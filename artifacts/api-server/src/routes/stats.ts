import { Router } from "express";
import { db } from "@workspace/db";
import { activityTable, projectsTable, projectFilesTable, conversationsTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";

const router = Router();

router.get("/stats", async (_req, res) => {
  const [projCount] = await db.select({ count: sql<number>`cast(count(*) as integer)` }).from(projectsTable);
  const [fileCount] = await db.select({ count: sql<number>`cast(count(*) as integer)` }).from(projectFilesTable);
  const [convCount] = await db.select({ count: sql<number>`cast(count(*) as integer)` }).from(conversationsTable);
  res.json({
    totalProjects: projCount?.count ?? 0,
    totalFiles: fileCount?.count ?? 0,
    totalConversations: convCount?.count ?? 0,
  });
});

router.get("/activity", async (req, res) => {
  const limit = Number(req.query.limit ?? 20);
  const entries = await db.select().from(activityTable).orderBy(desc(activityTable.createdAt)).limit(limit);
  res.json(entries.map(a => ({
    id: a.id, type: a.type, message: a.message,
    entityId: a.entityId, entityType: a.entityType,
    createdAt: a.createdAt.toISOString(),
  })));
});

export default router;
