import { Router } from "express";
import { db } from "@workspace/db";
import { modelConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Static model lists ─────────────────────────────────────────────────────────
const GROQ_MODELS = [
  "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama-3.2-11b-vision-preview",
  "mixtral-8x7b-32768", "gemma2-9b-it", "qwen-qwq-32b", "deepseek-r1-distill-llama-70b",
];
const OPENROUTER_FREE_MODELS = [
  "mistralai/mistral-7b-instruct:free", "mistralai/mistral-small-3.2-24b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free", "meta-llama/llama-3.1-8b-instruct:free",
  "google/gemma-3-12b-it:free", "deepseek/deepseek-r1:free",
  "deepseek/deepseek-chat-v3-0324:free", "qwen/qwq-32b:free",
];
const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash", "gemini-1.5-flash-8b"];
const MISTRAL_MODELS = ["mistral-large-latest", "mistral-small-latest", "open-mistral-nemo", "pixtral-large-latest"];
const DEEPSEEK_MODELS = ["deepseek-chat", "deepseek-reasoner"];
const CEREBRAS_MODELS = ["llama3.1-8b", "llama3.1-70b", "llama-4-scout-17b-16e-instruct"];
const NVIDIA_MODELS = ["meta/llama-3.1-8b-instruct", "meta/llama-3.1-70b-instruct", "nvidia/llama-3.1-nemotron-70b-instruct"];
const KIMI_MODELS = ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"];
const FIREWORKS_MODELS = ["accounts/fireworks/models/llama-v3p3-70b-instruct", "accounts/fireworks/models/llama-v3p1-8b-instruct", "accounts/fireworks/models/qwen2p5-72b-instruct"];
const ZAI_MODELS = ["glm-4-flash", "glm-4-plus", "glm-z1-flash"];
const CODESTRAL_MODELS = ["codestral-latest", "codestral-2501"];
const OPENAI_MODELS = ["gpt-4o", "gpt-4o-mini", "o1-mini", "o3-mini", "gpt-4-turbo"];
const ANTHROPIC_MODELS = ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-3-5"];

// ── Master provider catalog ────────────────────────────────────────────────────
export const PROVIDERS = [
  { id: "nvidia",     name: "NVIDIA NIM",         envKey: "NVIDIA_NIM_API_KEY",  baseUrl: "https://integrate.api.nvidia.com/v1",      kind: "openai_compat", local: false, models: NVIDIA_MODELS,       signupUrl: "https://build.nvidia.com" },
  { id: "openrouter", name: "OpenRouter",          envKey: "OPENROUTER_API_KEY",  baseUrl: "https://openrouter.ai/api/v1",             kind: "openrouter",    local: false, models: OPENROUTER_FREE_MODELS, signupUrl: "https://openrouter.ai" },
  { id: "gemini",     name: "Gemini",              envKey: "GEMINI_API_KEY",      baseUrl: "https://generativelanguage.googleapis.com", kind: "gemini",        local: false, models: GEMINI_MODELS,       signupUrl: "https://aistudio.google.com" },
  { id: "deepseek",   name: "DeepSeek",            envKey: "DEEPSEEK_API_KEY",    baseUrl: "https://api.deepseek.com/v1",              kind: "openai_compat", local: false, models: DEEPSEEK_MODELS,     signupUrl: "https://platform.deepseek.com" },
  { id: "mistral",    name: "Mistral",             envKey: "MISTRAL_API_KEY",     baseUrl: "https://api.mistral.ai/v1",                kind: "openai_compat", local: false, models: MISTRAL_MODELS,      signupUrl: "https://console.mistral.ai" },
  { id: "codestral",  name: "Mistral Codestral",   envKey: "CODESTRAL_API_KEY",   baseUrl: "https://codestral.mistral.ai/v1",          kind: "openai_compat", local: false, models: CODESTRAL_MODELS,    signupUrl: "https://console.mistral.ai" },
  { id: "kimi",       name: "Kimi",                envKey: "KIMI_API_KEY",        baseUrl: "https://api.moonshot.cn/v1",               kind: "openai_compat", local: false, models: KIMI_MODELS,         signupUrl: "https://platform.moonshot.cn" },
  { id: "cerebras",   name: "Cerebras",            envKey: "CEREBRAS_API_KEY",    baseUrl: "https://api.cerebras.ai/v1",               kind: "openai_compat", local: false, models: CEREBRAS_MODELS,     signupUrl: "https://cloud.cerebras.ai" },
  { id: "groq",       name: "Groq",                envKey: "GROQ_API_KEY",        baseUrl: "https://api.groq.com/openai/v1",           kind: "openai_compat", local: false, models: GROQ_MODELS,         signupUrl: "https://console.groq.com" },
  { id: "fireworks",  name: "Fireworks",           envKey: "FIREWORKS_API_KEY",   baseUrl: "https://api.fireworks.ai/inference/v1",    kind: "openai_compat", local: false, models: FIREWORKS_MODELS,    signupUrl: "https://fireworks.ai" },
  { id: "zai",        name: "Z.ai",                envKey: "ZAI_API_KEY",         baseUrl: "https://api.z.ai/v1",                      kind: "openai_compat", local: false, models: ZAI_MODELS,          signupUrl: "https://bigmodel.cn" },
  { id: "openai",     name: "OpenAI",              envKey: "OPENAI_API_KEY",      baseUrl: "https://api.openai.com/v1",                kind: "openai_compat", local: false, models: OPENAI_MODELS,       signupUrl: "https://platform.openai.com" },
  { id: "anthropic",  name: "Anthropic",           envKey: "ANTHROPIC_API_KEY",   baseUrl: "https://api.anthropic.com",                kind: "anthropic",     local: false, models: ANTHROPIC_MODELS,    signupUrl: "https://console.anthropic.com" },
  { id: "lmstudio",   name: "LM Studio",           envKey: null,                  baseUrl: "http://localhost:1234/v1",                 kind: "openai_compat", local: true,  models: [],                  signupUrl: "https://lmstudio.ai" },
  { id: "llamacpp",   name: "llama.cpp",            envKey: null,                  baseUrl: "http://localhost:8080/v1",                 kind: "openai_compat", local: true,  models: [],                  signupUrl: "https://github.com/ggerganov/llama.cpp" },
  { id: "ollama",     name: "Ollama",              envKey: null,                  baseUrl: "http://localhost:11434",                   kind: "ollama",        local: true,  models: [],                  signupUrl: "https://ollama.com" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
async function getDefaultConfig() {
  const [cfg] = await db.select().from(modelConfigsTable).where(eq(modelConfigsTable.isDefault, true)).limit(1);
  if (cfg) return cfg;
  const [first] = await db.select().from(modelConfigsTable).limit(1);
  if (first) return first;

  const [created] = await db.insert(modelConfigsTable).values({
    id: genId("mcfg"), name: "default", mode: "global",
    globalModel: "mistral-large-latest",
    agentOverrides: {}, sources: [], isDefault: true,
  }).returning();
  return created;
}

async function fetchModelsFromProvider(providerId: string, apiKey?: string, baseUrl?: string): Promise<string[]> {
  const p = PROVIDERS.find(x => x.id === providerId);
  if (!p) return [];
  const url = baseUrl || p.baseUrl;
  const key = apiKey;

  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 8000);

    if (p.kind === "ollama") {
      const resp = await fetch(`${url}/api/tags`, { signal: ctrl.signal });
      if (!resp.ok) return [];
      const j = await resp.json() as any;
      return (j.models ?? []).map((m: any) => m.name as string);
    }

    if (p.kind === "gemini") {
      if (!key) return p.models;
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, { signal: ctrl.signal });
      if (!resp.ok) return p.models;
      const j = await resp.json() as any;
      return (j.models ?? []).filter((m: any) => m.name.includes("gemini")).map((m: any) => m.name.replace("models/", ""));
    }

    if (p.kind === "anthropic") return p.models;

    if (p.kind === "openrouter") {
      const resp = await fetch("https://openrouter.ai/api/v1/models", {
        headers: key ? { Authorization: `Bearer ${key}` } : {},
        signal: ctrl.signal,
      });
      if (!resp.ok) return OPENROUTER_FREE_MODELS;
      const j = await resp.json() as any;
      return (j.data ?? []).filter((m: any) => m.id?.endsWith(":free") || m.pricing?.prompt === "0").map((m: any) => m.id as string).slice(0, 40);
    }

    // OpenAI-compat
    const endpoint = url.endsWith("/v1") ? `${url}/models` : `${url}/v1/models`;
    const resp = await fetch(endpoint, {
      headers: key ? { Authorization: `Bearer ${key}` } : {},
      signal: ctrl.signal,
    });
    if (!resp.ok) return p.models;
    const j = await resp.json() as any;
    return (j.data ?? []).map((m: any) => m.id as string);
  } catch {
    return p.models;
  }
}

