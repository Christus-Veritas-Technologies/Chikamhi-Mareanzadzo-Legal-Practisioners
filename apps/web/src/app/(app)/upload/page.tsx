"use client";

import { Button } from "@CMLP/ui/components/button";
import { cn } from "@CMLP/ui/lib/utils";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  FileText,
  Folder,
  MapPin,
  Plus,
  RotateCcw,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  type CaseOption,
  type ClientOption,
  type Destination,
  DestinationPicker,
  EMPTY_DESTINATION,
  type FolderOption,
} from "@/components/destination-picker";
import { apiFetch, useApi } from "@/hooks/use-api";

type QueueItem = {
  id: string;
  documentId?: string;
  name: string;
  file: File;
  state: "ready" | "uploading" | "done" | "failed";
  destination: Destination;
  // True once this item's destination has been changed independently of the shared
  // (global) destination — from then on, changing the global destination no longer
  // overwrites this item, matching the "shared by default, per-file override" behavior.
  overridden: boolean;
  tagIds: string[];
  errorMessage?: string;
  tagPickerOpen?: boolean;
};

type TagOption = { id: string; name: string };

function extToFileType(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "file";
  return ext;
}

// Splits a filename into an editable base and a locked extension (including the dot) so
// renaming can never accidentally strip or corrupt the extension. Names with no extension,
// or dotfile-style names starting with a dot (e.g. ".env"), are treated as having no
// extension at all — the whole thing is editable.
function splitName(name: string): { base: string; ext: string } {
  const idx = name.lastIndexOf(".");
  if (idx <= 0) return { base: name, ext: "" };
  return { base: name.slice(0, idx), ext: name.slice(idx) };
}

function destinationSummary(d: Destination): string {
  if (!d.clientId) return "";
  const parts = [d.clientName, d.caseTitle ?? "Unfiled"];
  const label = parts.join(" → ");
  return d.folderName ? `${label} · 📁 ${d.folderName}` : label;
}

