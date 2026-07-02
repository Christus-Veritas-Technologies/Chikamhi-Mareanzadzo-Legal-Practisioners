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

import { apiFetch, useApi } from "@/hooks/use-api";

type UserOption = { id: string; name: string };

type CaseFormDialogProps = {
  trigger: React.ReactNode;
  clientId: string;
  onSaved: () => void;
};

export function CaseFormDialog({ trigger, clientId, onSaved }: CaseFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [matterType, setMatterType] = useState("");
  const [location, setLocation] = useState("");
  const [registry, setRegistry] = useState("");
  const [leadAttorneyId, setLeadAttorneyId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: usersData } = useApi<{ users: UserOption[] }>(open ? "/users" : null);
  const users = usersData?.users ?? [];

  async function save() {
    if (!title.trim() || !matterType.trim()) return;
    setIsSaving(true);
    try {
      await apiFetch("/cases", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          clientId,
          matterType: matterType.trim(),
          location: location.trim() || undefined,
          registry: registry.trim() || undefined,
          leadAttorneyId: leadAttorneyId || undefined,
        }),
      });
      toast.success("Case created.");
      setOpen(false);
      setTitle("");
      setMatterType("");
      setLocation("");
      setRegistry("");
      setLeadAttorneyId("");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create case.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New case</DialogTitle>
          <DialogDescription>Open a new case for this client.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="case-title">Title</Label>
            <Input id="case-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Stand 4471 — Transfer" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="case-matter-type">Matter type</Label>
            <Input id="case-matter-type" value={matterType} onChange={(e) => setMatterType(e.target.value)} placeholder="Conveyancing" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="case-location">Location (optional)</Label>
            <Input id="case-location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="case-registry">Registry (optional)</Label>
            <Input id="case-registry" value={registry} onChange={(e) => setRegistry(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="case-lead">Lead attorney</Label>
            <select
              id="case-lead"
              value={leadAttorneyId}
              onChange={(e) => setLeadAttorneyId(e.target.value)}
              className="py-2 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={isSaving || !title.trim() || !matterType.trim()}>
            {isSaving ? "Creating…" : "Create case"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
