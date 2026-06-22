import { Router } from "express";
import { db } from "@workspace/db";
import { modelConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function getDefaultConfig() {
  const [cfg] = await db.select().from(modelConfigsTable).where(eq(modelConfigsTable.isDefault, true)).limit(1);
  if (cfg) return cfg;
  const [first] = await db.select().from(modelConfigsTable).limit(1);
  if (first) return first;

  const [created] = await db.insert(modelConfigsTable).values({
    id: genId("mcfg"),
    name: "default",
    mode: "global",
    globalModel: "qwen2.5-coder:7b",
    agentOverrides: {},
    sources: [
      {
        id: "src_local",
        type: "ollama",
        label: "Yerel Ollama",
        url: "http://localhost:11434",
        isDefault: true,
        models: [],
      },
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
      mode?: string;
      globalModel?: string;
      agentOverrides?: Record<string, string>;
      sources?: any[];
      name?: string;
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

router.get("/available", async (req, res) => {
  try {
    const cfg = await getDefaultConfig();
    const sourceUrl = (req.query.sourceUrl as string | undefined) || null;
    const results: Array<{ sourceId: string; label: string; url: string; models: string[]; ok: boolean; error?: string }> = [];

    const ollamaSources = (cfg.sources as any[]).filter((s: any) => s.type === "ollama");
    if (sourceUrl) {
      ollamaSources.push({ id: "custom_test", type: "ollama", label: "Custom", url: sourceUrl, isDefault: false });
    }

    for (const src of ollamaSources) {
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
    }

    const openaiSources = (cfg.sources as any[]).filter((s: any) => s.type === "openai");
    for (const src of openaiSources) {
      results.push({
        sourceId: src.id, label: src.label, url: src.url, ok: true,
        models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
      });
    }

    const anthropicSources = (cfg.sources as any[]).filter((s: any) => s.type === "anthropic");
    for (const src of anthropicSources) {
      results.push({
        sourceId: src.id, label: src.label, url: src.url, ok: true,
        models: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-3-5"],
      });
    }

    res.json({ sources: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/test", async (req, res) => {
  try {
    const { type, url, apiKey } = req.body as { type: string; url: string; apiKey?: string };
    if (!url) return res.status(400).json({ error: "url gerekli" });

    if (type === "ollama") {
      const cleanUrl = url.replace(/\/$/, "");
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 6000);
        const resp = await fetch(`${cleanUrl}/api/tags`, { signal: controller.signal });
        clearTimeout(tid);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json() as any;
        const models: string[] = (json.models ?? []).map((m: any) => m.name as string);
        return res.json({ ok: true, models, message: `Bağlantı başarılı — ${models.length} model bulundu` });
      } catch (err: any) {
        return res.json({ ok: false, models: [], message: `Bağlantı hatası: ${err.message}` });
      }
    }

    if (type === "openai") {
      if (!apiKey) return res.json({ ok: false, message: "OpenAI API key gerekli" });
      try {
        const resp = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return res.json({ ok: true, message: "OpenAI API key geçerli" });
      } catch (err: any) {
        return res.json({ ok: false, message: `OpenAI bağlantı hatası: ${err.message}` });
      }
    }

    if (type === "anthropic") {
      return res.json({ ok: true, message: "Anthropic yapılandırması kaydedildi (canlı test için API key gerekli)" });
    }

    return res.status(400).json({ error: "Geçersiz type. ollama | openai | anthropic | custom" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
