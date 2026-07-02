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
import { formatStatus } from "@/lib/format-status";

const CLIENT_TYPES = ["CORPORATE", "DECEASED_ESTATE", "FAMILY", "GOVERNMENT"] as const;

type UserOption = { id: string; name: string };

type ClientFormDialogProps = {
  trigger: React.ReactNode;
  mode: "create" | "edit";
  clientId?: string;
  initial?: {
    name: string;
    type: string;
    regNumber: string | null;
    attorneyOfRecordId: string | null;
  };
  onSaved: () => void;
};

export function ClientFormDialog({ trigger, mode, clientId, initial, onSaved }: ClientFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<string>(initial?.type ?? "CORPORATE");
  const [regNumber, setRegNumber] = useState(initial?.regNumber ?? "");
  const [attorneyOfRecordId, setAttorneyOfRecordId] = useState(initial?.attorneyOfRecordId ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const { data: usersData } = useApi<{ users: UserOption[] }>(open ? "/users" : null);
  const users = usersData?.users ?? [];

  async function save() {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const body = JSON.stringify({
        name: name.trim(),
        type,
        regNumber: regNumber.trim() || undefined,
        attorneyOfRecordId: attorneyOfRecordId || undefined,
      });
      if (mode === "create") {
        await apiFetch("/clients", { method: "POST", body });
        toast.success("Client created.");
      } else {
        await apiFetch(`/clients/${clientId}`, { method: "PATCH", body });
        toast.success("Client updated.");
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save client.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New client" : "Edit client"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Add a new client record." : "Update this client's details."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-name">Name</Label>
            <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Moyo Holdings (Pvt) Ltd" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-type">Type</Label>
            <select
              id="client-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="py-2 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
            >
              {CLIENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {formatStatus(t)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-reg">Registration number (optional)</Label>
            <Input id="client-reg" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-attorney">Attorney of record</Label>
            <select
              id="client-attorney"
              value={attorneyOfRecordId}
              onChange={(e) => setAttorneyOfRecordId(e.target.value)}
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
          <Button onClick={save} disabled={isSaving || !name.trim()}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
