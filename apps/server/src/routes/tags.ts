import { Hono } from "hono";

import { createTag, listTags, updateTag } from "@/controllers/tags";
import { requireAuth, requireRole } from "@/middleware/auth";

const tags = new Hono()
  .use("*", requireAuth)
  .get("/", listTags)
  // Taxonomy management (creating/renaming tags) is admin-only; everyone can still apply
  // existing tags to documents via the documents routes.
  .post("/", requireRole("ADMIN"), createTag)
  .patch("/:id", requireRole("ADMIN"), updateTag);

export default tags;
