import { db } from "@workspace/db";
import { modelConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { compressMessages } from "@workspace/compressor";

export type LLMMessage = { role: "user" | "assistant" | "system"; content: string };
export type ParsedFile = { path: string; content: string; language: string };
export type LLMResult = {
  content: string;
  model: string;
  files: ParsedFile[];
  source: "ollama" | "openai" | "anthropic" | "openrouter" | "groq" | "gemini" | "mistral" | "mock";
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

// ── Config resolution ──────────────────────────────────────────────────────────
type ResolvedCfg =
  | { type: "ollama";     model: string; ollamaUrl: string }
  | { type: "openai";     model: string; apiKey: string; url: string }
  | { type: "anthropic";  model: string; apiKey: string }
  | { type: "openrouter"; model: string; apiKey: string }
  | { type: "groq";       model: string; apiKey: string }
  | { type: "gemini";     model: string; apiKey: string }
  | { type: "mistral";    model: string; apiKey: string }
  | { type: "mock";       model: string };

async function getConfig(agentKey?: string): Promise<ResolvedCfg> {
  const [cfg] = await db.select().from(modelConfigsTable)
    .where(eq(modelConfigsTable.isDefault, true)).limit(1);
  if (!cfg) return { type: "ollama", model: "qwen2.5-coder:7b", ollamaUrl: "http://localhost:11434" };

  let model = cfg.globalModel;
  if (agentKey && cfg.mode === "per_agent") {
    const overrides = cfg.agentOverrides as Record<string, string>;
    if (overrides[agentKey]) model = overrides[agentKey];
  }

  const sources = (cfg.sources as any[]);
  const find = (type: string) => sources.find((s: any) => s.type === type && s.apiKey) || sources.find((s: any) => s.type === type);
  const defaultSrc = sources.find((s: any) => s.isDefault);

  // Default kaynak varsa onu kullan
  if (defaultSrc) {
    if (defaultSrc.type === "groq"       && defaultSrc.apiKey) return { type: "groq",       model, apiKey: defaultSrc.apiKey };
    if (defaultSrc.type === "openrouter" && defaultSrc.apiKey) return { type: "openrouter", model, apiKey: defaultSrc.apiKey };
    if (defaultSrc.type === "openai"     && defaultSrc.apiKey) return { type: "openai",     model, apiKey: defaultSrc.apiKey, url: defaultSrc.url || "https://api.openai.com" };
    if (defaultSrc.type === "anthropic"  && defaultSrc.apiKey) return { type: "anthropic",  model, apiKey: defaultSrc.apiKey };
    if (defaultSrc.type === "gemini"     && defaultSrc.apiKey) return { type: "gemini",     model, apiKey: defaultSrc.apiKey };
    if (defaultSrc.type === "ollama") return { type: "ollama", model, ollamaUrl: defaultSrc.url };
  }

  // Fallback sırası: mistral > groq > openrouter > openai > anthropic > gemini > ollama > mock
  const mistral    = find("mistral");
  const groq       = find("groq");
  const openrouter = find("openrouter");
  const openai     = find("openai");
  const anthropic  = find("anthropic");
  const gemini     = find("gemini");
  const ollama     = find("ollama");

  if (mistral?.apiKey)    return { type: "mistral",    model, apiKey: mistral.apiKey };
  if (groq?.apiKey)       return { type: "groq",       model, apiKey: groq.apiKey };
  if (openrouter?.apiKey) return { type: "openrouter", model, apiKey: openrouter.apiKey };
  if (openai?.apiKey)     return { type: "openai",     model, apiKey: openai.apiKey, url: openai.url || "https://api.openai.com" };
  if (anthropic?.apiKey)  return { type: "anthropic",  model, apiKey: anthropic.apiKey };
  if (gemini?.apiKey)     return { type: "gemini",     model, apiKey: gemini.apiKey };
  if (ollama)             return { type: "ollama",     model, ollamaUrl: ollama.url };
  return { type: "mock", model };
}

// ── File parser ────────────────────────────────────────────────────────────────
function parseFiles(text: string): { content: string; files: ParsedFile[] } {
  const files: ParsedFile[] = [];
  const fileRegex = /```file:([^\n]+)\n([\s\S]*?)```/g;
  let match;
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
  const clean = text.replace(fileRegex, (_, path, content) =>
    `\`\`\`${path.split(".").pop() ?? ""}\n// 📄 ${path}\n${content}\`\`\``
  );
  return { content: clean, files };
}

// ── Provider callers ───────────────────────────────────────────────────────────
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
    if (!resp.ok) throw new Error(`Ollama ${resp.status}: ${await resp.text()}`);
    const json = await resp.json() as any;
    return json.message?.content ?? json.response ?? "";
  } catch (err: any) { clearTimeout(tid); throw err; }
}

