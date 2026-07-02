import prisma from "@CMLP/db";
import type { Context } from "hono";
import { z } from "zod";

import { buildStorageKey, getDownloadUrl, getUploadUrl, isR2Configured } from "@/lib/r2";

const TRASH_RETENTION_DAYS = 30;

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
  const caseId = c.req.query("caseId");
  const tagId = c.req.query("tagId");
  const status = c.req.query("status");
  const uploadedById = c.req.query("uploadedById");

  const documents = await prisma.document.findMany({
    where: {
      deletedAt: null,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      ...(clientId ? { clientId } : {}),
      ...(caseId ? { caseId } : {}),
      ...(status ? { status: status as never } : {}),
      ...(uploadedById ? { uploadedById } : {}),
      ...(tagId ? { tags: { some: { tagId } } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      case: { select: { id: true, title: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  return c.json({
    documents: documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      fileType: doc.fileType,
      status: doc.status,
      uploadedBy: doc.uploadedBy.name,
      uploadedById: doc.uploadedBy.id,
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
      folder: { select: { id: true, name: true } },
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

  const downloadUrl = doc.storageKey ? await getDownloadUrl(doc.storageKey) : null;

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
      folder: doc.folder,
      tags: doc.tags.map((t) => ({ id: t.tag.id, name: t.tag.name, colorClass: t.tag.colorClass })),
      hasStoredFile: Boolean(doc.storageKey),
      downloadUrl,
    },
  });
}

export async function getDocumentHistory(c: Context) {
  const id = c.req.param("id");

  const entries = await prisma.auditLogEntry.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true } } },
  });

  return c.json({
    entries: entries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      description: entry.targetLabel,
      actor: entry.actor?.name ?? "System",
      timestamp: entry.createdAt.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    })),
  });
}

const createDocumentSchema = z.object({
  name: z.string().min(1),
  fileType: z.string().min(1),
  clientId: z.string().min(1),
  caseId: z.string().optional(),
  folderId: z.string().optional(),
  contentType: z.string().optional(),
  sizeBytes: z.number().int().positive().optional(),
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

  const { contentType, sizeBytes, ...docFields } = parsed.data;
  const user = c.get("user");

  const doc = await prisma.document.create({
    data: {
      ...docFields,
      sizeBytes,
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

  // Real R2 upload path: reserve a storage key and hand back a presigned PUT URL the client
  // can push the actual file bytes to. Falls back to a metadata-only record (uploadUrl: null)
  // when R2 credentials aren't configured — see @/lib/r2.
  let uploadUrl: string | null = null;
  if (isR2Configured) {
    const storageKey = buildStorageKey(doc.clientId, doc.id, doc.name);
    await prisma.document.update({ where: { id: doc.id }, data: { storageKey } });
    uploadUrl = await getUploadUrl(storageKey, contentType);
  }

  return c.json({ document: doc, uploadUrl }, 201);
}

const updateDocumentSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["DRAFT", "UNDER_REVIEW", "FILED", "SIGNED", "EXECUTED"]).optional(),
  caseId: z.string().nullable().optional(),
  folderId: z.string().nullable().optional(),
});

export async function updateDocument(c: Context) {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updateDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid update." } }, 400);
  }

  const user = c.get("user");
  const before = await prisma.document.findUnique({ where: { id } });
  if (!before) {
    return c.json({ error: { code: "NOT_FOUND", message: "Document not found." } }, 404);
  }

  const doc = await prisma.document.update({ where: { id }, data: parsed.data });

  const moved = "caseId" in parsed.data || "folderId" in parsed.data;
  if (moved) {
    await prisma.auditLogEntry.create({
      data: { actorId: user.id, action: "MOVED", targetLabel: doc.name, documentId: doc.id, caseId: doc.caseId },
    });
  }

  return c.json({ document: doc });
}

export async function deleteDocument(c: Context) {
  const id = c.req.param("id");
  const user = c.get("user");

  const doc = await prisma.document.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: user.id },
  });

  await prisma.auditLogEntry.create({
    data: { actorId: user.id, action: "DELETED", targetLabel: doc.name, documentId: doc.id, caseId: doc.caseId },
  });

  return c.json({ document: doc });
}

export async function permanentlyDeleteDocument(c: Context) {
  const id = c.req.param("id");
  const doc = await prisma.document.findUnique({ where: { id } });

  if (!doc) {
    return c.json({ error: { code: "NOT_FOUND", message: "Document not found." } }, 404);
  }

  // Audit entries reference this document — clear the FK before the hard delete so the
  // firm-wide audit trail (which must survive purges) isn't cascaded away with it.
  await prisma.auditLogEntry.updateMany({ where: { documentId: id }, data: { documentId: null } });
  await prisma.documentTag.deleteMany({ where: { documentId: id } });
  await prisma.document.delete({ where: { id } });

  return c.json({ ok: true });
}

export async function listTrash(c: Context) {
  const documents = await prisma.document.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      case: { select: { id: true, title: true } },
      deletedBy: { select: { name: true } },
    },
  });

  return c.json({
    documents: documents.map((doc) => {
      const deletedAt = doc.deletedAt!;
      const daysElapsed = Math.floor((Date.now() - deletedAt.getTime()) / 86_400_000);
      return {
        id: doc.id,
        name: doc.name,
        client: doc.client,
        case: doc.case,
        deletedBy: doc.deletedBy?.name ?? "Unknown",
        deletedAt: deletedAt.toISOString(),
        purgesInDays: Math.max(0, TRASH_RETENTION_DAYS - daysElapsed),
      };
    }),
  });
}

export async function restoreDocument(c: Context) {
  const id = c.req.param("id");
  const user = c.get("user");

  const doc = await prisma.document.update({
    where: { id },
    data: { deletedAt: null, deletedById: null },
  });

  await prisma.auditLogEntry.create({
    data: { actorId: user.id, action: "RESTORED", targetLabel: doc.name, documentId: doc.id },
  });

  return c.json({ document: doc });
}

const addTagSchema = z.object({ tagId: z.string().min(1) });

export async function addDocumentTag(c: Context) {
  const documentId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = addTagSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "tagId is required." } }, 400);
  }

  await prisma.documentTag.upsert({
    where: { documentId_tagId: { documentId, tagId: parsed.data.tagId } },
    update: {},
    create: { documentId, tagId: parsed.data.tagId },
  });

  const tags = await prisma.documentTag.findMany({
    where: { documentId },
    include: { tag: true },
  });

  return c.json({ tags: tags.map((t) => ({ id: t.tag.id, name: t.tag.name, colorClass: t.tag.colorClass })) });
}

export async function removeDocumentTag(c: Context) {
  const documentId = c.req.param("id");
  const tagId = c.req.param("tagId");

  await prisma.documentTag.deleteMany({ where: { documentId, tagId } });

  const tags = await prisma.documentTag.findMany({
    where: { documentId },
    include: { tag: true },
  });

  return c.json({ tags: tags.map((t) => ({ id: t.tag.id, name: t.tag.name, colorClass: t.tag.colorClass })) });
}
