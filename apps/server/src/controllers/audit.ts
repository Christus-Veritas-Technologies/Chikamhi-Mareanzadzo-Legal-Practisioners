import prisma from "@CMLP/db";
import type { Context } from "hono";

import { paginationMeta, parsePagination } from "@/lib/pagination";

export async function listAuditLog(c: Context) {
  const actorId = c.req.query("actorId");
  const action = c.req.query("action");
  const clientId = c.req.query("clientId");
  const caseId = c.req.query("caseId");
  // Higher max than other endpoints: the web/native filter dropdowns request a large
  // one-off page to enumerate all actors/actions without needing real pagination there.
  const pagination = parsePagination(c, 50, 500);

  const where = {
    ...(actorId ? { actorId } : {}),
    ...(action ? { action: action as never } : {}),
    ...(caseId ? { caseId } : {}),
    // No direct clientId column on AuditLogEntry — reach it via the linked case or document.
    ...(clientId ? { OR: [{ case: { clientId } }, { document: { clientId } }] } : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.auditLogEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pagination.offset,
      take: pagination.limit,
      include: { actor: { select: { id: true, name: true } } },
    }),
    prisma.auditLogEntry.count({ where }),
  ]);

  return c.json({
    entries: entries.map((entry) => ({
      id: entry.id,
      actorId: entry.actor?.id ?? null,
      actor: entry.actor?.name ?? "System",
      isSystem: !entry.actor,
      action: entry.action,
      target: entry.targetLabel,
      sourceIp: entry.sourceIp ?? "—",
      timestamp: entry.createdAt.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    })),
    pagination: paginationMeta(total, pagination),
  });
}
