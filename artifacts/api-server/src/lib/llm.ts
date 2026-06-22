import { db } from "@workspace/db";
import { modelConfigsTable, agentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";

export type LLMMessage = { role: "user" | "assistant" | "system"; content: string };

export type ParsedFile = { path: string; content: string; language: string };

export type LLMResult = {
  content: string;
  model: string;
  files: ParsedFile[];
  thinking?: string;
  source: "ollama" | "openai" | "anthropic" | "mock";
};

const SYSTEM_PROMPT = `Sen SWARM_CTRL'nin yerleşik AI kodlama asistanısın. Kullanıcının dosya oluşturmasına, kod yazmasına ve projesini geliştirmesine yardım edersin.

DOSYA OLUŞTURMA:
Bir dosya oluşturmak veya güncellemek istediğinde şu formatı kullan:

\`\`\`file:src/app.ts
// dosya içeriği buraya
\`\`\`

Birden fazla dosya oluşturabilirsin. Her dosya bloğu ayrı işlenir.

KURALLAR:
- Türkçe veya İngilizce — kullanıcı hangi dilde yazarsa o dilde yanıt ver
- Kod yazarken önce ne yapacağını kısaca açıkla
- Dosya oluştururken daima tam yolu belirt (ör: src/routes/auth.ts)
- TypeScript tercih et, aksi belirtilmedikçe
- Kısa ve net ol — gereksiz sözcük kullanma
- Eğer proje bağlamı verildiyse (bellek, dosyalar), bunu kullanarak önerilerde bulun`;

async function getConfig(agentKey?: string) {
  const [cfg] = await db.select().from(modelConfigsTable)
    .where(eq(modelConfigsTable.isDefault, true)).limit(1);
  if (!cfg) return { model: "qwen2.5-coder:7b", ollamaUrl: "http://localhost:11434", type: "ollama" as const };

  let model = cfg.globalModel;
  if (agentKey && cfg.mode === "per_agent") {
    const overrides = cfg.agentOverrides as Record<string, string>;
    if (overrides[agentKey]) model = overrides[agentKey];
  }

  const sources = (cfg.sources as any[]);
  const ollamaSrc = sources.find((s: any) => s.type === "ollama" && s.isDefault) || sources.find((s: any) => s.type === "ollama");
  const openaiSrc = sources.find((s: any) => s.type === "openai");
  const anthropicSrc = sources.find((s: any) => s.type === "anthropic");

  if (openaiSrc?.apiKey) return { model, type: "openai" as const, apiKey: openaiSrc.apiKey, url: openaiSrc.url || "https://api.openai.com" };
  if (anthropicSrc?.apiKey) return { model, type: "anthropic" as const, apiKey: anthropicSrc.apiKey };
  if (ollamaSrc) return { model, type: "ollama" as const, ollamaUrl: ollamaSrc.url };
  return { model, type: "ollama" as const, ollamaUrl: "http://localhost:11434" };
}

function parseFiles(text: string): { content: string; files: ParsedFile[] } {
  const files: ParsedFile[] = [];
  const fileRegex = /```file:([^\n]+)\n([\s\S]*?)```/g;
  let match;
  let clean = text;

  while ((match = fileRegex.exec(text)) !== null) {
    const rawPath = match[1].trim();
    const content = match[2];
    const ext = rawPath.split(".").pop() ?? "text";
    const langMap: Record<string, string> = {
      ts: "typescript", tsx: "typescriptreact", js: "javascript", jsx: "javascriptreact",
      py: "python", rs: "rust", go: "go", sql: "sql", md: "markdown", json: "json",
      yaml: "yaml", yml: "yaml", sh: "bash", html: "html", css: "css",
    };
    files.push({ path: rawPath, content, language: langMap[ext] || "text" });
  }

  clean = text.replace(fileRegex, (_, path, content) =>
    `\`\`\`${(path.split(".").pop() ?? "")}\n// 📄 ${path}\n${content}\`\`\``
  );

  return { content: clean, files };
}

async function callOllama(ollamaUrl: string, model: string, messages: LLMMessage[]): Promise<string> {
  const url = ollamaUrl.replace(/\/$/, "");
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 120_000);
  try {
    const resp = await fetch(`${url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false }),
      signal: controller.signal,
    });
    clearTimeout(tid);
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Ollama ${resp.status}: ${err}`);
    }
    const json = await resp.json() as any;
    return json.message?.content ?? json.response ?? "";
  } catch (err: any) {
    clearTimeout(tid);
    throw err;
  }
}

