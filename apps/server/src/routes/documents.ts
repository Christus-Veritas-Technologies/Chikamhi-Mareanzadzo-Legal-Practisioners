import { Hono } from "hono";

import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  listTrash,
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
  .delete("/:id", deleteDocument);

export default documents;
