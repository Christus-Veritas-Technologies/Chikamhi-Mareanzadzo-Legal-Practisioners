import { Hono } from "hono";

import {
  createFolder,
  deleteFolder,
  getFolder,
  listFolders,
  listFolderTrash,
  permanentlyDeleteFolder,
  restoreFolder,
  updateFolder,
} from "@/controllers/folders";
import { requireAuth } from "@/middleware/auth";

// No role gate beyond being signed in — attorneys and paralegals have equal access to
// folder/tag management. (The only two attorney-only areas in the app are the Audit Log and
// Users & Roles.)
const folders = new Hono()
  .use("*", requireAuth)
  .get("/", listFolders)
  .post("/", createFolder)
  .get("/trash", listFolderTrash)
  .get("/:id", getFolder)
  .post("/:id/restore", restoreFolder)
  .delete("/:id/permanent", permanentlyDeleteFolder)
  .patch("/:id", updateFolder)
  .delete("/:id", deleteFolder);

export default folders;
