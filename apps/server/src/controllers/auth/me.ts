import prisma from "@CMLP/db";
import type { Context } from "hono";

import { serializeProfile } from "@/lib/serializers";

export async function meController(c: Context) {
  const authed = c.get("user");
  const user = await prisma.user.findUnique({ where: { id: authed.id } });

  if (!user) {
    return c.json({ error: { code: "NOT_FOUND", message: "Account not found." } }, 404);
  }

  return c.json({ user: await serializeProfile(user) });
}
