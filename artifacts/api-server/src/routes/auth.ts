import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth, clerkClient } from "@clerk/express";

const router: IRouter = Router();

router.get("/auth/user", async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.json({ user: null });
    return;
  }
  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    res.json({
      user: {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? null,
        firstName: clerkUser.firstName ?? null,
        lastName: clerkUser.lastName ?? null,
        profileImageUrl: clerkUser.imageUrl ?? null,
      },
    });
  } catch {
    res.json({ user: null });
  }
});

export default router;
