import { Router, type IRouter, type Request, type Response } from "express";
import { db, apiKeysTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): string | null {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Oturum acmaniz gerekiyor" });
    return null;
  }
  return req.user.id;
}

router.get("/keys", authMiddleware, async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const keys = await db
    .select({
      id: apiKeysTable.id,
      name: apiKeysTable.name,
      prefix: apiKeysTable.prefix,
      createdAt: apiKeysTable.createdAt,
      lastUsedAt: apiKeysTable.lastUsedAt,
    })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.userId, userId));

  res.json(keys);
});

router.post("/keys", authMiddleware, async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

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
    userId,
    name: name.trim(),
    key,
    prefix,
  });

  res.status(201).json({
    id,
    name: name.trim(),
    prefix,
    key,
    createdAt: new Date().toISOString(),
  });
});

router.delete(
  "/keys/:id",
  authMiddleware,
  async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { id } = req.params;
    const keyId = Array.isArray(id) ? id[0] : id;

    const deleted = await db
      .delete(apiKeysTable)
      .where(and(eq(apiKeysTable.id, keyId), eq(apiKeysTable.userId, userId)))
      .returning({ id: apiKeysTable.id });

    if (deleted.length === 0) {
      res.status(404).json({ error: "Anahtar bulunamadi" });
      return;
    }

    res.status(204).send();
  },
);

export default router;