async function callOpenAICompat(
  apiKey: string,
  baseUrl: string,
  model: string,
  messages: LLMMessage[],
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  const url = baseUrl.replace(/\/$/, "");
  const endpoint = url.endsWith("/v1") ? `${url}/chat/completions` : `${url}/v1/chat/completions`;
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({ model, messages, max_tokens: 4096 }),
  });
  if (!resp.ok) throw new Error(`${url} → ${resp.status}: ${await resp.text()}`);
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

async function callGemini(apiKey: string, model: string, messages: LLMMessage[]): Promise<string> {
  const system = messages.find(m => m.role === "system")?.content ?? "";
  const userMsgs = messages.filter(m => m.role !== "system");
  const contents = userMsgs.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const body: any = {
    contents,
    generationConfig: { maxOutputTokens: 4096 },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${await resp.text()}`);
  const json = await resp.json() as any;
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ── Error message builder ──────────────────────────────────────────────────────
function errorResponse(err: any, cfg: ResolvedCfg): string {
  const lines = [
    `⚠️ **LLM bağlantı hatası:** ${err.message}`,
    "",
    `**Provider:** ${cfg.type}  |  **Model:** ${cfg.model}`,
    "",
  ];

  if (cfg.type === "ollama") {
    lines.push(
      "**Çözüm:**",
      "- `ollama serve` çalıştırın",
      `- \`ollama pull ${cfg.model}\` ile modeli indirin`,
    );
  } else if (cfg.type === "groq") {
    lines.push("**Çözüm:** console.groq.com → API Keys → yeni key oluşturun → Models sayfasına ekleyin");
  } else if (cfg.type === "openrouter") {
    lines.push("**Çözüm:** openrouter.ai → Keys → API key oluşturun → Models sayfasına ekleyin");
  } else if (cfg.type === "gemini") {
    lines.push("**Çözüm:** aistudio.google.com → Get API key → Models sayfasına ekleyin");
  } else {
    lines.push("**Models** sayfasından kaynak bağlantısını test edin");
  }
  return lines.join("\n");
}

// ── Main export ────────────────────────────────────────────────────────────────
export async function chat(
  userMessages: LLMMessage[],
  options: { agentKey?: string; context?: string } = {}
): Promise<LLMResult> {
  const cfg = await getConfig(options.agentKey);
  const systemContent = options.context
    ? `${SYSTEM_PROMPT}\n\n## Proje Bağlamı\n${options.context}`
    : SYSTEM_PROMPT;

  const rawMessages: LLMMessage[] = [{ role: "system", content: systemContent }, ...userMessages];
  const { messages: fullMessages, stats } = compressMessages(rawMessages, { logStats: true });
  if (stats.totalSavedTokens > 0) {
    console.log(`[llm] context compressed: -${stats.totalSavedTokens} tokens (-${stats.savedPercent.toFixed(1)}%)`);
  }

  let rawContent = "";
  let source: LLMResult["source"] = "mock";

  try {
    switch (cfg.type) {
      case "ollama":
        rawContent = await callOllama(cfg.ollamaUrl, cfg.model, fullMessages);
        source = "ollama";
        break;
      case "openai":
        rawContent = await callOpenAICompat(cfg.apiKey, cfg.url, cfg.model, fullMessages);
        source = "openai";
        break;
      case "openrouter":
        rawContent = await callOpenAICompat(
          cfg.apiKey,
          "https://openrouter.ai/api/v1",
          cfg.model,
          fullMessages,
          { "HTTP-Referer": "https://swarm-ctrl.app", "X-Title": "SWARM_CTRL" }
        );
        source = "openrouter";
        break;
      case "groq":
        rawContent = await callOpenAICompat(cfg.apiKey, "https://api.groq.com/openai/v1", cfg.model, fullMessages);
        source = "groq";
        break;
      case "mistral":
        rawContent = await callOpenAICompat(cfg.apiKey, "https://api.mistral.ai/v1", cfg.model, fullMessages);
        source = "mistral";
        break;
      case "anthropic":
        rawContent = await callAnthropic(cfg.apiKey, cfg.model, fullMessages);
        source = "anthropic";
        break;
      case "gemini":
        rawContent = await callGemini(cfg.apiKey, cfg.model, fullMessages);
        source = "gemini";
        break;
      default:
        rawContent = mockResponse(userMessages[userMessages.length - 1]?.content ?? "");
        source = "mock";
    }
  } catch (err: any) {
    rawContent = errorResponse(err, cfg);
    source = "mock";
  }

  const { content, files } = parseFiles(rawContent);
  return { content, files, model: cfg.model, source };
}