// ── GET /api/models/providers ─────────────────────────────────────────────────
router.get("/providers", async (_req, res) => {
  try {
    const cfg = await getDefaultConfig();
    const dbSources = (cfg.sources ?? []) as any[];

    const results = await Promise.all(PROVIDERS.map(async (p) => {
      const dbSource = dbSources.find((s: any) => s.type === p.id);
      const envKey = p.envKey ? process.env[p.envKey] : undefined;
      const resolvedKey = envKey || dbSource?.apiKey;
      const resolvedUrl = dbSource?.url || p.baseUrl;

      let status: "configured" | "missing" | "online" | "offline";
      let models: string[] = dbSource?.models?.length ? dbSource.models : p.models;

      if (p.local) {
        try {
          const ctrl = new AbortController();
          setTimeout(() => ctrl.abort(), 2500);
          const testUrl = p.kind === "ollama" ? `${resolvedUrl}/api/tags` : `${resolvedUrl}/models`;
          const resp = await fetch(testUrl, { signal: ctrl.signal });
          status = resp.ok ? "online" : "offline";
          if (resp.ok && p.kind === "ollama") {
            const j = await resp.json() as any;
            models = (j.models ?? []).map((m: any) => m.name as string);
          } else if (resp.ok) {
            const j = await resp.json() as any;
            models = (j.data ?? []).map((m: any) => m.id as string);
          }
        } catch {
          status = "offline";
        }
      } else {
        status = resolvedKey ? "configured" : "missing";
      }

      return {
        id: p.id, name: p.name, envKey: p.envKey, baseUrl: resolvedUrl,
        kind: p.kind, local: p.local, status, models,
        signupUrl: p.signupUrl,
        hasDbKey: !!dbSource?.apiKey,
        hasEnvKey: !!envKey,
      };
    }));

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/models/providers/refresh ────────────────────────────────────────
router.post("/providers/refresh", async (req, res) => {
  try {
    const { providerId } = req.body as { providerId: string };
    const p = PROVIDERS.find(x => x.id === providerId);
    if (!p) return res.status(404).json({ error: "Provider bulunamadı" });

    const cfg = await getDefaultConfig();
    const dbSources = (cfg.sources ?? []) as any[];
    const dbSource = dbSources.find((s: any) => s.type === providerId);
    const envKey = p.envKey ? process.env[p.envKey] : undefined;
    const resolvedKey = envKey || dbSource?.apiKey;
    const resolvedUrl = dbSource?.url || p.baseUrl;

    const models = await fetchModelsFromProvider(providerId, resolvedKey, resolvedUrl);

    // Save models to DB source if source exists
    if (dbSource && models.length > 0) {
      const updated = dbSources.map((s: any) =>
        s.type === providerId ? { ...s, models } : s
      );
      await db.update(modelConfigsTable).set({ sources: updated, updatedAt: new Date() })
        .where(eq(modelConfigsTable.id, cfg.id));
    }

    res.json({ ok: true, models, count: models.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/models/providers/save-key ──────────────────────────────────────
router.post("/providers/save-key", async (req, res) => {
  try {
    const { providerId, apiKey, baseUrl } = req.body as { providerId: string; apiKey: string; baseUrl?: string };
    const p = PROVIDERS.find(x => x.id === providerId);
    if (!p) return res.status(404).json({ error: "Provider bulunamadı" });

    const cfg = await getDefaultConfig();
    let sources = (cfg.sources ?? []) as any[];
    const existing = sources.find((s: any) => s.type === providerId);

    const models = await fetchModelsFromProvider(providerId, apiKey, baseUrl || p.baseUrl);

    if (existing) {
      sources = sources.map((s: any) =>
        s.type === providerId
          ? { ...s, apiKey, url: baseUrl || s.url, models: models.length ? models : (s.models ?? []) }
          : s
      );
    } else {
      sources.push({
        id: `src_${providerId}_${Date.now()}`,
        type: providerId,
        label: p.name,
        url: baseUrl || p.baseUrl,
        apiKey,
        isDefault: sources.length === 0,
        models,
      });
    }

    await db.update(modelConfigsTable).set({ sources, updatedAt: new Date() }).where(eq(modelConfigsTable.id, cfg.id));
    res.json({ ok: true, models, count: models.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/models/providers/set-default ────────────────────────────────────
router.post("/providers/set-default", async (req, res) => {
  try {
    const { providerId, model } = req.body as { providerId: string; model: string };
    const cfg = await getDefaultConfig();
    const sources = (cfg.sources ?? []) as any[];

    const updated = sources.map((s: any) => ({ ...s, isDefault: s.type === providerId }));
    await db.update(modelConfigsTable)
      .set({ sources: updated, globalModel: model || cfg.globalModel, updatedAt: new Date() })
      .where(eq(modelConfigsTable.id, cfg.id));

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Legacy endpoints (kept for backward compat) ────────────────────────────────
router.get("/config", async (_req, res) => {
  try { res.json(await getDefaultConfig()); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put("/config", async (req, res) => {
  try {
    const { mode, globalModel, agentOverrides, sources, name } = req.body as any;
    const cfg = await getDefaultConfig();
    const [updated] = await db.update(modelConfigsTable).set({
      ...(name !== undefined && { name }),
      ...(mode !== undefined && { mode }),
      ...(globalModel !== undefined && { globalModel }),
      ...(agentOverrides !== undefined && { agentOverrides }),
      ...(sources !== undefined && { sources }),
      updatedAt: new Date(),
    }).where(eq(modelConfigsTable.id, cfg.id)).returning();
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/test", async (req, res) => {
  try {
    const { type, url, apiKey } = req.body as { type: string; url?: string; apiKey?: string };
    const models = await fetchModelsFromProvider(type, apiKey, url);
    if (models.length > 0) {
      res.json({ ok: true, models, message: `Bağlantı başarılı — ${models.length} model` });
    } else {
      res.json({ ok: false, models: [], message: "Model listesi alınamadı" });
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
