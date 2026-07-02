import prisma from "@CMLP/db";
import type { Context } from "hono";
import { z } from "zod";

import { serializeProfile } from "@/lib/serializers";

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export async function updateProfileController(c: Context) {
  const authed = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid request." } },
      400,
    );
  }

  const user = await prisma.user.update({ where: { id: authed.id }, data: parsed.data });
  return c.json({ user: await serializeProfile(user) });
}
