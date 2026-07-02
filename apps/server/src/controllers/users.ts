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
  // Human-typeable temp password, shown once to the admin to hand off to the new user.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["ADMIN", "ATTORNEY", "PARALEGAL"]).default("PARALEGAL"),
});

export async function createUser(c: Context) {
  const body = await c.req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid request." } },
      400,
    );
  }

  const base = slugifyUsername(parsed.data.name);
  let username = base;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${base}${suffix}`;
    suffix += 1;
  }

  const tempPassword = randomTempPassword();
  const { hash, salt } = hashPassword(tempPassword);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      username,
      role: parsed.data.role,
      passwordHash: hash,
      passwordSalt: salt,
    },
  });

  // No email delivery configured yet — return the temp password once so the admin can hand it off.
  return c.json({ user: serializeUser(user), tempPassword }, 201);
}

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "ATTORNEY", "PARALEGAL"]).optional(),
  isActive: z.boolean().optional(),
});

export async function updateUser(c: Context) {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid update." } }, 400);
  }

  const user = await prisma.user.update({ where: { id }, data: parsed.data });
  return c.json({ user: serializeUser(user) });
}
