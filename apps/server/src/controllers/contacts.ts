import prisma from "@CMLP/db";
import type { Context } from "hono";
import { z } from "zod";

export async function listClientContacts(c: Context) {
  const clientId = c.req.param("id");

  const contacts = await prisma.contact.findMany({
    where: { clientId },
    orderBy: { createdAt: "asc" },
  });

  return c.json({ contacts });
}

const createContactSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

export async function createClientContact(c: Context) {
  const clientId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = createContactSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid request." } },
      400,
    );
  }

  const contact = await prisma.contact.create({
    data: {
      clientId,
      name: parsed.data.name,
      role: parsed.data.role,
      email: parsed.data.email || undefined,
      phone: parsed.data.phone,
    },
  });

  return c.json({ contact }, 201);
}

export async function deleteClientContact(c: Context) {
  const contactId = c.req.param("contactId");
  await prisma.contact.delete({ where: { id: contactId } });
  return c.json({ ok: true });
}
