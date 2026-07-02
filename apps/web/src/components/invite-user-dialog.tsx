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
import { Copy, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { apiFetch } from "@/hooks/use-api";
import { formatStatus } from "@/lib/format-status";

const ROLES = ["ADMIN", "ATTORNEY", "PARALEGAL"] as const;

type CreatedUser = { username: string; tempPassword: string };

export function InviteUserDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("PARALEGAL");
  const [isSaving, setIsSaving] = useState(false);
  const [created, setCreated] = useState<CreatedUser | null>(null);

  async function save() {
    if (!name.trim() || !email.trim()) return;
    setIsSaving(true);
    try {
      const result = await apiFetch<{ user: { username: string }; tempPassword: string }>("/users", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
      });
      setCreated({ username: result.user.username, tempPassword: result.tempPassword });
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create user.");
    } finally {
      setIsSaving(false);
    }
  }

  function reset() {
    setName("");
    setEmail("");
    setRole("PARALEGAL");
    setCreated(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <UserPlus />
            Invite user
          </Button>
        }
      />
      <DialogContent>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Account created</DialogTitle>
              <DialogDescription>
                No email delivery is configured yet — share these credentials with the new user directly. They'll be
                asked to sign in with them.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Username</span>
                <span className="font-mono text-foreground">{created.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Temporary password</span>
                <span className="font-mono text-foreground">{created.tempPassword}</span>
              </div>
              <button
                type="button"
                className="mt-1 flex items-center justify-center gap-1 text-brand hover:underline"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Username: ${created.username}\nTemporary password: ${created.tempPassword}`,
                  );
                  toast.success("Copied.");
                }}
              >
                <Copy className="size-3" />
                Copy credentials
              </button>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invite user</DialogTitle>
              <DialogDescription>Create a new staff account.</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-name">Name</Label>
                <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
                  className="py-2 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {formatStatus(r)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={isSaving || !name.trim() || !email.trim()}>
                {isSaving ? "Creating…" : "Create account"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
