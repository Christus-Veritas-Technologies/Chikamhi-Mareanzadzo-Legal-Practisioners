import prisma from "@CMLP/db";
import type { Context } from "hono";
import { z } from "zod";

import { serializeProfile } from "@/lib/serializers";

const updateNotificationsSchema = z.object({
  caseUpload: z.boolean().optional(),
  ocrComplete: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
});

export async function updateNotificationsController(c: Context) {
  const authed = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = updateNotificationsSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid update." } }, 400);
  }

  const user = await prisma.user.update({
    where: { id: authed.id },
    data: {
      ...(parsed.data.caseUpload !== undefined ? { notifyOnCaseUpload: parsed.data.caseUpload } : {}),
      ...(parsed.data.ocrComplete !== undefined ? { notifyOnOcrComplete: parsed.data.ocrComplete } : {}),
      ...(parsed.data.weeklyDigest !== undefined ? { notifyWeeklyDigest: parsed.data.weeklyDigest } : {}),
    },
  });

  return c.json({ user: await serializeProfile(user) });
}
