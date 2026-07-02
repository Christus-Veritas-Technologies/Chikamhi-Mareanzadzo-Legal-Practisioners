import { Hono } from "hono";

import { createUser, listUsers, updateUser } from "@/controllers/users";
import { requireAuth } from "@/middleware/auth";

const users = new Hono()
  .use("*", requireAuth)
  .get("/", listUsers)
  .post("/", createUser)
  .patch("/:id", updateUser);

export default users;
