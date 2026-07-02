import { Hono } from "hono";

import { createFolder, listFolders } from "@/controllers/folders";
import { requireAuth, requireRole } from "@/middleware/auth";

const folders = new Hono()
  .use("*", requireAuth)
  .get("/", listFolders)
  // Taxonomy management is admin-only; everyone can still file documents into folders.
  .post("/", requireRole("ADMIN"), createFolder);

export default folders;
