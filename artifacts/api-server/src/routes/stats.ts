import { Router } from "express";
import { db } from "@workspace/db";
import { agentsTable, runsTable, runLogsTable, snapshotsTable, activityTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { ListActivityQueryParams } from "@workspace/api-zod";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/stats", async (_req, res) => {
  const [agentCount] = await db.select({ count: sql<number>`count(*)::int` }).from(agentsTable);
  const allRuns = await db.select({ status: runsTable.status }).from(runsTable);
  const activeRuns = allRuns.filter(r => r.status === "running").length;
  const completedRuns = allRuns.filter(r => r.status === "completed").length;
  const failedRuns = allRuns.filter(r => r.status === "failed").length;
  const [snapCount] = await db.select({ count: sql<number>`count(*)::int` }).from(snapshotsTable);
  const [logCount] = await db.select({ count: sql<number>`count(*)::int` }).from(runLogsTable);
  res.json({
    totalAgents: agentCount?.count ?? 0,
    activeRuns,
    completedRuns,
    failedRuns,
    totalSnapshots: snapCount?.count ?? 0,
    totalLogs: logCount?.count ?? 0,
    recentThroughput: completedRuns + activeRuns * 0.5,
  });
});

router.get("/activity", async (req, res) => {
  const query = ListActivityQueryParams.parse(req.query);
  const limit = query.limit ?? 20;
  const entries = await db.select().from(activityTable).orderBy(desc(activityTable.createdAt)).limit(limit);
  res.json(entries.map(a => ({
    id: a.id, type: a.type, message: a.message,
    entityId: a.entityId, entityType: a.entityType,
    createdAt: a.createdAt.toISOString(),
  })));
});

export default router;
