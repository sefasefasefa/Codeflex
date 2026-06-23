import { Router } from "express";
import { db } from "@workspace/db";
import { modelConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Static free model catalogs ─────────────────────────────────────────────────
const GROQ_MODELS = [
  "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama-3.2-11b-vision-preview",
  "mixtral-8x7b-32768", "gemma2-9b-it", "qwen-qwq-32b", "deepseek-r1-distill-llama-70b",
];

const OPENROUTER_FREE_MODELS = [
  "mistralai/mistral-7b-instruct:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "meta-llama/llama-3.2-11b-vision-instruct:free",
  "google/gemma-2-9b-it:free",
  "google/gemma-3-12b-it:free",
  "deepseek/deepseek-r1:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "qwen/qwq-32b:free",
  "microsoft/phi-3-mini-128k-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "thudm/glm-4-32b:free",
];

const GEMINI_FREE_MODELS = [
  "gemini-2.0-flash", "gemini-2.0-flash-lite",
  "gemini-1.5-flash", "gemini-1.5-flash-8b",
];

async function getDefaultConfig() {
  const [cfg] = await db.select().from(modelConfigsTable).where(eq(modelConfigsTable.isDefault, true)).limit(1);
  if (cfg) return cfg;
  const [first] = await db.select().from(modelConfigsTable).limit(1);
  if (first) return first;

  const [created] = await db.insert(modelConfigsTable).values({
    id: genId("mcfg"),
    name: "default",
    mode: "global",
    globalModel: "llama-3.3-70b-versatile",
    agentOverrides: {},
    sources: [
      { id: "src_local", type: "ollama", label: "Yerel Ollama", url: "http://localhost:11434", isDefault: false, models: [] },
    ],
    isDefault: true,
  }).returning();
  return created;
}

router.get("/config", async (_req, res) => {
  try {
    const cfg = await getDefaultConfig();
    res.json(cfg);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/config", async (req, res) => {
  try {
    const { mode, globalModel, agentOverrides, sources, name } = req.body as {
      mode?: string; globalModel?: string; agentOverrides?: Record<string, string>;
      sources?: any[]; name?: string;
    };
    const cfg = await getDefaultConfig();
    const [updated] = await db.update(modelConfigsTable)
      .set({
        ...(name !== undefined && { name }),
        ...(mode !== undefined && { mode }),
        ...(globalModel !== undefined && { globalModel }),
        ...(agentOverrides !== undefined && { agentOverrides }),
        ...(sources !== undefined && { sources }),
        updatedAt: new Date(),
      })
      .where(eq(modelConfigsTable.id, cfg.id))
      .returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/catalog", (_req, res) => {
  res.json({
    openrouter: {
      type: "openrouter",
      label: "OpenRouter",
      description: "50+ ücretsiz model — Mistral, Llama, DeepSeek, Gemma, Qwen",
      url: "https://openrouter.ai/api/v1",
      signupUrl: "https://openrouter.ai",
      icon: "🔀",
      isFree: true,
      models: OPENROUTER_FREE_MODELS,
    },
    groq: {
      type: "groq",
      label: "Groq",
      description: "Saniyede 500+ token — dünyanın en hızlı çıkarım servisi",
      url: "https://api.groq.com/openai/v1",
      signupUrl: "https://console.groq.com",
      icon: "⚡",
      isFree: true,
      models: GROQ_MODELS,
    },
    gemini: {
      type: "gemini",
      label: "Google Gemini",
      description: "Gemini Flash — dakikada 15 istek, ücretsiz",
      url: "https://generativelanguage.googleapis.com",
      signupUrl: "https://aistudio.google.com",
      icon: "✨",
      isFree: true,
      models: GEMINI_FREE_MODELS,
    },
    ollama: {
      type: "ollama",
      label: "Ollama (Yerel)",
      description: "Tamamen yerel — internet gerekmez, sınırsız kullanım",
      url: "http://localhost:11434",
      signupUrl: "https://ollama.com",
      icon: "🦙",
      isFree: true,
      models: [
        "qwen2.5-coder:7b", "qwen2.5-coder:32b", "deepseek-r1:14b",
        "llama3.1:8b", "mistral:7b", "codellama:7b", "gemma2:9b", "phi4:14b",
      ],
    },
    openai: {
      type: "openai",
      label: "OpenAI",
      description: "GPT-4o — ücretli, en yetenekli",
      url: "https://api.openai.com",
      signupUrl: "https://platform.openai.com",
      icon: "🤖",
      isFree: false,
      models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-mini"],
    },
    anthropic: {
      type: "anthropic",
      label: "Anthropic",
      description: "Claude Sonnet — ücretli, kod için çok iyi",
      url: "https://api.anthropic.com",
      signupUrl: "https://console.anthropic.com",
      icon: "🧠",
      isFree: false,
      models: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-3-5"],
    },
  });
});

router.get("/available", async (req, res) => {
  try {
    const cfg = await getDefaultConfig();
    const results: Array<{ sourceId: string; label: string; url: string; models: string[]; ok: boolean; error?: string }> = [];

    for (const src of cfg.sources as any[]) {
      if (src.type === "ollama") {
        try {
          const url = src.url.replace(/\/$/, "");
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), 5000);
          const resp = await fetch(`${url}/api/tags`, { signal: controller.signal });
          clearTimeout(tid);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const json = await resp.json() as any;
          const models: string[] = (json.models ?? []).map((m: any) => m.name as string);
          results.push({ sourceId: src.id, label: src.label, url: src.url, models, ok: true });
        } catch (err: any) {
          results.push({ sourceId: src.id, label: src.label, url: src.url, models: [], ok: false, error: err.message });
        }
      } else if (src.type === "openrouter" && src.apiKey) {
        try {
          const resp = await fetch("https://openrouter.ai/api/v1/models", {
            headers: { Authorization: `Bearer ${src.apiKey}` },
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const json = await resp.json() as any;
          const models: string[] = (json.data ?? [])
            .filter((m: any) => m.pricing?.prompt === "0" || m.id?.endsWith(":free"))
            .map((m: any) => m.id as string)
            .slice(0, 30);
          results.push({ sourceId: src.id, label: src.label, url: src.url, models: models.length > 0 ? models : OPENROUTER_FREE_MODELS, ok: true });
        } catch {
          results.push({ sourceId: src.id, label: src.label, url: src.url, models: OPENROUTER_FREE_MODELS, ok: true });
        }
      } else if (src.type === "groq") {
        results.push({ sourceId: src.id, label: src.label, url: src.url, models: GROQ_MODELS, ok: !!src.apiKey });
      } else if (src.type === "gemini") {
        results.push({ sourceId: src.id, label: src.label, url: src.url, models: GEMINI_FREE_MODELS, ok: !!src.apiKey });
      } else if (src.type === "openai") {
        results.push({ sourceId: src.id, label: src.label, url: src.url, models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-mini"], ok: !!src.apiKey });
      } else if (src.type === "anthropic") {
        results.push({ sourceId: src.id, label: src.label, url: src.url, models: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-3-5"], ok: !!src.apiKey });
      } else {
        results.push({ sourceId: src.id, label: src.label, url: src.url, models: src.models ?? [], ok: true });
      }
    }

    res.json({ sources: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/test", async (req, res) => {
  try {
    const { type, url, apiKey } = req.body as { type: string; url?: string; apiKey?: string };

    if (type === "ollama") {
      const cleanUrl = (url || "http://localhost:11434").replace(/\/$/, "");
      try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 6000);
        const resp = await fetch(`${cleanUrl}/api/tags`, { signal: controller.signal });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json() as any;
        const models: string[] = (json.models ?? []).map((m: any) => m.name as string);
        return res.json({ ok: true, models, message: `Bağlantı başarılı — ${models.length} model` });
      } catch (err: any) {
        return res.json({ ok: false, models: [], message: `Bağlantı hatası: ${err.message}` });
      }
    }

    if (type === "groq") {
      if (!apiKey) return res.json({ ok: false, message: "API key gerekli" });
      try {
        const resp = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json() as any;
        const models: string[] = (json.data ?? []).map((m: any) => m.id as string);
        return res.json({ ok: true, models, message: `Groq bağlantısı başarılı — ${models.length} model` });
      } catch (err: any) {
        return res.json({ ok: false, message: `Groq hatası: ${err.message}` });
      }
    }

    if (type === "openrouter") {
      if (!apiKey) return res.json({ ok: false, message: "API key gerekli" });
      try {
        const resp = await fetch("https://openrouter.ai/api/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json() as any;
        const free = (json.data ?? []).filter((m: any) => m.id?.endsWith(":free")).map((m: any) => m.id);
        return res.json({ ok: true, models: free, message: `OpenRouter bağlantısı başarılı — ${free.length} ücretsiz model` });
      } catch (err: any) {
        return res.json({ ok: false, message: `OpenRouter hatası: ${err.message}` });
      }
    }

    if (type === "gemini") {
      if (!apiKey) return res.json({ ok: false, message: "API key gerekli" });
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return res.json({ ok: true, models: GEMINI_FREE_MODELS, message: "Gemini API key geçerli" });
      } catch (err: any) {
        return res.json({ ok: false, message: `Gemini hatası: ${err.message}` });
      }
    }

    if (type === "openai") {
      if (!apiKey) return res.json({ ok: false, message: "API key gerekli" });
      try {
        const resp = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return res.json({ ok: true, message: "OpenAI API key geçerli" });
      } catch (err: any) {
        return res.json({ ok: false, message: `OpenAI hatası: ${err.message}` });
      }
    }

    if (type === "anthropic") {
      return res.json({ ok: true, message: "Anthropic yapılandırması kaydedildi" });
    }

    return res.status(400).json({ error: "Geçersiz type" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
