"use client";

import { Button } from "@CMLP/ui/components/button";
import { cn } from "@CMLP/ui/lib/utils";
import { AlertCircle, CheckCircle2, FileText, Plus, RotateCcw, UploadCloud, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { apiFetch, useApi } from "@/hooks/use-api";

type QueueItem = {
  id: string;
  documentId?: string;
  name: string;
  fileType: string;
  file: File;
  state: "ready" | "uploading" | "done" | "failed";
  clientId?: string;
  caseId?: string;
  tagIds: string[];
  errorMessage?: string;
  tagPickerOpen?: boolean;
};

type ClientOption = { id: string; name: string };
type CaseOption = { id: string; title: string; client: { id: string } };
type TagOption = { id: string; name: string };

function extToFileType(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "file";
  return ext;
}

export default function UploadPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isFiling, setIsFiling] = useState(false);

  const { data: clientsData } = useApi<{ clients: ClientOption[] }>("/clients");
  const { data: casesData } = useApi<{ cases: CaseOption[] }>("/cases");
  const { data: tagsData } = useApi<{ tags: TagOption[] }>("/tags");
  const clients = clientsData?.clients ?? [];
  const cases = casesData?.cases ?? [];
  const tags = tagsData?.tags ?? [];

  function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const items: QueueItem[] = Array.from(files).map((file, i) => ({
      id: `${Date.now()}-${i}`,
      name: file.name,
      fileType: extToFileType(file.name),
      file,
      state: "ready",
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

  const readyCount = queue.filter((i) => i.state === "ready").length;
  const needsAttention = queue.filter((i) => i.state === "failed").length;

  async function fileAll() {
    setIsFiling(true);
    try {
      for (const item of queue) {
        if (item.state !== "ready" || !item.clientId) continue;
        updateItem(item.id, { state: "uploading" });
        try {
          const { document, uploadUrl } = await apiFetch<{
            document: { id: string };
            uploadUrl: string | null;
          }>("/documents", {
            method: "POST",
            body: JSON.stringify({
              name: item.name,
              fileType: item.fileType,
              clientId: item.clientId,
              caseId: item.caseId || undefined,
              contentType: item.file.type || undefined,
              sizeBytes: item.file.size || undefined,
            }),
          });

          // If R2 is configured, uploadUrl is a presigned PUT URL — push the actual bytes
          // straight to storage from the browser. Otherwise this stays a metadata-only record.
          if (uploadUrl) {
            const putRes = await fetch(uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": item.file.type || "application/octet-stream" },
              body: item.file,
            });
            if (!putRes.ok) throw new Error("File upload to storage failed.");

            // Tells the server the bytes have actually landed in R2 — that's what kicks off
            // OCR for eligible file types. Best-effort: OCR just won't run if this fails.
            await apiFetch(`/documents/${document.id}/confirm-upload`, { method: "POST" }).catch(() => {});
          }

          for (const tagId of item.tagIds) {
            await apiFetch(`/documents/${document.id}/tags`, {
              method: "POST",
              body: JSON.stringify({ tagId }),
            }).catch(() => {});
          }

          updateItem(item.id, { state: "done", documentId: document.id });
        } catch (err) {
          updateItem(item.id, {
            state: "failed",
            errorMessage: err instanceof Error ? err.message : "Upload failed.",
          });
        }
      }
      toast.success("Documents filed.");
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

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Upload & import</h1>
        <p className="text-sm text-muted-foreground">
          Add documents from your device or a mobile scan. Assign each to a client and case before filing.
        </p>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-none border border-dashed border-border bg-muted/30 px-6 py-12 text-center hover:bg-muted/50">
        <UploadCloud className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Drag documents here</p>
        <p className="text-xs text-muted-foreground">PDF, DOCX, XLSX, JPG or PNG · up to 50 MB each</p>
        <span className="mt-2 inline-flex h-8 items-center rounded-none bg-primary px-3 text-xs font-medium text-primary-foreground">
          Browse files
        </span>
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFilesSelected(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-none border border-border px-6 py-12 text-center">
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
              <div key={item.id} className="rounded-none border border-border p-3">
                <div className="flex items-center gap-3">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {item.name}
                  </p>
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
                  <div className="mt-2 flex items-start justify-between gap-3 rounded-none border border-destructive/30 bg-destructive/10 px-2.5 py-2">
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
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select
                      value={item.clientId ?? ""}
                      onChange={(e) => updateItem(item.id, { clientId: e.target.value, caseId: undefined })}
                      className="h-7 rounded-none border border-input bg-background px-2 text-xs text-foreground"
                    >
                      <option value="">Select client…</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={item.caseId ?? ""}
                      onChange={(e) => updateItem(item.id, { caseId: e.target.value })}
                      className="h-7 rounded-none border border-input bg-background px-2 text-xs text-foreground"
                      disabled={!item.clientId}
                    >
                      <option value="">Select case…</option>
                      {cases.filter((c) => c.client.id === item.clientId).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
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
                        <div className="absolute top-full left-0 z-10 mt-1 flex max-h-40 w-40 flex-col gap-0.5 overflow-y-auto rounded-none border border-border bg-popover p-1 shadow-md">
                          {tags.length === 0 ? (
                            <p className="px-2 py-1 text-[11px] text-muted-foreground">No tags yet.</p>
                          ) : (
                            tags.map((tag) => (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => toggleTag(item, tag.id)}
                                className={cn(
                                  "flex items-center justify-between rounded-none px-2 py-1 text-left text-[11px] hover:bg-muted/60",
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

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setQueue([])}>
              Cancel
            </Button>
            <Button onClick={fileAll} disabled={isFiling || readyCount === 0}>
              {isFiling ? "Filing…" : `File ${readyCount} documents`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
