import prisma from "@CMLP/db";
import type { Context } from "hono";
import { z } from "zod";

import { paginationMeta, parsePagination } from "@/lib/pagination";
import { purgesInDays } from "@/lib/trash";

function relativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export async function listCases(c: Context) {
  const status = c.req.query("status");
  const clientId = c.req.query("clientId");

  const cases = await prisma.case.findMany({
    where: {
      deletedAt: null,
      ...(status ? { status: status as never } : {}),
      ...(clientId ? { clientId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      _count: { select: { documents: { where: { deletedAt: null } } } },
    },
  });

  return c.json({
    cases: cases.map((matter) => ({
      id: matter.id,
      caseNumber: matter.caseNumber,
      title: matter.title,
      status: matter.status,
      matterType: matter.matterType,
      location: matter.location,
      documentCount: matter._count.documents,
      updated: relativeTime(matter.updatedAt),
      client: matter.client,
    })),
  });
}

export async function getCase(c: Context) {
  const id = c.req.param("id");

  const matter = await prisma.case.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      leadAttorney: { select: { name: true } },
      documents: { orderBy: { updatedAt: "desc" }, where: { deletedAt: null } },
      auditEntries: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { actor: { select: { name: true } } },
      },
    },
  });

  if (!matter) {
    return c.json({ error: { code: "NOT_FOUND", message: "Case not found." } }, 404);
  }

  return c.json({
    case: {
      id: matter.id,
      caseNumber: matter.caseNumber,
      title: matter.title,
      status: matter.status,
      matterType: matter.matterType,
      location: matter.location,
      registry: matter.registry,
      leadAttorneyId: matter.leadAttorneyId,
      leadAttorney: matter.leadAttorney?.name ?? "Unassigned",
      opened: matter.openedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      client: matter.client,
      documentCount: matter.documents.length,
      documents: matter.documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        status: doc.status,
        modified: relativeTime(doc.updatedAt),
      })),
      timeline: matter.auditEntries.map((entry) => ({
        id: entry.id,
        description: entry.targetLabel,
        actor: entry.actor?.name ?? "System",
        timestamp: entry.createdAt.toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
      })),
    },
  });
}

async function generateCaseNumber() {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const candidate = `CASE-${year}-${suffix}`;
    const existing = await prisma.case.findUnique({ where: { caseNumber: candidate } });
    if (!existing) return candidate;
  }
  return `CASE-${year}-${Date.now()}`;
}

const createCaseSchema = z.object({
  title: z.string().min(1),
  clientId: z.string().min(1),
  matterType: z.string().min(1),
  location: z.string().optional(),
  leadAttorneyId: z.string().optional(),
  registry: z.string().optional(),
});

export async function createCase(c: Context) {
  const body = await c.req.json().catch(() => null);
  const parsed = createCaseSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid request." } },
      400,
    );
  }

  const user = c.get("user");
  const caseNumber = await generateCaseNumber();

  const matter = await prisma.case.create({
    data: { ...parsed.data, caseNumber },
  });

  await prisma.auditLogEntry.create({
    data: { actorId: user.id, action: "CASE_OPENED", targetLabel: matter.title, caseId: matter.id },
  });

  return c.json({ case: matter }, 201);
}

const updateCaseSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "UNDER_REVIEW", "CLOSED"]).optional(),
  matterType: z.string().min(1).optional(),
  location: z.string().optional(),
  leadAttorneyId: z.string().optional(),
  registry: z.string().optional(),
});

export async function updateCase(c: Context) {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updateCaseSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid request." } },
      400,
    );
  }

  const user = c.get("user");
  const before = await prisma.case.findUnique({ where: { id }, select: { status: true, leadAttorneyId: true } });

  const wasClosing = parsed.data.status === "CLOSED";
  const matter = await prisma.case.update({
    where: { id },
    data: { ...parsed.data, ...(wasClosing ? { closedAt: new Date() } : {}) },
  });

  // Notify the lead attorney whenever someone else changes the case's status.
  const statusChanged = parsed.data.status && before && parsed.data.status !== before.status;
  if (statusChanged && matter.leadAttorneyId && matter.leadAttorneyId !== user.id) {
    await prisma.notification.create({
      data: {
        userId: matter.leadAttorneyId,
        type: "CASE_STATUS_CHANGE",
        title: "Case status changed",
        body: `${matter.title} moved to ${matter.status.replace("_", " ").toLowerCase()}.`,
        caseId: matter.id,
      },
    });
  }

  return c.json({ case: matter });
}

const deleteCaseSchema = z.object({ deleteDocuments: z.boolean().default(false) });

export async function deleteCase(c: Context) {
  const id = c.req.param("id");
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const parsed = deleteCaseSchema.safeParse(body ?? {});
  const deleteDocuments = parsed.success ? parsed.data.deleteDocuments : false;

  const matter = await prisma.case.findUnique({ where: { id } });
  if (!matter) {
    return c.json({ error: { code: "NOT_FOUND", message: "Case not found." } }, 404);
  }

  if (deleteDocuments) {
    await prisma.document.updateMany({
      where: { caseId: id, deletedAt: null },
      data: { deletedAt: new Date(), deletedById: user.id },
    });
  } else {
    // Keep the documents — just detach them from the (now-deleted) case.
    await prisma.document.updateMany({ where: { caseId: id }, data: { caseId: null } });
  }

  const updated = await prisma.case.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: user.id },
  });

  return c.json({ case: updated });
}

export async function listCaseTrash(c: Context) {
  const pagination = parsePagination(c);
  const where = { deletedAt: { not: null } };

  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where,
      orderBy: { deletedAt: "desc" },
      skip: pagination.offset,
      take: pagination.limit,
      include: {
        client: { select: { id: true, name: true } },
        deletedBy: { select: { name: true } },
        _count: { select: { documents: true } },
      },
    }),
    prisma.case.count({ where }),
  ]);

  return c.json({
    cases: cases.map((matter) => ({
      id: matter.id,
      caseNumber: matter.caseNumber,
      title: matter.title,
      client: matter.client,
      documentCount: matter._count.documents,
      deletedBy: matter.deletedBy?.name ?? "Unknown",
      deletedAt: matter.deletedAt!.toISOString(),
      purgesInDays: purgesInDays(matter.deletedAt!),
    })),
    pagination: paginationMeta(total, pagination),
  });
}

export async function restoreCase(c: Context) {
  const id = c.req.param("id");
  const matter = await prisma.case.update({ where: { id }, data: { deletedAt: null, deletedById: null } });
  return c.json({ case: matter });
}

export async function permanentlyDeleteCase(c: Context) {
  const id = c.req.param("id");
  const matter = await prisma.case.findUnique({ where: { id } });
  if (!matter) {
    return c.json({ error: { code: "NOT_FOUND", message: "Case not found." } }, 404);
  }

  await prisma.auditLogEntry.updateMany({ where: { caseId: id }, data: { caseId: null } });
  await prisma.notification.updateMany({ where: { caseId: id }, data: { caseId: null } });
  await prisma.document.updateMany({ where: { caseId: id }, data: { caseId: null } });
  await prisma.deadline.deleteMany({ where: { caseId: id } });
  await prisma.case.delete({ where: { id } });

  return c.json({ ok: true });
}
