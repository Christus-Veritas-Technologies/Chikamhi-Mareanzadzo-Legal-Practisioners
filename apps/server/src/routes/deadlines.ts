import { Hono } from "hono";

import { createDeadline, deleteDeadline, listDeadlines, updateDeadline } from "@/controllers/deadlines";
import { requireAuth } from "@/middleware/auth";

const deadlines = new Hono()
  .use("*", requireAuth)
  .get("/", listDeadlines)
  .post("/", createDeadline)
  .patch("/:id", updateDeadline)
  .delete("/:id", deleteDeadline);

export default deadlines;
