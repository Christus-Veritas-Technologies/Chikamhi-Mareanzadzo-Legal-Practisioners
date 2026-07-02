import { Hono } from "hono";

import { listAuditLog } from "@/controllers/audit";
import { requireAuth } from "@/middleware/auth";

const audit = new Hono().use("*", requireAuth).get("/", listAuditLog);

export default audit;
