"use client";

import { Button } from "@CMLP/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@CMLP/ui/components/dialog";
import { Input } from "@CMLP/ui/components/input";
import { Label } from "@CMLP/ui/components/label";
import { useState } from "react";
import { toast } from "sonner";

import { apiFetch } from "@/hooks/use-api";

type ContactFormDialogProps = {
  trigger: React.ReactNode;
  clientId: string;
  onSaved: () => void;
};

export function ContactFormDialog({ trigger, clientId, onSaved }: ContactFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await apiFetch(`/clients/${clientId}/contacts`, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      toast.success("Contact added.");
      setOpen(false);
      setName("");
      setRole("");
      setEmail("");
      setPhone("");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add contact.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
          <DialogDescription>Add a key contact for this client.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-name">Name</Label>
            <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-role">Role (optional)</Label>
            <Input id="contact-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Director, Next of kin…" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-email">Email (optional)</Label>
            <Input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-phone">Phone (optional)</Label>
            <Input id="contact-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={isSaving || !name.trim()}>
            {isSaving ? "Adding…" : "Add contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
