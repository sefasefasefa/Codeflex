import { Router } from "express";
import { db } from "@workspace/db";
import { runsTable, runLogsTable, activityTable, agentsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { CreateRunBody, ListRunsQueryParams, GetRunParams, CancelRunParams } from "@workspace/api-zod";
import { generateId } from "../lib/id.js";
import { broadcast } from "../lib/broadcast.js";

const router = Router();

function runToJson(r: typeof runsTable.$inferSelect) {
  return {
    id: r.id, projectName: r.projectName, prompt: r.prompt,
    status: r.status, agentKeys: r.agentKeys as string[],
    parallelCount: r.parallelCount, snapshotId: r.snapshotId ?? null,
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}

function logToJson(l: typeof runLogsTable.$inferSelect) {
  return {
    id: l.id, runId: l.runId, agentKey: l.agentKey, level: l.level,
    message: l.message, thinkTrace: l.thinkTrace ?? null,
    createdAt: l.createdAt.toISOString(),
  };
}

async function addLog(runId: string, agentKey: string, level: string, message: string, thinkTrace?: string) {
  const id = generateId("log");
  const [log] = await db.insert(runLogsTable).values({ id, runId, agentKey, level, message, thinkTrace }).returning();
  broadcast("run_log", logToJson(log));
  return log;
}

async function simulateAgentRun(runId: string, agentKeys: string[], prompt: string, ollamaUrl?: string | null) {
  const simulatedMessages: Record<string, string[][]> = {
    default: [
      ["info", "Initializing agent session..."],
      ["think", "Analyzing the prompt and determining optimal approach"],
      ["info", "Connecting to LLM endpoint"],
      ["think", "Breaking down task into sub-components: schema design, API layer, frontend hooks"],
      ["info", "Generating code structure..."],
      ["output", "```typescript\n// Generated code block\nexport const handler = async (req, res) => {\n  const data = await processRequest(req);\n  res.json(data);\n};\n```"],
      ["info", "Running self-test validation"],
      ["warn", "Minor type mismatch detected in response shape — correcting"],
      ["info", "Applying correction patch"],
      ["output", "Agent task completed successfully. 3 files modified, 0 errors."],
    ],
  };

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  for (const agentKey of agentKeys) {
    const messages = simulatedMessages.default;
    for (const [level, msg] of messages) {
      await delay(300 + Math.random() * 700);
      const thinkTrace = level === "think" ? msg : undefined;
      const displayMsg = level === "think" ? `[Reasoning] ${msg}` : msg;
      await addLog(runId, agentKey, level, displayMsg, thinkTrace);
      const [run] = await db.select().from(runsTable).where(eq(runsTable.id, runId));
      if (run?.status === "cancelled") return;
    }
    await addLog(runId, agentKey, "info", `Agent "${agentKey}" pipeline complete`);
  }

  await db.update(runsTable).set({ status: "completed", completedAt: new Date() }).where(eq(runsTable.id, runId));
  const [run] = await db.select().from(runsTable).where(eq(runsTable.id, runId));
  if (run) {
    broadcast("run_completed", runToJson(run));
    const actId = generateId("act");
    await db.insert(activityTable).values({
      id: actId, type: "run_completed",
      message: `Run "${run.projectName}" completed (${agentKeys.length} agents)`,
      entityId: run.id, entityType: "run",
    });
  }
}

router.get("/", async (req, res) => {
  const query = ListRunsQueryParams.parse(req.query);
  let q = db.select().from(runsTable).orderBy(desc(runsTable.createdAt));
  const runs = await q;
  const filtered = query.status ? runs.filter(r => r.status === query.status) : runs;
  const limited = query.limit ? filtered.slice(0, query.limit) : filtered;
  res.json(limited.map(runToJson));
});

router.post("/", async (req, res) => {
  const body = CreateRunBody.parse(req.body);
  const id = generateId("run");
  const parallelCount = body.parallelCount ?? Math.min(body.agentKeys.length, 10);
  const [run] = await db.insert(runsTable).values({
    id, projectName: body.projectName, prompt: body.prompt,
    agentKeys: body.agentKeys, parallelCount,
    ollamaUrl: body.ollamaUrl, status: "running",
  }).returning();
  const actId = generateId("act");
  await db.insert(activityTable).values({
    id: actId, type: "run_started",
    message: `Run "${body.projectName}" started with ${body.agentKeys.length} agents`,
    entityId: run.id, entityType: "run",
  });
  broadcast("run_started", runToJson(run));
  simulateAgentRun(run.id, body.agentKeys, body.prompt, body.ollamaUrl).catch(() => {
    db.update(runsTable).set({ status: "failed", completedAt: new Date() }).where(eq(runsTable.id, run.id));
  });
  res.status(201).json(runToJson(run));
});

router.get("/:runId", async (req, res) => {
  const { runId } = GetRunParams.parse(req.params);
  const [run] = await db.select().from(runsTable).where(eq(runsTable.id, runId));
  if (!run) return res.status(404).json({ error: "Run not found" });
  const logs = await db.select().from(runLogsTable).where(eq(runLogsTable.runId, runId)).orderBy(runLogsTable.createdAt);
  res.json({ ...runToJson(run), logs: logs.map(logToJson) });
});

router.delete("/:runId", async (req, res) => {
  const { runId } = CancelRunParams.parse(req.params);
  const [run] = await db.update(runsTable)
    .set({ status: "cancelled", completedAt: new Date() })
    .where(and(eq(runsTable.id, runId)))
    .returning();
  if (!run) return res.status(404).json({ error: "Run not found" });
  broadcast("run_cancelled", runToJson(run));
  res.json(runToJson(run));
});

export default router;
