import type { Context } from "hono";

export function signOutController(c: Context) {
  // Stateless JWTs — nothing to invalidate server-side yet. Client discards the token/cookie.
  return c.json({ ok: true });
}
