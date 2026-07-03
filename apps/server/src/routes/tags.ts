import { Hono } from "hono";

import {
  createTag,
  deleteTag,
  getTag,
  listTags,
  listTagTrash,
  permanentlyDeleteTag,
  restoreTag,
  updateTag,
} from "@/controllers/tags";
import { requireAuth } from "@/middleware/auth";

// No role gate beyond being signed in — see routes/folders.ts for why.
const tags = new Hono()
  .use("*", requireAuth)
  .get("/", listTags)
  .post("/", createTag)
  .get("/trash", listTagTrash)
  .get("/:id", getTag)
  .post("/:id/restore", restoreTag)
  .delete("/:id/permanent", permanentlyDeleteTag)
  .patch("/:id", updateTag)
  .delete("/:id", deleteTag);

export default tags;
