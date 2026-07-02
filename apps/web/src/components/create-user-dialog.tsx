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
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { apiFetch } from "@/hooks/use-api";
import { formatStatus } from "@/lib/format-status";

const ROLES = ["PARALEGAL", "ATTORNEY"] as const;

// Not an "invite" — there's no pending state. The creating attorney sets a real password
// directly and the account is active immediately.
export function CreateUserDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("PARALEGAL");
  const [isSaving, setIsSaving] = useState(false);

  const canSave = name.trim() && email.trim() && password.length >= 8;

  async function save() {
    if (!canSave) return;
    setIsSaving(true);
    try {
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          username: username.trim() || undefined,
          password,
          role,
        }),
      });
      toast.success(`${name.trim()} is now part of the firm.`);
      setOpen(false);
      reset();
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
    setUsername("");
    setPassword("");
    setRole("PARALEGAL");
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
            Create user
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            They become part of the firm the moment you create this — no invite step. Set the password they'll
            actually sign in with (they can change it themselves afterward).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-user-name">Name</Label>
            <Input id="create-user-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-user-email">Email</Label>
            <Input id="create-user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-user-username">Username (optional)</Label>
            <Input
              id="create-user-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Generated from name if left blank"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-user-password">Password</Label>
            <Input
              id="create-user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-user-role">Role</Label>
            <select
              id="create-user-role"
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
            {role === "ATTORNEY" ? (
              <p className="text-[11px] text-muted-foreground">
                Attorneys can't suspend or reactivate other attorneys — including each other — once created.
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={isSaving || !canSave}>
            {isSaving ? "Creating…" : "Create user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
