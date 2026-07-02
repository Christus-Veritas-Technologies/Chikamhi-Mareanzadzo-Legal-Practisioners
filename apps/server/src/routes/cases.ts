import { Hono } from "hono";

import { createCase, getCase, listCases, updateCase } from "@/controllers/cases";
import { requireAuth } from "@/middleware/auth";

const cases = new Hono()
  .use("*", requireAuth)
  .get("/", listCases)
  .post("/", createCase)
  .get("/:id", getCase)
  .patch("/:id", updateCase);

export default cases;
