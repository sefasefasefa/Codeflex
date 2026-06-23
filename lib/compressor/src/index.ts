export type CompressionLevel = "light" | "medium" | "aggressive";

export interface CompressionResult {
  original: string;
  compressed: string;
  originalTokens: number;
  compressedTokens: number;
  savedTokens: number;
  savedPercent: number;
  passes: number;
}

export interface CompressMessagesResult {
  totalOriginalTokens: number;
  totalCompressedTokens: number;
  totalSavedTokens: number;
  savedPercent: number;
}

function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ── Compression strategies ───────────────────────────────────────────────────

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function minifyJSON(text: string): string {
  return text.replace(/```json\s*([\s\S]*?)```/g, (_, json) => {
    try {
      return "```json\n" + JSON.stringify(JSON.parse(json)) + "\n```";
    } catch {
      return _;
    }
  }).replace(/(\{[^{}]*\}|\[[^\[\]]*\])/g, (match) => {
    try {
      const parsed = JSON.parse(match);
      const mini = JSON.stringify(parsed);
      return mini.length < match.length ? mini : match;
    } catch {
      return match;
    }
  });
}

function deduplicateLogs(text: string): string {
  const lines = text.split("\n");
  const seen = new Map<string, number>();
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const normalized = line.replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?Z?/g, "<ts>")
      .replace(/\b\d+ms\b/g, "<ms>")
      .replace(/0x[0-9a-f]+/gi, "<hex>");
    const count = seen.get(normalized) ?? 0;
    if (count < 2) {
      out.push(line);
      seen.set(normalized, count + 1);
    } else if (count === 2) {
      out.push(`... (repeated)`);
      seen.set(normalized, count + 1);
    }
    i++;
  }
  return out.join("\n");
}

function compressRepeatedPatterns(text: string): string {
  const lines = text.split("\n");
  if (lines.length < 4) return text;
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    let patLen = 1;
    let bestRun = 1;
    let bestLen = 1;
    for (let len = 1; len <= Math.min(5, Math.floor((lines.length - i) / 2)); len++) {
      const pattern = lines.slice(i, i + len).join("\n");
      let runCount = 1;
      let j = i + len;
      while (j + len <= lines.length && lines.slice(j, j + len).join("\n") === pattern) {
        runCount++;
        j += len;
      }
      if (runCount > bestRun || (runCount === bestRun && len > bestLen)) {
        bestRun = runCount;
        bestLen = len;
        patLen = len;
      }
    }
    if (bestRun >= 3) {
      const pattern = lines.slice(i, i + patLen);
      out.push(...pattern);
      out.push(`... (${bestRun - 1}x repeated)`);
      i += patLen * bestRun;
    } else {
      out.push(lines[i]);
      i++;
    }
  }
  return out.join("\n");
}

function stripMarkdownFormatting(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/#{1,6} /g, "")
    .replace(/^\s*[-*+] /gm, "- ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

function removeLogBoilerplate(text: string): string {
  return text
    .replace(/^\s*(DEBUG|TRACE|VERBOSE)\b.*$/gim, "")
    .replace(/^.*(heartbeat|ping|keepalive|health.?check).*$/gim, "")
    .replace(/^.*(token|bearer|authorization):\s*[^\s]+.*$/gim, "<auth-redacted>")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Core compress ────────────────────────────────────────────────────────────

export function compress(text: string, level: CompressionLevel = "medium"): string {
  let result = text;
  result = normalizeWhitespace(result);
  result = minifyJSON(result);
  result = deduplicateLogs(result);

  if (level === "medium" || level === "aggressive") {
    result = compressRepeatedPatterns(result);
    result = removeLogBoilerplate(result);
  }

  if (level === "aggressive") {
    result = stripMarkdownFormatting(result);
  }

  return result;
}

export function compressFull(
  text: string,
  level: CompressionLevel = "aggressive",
  maxPasses = 20,
  minGainPercent = 0.5,
): CompressionResult {
  const originalTokens = countTokens(text);
  let current = text;
  let passes = 0;

  for (let i = 0; i < maxPasses; i++) {
    const next = compress(current, level);
    const prevLen = current.length;
    const nextLen = next.length;
    const gain = prevLen === 0 ? 0 : ((prevLen - nextLen) / prevLen) * 100;
    current = next;
    passes++;
    if (gain < minGainPercent || nextLen >= prevLen) break;
  }

  const compressedTokens = countTokens(current);
  const savedTokens = originalTokens - compressedTokens;
  const savedPercent = originalTokens === 0 ? 0 : (savedTokens / originalTokens) * 100;

  return {
    original: text,
    compressed: current,
    originalTokens,
    compressedTokens,
    savedTokens,
    savedPercent,
    passes,
  };
}

// ── LLM message middleware ───────────────────────────────────────────────────

export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface CompressOptions {
  level?: CompressionLevel;
  maxPasses?: number;
  minGainPercent?: number;
  roles?: Array<"user" | "assistant" | "system">;
  minTokensToCompress?: number;
  logStats?: boolean;
}

/**
 * Compresses LLM messages in-place before sending to a model.
 * By default compresses user messages above 100 tokens using aggressive mode.
 *
 * @example
 * const { messages, stats } = compressMessages(messages, { logStats: true });
 * const response = await callOpenAI(messages);
 */
export function compressMessages(
  messages: LLMMessage[],
  options: CompressOptions = {},
): { messages: LLMMessage[]; stats: CompressMessagesResult } {
  const {
    level = "aggressive",
    maxPasses = 10,
    minGainPercent = 0.5,
    roles = ["user"],
    minTokensToCompress = 100,
    logStats = false,
  } = options;

  let totalOriginal = 0;
  let totalCompressed = 0;

  const compressed = messages.map((msg) => {
    if (!roles.includes(msg.role)) return msg;
    const tokens = countTokens(msg.content);
    if (tokens < minTokensToCompress) return msg;

    const result = compressFull(msg.content, level, maxPasses, minGainPercent);
    totalOriginal += result.originalTokens;
    totalCompressed += result.compressedTokens;

    if (logStats) {
      console.log(
        `[compressor] ${msg.role} msg: ${result.originalTokens} → ${result.compressedTokens} tokens ` +
        `(-${result.savedPercent.toFixed(1)}%, ${result.passes} passes)`
      );
    }

    return { ...msg, content: result.compressed };
  });

  const totalSavedTokens = totalOriginal - totalCompressed;
  const savedPercent = totalOriginal === 0 ? 0 : (totalSavedTokens / totalOriginal) * 100;

  if (logStats && totalOriginal > 0) {
    console.log(
      `[compressor] total: ${totalOriginal} → ${totalCompressed} tokens (-${savedPercent.toFixed(1)}%)`
    );
  }

  return {
    messages: compressed,
    stats: { totalOriginalTokens: totalOriginal, totalCompressedTokens: totalCompressed, totalSavedTokens, savedPercent },
  };
}

/**
 * Compresses a single context string (e.g. project context, RAG chunk, tool output).
 */
export function compressContext(text: string, options: CompressOptions = {}): string {
  const { level = "aggressive", maxPasses = 10, minGainPercent = 0.5 } = options;
  return compressFull(text, level, maxPasses, minGainPercent).compressed;
}
