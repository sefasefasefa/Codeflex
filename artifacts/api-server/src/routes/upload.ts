import { Router } from "express";
import multer from "multer";
import { extname } from "path";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

const PLAIN_TEXT_EXTS = new Set([
  ".txt", ".md", ".markdown", ".csv", ".tsv", ".json", ".jsonl",
  ".xml", ".yaml", ".yml", ".toml", ".ini", ".env",
  ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx",
  ".py", ".rb", ".go", ".rs", ".java", ".kt", ".swift",
  ".c", ".cpp", ".h", ".cs", ".php", ".sh", ".bash",
  ".html", ".htm", ".css", ".scss", ".less", ".sql",
  ".log", ".conf", ".config",
]);

async function extractText(buffer: Buffer, ext: string, mimetype: string): Promise<string> {
  // Plain text files
  if (PLAIN_TEXT_EXTS.has(ext)) {
    return buffer.toString("utf-8");
  }

  // PDF
  if (ext === ".pdf" || mimetype === "application/pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text;
  }

  // DOCX
  if (ext === ".docx" || mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // DOC (plain mammoth fallback)
  if (ext === ".doc") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // PPTX — it's a ZIP, extract text from slide XML files
  if (ext === ".pptx" || mimetype === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files)
      .filter(name => name.match(/^ppt\/slides\/slide\d+\.xml$/))
      .sort((a, b) => {
        const na = parseInt(a.match(/\d+/)?.[0] ?? "0");
        const nb = parseInt(b.match(/\d+/)?.[0] ?? "0");
        return na - nb;
      });

    const texts: string[] = [];
    for (const slideFile of slideFiles) {
      const xml = await zip.files[slideFile].async("string");
      // Strip XML tags, keep text content
      const text = xml
        .replace(/<a:t>/g, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
      if (text) texts.push(text);
    }
    return texts.join("\n\n");
  }

  // XLSX / XLS
  if (ext === ".xlsx" || ext === ".xls" || mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buffer, { type: "buffer" });
    const lines: string[] = [];
    for (const sheetName of wb.SheetNames) {
      lines.push(`=== Sheet: ${sheetName} ===`);
      const ws = wb.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(ws);
      lines.push(csv);
    }
    return lines.join("\n\n");
  }

  // RTF — basic text stripping
  if (ext === ".rtf") {
    const rtf = buffer.toString("latin1");
    const text = rtf
      .replace(/\\[a-z]+\d* ?/g, " ")
      .replace(/[{}\\]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return text;
  }

  // Fallback: attempt UTF-8 decode
  return buffer.toString("utf-8");
}

router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Dosya bulunamadı" });
  }

  const { originalname, buffer, mimetype, size } = req.file;
  const ext = extname(originalname).toLowerCase();

  try {
    const text = await extractText(buffer, ext, mimetype);
    const trimmed = text.slice(0, 200_000); // max 200k chars to LLM

    res.json({
      filename: originalname,
      ext,
      mimetype,
      sizeBytes: size,
      charCount: trimmed.length,
      text: trimmed,
    });
  } catch (err: any) {
    console.error("File extraction error:", err);
    res.status(422).json({ error: `Dosya okunamadı: ${err.message}` });
  }
});

export default router;
