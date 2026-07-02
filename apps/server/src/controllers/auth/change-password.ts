import prisma from "@CMLP/db";
import { hashPassword, verifyPassword } from "@CMLP/db/password";
import type { Context } from "hono";
import { z } from "zod";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
});

export async function changePasswordController(c: Context) {
  const authed = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid request." } },
      400,
    );
  }

  const user = await prisma.user.findUnique({ where: { id: authed.id } });
  if (!user) {
    return c.json({ error: { code: "NOT_FOUND", message: "Account not found." } }, 404);
  }

  const isValid = verifyPassword(parsed.data.currentPassword, user.passwordHash, user.passwordSalt);
  if (!isValid) {
    return c.json({ error: { code: "INVALID_CREDENTIALS", message: "Current password is incorrect." } }, 401);
  }

  const { hash, salt } = hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash, passwordSalt: salt } });

  return c.json({ ok: true });
}
