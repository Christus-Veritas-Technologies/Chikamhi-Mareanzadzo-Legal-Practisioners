import prisma from "@CMLP/db";
import { hashPassword } from "@CMLP/db/password";
import type { Context } from "hono";
import { z } from "zod";

import { paginationMeta, parsePagination } from "@/lib/pagination";
import { serializeUser } from "@/lib/serializers";

export async function listUsers(c: Context) {
  // Higher default than other list endpoints: /users also feeds "lead attorney" /
  // "attorney of record" dropdowns elsewhere that expect the full staff roster.
  const pagination = parsePagination(c, 100);
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      skip: pagination.offset,
      take: pagination.limit,
    }),
    prisma.user.count(),
  ]);
  return c.json({ users: users.map(serializeUser), pagination: paginationMeta(total, pagination) });
}

function slugifyUsername(name: string) {
  const parts = name.trim().toLowerCase().split(/\s+/);
  const last = parts.pop() ?? "user";
  const initial = parts[0]?.[0] ?? "u";
  return `${initial}.${last}`.replace(/[^a-z0-9.]/g, "");
}

function randomTempPassword() {
  // Human-typeable temp password, used only for the "reset password" flow (where there's no
  // way for the resetting attorney to know what the user will want) — new accounts get a real
  // password chosen up front, see createUser below.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1).optional(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["ATTORNEY", "PARALEGAL"]).default("PARALEGAL"),
});

// Creating a user (not "inviting" one — there's no pending/invite state) is attorney-only,
// and the creating attorney sets the real password directly. The new account is active
// immediately: they're a full part of the firm in the system the moment this returns.
export async function createUser(c: Context) {
  const body = await c.req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid request." } },
      400,
    );
  }

  const base = parsed.data.username?.trim().toLowerCase() || slugifyUsername(parsed.data.name);
  let username = base;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${base}${suffix}`;
    suffix += 1;
  }

  const { hash, salt } = hashPassword(parsed.data.password);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      username,
      role: parsed.data.role,
      passwordHash: hash,
      passwordSalt: salt,
      isActive: true,
    },
  });

  return c.json({ user: serializeUser(user) }, 201);
}

export async function resetUserPassword(c: Context) {
  const id = c.req.param("id");
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return c.json({ error: { code: "NOT_FOUND", message: "User not found." } }, 404);
  }

  const tempPassword = randomTempPassword();
  const { hash, salt } = hashPassword(tempPassword);
  const user = await prisma.user.update({
    where: { id },
    data: { passwordHash: hash, passwordSalt: salt },
  });

  // No email delivery configured yet — return the temp password once so the admin can hand
  // it off directly. The user should be told to change it after signing in.
  return c.json({ user: serializeUser(user), tempPassword });
}

const updateUserSchema = z.object({
  role: z.enum(["ATTORNEY", "PARALEGAL"]).optional(),
  isActive: z.boolean().optional(),
});

export async function updateUser(c: Context) {
  const id = c.req.param("id");
  const actor = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid update." } }, 400);
  }

  // Attorneys can't suspend/reactivate each other — including themselves. This is what
  // caused the "Account not found or disabled" lockout bug: an attorney disabled their own
  // account and immediately got signed out with no way back in without direct DB access.
  if (parsed.data.isActive !== undefined) {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return c.json({ error: { code: "NOT_FOUND", message: "User not found." } }, 404);
    }
    if (target.role === "ATTORNEY" && actor.role === "ATTORNEY") {
      return c.json(
        {
          error: {
            code: "FORBIDDEN",
            message:
              target.id === actor.id
                ? "You can't suspend your own account."
                : "Attorneys can't suspend or reactivate other attorneys.",
          },
        },
        403,
      );
    }
  }

  const user = await prisma.user.update({ where: { id }, data: parsed.data });
  return c.json({ user: serializeUser(user) });
}
