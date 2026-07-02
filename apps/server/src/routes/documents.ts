import { Hono } from "hono";

import {
  addDocumentTag,
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
import { requireAuth } from "@/middleware/auth";

const documents = new Hono()
  .use("*", requireAuth)
  .get("/", listDocuments)
  .post("/", createDocument)
  .get("/trash", listTrash)
  .post("/:id/restore", restoreDocument)
  .delete("/:id/permanent", permanentlyDeleteDocument)
  .get("/:id/history", getDocumentHistory)
  .get("/:id", getDocument)
  .patch("/:id", updateDocument)
  .delete("/:id", deleteDocument)
  .post("/:id/tags", addDocumentTag)
  .delete("/:id/tags/:tagId", removeDocumentTag);

export default documents;
