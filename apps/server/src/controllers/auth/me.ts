import type { Context } from "hono";

export function meController(c: Context) {
  return c.json({ user: c.get("user") });
}
