import prisma from "@CMLP/db";
import type { Context } from "hono";
import { z } from "zod";

function relativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export async function listDocuments(c: Context) {
  const search = c.req.query("q");
  const clientId = c.req.query("clientId");
  const status = c.req.query("status");

  const documents = await prisma.document.findMany({
    where: {
      deletedAt: null,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      ...(clientId ? { clientId } : {}),
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      case: { select: { id: true, title: true } },
      uploadedBy: { select: { name: true } },
    },
  });

  return c.json({
    documents: documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      fileType: doc.fileType,
      status: doc.status,
      uploadedBy: doc.uploadedBy.name,
      modified: relativeTime(doc.updatedAt),
      client: doc.client,
      case: doc.case,
    })),
  });
}

export async function getDocument(c: Context) {
  const id = c.req.param("id");

  const doc = await prisma.document.findFirst({
    where: { id, deletedAt: null },
    include: {
      client: { select: { id: true, name: true } },
      case: { select: { id: true, title: true } },
      uploadedBy: { select: { name: true } },
      tags: { include: { tag: true } },
    },
  });

  if (!doc) {
    return c.json({ error: { code: "NOT_FOUND", message: "Document not found." } }, 404);
  }

  await prisma.auditLogEntry.create({
    data: {
      actorId: c.get("user")?.id,
      action: "VIEWED",
      targetLabel: doc.name,
      documentId: doc.id,
      caseId: doc.caseId,
    },
  });

  return c.json({
    document: {
      id: doc.id,
      name: doc.name,
      fileType: doc.fileType,
      status: doc.status,
      uploadedBy: doc.uploadedBy.name,
      modified: relativeTime(doc.updatedAt),
      client: doc.client,
      case: doc.case,
      tags: doc.tags.map((t) => ({ id: t.tag.id, name: t.tag.name, colorClass: t.tag.colorClass })),
    },
  });
}

const createDocumentSchema = z.object({
  name: z.string().min(1),
  fileType: z.string().min(1),
  clientId: z.string().min(1),
  caseId: z.string().optional(),
  folderId: z.string().optional(),
});

export async function createDocument(c: Context) {
  const body = await c.req.json().catch(() => null);
  const parsed = createDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid request." } },
      400,
    );
  }

  const user = c.get("user");
  const doc = await prisma.document.create({
    data: {
      ...parsed.data,
      status: "DRAFT",
      uploadedById: user.id,
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      actorId: user.id,
      action: "UPLOADED",
      targetLabel: doc.name,
      documentId: doc.id,
      caseId: doc.caseId,
    },
  });

  return c.json({ document: doc }, 201);
}

export async function deleteDocument(c: Context) {
  const id = c.req.param("id");
  const user = c.get("user");

  const doc = await prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });

  await prisma.auditLogEntry.create({
    data: { actorId: user.id, action: "DELETED", targetLabel: doc.name, documentId: doc.id, caseId: doc.caseId },
  });

  return c.json({ document: doc });
}

export async function listTrash(c: Context) {
  const documents = await prisma.document.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
  });

  return c.json({
    documents: documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      deletedAt: doc.deletedAt?.toISOString(),
    })),
  });
}

export async function restoreDocument(c: Context) {
  const id = c.req.param("id");
  const user = c.get("user");

  const doc = await prisma.document.update({ where: { id }, data: { deletedAt: null } });

  await prisma.auditLogEntry.create({
    data: { actorId: user.id, action: "RESTORED", targetLabel: doc.name, documentId: doc.id },
  });

  return c.json({ document: doc });
}
