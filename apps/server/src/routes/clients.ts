import { Hono } from "hono";

import { createClientContact, deleteClientContact, listClientContacts } from "@/controllers/contacts";
import { createClient, getClient, listClients, updateClient } from "@/controllers/clients";
import { requireAuth } from "@/middleware/auth";

const clients = new Hono()
  .use("*", requireAuth)
  .get("/", listClients)
  .post("/", createClient)
  .get("/:id", getClient)
  .patch("/:id", updateClient)
  .get("/:id/contacts", listClientContacts)
  .post("/:id/contacts", createClientContact)
  .delete("/:id/contacts/:contactId", deleteClientContact);

export default clients;
