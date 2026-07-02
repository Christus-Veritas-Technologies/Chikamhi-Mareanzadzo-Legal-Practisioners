import { Hono } from "hono";

import { listAuditLog } from "@/controllers/audit";
import { requireAuth, requireRole } from "@/middleware/auth";

// The firm-wide Audit Log is attorney-only — paralegals can't view it (they can still see a
// case's own activity timeline, which is a separate, case-scoped endpoint on /cases/:id).
const audit = new Hono().use("*", requireAuth, requireRole("ATTORNEY")).get("/", listAuditLog);

export default audit;
