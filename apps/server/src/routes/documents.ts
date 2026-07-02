import { Hono } from "hono";

import {
  addDocumentTag,
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  listTrash,
  removeDocumentTag,
  restoreDocument,
} from "@/controllers/documents";
import { requireAuth } from "@/middleware/auth";

const documents = new Hono()
  .use("*", requireAuth)
  .get("/", listDocuments)
  .post("/", createDocument)
  .get("/trash", listTrash)
  .post("/:id/restore", restoreDocument)
  .get("/:id", getDocument)
  .delete("/:id", deleteDocument)
  .post("/:id/tags", addDocumentTag)
  .delete("/:id/tags/:tagId", removeDocumentTag);

export default documents;
