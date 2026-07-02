import { Hono } from "hono";

import {
  createCase,
  deleteCase,
  getCase,
  listCases,
  listCaseTrash,
  permanentlyDeleteCase,
  restoreCase,
  updateCase,
} from "@/controllers/cases";
import { requireAuth } from "@/middleware/auth";

const cases = new Hono()
  .use("*", requireAuth)
  .get("/", listCases)
  .post("/", createCase)
  .get("/trash", listCaseTrash)
  .post("/:id/restore", restoreCase)
  .delete("/:id/permanent", permanentlyDeleteCase)
  .get("/:id", getCase)
  .patch("/:id", updateCase)
  .delete("/:id", deleteCase);

export default cases;
