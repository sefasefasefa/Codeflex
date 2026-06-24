import { Router, type IRouter, type Request, type Response } from "express";
import { db, apiKeysTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Oturum acmaniz gerekiyor" });
    return false;
  }
  return true;
}

router.get("/keys", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const keys = await db
    .select({
      id: apiKeysTable.id,
      name: apiKeysTable.name,
      prefix: apiKeysTable.prefix,
      createdAt: apiKeysTable.createdAt,
      lastUsedAt: apiKeysTable.lastUsedAt,
    })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.userId, req.user!.id));

  res.json(keys);
});

router.post("/keys", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { name } = req.body as { name?: string };
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Anahtar adi gereklidir" });
    return;
  }

  const rawKey = randomBytes(32).toString("hex");
  const key = `sk-${rawKey}`;
  const prefix = `sk-${rawKey.slice(0, 8)}`;
  const id = randomBytes(12).toString("hex");

  await db.insert(apiKeysTable).values({
    id,
    userId: req.user!.id,
    name: name.trim(),
    key,
    prefix,
  });

  res.status(201).json({ id, name: name.trim(), prefix, key, createdAt: new Date().toISOString() });
});

router.delete("/keys/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { id } = req.params;

  const deleted = await db
    .delete(apiKeysTable)
    .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.userId, req.user!.id)))
    .returning({ id: apiKeysTable.id });

  if (deleted.length === 0) {
    res.status(404).json({ error: "Anahtar bulunamadi" });
    return;
  }

  res.status(204).send();
});

export default router;
