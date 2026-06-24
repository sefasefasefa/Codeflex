import { Router, type Request, type Response } from "express";
import { db, userActivityLogsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.get(
  "/user-activity",
  authMiddleware,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const userId = req.user.id;
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const logs = await db
      .select()
      .from(userActivityLogsTable)
      .where(eq(userActivityLogsTable.clerkUserId, userId))
      .orderBy(desc(userActivityLogsTable.createdAt))
      .limit(limit);

    res.json(logs);
  },
);

router.post(
  "/user-activity",
  authMiddleware,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const userId = req.user.id;

    const { eventType } = req.body as { eventType: string };
    if (!eventType) {
      res.status(400).json({ error: "eventType is required" });
      return;
    }

    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      null;

    const userAgent = (req.headers["user-agent"] as string) || null;

    const [log] = await db
      .insert(userActivityLogsTable)
      .values({ clerkUserId: userId, eventType, ipAddress, userAgent })
      .returning();

    res.status(201).json(log);
  },
);

export default router;
