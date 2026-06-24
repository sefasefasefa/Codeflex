import { Router } from "express";
import { db } from "@workspace/db";
import { agentsTable, conversationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateAgentBody, UpdateAgentBody, GetAgentParams, UpdateAgentParams, DeleteAgentParams } from "@workspace/api-zod";
import { generateId } from "../lib/id.js";
import { broadcast } from "../lib/broadcast.js";
import { agentChat, type LLMMessage } from "../lib/llm.js";

const router = Router();

function agentView(a: typeof agentsTable.$inferSelect) {
  return {
    id: a.id, key: a.key, role: a.role, modelName: a.modelName,
    temperature: a.temperature, description: a.description,
    maxRetries: a.maxRetries, createdAt: a.createdAt.toISOString(),
  };
}

router.get("/", async (_req, res) => {
  const agents = await db.select().from(agentsTable).orderBy(agentsTable.createdAt);
  res.json(agents.map(agentView));
});

router.post("/", async (req, res) => {
  const body = CreateAgentBody.parse(req.body);
  const id = generateId("agent");
  const [agent] = await db.insert(agentsTable).values({ id, ...body }).returning();
  broadcast("agent_created", { agentId: agent.id, key: agent.key });
  res.status(201).json(agentView(agent));
});

router.get("/:agentId", async (req, res) => {
  const { agentId } = GetAgentParams.parse(req.params);
  const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, agentId));
  if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }
  res.json(agentView(agent));
});

router.put("/:agentId", async (req, res) => {
  const { agentId } = UpdateAgentParams.parse(req.params);
  const body = UpdateAgentBody.parse(req.body);
  const [agent] = await db.update(agentsTable).set(body).where(eq(agentsTable.id, agentId)).returning();
  if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }
  broadcast("agent_updated", { agentId: agent.id, key: agent.key });
  res.json(agentView(agent));
});

router.delete("/:agentId", async (req, res) => {
  const { agentId } = DeleteAgentParams.parse(req.params);
  await db.delete(agentsTable).where(eq(agentsTable.id, agentId));
  res.status(204).send();
});

// ── Agent Chat endpoint ────────────────────────────────────────────────────────
// GET /api/agents/:key/conversations — ajan sohbet geçmişi
router.get("/:key/conversations", async (req, res) => {
  try {
    const key = req.params.key;
    const convs = await db.select({
      id: conversationsTable.id,
      title: conversationsTable.title,
      updatedAt: conversationsTable.updatedAt,
      createdAt: conversationsTable.createdAt,
    }).from(conversationsTable)
      .where(eq(conversationsTable.title, `agent:${key}:*` as any))
      .orderBy(desc(conversationsTable.updatedAt))
      .limit(50);

    // Başlık prefix'i ile filtrele (LIKE sorgusu yerine JS filter)
    const filtered = await db.select({
      id: conversationsTable.id,
      title: conversationsTable.title,
      updatedAt: conversationsTable.updatedAt,
      createdAt: conversationsTable.createdAt,
      messages: conversationsTable.messages,
    }).from(conversationsTable).orderBy(desc(conversationsTable.updatedAt));

    const agentConvs = filtered.filter(c => c.title.startsWith(`agent:${key}:`));
    res.json(agentConvs.map(c => ({
      id: c.id,
      title: c.title.replace(`agent:${key}:`, "") || "Sohbet",
      updatedAt: c.updatedAt,
      messageCount: (c.messages as any[]).length,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agents/:key/conversations/:convId — tek sohbet
router.get("/:key/conversations/:convId", async (req, res) => {
  try {
    const [conv] = await db.select().from(conversationsTable)
      .where(eq(conversationsTable.id, req.params.convId));
    if (!conv) { res.status(404).json({ error: "Sohbet bulunamadı" }); return; }
    res.json(conv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agents/:key/chat — mesaj gönder (oturum bazlı)
router.post("/:key/chat", async (req, res) => {
  try {
    const agentKey = req.params.key;
    const { message, conversationId, context } = req.body as {
      message: string;
      conversationId?: string;
      context?: string;
    };

    if (!message?.trim()) { res.status(400).json({ error: "message gerekli" }); return; }

    // Ajanı bul
    const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.key, agentKey));
    if (!agent) { res.status(404).json({ error: `Ajan bulunamadı: ${agentKey}` }); return; }

    // Konuşmayı bul veya oluştur
    let conv: typeof conversationsTable.$inferSelect;
    if (conversationId) {
      const [found] = await db.select().from(conversationsTable)
        .where(eq(conversationsTable.id, conversationId));
      if (!found) { res.status(404).json({ error: "Sohbet bulunamadı" }); return; }
      conv = found;
    } else {
      const id = generateId("conv");
      const title = `agent:${agentKey}:${message.slice(0, 50)}`;
      const [created] = await db.insert(conversationsTable).values({
        id, title, messages: [], model: agent.modelName ?? undefined,
      }).returning();
      conv = created;
    }

    // Mesaj geçmişi
    const history = (conv.messages ?? []) as Array<{ role: string; content: string; ts: string }>;
    const llmMessages: LLMMessage[] = history
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
    llmMessages.push({ role: "user", content: message });

    // LLM çağrısı
    const result = await agentChat(
      { key: agent.key, role: agent.role, description: agent.description, modelName: agent.modelName },
      llmMessages,
      { context }
    );

    // Geçmişe kaydet
    const now = new Date().toISOString();
    history.push({ role: "user", content: message, ts: now });
    history.push({ role: "assistant", content: result.content, ts: now });
    await db.update(conversationsTable).set({
      messages: history as any, updatedAt: new Date(),
    }).where(eq(conversationsTable.id, conv.id));

    res.json({
      conversationId: conv.id,
      agentKey,
      model: result.model,
      source: result.source,
      content: result.content,
      files: result.files,
      history: history.slice(-20),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
