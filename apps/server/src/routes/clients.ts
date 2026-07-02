import { Hono } from "hono";

import { createClientContact, deleteClientContact, listClientContacts } from "@/controllers/contacts";
import {
  createClient,
  deleteClient,
  getClient,
  listClients,
  listClientTrash,
  permanentlyDeleteClient,
  restoreClient,
  updateClient,
} from "@/controllers/clients";
import { requireAuth } from "@/middleware/auth";

const clients = new Hono()
  .use("*", requireAuth)
  .get("/", listClients)
  .post("/", createClient)
  .get("/trash", listClientTrash)
  .post("/:id/restore", restoreClient)
  .delete("/:id/permanent", permanentlyDeleteClient)
  .get("/:id", getClient)
  .patch("/:id", updateClient)
  .delete("/:id", deleteClient)
  .get("/:id/contacts", listClientContacts)
  .post("/:id/contacts", createClientContact)
  .delete("/:id/contacts/:contactId", deleteClientContact);

export default clients;
