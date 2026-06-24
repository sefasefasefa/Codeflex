---
name: AuthUser circular import fix
description: Where AuthUser is defined and how auth.ts/authMiddleware.ts import each other without circular deps
---

AuthUser is defined locally in `artifacts/api-server/src/middlewares/authMiddleware.ts` as a `Pick<DbUser, ...>` from `@workspace/db`.

`lib/auth.ts` imports `AuthUser` from `../middlewares/authMiddleware.js` — NOT from `@workspace/api-zod` (that package never exported AuthUser).

**Why:** `@workspace/api-zod` is auto-generated from the OpenAPI spec and does not contain DB-derived user types. The DB `User` type lives in `@workspace/db`.

**How to apply:** If you ever regenerate api-zod, do not expect AuthUser to be there. The source of truth is `authMiddleware.ts`.
