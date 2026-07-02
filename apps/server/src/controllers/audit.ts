import prisma from "@CMLP/db";
import type { Context } from "hono";

export async function listAuditLog(c: Context) {
  const actorId = c.req.query("actorId");
  const action = c.req.query("action");
  const clientId = c.req.query("clientId");
  const caseId = c.req.query("caseId");

  const entries = await prisma.auditLogEntry.findMany({
    where: {
      ...(actorId ? { actorId } : {}),
      ...(action ? { action: action as never } : {}),
      ...(caseId ? { caseId } : {}),
      // No direct clientId column on AuditLogEntry — reach it via the linked case or document.
      ...(clientId ? { OR: [{ case: { clientId } }, { document: { clientId } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { id: true, name: true } } },
  });

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
  });
}
