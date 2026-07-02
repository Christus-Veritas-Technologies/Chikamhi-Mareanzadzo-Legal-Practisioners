import { Hono } from "hono";

import { getDashboardSummary } from "@/controllers/dashboard";
import { requireAuth } from "@/middleware/auth";

const dashboard = new Hono().use("*", requireAuth).get("/summary", getDashboardSummary);

export default dashboard;
