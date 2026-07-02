import { Hono } from "hono";

import { avatarUploadUrlController } from "@/controllers/auth/avatar-upload-url";
import { changePasswordController } from "@/controllers/auth/change-password";
import { meController } from "@/controllers/auth/me";
import { signInController } from "@/controllers/auth/sign-in";
import { signOutController } from "@/controllers/auth/sign-out";
import { updateNotificationsController } from "@/controllers/auth/update-notifications";
import { updateProfileController } from "@/controllers/auth/update-profile";
import { requireAuth } from "@/middleware/auth";

const auth = new Hono()
  .post("/sign-in", signInController)
  .get("/me", requireAuth, meController)
  .patch("/me", requireAuth, updateProfileController)
  .post("/sign-out", requireAuth, signOutController)
  .post("/change-password", requireAuth, changePasswordController)
  .patch("/notifications", requireAuth, updateNotificationsController)
  .post("/avatar-upload-url", requireAuth, avatarUploadUrlController);

export default auth;
