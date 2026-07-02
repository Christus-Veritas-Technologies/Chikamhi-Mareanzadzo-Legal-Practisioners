import { Hono } from "hono";

import { createTag, listTags, updateTag } from "@/controllers/tags";
import { requireAuth } from "@/middleware/auth";

const tags = new Hono()
  .use("*", requireAuth)
  .get("/", listTags)
  .post("/", createTag)
  .patch("/:id", updateTag);

export default tags;
