import prisma from "@CMLP/db";
import type { Context } from "hono";
import { z } from "zod";

import { paginationMeta, parsePagination } from "@/lib/pagination";
import { purgesInDays } from "@/lib/trash";

export async function listFolders(c: Context) {
  const folders = await prisma.folder.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { documents: { where: { deletedAt: null } } } },
      tags: { include: { tag: true } },
    },
  });

  return c.json({
    folders: folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      documentCount: folder._count.documents,
      tags: folder.tags.map((ft) => ({ id: ft.tag.id, name: ft.tag.name, colorClass: ft.tag.colorClass })),
    })),
  });
}

export async function getFolder(c: Context) {
  const id = c.req.param("id");

  const folder = await prisma.folder.findFirst({
    where: { id, deletedAt: null },
    include: {
      tags: { include: { tag: true } },
      documents: {
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        include: {
          client: { select: { id: true, name: true } },
          case: { select: { id: true, title: true } },
        },
      },
    },
  });

  if (!folder) {
    return c.json({ error: { code: "NOT_FOUND", message: "Folder not found." } }, 404);
  }

  return c.json({
    folder: {
      id: folder.id,
      name: folder.name,
      createdAt: folder.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      tags: folder.tags.map((ft) => ({ id: ft.tag.id, name: ft.tag.name, colorClass: ft.tag.colorClass })),
      documents: folder.documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        status: doc.status,
        modified: doc.updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        client: doc.client,
        case: doc.case,
      })),
    },
  });
}

const createFolderSchema = z.object({
  name: z.string().min(1),
  tagIds: z.array(z.string().min(1)).optional(),
});

export async function createFolder(c: Context) {
  const body = await c.req.json().catch(() => null);
  const parsed = createFolderSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Folder name is required." } }, 400);
  }

  const { name, tagIds } = parsed.data;

  // Folder.name is globally unique, including soft-deleted rows — if a folder with this name
  // was previously deleted, reviving it (rather than erroring "name taken") is the more
  // useful behavior for a user who just re-creates something they trashed.
  const existing = await prisma.folder.findUnique({ where: { name } });
  if (existing && !existing.deletedAt) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "A folder with this name already exists." } }, 400);
  }

  const folder = existing
    ? await prisma.folder.update({ where: { id: existing.id }, data: { deletedAt: null, deletedById: null } })
    : await prisma.folder.create({ data: { name } });

  if (tagIds) {
    await prisma.folderTag.deleteMany({ where: { folderId: folder.id } });
    if (tagIds.length > 0) {
      await prisma.folderTag.createMany({
        data: tagIds.map((tagId) => ({ folderId: folder.id, tagId })),
        skipDuplicates: true,
      });
    }
  }

  const tags = await prisma.folderTag.findMany({ where: { folderId: folder.id }, include: { tag: true } });

  return c.json(
    {
      folder: {
        id: folder.id,
        name: folder.name,
        documentCount: 0,
        tags: tags.map((ft) => ({ id: ft.tag.id, name: ft.tag.name, colorClass: ft.tag.colorClass })),
      },
    },
    201,
  );
}

const updateFolderSchema = z.object({
  name: z.string().min(1).optional(),
  tagIds: z.array(z.string().min(1)).optional(),
});

export async function updateFolder(c: Context) {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updateFolderSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid update." } }, 400);
  }

  const { tagIds, ...rest } = parsed.data;

  const folder = await prisma.folder.update({ where: { id }, data: rest });

  if (tagIds) {
    await prisma.folderTag.deleteMany({ where: { folderId: id } });
    if (tagIds.length > 0) {
      await prisma.folderTag.createMany({
        data: tagIds.map((tagId) => ({ folderId: id, tagId })),
        skipDuplicates: true,
      });
    }
  }

  const tags = await prisma.folderTag.findMany({ where: { folderId: id }, include: { tag: true } });

  return c.json({
    folder: { ...folder, tags: tags.map((ft) => ({ id: ft.tag.id, name: ft.tag.name, colorClass: ft.tag.colorClass })) },
  });
}

const deleteFolderSchema = z.object({ deleteDocuments: z.boolean().default(false) });

export async function deleteFolder(c: Context) {
  const id = c.req.param("id");
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const parsed = deleteFolderSchema.safeParse(body ?? {});
  const deleteDocuments = parsed.success ? parsed.data.deleteDocuments : false;

  const folder = await prisma.folder.findUnique({ where: { id } });
  if (!folder) {
    return c.json({ error: { code: "NOT_FOUND", message: "Folder not found." } }, 404);
  }

  if (deleteDocuments) {
    await prisma.document.updateMany({
      where: { folderId: id, deletedAt: null },
      data: { deletedAt: new Date(), deletedById: user.id },
    });
  } else {
    // Keep the files — just uncategorize them so they don't silently vanish from the
    // library because their folder is gone.
    await prisma.document.updateMany({ where: { folderId: id }, data: { folderId: null } });
  }

  const updated = await prisma.folder.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: user.id },
  });

  return c.json({ folder: updated });
}

export async function listFolderTrash(c: Context) {
  const pagination = parsePagination(c);
  const where = { deletedAt: { not: null } };

  const [folders, total] = await Promise.all([
    prisma.folder.findMany({
      where,
      orderBy: { deletedAt: "desc" },
      skip: pagination.offset,
      take: pagination.limit,
      include: { deletedBy: { select: { name: true } }, _count: { select: { documents: true } } },
    }),
    prisma.folder.count({ where }),
  ]);

  return c.json({
    folders: folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      documentCount: folder._count.documents,
      deletedBy: folder.deletedBy?.name ?? "Unknown",
      deletedAt: folder.deletedAt!.toISOString(),
      purgesInDays: purgesInDays(folder.deletedAt!),
    })),
    pagination: paginationMeta(total, pagination),
  });
}

export async function restoreFolder(c: Context) {
  const id = c.req.param("id");
  const folder = await prisma.folder.update({ where: { id }, data: { deletedAt: null, deletedById: null } });
  return c.json({ folder });
}

export async function permanentlyDeleteFolder(c: Context) {
  const id = c.req.param("id");
  const folder = await prisma.folder.findUnique({ where: { id } });
  if (!folder) {
    return c.json({ error: { code: "NOT_FOUND", message: "Folder not found." } }, 404);
  }

  await prisma.document.updateMany({ where: { folderId: id }, data: { folderId: null } });
  await prisma.folderTag.deleteMany({ where: { folderId: id } });
  await prisma.folder.delete({ where: { id } });

  return c.json({ ok: true });
}
