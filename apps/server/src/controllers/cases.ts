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

export async function listCases(c: Context) {
  const status = c.req.query("status");
  const clientId = c.req.query("clientId");

  const cases = await prisma.case.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(clientId ? { clientId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      _count: { select: { documents: true } },
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

  const wasClosing = parsed.data.status === "CLOSED";
  const matter = await prisma.case.update({
    where: { id },
    data: { ...parsed.data, ...(wasClosing ? { closedAt: new Date() } : {}) },
  });

  return c.json({ case: matter });
}
