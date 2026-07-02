import { Hono } from "hono";

import { createFolder, listFolders } from "@/controllers/folders";
import { requireAuth } from "@/middleware/auth";

const folders = new Hono()
  .use("*", requireAuth)
  .get("/", listFolders)
  .post("/", createFolder);

export default folders;
