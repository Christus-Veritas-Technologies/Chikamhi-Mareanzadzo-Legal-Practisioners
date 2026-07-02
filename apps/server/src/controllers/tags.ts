import prisma from "@CMLP/db";
import type { Context } from "hono";
import { z } from "zod";

export async function listTags(c: Context) {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { documents: true } } },
  });

  return c.json({
    tags: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      colorClass: tag.colorClass,
      documentCount: tag._count.documents,
    })),
  });
}

const createTagSchema = z.object({
  name: z.string().min(1),
  colorClass: z.string().optional(),
});

export async function createTag(c: Context) {
  const body = await c.req.json().catch(() => null);
  const parsed = createTagSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Tag name is required." } }, 400);
  }

  const tag = await prisma.tag.create({
    data: { name: parsed.data.name, colorClass: parsed.data.colorClass ?? "bg-muted-foreground" },
  });
  return c.json({ tag }, 201);
}

const updateTagSchema = z.object({
  name: z.string().min(1).optional(),
  colorClass: z.string().optional(),
});

export async function updateTag(c: Context) {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updateTagSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid update." } }, 400);
  }

  const tag = await prisma.tag.update({ where: { id }, data: parsed.data });
  return c.json({ tag });
}
