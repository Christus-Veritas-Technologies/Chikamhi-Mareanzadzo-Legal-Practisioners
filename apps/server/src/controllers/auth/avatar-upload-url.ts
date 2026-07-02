import prisma from "@CMLP/db";
import type { Context } from "hono";
import { z } from "zod";

import { getUploadUrl, isR2Configured } from "@/lib/r2";

const requestSchema = z.object({
  contentType: z.string().min(1),
  fileExt: z.string().min(1).max(8),
});

// Two-step avatar flow, same pattern as document uploads: reserve a storage key + hand back
// a presigned PUT URL. The client uploads the bytes directly to R2, then the avatarKey is
// already saved so /auth/me picks up the new photo on next fetch.
export async function avatarUploadUrlController(c: Context) {
  const authed = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "contentType and fileExt are required." } }, 400);
  }

  if (!isR2Configured) {
    return c.json(
      { error: { code: "STORAGE_NOT_CONFIGURED", message: "File storage isn't configured yet." } },
      503,
    );
  }

  const avatarKey = `avatars/${authed.id}.${parsed.data.fileExt.replace(/[^a-z0-9]/gi, "")}`;
  const uploadUrl = await getUploadUrl(avatarKey, parsed.data.contentType);

  await prisma.user.update({ where: { id: authed.id }, data: { avatarKey } });

  return c.json({ uploadUrl });
}
