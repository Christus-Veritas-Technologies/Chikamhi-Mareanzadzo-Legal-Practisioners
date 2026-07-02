import prisma from "@CMLP/db";
import type { Context } from "hono";
import { z } from "zod";

import { paginationMeta, parsePagination } from "@/lib/pagination";

function serialize(d: {
  id: string;
  title: string;
  dueAt: Date;
  notes: string | null;
  completedAt: Date | null;
  caseId: string;
  createdBy: { id: string; name: string };
  case?: { id: string; title: string };
}) {
  return {
    id: d.id,
    title: d.title,
    dueAt: d.dueAt.toISOString(),
    notes: d.notes,
    completedAt: d.completedAt?.toISOString() ?? null,
    caseId: d.caseId,
    createdBy: d.createdBy,
    case: d.case ?? null,
  };
}

// Lists deadlines either scoped to one case (?caseId=) or firm-wide (used for a dashboard
// "upcoming" widget). ?upcoming=true filters to incomplete deadlines due from now onward,
// soonest first — otherwise defaults to newest-created first.
export async function listDeadlines(c: Context) {
  const caseId = c.req.query("caseId");
  const upcoming = c.req.query("upcoming") === "true";
  const pagination = parsePagination(c);

  const where = {
    ...(caseId ? { caseId } : {}),
    ...(upcoming ? { completedAt: null, dueAt: { gte: new Date() } } : {}),
  };

  const [deadlines, total] = await Promise.all([
    prisma.deadline.findMany({
      where,
      orderBy: upcoming ? { dueAt: "asc" } : { createdAt: "desc" },
      skip: pagination.offset,
      take: pagination.limit,
      include: {
        createdBy: { select: { id: true, name: true } },
        case: { select: { id: true, title: true } },
      },
    }),
    prisma.deadline.count({ where }),
  ]);

  return c.json({
    deadlines: deadlines.map(serialize),
    pagination: paginationMeta(total, pagination),
  });
}

const createDeadlineSchema = z.object({
  caseId: z.string().min(1),
  title: z.string().min(1),
  dueAt: z.coerce.date(),
  notes: z.string().optional(),
});

export async function createDeadline(c: Context) {
  const body = await c.req.json().catch(() => null);
  const parsed = createDeadlineSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid request." } },
      400,
    );
  }

  const user = c.get("user");
  const matter = await prisma.case.findUnique({
    where: { id: parsed.data.caseId },
    select: { title: true, leadAttorneyId: true },
  });
  if (!matter) {
    return c.json({ error: { code: "NOT_FOUND", message: "Case not found." } }, 404);
  }

  const deadline = await prisma.deadline.create({
    data: { ...parsed.data, createdById: user.id },
    include: {
      createdBy: { select: { id: true, name: true } },
      case: { select: { id: true, title: true } },
    },
  });

  if (matter.leadAttorneyId && matter.leadAttorneyId !== user.id) {
    await prisma.notification.create({
      data: {
        userId: matter.leadAttorneyId,
        type: "DEADLINE_SET",
        title: "New deadline set",
        body: `${user.name} set a deadline "${deadline.title}" on ${matter.title}, due ${deadline.dueAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`,
        caseId: deadline.caseId,
      },
    });
  }

  return c.json({ deadline: serialize(deadline) }, 201);
}

const updateDeadlineSchema = z.object({
  title: z.string().min(1).optional(),
  dueAt: z.coerce.date().optional(),
  notes: z.string().nullable().optional(),
  completed: z.boolean().optional(),
});

export async function updateDeadline(c: Context) {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updateDeadlineSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid update." } }, 400);
  }

  const { completed, ...rest } = parsed.data;
  const deadline = await prisma.deadline.update({
    where: { id },
    data: {
      ...rest,
      ...(completed !== undefined ? { completedAt: completed ? new Date() : null } : {}),
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      case: { select: { id: true, title: true } },
    },
  });

  return c.json({ deadline: serialize(deadline) });
}

export async function deleteDeadline(c: Context) {
  const id = c.req.param("id");
  await prisma.deadline.delete({ where: { id } });
  return c.json({ ok: true });
}
