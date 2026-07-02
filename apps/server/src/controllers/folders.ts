import prisma from "@CMLP/db";
import type { Context } from "hono";
import { z } from "zod";

export async function listFolders(c: Context) {
  const folders = await prisma.folder.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { documents: true } } },
  });

  return c.json({
    folders: folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      documentCount: folder._count.documents,
    })),
  });
}

const createFolderSchema = z.object({ name: z.string().min(1) });

export async function createFolder(c: Context) {
  const body = await c.req.json().catch(() => null);
  const parsed = createFolderSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Folder name is required." } }, 400);
  }

  const folder = await prisma.folder.create({ data: { name: parsed.data.name } });
  return c.json({ folder }, 201);
}
