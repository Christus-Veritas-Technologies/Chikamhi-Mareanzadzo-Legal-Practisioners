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

const STATUSES = ["ACTIVE", "UNDER_REVIEW", "CLOSED"] as const;
type UserOption = { id: string; name: string };

type CaseEditDialogProps = {
  trigger: React.ReactNode;
  caseId: string;
  initial: {
    status: string;
    matterType: string;
    location: string | null;
    registry: string | null;
    leadAttorneyId: string | null;
  };
  onSaved: () => void;
};

export function CaseEditDialog({ trigger, caseId, initial, onSaved }: CaseEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(initial.status);
  const [matterType, setMatterType] = useState(initial.matterType);
  const [location, setLocation] = useState(initial.location ?? "");
  const [registry, setRegistry] = useState(initial.registry ?? "");
  const [leadAttorneyId, setLeadAttorneyId] = useState(initial.leadAttorneyId ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const { data: usersData } = useApi<{ users: UserOption[] }>(open ? "/users" : null);
  const users = usersData?.users ?? [];

  async function save() {
    setIsSaving(true);
    try {
      await apiFetch(`/cases/${caseId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          matterType: matterType.trim(),
          location: location.trim() || undefined,
          registry: registry.trim() || undefined,
          leadAttorneyId: leadAttorneyId || undefined,
        }),
      });
      toast.success("Case updated.");
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update case.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit case</DialogTitle>
          <DialogDescription>Update this case's status and details.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="case-status">Status</Label>
            <select
              id="case-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="py-2 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {formatStatus(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="case-matter-type-edit">Matter type</Label>
            <Input id="case-matter-type-edit" value={matterType} onChange={(e) => setMatterType(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="case-location-edit">Location</Label>
            <Input id="case-location-edit" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="case-registry-edit">Registry</Label>
            <Input id="case-registry-edit" value={registry} onChange={(e) => setRegistry(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="case-lead-edit">Lead attorney</Label>
            <select
              id="case-lead-edit"
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
          <Button onClick={save} disabled={isSaving || !matterType.trim()}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
