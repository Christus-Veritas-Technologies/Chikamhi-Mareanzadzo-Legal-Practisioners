import prisma from "@CMLP/db";
import { verifyPassword } from "@CMLP/db/password";
import type { Context } from "hono";
import { z } from "zod";

import { createAuthToken } from "@/lib/jwt";

const signInSchema = z.object({
  username: z.string().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});

export async function signInController(c: Context) {
  const body = await c.req.json().catch(() => null);
  const parsed = signInSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "Invalid request.",
        },
      },
      400,
    );
  }

  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { username: username.trim().toLowerCase() },
  });

  // Same generic message whether the username doesn't exist or the password is wrong —
  // don't leak which one it was.
  const invalidCredentials = () =>
    c.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Incorrect username or password." } },
      401,
    );

  if (!user) {
    return invalidCredentials();
  }

  const isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
  if (!isValid) {
    return invalidCredentials();
  }

  if (!user.isActive) {
    return c.json(
      {
        error: {
          code: "ACCOUNT_DISABLED",
          message: "This account has been suspended. Contact your admin.",
        },
      },
      403,
    );
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });

  const token = await createAuthToken(user.id, user.role);

  return c.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
    },
  });
}
