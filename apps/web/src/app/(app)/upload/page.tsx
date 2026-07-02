"use client";

import { Button } from "@CMLP/ui/components/button";
import { AlertCircle, CheckCircle2, FileText, RotateCcw, UploadCloud } from "lucide-react";
import { useState } from "react";

import { CASES, CLIENTS } from "@/lib/mock-data";

type QueueItem = {
  id: string;
  name: string;
  kind: "pdf" | "docx" | "image";
  progress: number;
  state: "uploading" | "done" | "failed";
  clientId?: string;
  caseId?: string;
  tag?: string;
  errorMessage?: string;
};

const INITIAL_QUEUE: QueueItem[] = [
  {
    id: "q1",
    name: "Deed of Transfer — Stand 4471.pdf",
    kind: "pdf",
    progress: 68,
    state: "uploading",
    clientId: "moyo-holdings",
    caseId: "stand-4471-transfer",
  },
  {
    id: "q2",
    name: "Scan — Rates Clearance.jpg",
    kind: "image",
    progress: 100,
    state: "done",
    clientId: "bulawayo-city-council",
    tag: "Rates",
  },
  {
    id: "q3",
    name: "Board Minutes 2024.docx",
    kind: "docx",
    progress: 42,
    state: "failed",
    errorMessage: "Network interrupted at 42% — the file was not saved to R2.",
  },
];

export default function UploadPage() {
  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE);

  function retry(id: string) {
    setQueue((q) =>
      q.map((item) => (item.id === id ? { ...item, state: "uploading", progress: 0, errorMessage: undefined } : item)),
    );
  }

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setQueue((q) => q.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  const readyCount = queue.filter((i) => i.state !== "failed").length;
  const needsAttention = queue.filter((i) => i.state === "failed").length;

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
        <input type="file" multiple className="hidden" />
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
                      Uploaded{item.tag ? " · OCR done" : ""}
                    </span>
                  ) : item.state === "uploading" ? (
                    <span className="text-xs text-muted-foreground">{item.progress}%</span>
                  ) : null}
                </div>

                {item.state === "uploading" ? (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                ) : null}

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
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select
                      value={item.clientId ?? ""}
                      onChange={(e) => updateItem(item.id, { clientId: e.target.value, caseId: undefined })}
                      className="h-7 rounded-none border border-input bg-background px-2 text-xs text-foreground"
                    >
                      <option value="">Select client…</option>
                      {CLIENTS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={item.caseId ?? ""}
                      onChange={(e) => updateItem(item.id, { caseId: e.target.value })}
                      className="h-7 rounded-none border border-input bg-background px-2 text-xs text-foreground"
                    >
                      <option value="">Select case…</option>
                      {CASES.filter((c) => c.clientId === item.clientId).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                    {item.tag ? (
                      <span className="rounded-full bg-brand-muted px-2 py-0.5 text-[11px] font-medium text-brand-foreground">
                        {item.tag}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="rounded-none border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                        onClick={() => updateItem(item.id, { tag: "Tagged" })}
                      >
                        + Add tag
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button>File {readyCount} documents</Button>
          </div>
        </div>
      )}
    </div>
  );
}