export default function UploadPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isFiling, setIsFiling] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const [globalDestination, setGlobalDestination] = useState<Destination>(EMPTY_DESTINATION);
  const [globalPickerOpen, setGlobalPickerOpen] = useState(false);
  const [perItemPickerId, setPerItemPickerId] = useState<string | null>(null);

  const { data: clientsData } = useApi<{ clients: ClientOption[] }>("/clients");
  const { data: casesData } = useApi<{ cases: CaseOption[] }>("/cases");
  const { data: foldersData } = useApi<{ folders: FolderOption[] }>("/folders");
  const { data: tagsData } = useApi<{ tags: TagOption[] }>("/tags");
  const clients = clientsData?.clients ?? [];
  const cases = casesData?.cases ?? [];
  const folders = foldersData?.folders ?? [];
  const tags = tagsData?.tags ?? [];

  function addFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    const items: QueueItem[] = Array.from(files).map((file, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      file,
      state: "ready",
      destination: globalDestination,
      overridden: false,
      tagIds: [],
    }));
    setQueue((q) => [...q, ...items]);
  }

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setQueue((q) => q.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function retry(id: string) {
    updateItem(id, { state: "ready", errorMessage: undefined });
  }

  // Applying a new global destination re-syncs every item that hasn't been individually
  // overridden — items with their own destination are left alone.
  function applyGlobalDestination(next: Destination) {
    setGlobalDestination(next);
    setQueue((q) => q.map((item) => (item.overridden ? item : { ...item, destination: next })));
  }

  function applyItemDestination(id: string, next: Destination) {
    updateItem(id, { destination: next, overridden: true });
  }

  const readyCount = queue.filter((i) => i.state === "ready").length;
  const readyMissingDestination = queue.filter((i) => i.state === "ready" && !i.destination.clientId).length;
  const needsAttention = queue.filter((i) => i.state === "failed").length;

  async function fileAll() {
    setIsFiling(true);
    let succeeded = 0;
    let failed = 0;
    try {
      for (const item of queue) {
        if (item.state !== "ready" || !item.destination.clientId) continue;
        updateItem(item.id, { state: "uploading" });
        try {
          const { document, uploadUrl } = await apiFetch<{
            document: { id: string };
            uploadUrl: string | null;
          }>("/documents", {
            method: "POST",
            body: JSON.stringify({
              name: item.name,
              // Recomputed from the (possibly user-edited) name rather than a value cached
              // at drop time, so renaming the extension keeps this in sync.
              fileType: extToFileType(item.name),
              clientId: item.destination.clientId,
              caseId: item.destination.caseId || undefined,
              folderId: item.destination.folderId || undefined,
              contentType: item.file.type || undefined,
              sizeBytes: item.file.size || undefined,
            }),
          });

          // If R2 is configured, uploadUrl is a presigned PUT URL — push the actual bytes
          // straight to storage from the browser. Otherwise this stays a metadata-only
          // record (no bytes stored) and the document viewer will say so explicitly.
          if (uploadUrl) {
            const putRes = await fetch(uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": item.file.type || "application/octet-stream" },
              body: item.file,
            });
            if (!putRes.ok) {
              throw new Error(
                `Upload to storage failed (${putRes.status}). If this keeps happening, the storage bucket's CORS policy likely needs to allow PUT requests from this app's origin.`,
              );
            }

            // Tells the server the bytes have actually landed in storage — that's what kicks
            // off OCR for eligible file types. Best-effort: OCR just won't run if this fails.
            await apiFetch(`/documents/${document.id}/confirm-upload`, { method: "POST" }).catch(() => {});
          }

          for (const tagId of item.tagIds) {
            await apiFetch(`/documents/${document.id}/tags`, {
              method: "POST",
              body: JSON.stringify({ tagId }),
            }).catch(() => {});
          }

          updateItem(item.id, { state: "done", documentId: document.id });
          succeeded += 1;
        } catch (err) {
          updateItem(item.id, {
            state: "failed",
            errorMessage: err instanceof Error ? err.message : "Upload failed.",
          });
          failed += 1;
        }
      }

      // Report what actually happened instead of a blanket "success" — a failed item is
      // still visible inline with a Retry button, but the toast shouldn't contradict it.
      if (failed === 0 && succeeded > 0) {
        toast.success(succeeded === 1 ? "Document filed." : `${succeeded} documents filed.`);
      } else if (succeeded > 0 && failed > 0) {
        toast.warning(`${succeeded} filed, ${failed} failed — see the queue below.`);
      } else if (failed > 0) {
        toast.error(failed === 1 ? "Upload failed." : `${failed} uploads failed — see the queue below.`);
      }
    } finally {
      setIsFiling(false);
    }
  }

  async function toggleTag(item: QueueItem, tagId: string) {
    const has = item.tagIds.includes(tagId);
    const nextTagIds = has ? item.tagIds.filter((t) => t !== tagId) : [...item.tagIds, tagId];
    updateItem(item.id, { tagIds: nextTagIds });

    // If the document has already been filed, sync the tag change immediately.
    if (item.documentId) {
      try {
        if (has) {
          await apiFetch(`/documents/${item.documentId}/tags/${tagId}`, { method: "DELETE" });
        } else {
          await apiFetch(`/documents/${item.documentId}/tags`, {
            method: "POST",
            body: JSON.stringify({ tagId }),
          });
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update tag.");
        updateItem(item.id, { tagIds: item.tagIds });
      }
    }
  }

  const perItemPickerTarget = queue.find((i) => i.id === perItemPickerId);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Upload & import</h1>
        <p className="text-sm text-muted-foreground">
          Add documents from your device or a mobile scan, then choose where they're filed.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Destination</p>
            {globalDestination.clientId ? (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Users className="size-3 text-muted-foreground" />
                  {globalDestination.clientName}
                </span>
                <span className="flex items-center gap-1 text-foreground">
                  <Briefcase className="size-3 text-muted-foreground" />
                  {globalDestination.caseTitle ?? "Unfiled"}
                </span>
                {globalDestination.folderId ? (
                  <span className="flex items-center gap-1 text-foreground">
                    <Folder className="size-3 text-muted-foreground" />
                    {globalDestination.folderName}
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                No destination chosen yet — pick one to apply it to every file you add below.
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setGlobalPickerOpen(true)}>
            <MapPin />
            {globalDestination.clientId ? "Change destination" : "Choose destination"}
          </Button>
        </div>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center transition-colors",
          isDraggingOver ? "border-brand bg-brand-muted/40" : "border-border bg-muted/30 hover:bg-muted/50",
        )}
      >
        <UploadCloud className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Drag documents here</p>
        <p className="text-xs text-muted-foreground">PDF, DOCX, XLSX, JPG or PNG · up to 50 MB each</p>
        <span className="mt-2 inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground">
          Browse files
        </span>
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border px-6 py-12 text-center">
          <FileText className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No files queued</p>
          <p className="text-xs text-muted-foreground">Drag documents above, or browse files to get started.</p>
        </div>
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-foreground">Upload queue</p>
            <p className="text-xs text-muted-foreground">
              {queue.length} files{needsAttention > 0 ? ` · ${needsAttention} needs attention` : ""}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {queue.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  {item.state === "ready" ? (
                    <div className="flex min-w-0 flex-1 items-center">
                      <input
                        value={splitName(item.name).base}
                        onChange={(e) =>
                          updateItem(item.id, { name: `${e.target.value}${splitName(item.name).ext}` })
                        }
                        className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-medium text-foreground hover:border-input focus:border-input focus:outline-none"
                      />
                      {splitName(item.name).ext ? (
                        <span className="shrink-0 pr-1.5 text-sm font-medium text-muted-foreground">
                          {splitName(item.name).ext}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{item.name}</p>
                  )}
                  {item.state === "done" ? (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="size-3.5" />
                      Uploaded
                    </span>
                  ) : item.state === "uploading" ? (
                    <span className="text-xs text-muted-foreground">Filing…</span>
                  ) : null}
                </div>

                {item.state === "failed" ? (
                  <div className="mt-2 flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                      <div>
                        <p className="text-xs font-medium text-destructive">Upload failed</p>
                        <p className="text-xs text-destructive/80">{item.errorMessage}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => retry(item.id)}>
                      <RotateCcw />
                      Retry
                    </Button>
                  </div>
                ) : item.state === "ready" ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                    {item.destination.clientId ? (
                      <span className="text-muted-foreground">{destinationSummary(item.destination)}</span>
                    ) : (
                      <span className="text-destructive">No destination chosen</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPerItemPickerId(item.id)}
                      className="font-medium text-brand hover:underline"
                    >
                      {item.destination.clientId ? "Change" : "Choose"}
                    </button>
                  </div>
                ) : null}

                {item.state === "ready" || item.state === "done" ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {item.tagIds.map((tagId) => {
                      const tag = tags.find((t) => t.id === tagId);
                      if (!tag) return null;
                      return (
                        <span
                          key={tagId}
                          className="inline-flex items-center gap-1 rounded-full bg-brand-muted px-2 py-0.5 text-[11px] font-medium text-brand-foreground"
                        >
                          {tag.name}
                          <button
                            type="button"
                            onClick={() => toggleTag(item, tagId)}
                            aria-label={`Remove tag ${tag.name}`}
                          >
                            <X className="size-2.5" />
                          </button>
                        </span>
                      );
                    })}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => updateItem(item.id, { tagPickerOpen: !item.tagPickerOpen })}
                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/50"
                      >
                        <Plus className="size-2.5" />
                        Add tag
                      </button>
                      {item.tagPickerOpen ? (
                        <div className="absolute top-full left-0 z-10 mt-1 flex max-h-40 w-40 flex-col gap-0.5 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md">
                          {tags.length === 0 ? (
                            <p className="px-2 py-1 text-[11px] text-muted-foreground">No tags yet.</p>
                          ) : (
                            tags.map((tag) => (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => toggleTag(item, tag.id)}
                                className={cn(
                                  "flex items-center justify-between rounded-md px-2 py-1 text-left text-[11px] hover:bg-muted/60",
                                  item.tagIds.includes(tag.id) && "font-semibold text-brand",
                                )}
                              >
                                {tag.name}
                                {item.tagIds.includes(tag.id) ? <CheckCircle2 className="size-3" /> : null}
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col items-end gap-1.5">
            {readyCount > 0 && readyMissingDestination > 0 ? (
              <p className="text-[11px] text-destructive">
                {readyMissingDestination} file{readyMissingDestination === 1 ? "" : "s"} still need a destination.
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setQueue([])}>
                Cancel
              </Button>
              <Button onClick={fileAll} disabled={isFiling || readyCount === 0 || readyMissingDestination > 0}>
                {isFiling ? "Filing…" : `File ${readyCount} documents`}
              </Button>
            </div>
          </div>
        </div>
      )}

      <DestinationPicker
        open={globalPickerOpen}
        onOpenChange={setGlobalPickerOpen}
        value={globalDestination}
        onChange={applyGlobalDestination}
        clients={clients}
        cases={cases}
        folders={folders}
      />

      {perItemPickerTarget ? (
        <DestinationPicker
          open={Boolean(perItemPickerId)}
          onOpenChange={(open) => !open && setPerItemPickerId(null)}
          value={perItemPickerTarget.destination}
          onChange={(next) => applyItemDestination(perItemPickerTarget.id, next)}
          clients={clients}
          cases={cases}
          folders={folders}
        />
      ) : null}
    </div>
  );
}
