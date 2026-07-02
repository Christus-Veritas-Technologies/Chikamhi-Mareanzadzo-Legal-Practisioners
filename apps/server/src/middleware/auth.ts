import prisma from "@CMLP/db";
import type { Context, Next } from "hono";

import { verifyAuthToken } from "@/lib/jwt";

export type AuthedUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  isActive: boolean;
};

declare module "hono" {
  interface ContextVariableMap {
    user: AuthedUser;
  }
}

function unauthorized(c: Context, message = "Not authenticated.") {
  return c.json({ error: { code: "UNAUTHORIZED", message } }, 401);
}

export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    return unauthorized(c);
  }

  try {
    const payload = await verifyAuthToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || !user.isActive) {
      return unauthorized(c, "Account not found or disabled.");
    }

    c.set("user", {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
    });

    await next();
  } catch {
    return unauthorized(c, "Session expired or invalid — please sign in again.");
  }
}

// Role gate — chain after requireAuth on any route that should be restricted to specific
// roles (e.g. .use("*", requireAuth, requireRole("ADMIN"))). Client-side nav hiding is
// cosmetic only; this is what actually stops a non-admin from calling the endpoint directly.
export function requireRole(...roles: string[]) {
  return async function (c: Context, next: Next) {
    const user = c.get("user");
    if (!user || !roles.includes(user.role)) {
      return c.json(
        { error: { code: "FORBIDDEN", message: "You don't have permission to do this." } },
        403,
      );
    }
    await next();
  };
}
