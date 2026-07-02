import { Hono } from "hono";

import { createUser, listUsers, updateUser } from "@/controllers/users";
import { requireAuth, requireRole } from "@/middleware/auth";

const users = new Hono()
  .use("*", requireAuth)
  .get("/", listUsers)
  // Creating accounts and changing roles/active status is admin-only — the rest of the
  // staff can view the roster (e.g. for "lead attorney" pickers) but not manage it.
  .post("/", requireRole("ADMIN"), createUser)
  .patch("/:id", requireRole("ADMIN"), updateUser);

export default users;
