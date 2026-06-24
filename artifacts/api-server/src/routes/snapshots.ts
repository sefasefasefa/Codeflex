import { Router } from "express";
import { db } from "@workspace/db";
import { snapshotsTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateSnapshotBody, GetSnapshotParams, DeleteSnapshotParams, RollbackSnapshotParams } from "@workspace/api-zod";
import { generateId } from "../lib/id.js";
import { broadcast } from "../lib/broadcast.js";

const router = Router();

function snapshotToJson(s: typeof snapshotsTable.$inferSelect) {
  return {
    id: s.id, projectName: s.projectName, label: s.label,
    checkpointId: s.checkpointId, sizeBytes: s.sizeBytes,
    runId: s.runId ?? null, agentKey: s.agentKey ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/", async (_req, res) => {
  const snapshots = await db.select().from(snapshotsTable).orderBy(snapshotsTable.createdAt);
  res.json(snapshots.map(snapshotToJson));
});

router.post("/", async (req, res) => {
  const body = CreateSnapshotBody.parse(req.body);
  const id = generateId("snap");
  const checkpointId = `manual_${Date.now()}`;
  const [snap] = await db.insert(snapshotsTable).values({
    id, projectName: body.projectName, label: body.label,
    checkpointId, sizeBytes: Math.floor(Math.random() * 1024 * 1024 * 5),
  }).returning();
  const actId = generateId("act");
  await db.insert(activityTable).values({
    id: actId, type: "snapshot_created", message: `Snapshot "${body.label}" created`,
    entityId: snap.id, entityType: "snapshot",
  });
  broadcast("snapshot_created", snapshotToJson(snap));
  res.status(201).json(snapshotToJson(snap));
});

router.get("/:snapshotId", async (req, res) => {
  const { snapshotId } = GetSnapshotParams.parse(req.params);
  const [snap] = await db.select().from(snapshotsTable).where(eq(snapshotsTable.id, snapshotId));
  if (!snap) { res.status(404).json({ error: "Snapshot not found" }); return; }
  res.json(snapshotToJson(snap));
});

router.delete("/:snapshotId", async (req, res) => {
  const { snapshotId } = DeleteSnapshotParams.parse(req.params);
  await db.delete(snapshotsTable).where(eq(snapshotsTable.id, snapshotId));
  res.status(204).send();
});

router.post("/:snapshotId/rollback", async (req, res) => {
  const { snapshotId } = RollbackSnapshotParams.parse(req.params);
  const [snap] = await db.select().from(snapshotsTable).where(eq(snapshotsTable.id, snapshotId));
  if (!snap) { res.status(404).json({ error: "Snapshot not found" }); return; }
  const actId = generateId("act");
  await db.insert(activityTable).values({
    id: actId, type: "snapshot_rolled_back",
    message: `Rolled back to snapshot "${snap.label}" (${snap.checkpointId})`,
    entityId: snap.id, entityType: "snapshot",
  });
  broadcast("snapshot_rolled_back", snapshotToJson(snap));
  res.json(snapshotToJson(snap));
});

export default router;
