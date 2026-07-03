import prisma from "@CMLP/db";
import type { Context } from "hono";

// R2 bucket quota for the firm's plan — infrastructure config, not seed/mock data.
const STORAGE_QUOTA_GB = 200;

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 GB";
  const gb = bytes / 1024 ** 3;
  return `${gb.toFixed(1)} GB`;
}

function relativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export async function getDashboardSummary(c: Context) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3_600_000);

  const [filedThisWeek, awaitingSignature, openCases, storageAgg, recentDocuments] = await Promise.all([
    prisma.document.count({ where: { status: "FILED", updatedAt: { gte: sevenDaysAgo }, deletedAt: null } }),
    prisma.document.count({ where: { status: "FILED", deletedAt: null } }),
    prisma.case.count({ where: { status: "ACTIVE" } }),
    prisma.document.aggregate({ where: { deletedAt: null }, _sum: { sizeBytes: true } }),
    prisma.document.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        client: { select: { name: true } },
        case: { select: { title: true } },
      },
    }),
  ]);

  const usedGb = (storageAgg._sum.sizeBytes ?? 0) / 1024 ** 3;

  return c.json({
    stats: {
      filedThisWeek,
      awaitingSignature,
      openCases,
      storageUsed: formatBytes(storageAgg._sum.sizeBytes ?? 0),
      storageQuotaGb: STORAGE_QUOTA_GB,
      storagePercentUsed: Math.min(100, Math.round((usedGb / STORAGE_QUOTA_GB) * 100)),
    },
    recentDocuments: recentDocuments.map((doc) => ({
      id: doc.id,
      name: doc.name,
      status: doc.status,
      modified: relativeTime(doc.updatedAt),
      matter: doc.case?.title ?? doc.client.name,
    })),
  });
}
