"use client";

import { Button } from "@CMLP/ui/components/button";
import { Checkbox } from "@CMLP/ui/components/checkbox";
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
import { FolderPlus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { apiFetch } from "@/hooks/use-api";

type Tag = { id: string; name: string; colorClass: string };

// Replaces the old "type a name inline, it's created the moment you click Add" flow — a
// folder is only created once the user confirms in this dialog, and they can pick tags for
// it up front instead of tagging it after the fact.
export function CreateFolderDialog({ tags, onCreated }: { tags: Tag[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  function toggleTag(id: string) {
    setTagIds((ids) => (ids.includes(id) ? ids.filter((t) => t !== id) : [...ids, id]));
  }

  function reset() {
    setName("");
    setTagIds([]);
  }

  async function save() {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await apiFetch("/folders", { method: "POST", body: JSON.stringify({ name: name.trim(), tagIds }) });
      toast.success("Folder created.");
      setOpen(false);
      reset();
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create folder.");
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
          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border p-4 text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-4" />
            <span className="text-xs">New folder</span>
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>Name it, and optionally tag it — you can change either later.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="e.g. Conveyancing"
            />
          </div>

          {tags.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-foreground"
                  >
                    <Checkbox checked={tagIds.includes(tag.id)} onCheckedChange={() => toggleTag(tag.id)} />
                    <span className={`size-2 rounded-full ${tag.colorClass}`} />
                    {tag.name}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={isSaving || !name.trim()}>
            <FolderPlus />
            {isSaving ? "Creating…" : "Create folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
