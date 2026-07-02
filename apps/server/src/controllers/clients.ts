import prisma from "@CMLP/db";
import type { Context } from "hono";
import { z } from "zod";

import { paginationMeta, parsePagination } from "@/lib/pagination";

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
  const where = search ? { name: { contains: search, mode: "insensitive" as const } } : {};

  const [clients, total, storageByClient] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: pagination.offset,
      take: pagination.limit,
      include: {
        attorneyOfRecord: { select: { name: true } },
        _count: { select: { cases: true, documents: true } },
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
        cases: { orderBy: { updatedAt: "desc" } },
        _count: { select: { documents: true } },
      },
    }),
    prisma.document.aggregate({ where: { clientId: id }, _sum: { sizeBytes: true } }),
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
