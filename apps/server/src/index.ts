import { env } from "@CMLP/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import audit from "@/routes/audit";
import auth from "@/routes/auth";
import cases from "@/routes/cases";
import clients from "@/routes/clients";
import dashboard from "@/routes/dashboard";
import documents from "@/routes/documents";
import folders from "@/routes/folders";
import tags from "@/routes/tags";
import users from "@/routes/users";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.get("/", (c) => {
  return c.text("OK");
});

app.route("/auth", auth);
app.route("/clients", clients);
app.route("/dashboard", dashboard);
app.route("/cases", cases);
app.route("/documents", documents);
app.route("/folders", folders);
app.route("/tags", tags);
app.route("/audit-log", audit);
app.route("/users", users);

export default app;
