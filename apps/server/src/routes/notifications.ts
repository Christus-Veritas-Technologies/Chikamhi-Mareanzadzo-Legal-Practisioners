import { Hono } from "hono";

import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/controllers/notifications";
import { requireAuth } from "@/middleware/auth";

const notifications = new Hono()
  .use("*", requireAuth)
  .get("/", listNotifications)
  .patch("/read-all", markAllNotificationsRead)
  .patch("/:id/read", markNotificationRead);

export default notifications;
