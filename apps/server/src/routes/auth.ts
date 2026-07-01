import { Hono } from "hono";

import { meController } from "@/controllers/auth/me";
import { signInController } from "@/controllers/auth/sign-in";
import { signOutController } from "@/controllers/auth/sign-out";
import { requireAuth } from "@/middleware/auth";

const auth = new Hono()
  .post("/sign-in", signInController)
  .get("/me", requireAuth, meController)
  .post("/sign-out", requireAuth, signOutController);

export default auth;
