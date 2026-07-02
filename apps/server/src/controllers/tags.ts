import prisma from "@CMLP/db";
import type { Context } from "hono";
import { z } from "zod";

import { paginationMeta, parsePagination } from "@/lib/pagination";
import { purgesInDays } from "@/lib/trash";

export async function listTags(c: Context) {
  const tags = await prisma.tag.findMany({
    where: { deletedAt: null },
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

  // Same revive-on-recreate behavior as folders — Tag.name is globally unique even for
  // soft-deleted rows.
  const existing = await prisma.tag.findUnique({ where: { name: parsed.data.name } });
  if (existing && !existing.deletedAt) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "A tag with this name already exists." } }, 400);
  }

  const tag = existing
    ? await prisma.tag.update({
        where: { id: existing.id },
        data: { deletedAt: null, deletedById: null, colorClass: parsed.data.colorClass ?? existing.colorClass },
      })
    : await prisma.tag.create({
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

export async function deleteTag(c: Context) {
  const id = c.req.param("id");
  const user = c.get("user");

  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) {
    return c.json({ error: { code: "NOT_FOUND", message: "Tag not found." } }, 404);
  }

  const updated = await prisma.tag.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: user.id },
  });

  return c.json({ tag: updated });
}

export async function listTagTrash(c: Context) {
  const pagination = parsePagination(c);
  const where = { deletedAt: { not: null } };

  const [tags, total] = await Promise.all([
    prisma.tag.findMany({
      where,
      orderBy: { deletedAt: "desc" },
      skip: pagination.offset,
      take: pagination.limit,
      include: { deletedBy: { select: { name: true } } },
    }),
    prisma.tag.count({ where }),
  ]);

  return c.json({
    tags: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      colorClass: tag.colorClass,
      deletedBy: tag.deletedBy?.name ?? "Unknown",
      deletedAt: tag.deletedAt!.toISOString(),
      purgesInDays: purgesInDays(tag.deletedAt!),
    })),
    pagination: paginationMeta(total, pagination),
  });
}

export async function restoreTag(c: Context) {
  const id = c.req.param("id");
  const tag = await prisma.tag.update({ where: { id }, data: { deletedAt: null, deletedById: null } });
  return c.json({ tag });
}

export async function permanentlyDeleteTag(c: Context) {
  const id = c.req.param("id");
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) {
    return c.json({ error: { code: "NOT_FOUND", message: "Tag not found." } }, 404);
  }

  await prisma.documentTag.deleteMany({ where: { tagId: id } });
  await prisma.folderTag.deleteMany({ where: { tagId: id } });
  await prisma.tag.delete({ where: { id } });

  return c.json({ ok: true });
}
