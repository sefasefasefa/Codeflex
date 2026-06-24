import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, projectsTable, projectFilesTable } from "@workspace/db";
import type { ChatMessage } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { generateId } from "../lib/id.js";
import { broadcast } from "../lib/broadcast.js";
import { chat as llmChat, writeFilesToDisk } from "../lib/llm.js";

const router = Router();
const WORKSPACE_ROOT = process.env["WORKSPACE_ROOT"] ?? "/tmp/swarm_workspace";

router.get("/", async (_req, res) => {
  const convs = await db.select({
    id: conversationsTable.id,
    title: conversationsTable.title,
    projectId: conversationsTable.projectId,
    model: conversationsTable.model,
    createdAt: conversationsTable.createdAt,
    updatedAt: conversationsTable.updatedAt,
  }).from(conversationsTable).orderBy(desc(conversationsTable.updatedAt)).limit(50);
  res.json(convs.map(c => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })));
});

router.post("/", async (req, res) => {
  const { title = "Yeni Sohbet", projectId, model } = req.body as { title?: string; projectId?: string; model?: string };
  const id = generateId("conv");
  const [conv] = await db.insert(conversationsTable).values({ id, title, projectId, model, messages: [] }).returning();
  res.status(201).json({ ...conv, createdAt: conv.createdAt.toISOString(), updatedAt: conv.updatedAt.toISOString() });
});

router.get("/:id", async (req, res) => {
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, req.params.id));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  res.json({ ...conv, createdAt: conv.createdAt.toISOString(), updatedAt: conv.updatedAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  await db.delete(conversationsTable).where(eq(conversationsTable.id, req.params.id));
  res.status(204).send();
});

router.patch("/:id", async (req, res) => {
  const { title } = req.body as { title: string };
  const [updated] = await db.update(conversationsTable)
    .set({ title, updatedAt: new Date() })
    .where(eq(conversationsTable.id, req.params.id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.post("/:id/message", async (req, res) => {
  const { content, projectId: reqProjectId } = req.body as { content: string; projectId?: string };
  if (!content?.trim()) { res.status(400).json({ error: "content is required" }); return; }

  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, req.params.id));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  const messages = (conv.messages ?? []) as ChatMessage[];
  const userMsg: ChatMessage = { role: "user", content: content.trim(), ts: new Date().toISOString() };
  messages.push(userMsg);

  let projectContext = "";
  const pid = reqProjectId || conv.projectId;
  if (pid) {
    const [proj] = await db.select().from(projectsTable).where(eq(projectsTable.id, pid));
    if (proj) {
      const mem = proj.memory as any;
      const files = await db.select({ path: projectFilesTable.path, agentKey: projectFilesTable.agentKey })
        .from(projectFilesTable).where(eq(projectFilesTable.projectId, pid)).limit(20);
      projectContext = [
        `Proje: ${proj.name} (${proj.status})`,
        `Stack: ${proj.stack ?? "belirtilmedi"}`,
        `Açıklama: ${proj.description}`,
        mem.summary ? `Bellek özeti: ${mem.summary}` : "",
        files.length > 0 ? `Mevcut dosyalar: ${files.map(f => f.path).join(", ")}` : "",
      ].filter(Boolean).join("\n");
    }
  }

  const llmMessages = messages
    .filter(m => m.role !== "system")
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  const result = await llmChat(llmMessages, { context: projectContext });

  const assistantMsg: ChatMessage = {
    role: "assistant",
    content: result.content,
    ts: new Date().toISOString(),
    files: result.files.length > 0 ? result.files.map(f => ({ path: f.path, content: f.content, language: f.language })) : undefined,
  };
  messages.push(assistantMsg);

  const titleNeedsUpdate = conv.title === "Yeni Sohbet" && messages.length <= 3;
  const newTitle = titleNeedsUpdate
    ? content.slice(0, 60) + (content.length > 60 ? "…" : "")
    : conv.title;

  await db.update(conversationsTable).set({
    messages: messages as any,
    title: newTitle,
    model: result.model,
    updatedAt: new Date(),
    ...(pid && !conv.projectId ? { projectId: pid } : {}),
  }).where(eq(conversationsTable.id, conv.id));

  let writtenPaths: string[] = [];
  if (result.files.length > 0) {
    const projName = pid
      ? (await db.select({ name: projectsTable.name }).from(projectsTable).where(eq(projectsTable.id, pid)).limit(1))[0]?.name
      : undefined;
    writtenPaths = writeFilesToDisk(result.files, WORKSPACE_ROOT, projName);

    if (pid) {
      for (const f of result.files) {
        await db.insert(projectFilesTable).values({
          id: generateId("pf"),
          projectId: pid,
          runId: conv.id,
          agentKey: "chat_assistant",
          path: f.path,
          content: f.content,
          language: f.language,
          operation: "create",
          version: 1,
          sizeBytes: f.content.length,
        });
      }
    }

    broadcast("chat_file_written", { conversationId: conv.id, files: result.files.map(f => f.path) });
  }

  res.json({
    message: {
      role: assistantMsg.role,
      content: assistantMsg.content,
      ts: assistantMsg.ts,
      files: assistantMsg.files ?? [],
    },
    model: result.model,
    source: result.source,
    filesWritten: writtenPaths,
    title: newTitle,
  });
});

export default router;