async function callOpenAI(apiKey: string, baseUrl: string, model: string, messages: LLMMessage[]): Promise<string> {
  const url = baseUrl.replace(/\/$/, "");
  const resp = await fetch(`${url}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: 4096 }),
  });
  if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${await resp.text()}`);
  const json = await resp.json() as any;
  return json.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(apiKey: string, model: string, messages: LLMMessage[]): Promise<string> {
  const system = messages.find(m => m.role === "system")?.content ?? "";
  const userMsgs = messages.filter(m => m.role !== "system");
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, system, messages: userMsgs, max_tokens: 4096 }),
  });
  if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${await resp.text()}`);
  const json = await resp.json() as any;
  return json.content?.[0]?.text ?? "";
}

export async function chat(
  userMessages: LLMMessage[],
  options: { agentKey?: string; context?: string } = {}
): Promise<LLMResult> {
  const cfg = await getConfig(options.agentKey);
  const systemContent = options.context
    ? `${SYSTEM_PROMPT}\n\n## Proje Bağlamı\n${options.context}`
    : SYSTEM_PROMPT;

  const fullMessages: LLMMessage[] = [
    { role: "system", content: systemContent },
    ...userMessages,
  ];

  let rawContent = "";
  let source: LLMResult["source"] = "mock";

  try {
    if (cfg.type === "ollama") {
      rawContent = await callOllama(cfg.ollamaUrl!, cfg.model, fullMessages);
      source = "ollama";
    } else if (cfg.type === "openai") {
      rawContent = await callOpenAI(cfg.apiKey!, cfg.url || "https://api.openai.com", cfg.model, fullMessages);
      source = "openai";
    } else if (cfg.type === "anthropic") {
      rawContent = await callAnthropic(cfg.apiKey!, cfg.model, fullMessages);
      source = "anthropic";
    } else {
      rawContent = mockResponse(userMessages[userMessages.length - 1]?.content ?? "");
      source = "mock";
    }
  } catch (err: any) {
    rawContent = [
      `⚠️ LLM bağlantı hatası: **${err.message}**`,
      "",
      `**Model:** ${cfg.model} (${cfg.type})`,
      cfg.type === "ollama" ? `**Ollama URL:** ${cfg.ollamaUrl}` : "",
      "",
      "**Çözüm önerileri:**",
      "- Ollama çalışıyor mu? `ollama serve` komutunu deneyin",
      "- Model yüklü mü? `ollama pull " + cfg.model + "` deneyin",
      "- Models sayfasından kaynak bağlantısını test edin",
    ].filter(Boolean).join("\n");
    source = "mock";
  }

  const { content, files } = parseFiles(rawContent);
  return { content, files, model: cfg.model, source };
}

export function writeFilesToDisk(files: ParsedFile[], workspaceRoot: string, projectName?: string) {
  const base = projectName ? join(workspaceRoot, projectName) : workspaceRoot;
  const written: string[] = [];
  for (const f of files) {
    try {
      const full = join(base, f.path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, f.content, "utf8");
      written.push(f.path);
    } catch {
      // ignore write errors in cloud env
    }
  }
  return written;
}

function mockResponse(input: string): string {
  return [
    `Mesajınızı aldım: _"${input.slice(0, 80)}${input.length > 80 ? "..." : ""}"_`,
    "",
    "**Şu anda bir LLM bağlı değil.** Aşağıdakileri yapabilirsiniz:",
    "",
    "1. **Yerel Ollama** kurun: `curl -fsSL https://ollama.com/install.sh | sh`",
    "2. Bir model indirin: `ollama pull qwen2.5-coder:7b`",
    "3. **Models** sayfasından Ollama URL'sini kaydedin (`http://localhost:11434`)",
    "4. **Kaydet** ve **Modelleri Tara** butonuna tıklayın",
    "",
    "Veya OpenAI/Anthropic API key ile de bağlanabilirsiniz.",
  ].join("\n");
}
