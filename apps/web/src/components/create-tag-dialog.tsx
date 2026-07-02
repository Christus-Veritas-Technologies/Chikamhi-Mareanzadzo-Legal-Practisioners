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

const COLOR_OPTIONS = [
  { value: "bg-muted-foreground", label: "Grey" },
  { value: "bg-brand", label: "Brand" },
  { value: "bg-destructive", label: "Red" },
  { value: "bg-success", label: "Green" },
  { value: "bg-warning", label: "Amber" },
  { value: "bg-chart-2", label: "Blue" },
  { value: "bg-chart-4", label: "Purple" },
];

// Same reasoning as CreateFolderDialog — replaces the old "click + New tag, it's created
// immediately as literally 'New tag', rename it after" flow.
export function CreateTagDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [colorClass, setColorClass] = useState(COLOR_OPTIONS[0]!.value);
  const [isSaving, setIsSaving] = useState(false);

  function reset() {
    setName("");
    setColorClass(COLOR_OPTIONS[0]!.value);
  }

  async function save() {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await apiFetch("/tags", { method: "POST", body: JSON.stringify({ name: name.trim(), colorClass }) });
      toast.success("Tag created.");
      setOpen(false);
      reset();
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create tag.");
    } finally {
      setIsSaving(false);
    }
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
          <button type="button" className="text-xs font-medium text-brand hover:underline">
            + New tag
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New tag</DialogTitle>
          <DialogDescription>Name it and pick a color.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tag-name">Tag name</Label>
            <Input
              id="tag-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="e.g. Urgent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColorClass(option.value)}
                  aria-label={option.label}
                  className={`flex size-7 items-center justify-center rounded-full border-2 ${colorClass === option.value ? "border-foreground" : "border-transparent"}`}
                >
                  <span className={`size-4 rounded-full ${option.value}`} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={isSaving || !name.trim()}>
            {isSaving ? "Creating…" : "Create tag"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
