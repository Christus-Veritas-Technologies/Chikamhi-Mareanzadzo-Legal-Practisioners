import prisma from "@CMLP/db";
import type { Context } from "hono";
import { z } from "zod";

import { paginationMeta, parsePagination } from "@/lib/pagination";
import { purgesInDays } from "@/lib/trash";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 GB";
  const gb = bytes / 1024 ** 3;
  return `${gb.toFixed(1)} GB`;
}

export async function listClients(c: Context) {
  const search = c.req.query("q");
  // Higher default than other list endpoints: /clients also feeds filter dropdowns
  // elsewhere in the app that expect the (realistically small) full client roster.
  const pagination = parsePagination(c, 100);
  const where = {
    deletedAt: null,
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [clients, total, storageByClient] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: pagination.offset,
      take: pagination.limit,
      include: {
        attorneyOfRecord: { select: { name: true } },
        _count: { select: { cases: { where: { deletedAt: null } }, documents: { where: { deletedAt: null } } } },
      },
    }),
    prisma.client.count({ where }),
    prisma.document.groupBy({
      by: ["clientId"],
      _sum: { sizeBytes: true },
    }),
  ]);

  const storageMap = new Map(storageByClient.map((row) => [row.clientId, row._sum.sizeBytes ?? 0]));

  return c.json({
    clients: clients.map((client) => ({
      id: client.id,
      name: client.name,
      type: client.type,
      regNumber: client.regNumber,
      attorneyOfRecord: client.attorneyOfRecord?.name ?? "Unassigned",
      clientSince: client.clientSince.getFullYear().toString(),
      openCases: client._count.cases,
      documents: client._count.documents,
      storage: formatBytes(storageMap.get(client.id) ?? 0),
      updatedAt: client.updatedAt.toISOString(),
    })),
    pagination: paginationMeta(total, pagination),
  });
}

export async function getClient(c: Context) {
  const id = c.req.param("id");

  const [client, storageAgg] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: {
        attorneyOfRecord: { select: { name: true } },
        cases: { where: { deletedAt: null }, orderBy: { updatedAt: "desc" } },
        _count: { select: { documents: { where: { deletedAt: null } } } },
      },
    }),
    prisma.document.aggregate({ where: { clientId: id, deletedAt: null }, _sum: { sizeBytes: true } }),
  ]);

  if (!client) {
    return c.json({ error: { code: "NOT_FOUND", message: "Client not found." } }, 404);
  }

  return c.json({
    client: {
      id: client.id,
      name: client.name,
      type: client.type,
      regNumber: client.regNumber,
      attorneyOfRecordId: client.attorneyOfRecordId,
      attorneyOfRecord: client.attorneyOfRecord?.name ?? "Unassigned",
      clientSince: client.clientSince.getFullYear().toString(),
      documents: client._count.documents,
      storage: formatBytes(storageAgg._sum.sizeBytes ?? 0),
      caseCount: client.cases.length,
      cases: client.cases.map((caseRecord) => ({
        id: caseRecord.id,
        caseNumber: caseRecord.caseNumber,
        title: caseRecord.title,
        status: caseRecord.status,
        matterType: caseRecord.matterType,
        location: caseRecord.location,
        updatedAt: caseRecord.updatedAt.toISOString(),
      })),
    },
  });
}

const createClientSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["CORPORATE", "DECEASED_ESTATE", "FAMILY", "GOVERNMENT"]),
  regNumber: z.string().optional(),
  attorneyOfRecordId: z.string().optional(),
});

export async function createClient(c: Context) {
  const body = await c.req.json().catch(() => null);
  const parsed = createClientSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid request." } },
      400,
    );
  }

  const client = await prisma.client.create({ data: parsed.data });
  return c.json({ client }, 201);
}

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["CORPORATE", "DECEASED_ESTATE", "FAMILY", "GOVERNMENT"]).optional(),
  regNumber: z.string().optional(),
  attorneyOfRecordId: z.string().optional(),
});

export async function updateClient(c: Context) {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updateClientSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid request." } },
      400,
    );
  }

  const client = await prisma.client.update({ where: { id }, data: parsed.data });
  return c.json({ client });
}

const deleteClientSchema = z.object({ deleteCases: z.boolean().default(false) });

export async function deleteClient(c: Context) {
  const id = c.req.param("id");
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const parsed = deleteClientSchema.safeParse(body ?? {});
  const deleteCases = parsed.success ? parsed.data.deleteCases : false;

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    return c.json({ error: { code: "NOT_FOUND", message: "Client not found." } }, 404);
  }

  if (deleteCases) {
    const openCases = await prisma.case.findMany({ where: { clientId: id, deletedAt: null }, select: { id: true } });
    await prisma.case.updateMany({
      where: { clientId: id, deletedAt: null },
      data: { deletedAt: new Date(), deletedById: user.id },
    });
    // Cascade one level further, same as a manual per-case delete would: the documents
    // inside each of those cases move with them into the trash too.
    await prisma.document.updateMany({
      where: { caseId: { in: openCases.map((matter) => matter.id) }, deletedAt: null },
      data: { deletedAt: new Date(), deletedById: user.id },
    });
  }

  const updated = await prisma.client.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: user.id },
  });

  return c.json({ client: updated });
}

export async function listClientTrash(c: Context) {
  const pagination = parsePagination(c);
  const where = { deletedAt: { not: null } };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { deletedAt: "desc" },
      skip: pagination.offset,
      take: pagination.limit,
      include: { deletedBy: { select: { name: true } }, _count: { select: { cases: true } } },
    }),
    prisma.client.count({ where }),
  ]);

  return c.json({
    clients: clients.map((client) => ({
      id: client.id,
      name: client.name,
      caseCount: client._count.cases,
      deletedBy: client.deletedBy?.name ?? "Unknown",
      deletedAt: client.deletedAt!.toISOString(),
      purgesInDays: purgesInDays(client.deletedAt!),
    })),
    pagination: paginationMeta(total, pagination),
  });
}

export async function restoreClient(c: Context) {
  const id = c.req.param("id");
  const client = await prisma.client.update({ where: { id }, data: { deletedAt: null, deletedById: null } });
  return c.json({ client });
}

export async function permanentlyDeleteClient(c: Context) {
  const id = c.req.param("id");
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    return c.json({ error: { code: "NOT_FOUND", message: "Client not found." } }, 404);
  }

  const hasCases = await prisma.case.count({ where: { clientId: id } });
  const hasDocuments = await prisma.document.count({ where: { clientId: id } });
  if (hasCases > 0 || hasDocuments > 0) {
    return c.json(
      {
        error: {
          code: "CONFLICT",
          message: "Permanently delete this client's cases and documents first — they're still linked to this record.",
        },
      },
      409,
    );
  }

  await prisma.contact.deleteMany({ where: { clientId: id } });
  await prisma.client.delete({ where: { id } });

  return c.json({ ok: true });
}
