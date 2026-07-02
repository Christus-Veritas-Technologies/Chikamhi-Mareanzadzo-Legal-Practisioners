import { Hono } from "hono";

import { createUser, listUsers, resetUserPassword, updateUser } from "@/controllers/users";
import { requireAuth, requireRole } from "@/middleware/auth";

const users = new Hono()
  .use("*", requireAuth)
  // GET is still open to everyone (not just attorneys) since the roster feeds "lead
  // attorney" / "attorney of record" pickers used throughout the app — only the Users &
  // Roles *page* itself (web/native nav + route guard) is attorney-only, plus every
  // mutating action below.
  .get("/", listUsers)
  .post("/", requireRole("ATTORNEY"), createUser)
  .patch("/:id", requireRole("ATTORNEY"), updateUser)
  .post("/:id/reset-password", requireRole("ATTORNEY"), resetUserPassword);

export default users;
