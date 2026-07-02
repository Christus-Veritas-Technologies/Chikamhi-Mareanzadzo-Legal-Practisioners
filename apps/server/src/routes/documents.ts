import { Hono } from "hono";

import {
  addDocumentTag,
  confirmDocumentUpload,
  createDocument,
  deleteDocument,
  getDocument,
  getDocumentHistory,
  listDocuments,
  listTrash,
  permanentlyDeleteDocument,
  removeDocumentTag,
  restoreDocument,
  updateDocument,
} from "@/controllers/documents";
import { requireAuth, requireRole } from "@/middleware/auth";

const documents = new Hono()
  .use("*", requireAuth)
  .get("/", listDocuments)
  .post("/", createDocument)
  .get("/trash", listTrash)
  .post("/:id/restore", restoreDocument)
  .post("/:id/confirm-upload", confirmDocumentUpload)
  // Permanent delete is irreversible and bypasses the 30-day trash retention — admin-only.
  .delete("/:id/permanent", requireRole("ADMIN"), permanentlyDeleteDocument)
  .get("/:id/history", getDocumentHistory)
  .get("/:id", getDocument)
  .patch("/:id", updateDocument)
  .delete("/:id", deleteDocument)
  .post("/:id/tags", addDocumentTag)
  .delete("/:id/tags/:tagId", removeDocumentTag);

export default documents;