// ── Agent-persona chat ─────────────────────────────────────────────────────────
export async function agentChat(
  agent: { key: string; role: string; description?: string | null; modelName?: string | null },
  userMessages: LLMMessage[],
  options: { context?: string } = {}
): Promise<LLMResult> {
  const cfg = await getConfig(agent.key);

  // Agent'ın kendi modeli varsa onu kullan
  const model = (agent.modelName && agent.modelName.trim()) ? agent.modelName : cfg.model;
  const resolvedCfg = { ...cfg, model };

  const agentSystemPrompt = [
    `Sen "${agent.key}" kod adlı bir AI ajanısın.`,
    `Rolün: ${agent.role}`,
    agent.description ? `Açıklama: ${agent.description}` : "",
    "",
    "Bu role tamamen uy. Konuşma tarzın, uzmanlık alanın ve önceliklerin bu rolü yansıtmalı.",
    "Kısa, net ve profesyonel yanıtlar ver.",
    "Kod yazarken ```file:<yol> formatını kullanabilirsin.",
    options.context ? `\n## Proje Bağlamı\n${options.context}` : "",
  ].filter(Boolean).join("\n");

  const rawAgentMessages: LLMMessage[] = [{ role: "system", content: agentSystemPrompt }, ...userMessages];
  const { messages: fullMessages, stats: agentStats } = compressMessages(rawAgentMessages, { logStats: true });
  if (agentStats.totalSavedTokens > 0) {
    console.log(`[llm:${agent.key}] context compressed: -${agentStats.totalSavedTokens} tokens (-${agentStats.savedPercent.toFixed(1)}%)`);
  }

  let rawContent = "";
  let source: LLMResult["source"] = "mock";

  try {
    switch (resolvedCfg.type) {
      case "ollama":
        rawContent = await callOllama(resolvedCfg.ollamaUrl, resolvedCfg.model, fullMessages);
        source = "ollama"; break;
      case "openai":
        rawContent = await callOpenAICompat(resolvedCfg.apiKey, resolvedCfg.url, resolvedCfg.model, fullMessages);
        source = "openai"; break;
      case "openrouter":
        rawContent = await callOpenAICompat(resolvedCfg.apiKey, "https://openrouter.ai/api/v1", resolvedCfg.model, fullMessages, { "HTTP-Referer": "https://swarm-ctrl.app", "X-Title": "SWARM_CTRL" });
        source = "openrouter"; break;
      case "groq":
        rawContent = await callOpenAICompat(resolvedCfg.apiKey, "https://api.groq.com/openai/v1", resolvedCfg.model, fullMessages);
        source = "groq"; break;
      case "mistral":
        rawContent = await callOpenAICompat(resolvedCfg.apiKey, "https://api.mistral.ai/v1", resolvedCfg.model, fullMessages);
        source = "mistral"; break;
      case "anthropic":
        rawContent = await callAnthropic(resolvedCfg.apiKey, resolvedCfg.model, fullMessages);
        source = "anthropic"; break;
      case "gemini":
        rawContent = await callGemini(resolvedCfg.apiKey, resolvedCfg.model, fullMessages);
        source = "gemini"; break;
      default:
        rawContent = `[${agent.key}] Henüz bir LLM kaynağı bağlı değil. Models sayfasından ekleyin.`;
        source = "mock";
    }
  } catch (err: any) {
    rawContent = errorResponse(err, resolvedCfg);
    source = "mock";
  }

  const { content, files } = parseFiles(rawContent);
  return { content, files, model: resolvedCfg.model, source };
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
    } catch { /* ignore in cloud env */ }
  }
  return written;
}

function mockResponse(input: string): string {
  return [
    `Mesajınızı aldım: _"${input.slice(0, 80)}${input.length > 80 ? "..." : ""}"_`,
    "",
    "**Henüz bir LLM kaynağı bağlı değil.** Models sayfasından ücretsiz bir kaynak ekleyin:",
    "",
    "- **Groq** → console.groq.com (ücretsiz, çok hızlı — Llama, Mixtral)",
    "- **OpenRouter** → openrouter.ai (ücretsiz — Mistral, DeepSeek, Gemma, Qwen)",
    "- **Gemini** → aistudio.google.com (ücretsiz — Gemini Flash)",
    "- **Ollama** → yerel kurulum, internet gerekmez",
  ].join("\n");
}
