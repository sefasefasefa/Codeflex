import { Router, type IRouter, type Request, type Response } from "express";
import * as oidc from "openid-client";
import {
  getOidcConfig,
  createSession,
  clearSession,
  getSessionId,
} from "../lib/auth.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/auth/user", authMiddleware, (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.json({ user: null });
    return;
  }
  res.json({ user: req.user });
});

function getPublicBaseUrl(req: Request): string {
  const replitDomain = process.env.REPLIT_DOMAINS ?? process.env.REPLIT_DEV_DOMAIN;
  if (replitDomain) {
    return `https://${replitDomain.split(",")[0].trim()}`;
  }
  const proto = req.headers["x-forwarded-proto"] ?? req.protocol;
  const host = req.headers["x-forwarded-host"] ?? req.get("host");
  return `${proto}://${host}`;
}

router.get("/login", async (req: Request, res: Response) => {
  try {
    const returnTo = (req.query.returnTo as string) ?? "/";
    const config = await getOidcConfig();
    const redirectUri = `${getPublicBaseUrl(req)}/api/callback`;
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const state = oidc.randomState();

    const authUrl = new URL(config.serverMetadata().authorization_endpoint!);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid profile email");
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", state);

    res.cookie("cv", codeVerifier, { httpOnly: true, sameSite: "lax", path: "/" });
    res.cookie("st", state, { httpOnly: true, sameSite: "lax", path: "/" });
    res.cookie("rt", returnTo, { httpOnly: true, sameSite: "lax", path: "/" });

    res.redirect(authUrl.toString());
  } catch (err) {
    console.error("Login error", err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/callback", async (req: Request, res: Response) => {
  try {
    const config = await getOidcConfig();
    const codeVerifier = req.cookies?.cv as string | undefined;
    const expectedState = req.cookies?.st as string | undefined;
    const returnTo = (req.cookies?.rt as string | undefined) ?? "/";

    if (!codeVerifier) {
      res.status(400).send("Missing code verifier");
      return;
    }

    const redirectUri = `${getPublicBaseUrl(req)}/api/callback`;
    const currentUrl = new URL(
      req.url,
      getPublicBaseUrl(req),
    );

    const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedState,
      redirectUri,
    });

    const claims = tokens.claims();
    if (!claims) {
      res.status(400).send("No claims in token");
      return;
    }

    const userId = String(claims.sub);
    const email = typeof claims.email === "string" ? claims.email : null;
    const firstName =
      typeof claims.given_name === "string"
        ? claims.given_name
        : typeof claims.first_name === "string"
          ? claims.first_name
          : null;
    const lastName =
      typeof claims.family_name === "string"
        ? claims.family_name
        : typeof claims.last_name === "string"
          ? claims.last_name
          : null;
    const profileImageUrl =
      typeof claims.profile_image_url === "string"
        ? claims.profile_image_url
        : null;

    await db
      .insert(usersTable)
      .values({ id: userId, email, firstName, lastName, profileImageUrl })
      .onConflictDoUpdate({
        target: usersTable.id,
        set: { email, firstName, lastName, profileImageUrl },
      });

    const now = Math.floor(Date.now() / 1000);
    const sid = await createSession({
      user: { id: userId, email, firstName, lastName, profileImageUrl },
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : undefined,
    });

    res.clearCookie("cv", { path: "/" });
    res.clearCookie("st", { path: "/" });
    res.clearCookie("rt", { path: "/" });

    res.cookie("sid", sid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(returnTo);
  } catch (err) {
    console.error("Callback error", err);
    res.status(500).json({ error: "Authentication callback failed" });
  }
});

router.get("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.redirect("/");
});

export default router;
