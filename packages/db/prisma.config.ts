import path from "node:path";

import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({
  path: "../../apps/server/.env",
});

// Not using prisma/config's `env()` helper here on purpose — it throws
// (PrismaConfigEnvError) if DATABASE_URL isn't resolvable at all, which breaks `prisma
// generate` (packages/db's postinstall script, so this runs on every `pnpm install`) in any
// environment that installs this whole pnpm workspace without a real database configured —
// e.g. EAS Build for apps/native, which doesn't use packages/db at all but still triggers
// this postinstall because EAS installs the full workspace. `generate` never opens a real
// connection, it only needs a URL-shaped string, so a dummy fallback is safe here. Real
// commands that do connect (`migrate deploy`, `db push`, `studio`) will fail loudly with a
// connection error if DATABASE_URL is genuinely missing in an environment that needs it —
// same outcome as before, just a different (still clear) failure point.
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://build:build@localhost:5432/build";

export default defineConfig({
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url: DATABASE_URL,
  },
});
