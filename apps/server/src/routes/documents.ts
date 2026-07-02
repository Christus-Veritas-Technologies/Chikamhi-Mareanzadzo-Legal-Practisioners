import { Hono } from "hono";

import {
  addDocumentTag,
  bulkDeleteDocuments,
  bulkMoveDocuments,
  bulkTagDocuments,
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
  signDocument,
  updateDocument,
} from "@/controllers/documents";
import { requireAuth, requireRole } from "@/middleware/auth";

const documents = new Hono()
  .use("*", requireAuth)
  .get("/", listDocuments)
  .post("/", createDocument)
  .get("/trash", listTrash)
  .post("/bulk/tag", bulkTagDocuments)
  .post("/bulk/move", bulkMoveDocuments)
  .post("/bulk/delete", bulkDeleteDocuments)
  .post("/:id/restore", restoreDocument)
  .post("/:id/confirm-upload", confirmDocumentUpload)
  .post("/:id/sign", signDocument)
  // Permanent delete is irreversible and bypasses the 30-day trash retention — admin-only.
  .delete("/:id/permanent", requireRole("ADMIN"), permanentlyDeleteDocument)
  .get("/:id/history", getDocumentHistory)
  .get("/:id", getDocument)
  .patch("/:id", updateDocument)
  .delete("/:id", deleteDocument)
  .post("/:id/tags", addDocumentTag)
  .delete("/:id/tags/:tagId", removeDocumentTag);

export default documents;
