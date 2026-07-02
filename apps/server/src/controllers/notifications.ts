import prisma from "@CMLP/db";
import type { Context } from "hono";

import { paginationMeta, parsePagination } from "@/lib/pagination";

function relativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export async function listNotifications(c: Context) {
  const user = c.get("user");
  const pagination = parsePagination(c);
  const where = { userId: user.id };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pagination.offset,
      take: pagination.limit,
      include: {
        case: { select: { id: true, title: true } },
        document: { select: { id: true, name: true } },
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return c.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      case: n.case,
      document: n.document,
      isRead: Boolean(n.readAt),
      createdAt: relativeTime(n.createdAt),
    })),
    unreadCount,
    pagination: paginationMeta(total, pagination),
  });
}

export async function markNotificationRead(c: Context) {
  const user = c.get("user");
  const id = c.req.param("id");

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== user.id) {
    return c.json({ error: { code: "NOT_FOUND", message: "Notification not found." } }, 404);
  }

  const updated = await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  return c.json({ notification: { id: updated.id, isRead: true } });
}

export async function markAllNotificationsRead(c: Context) {
  const user = c.get("user");
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return c.json({ ok: true });
}
