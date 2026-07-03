"use client";

import { Button, buttonVariants } from "@CMLP/ui/components/button";
import { Card, CardContent } from "@CMLP/ui/components/card";
import { Download, FileText, FileX, PenLine, Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { SignDocumentDialog } from "@/components/sign-document-dialog";
import { StatusPill } from "@/components/status-pill";
import { apiFetch, useApi } from "@/hooks/use-api";
import { formatStatus } from "@/lib/format-status";

type Signature = {
  id: string;
  signerName: string;
  signerRole: string | null;
  witnessedBy: string | null;
  createdAt: string;
};

type DocumentDetail = {
  id: string;
  name: string;
  fileType: string;
  status: string;
  uploadedBy: string;
  modified: string;
  client: { id: string; name: string } | null;
  case: { id: string; title: string } | null;
  folder: { id: string; name: string } | null;
  tags: { id: string; name: string; colorClass: string }[];
  hasStoredFile: boolean;
  downloadUrl: string | null;
  signatures: Signature[];
};

type TagOption = { id: string; name: string; colorClass: string };
type CaseOption = { id: string; title: string; client: { id: string } };
type FolderOption = { id: string; name: string };
type HistoryEntry = { id: string; action: string; description: string; actor: string; timestamp: string };

const STATUSES = ["FILED", "SIGNED", "EXECUTED"] as const;
const IMAGE_TYPES = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

const ACTION_LABELS: Record<string, string> = {
  VIEWED: "Viewed",
  UPLOADED: "Uploaded",
  SIGNED: "Signed",
  FILED: "Filed",
  MOVED: "Moved",
  DELETED: "Deleted",
  RESTORED: "Restored",
  OCR_COMPLETED: "OCR completed",
  CASE_OPENED: "Case opened",
};

export default function DocumentViewerPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const router = useRouter();
  const { data, isLoading, error, refetch } = useApi<{ document: DocumentDetail }>(`/documents/${documentId}`);
  const doc = data?.document;
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const [signDialogOpen, setSignDialogOpen] = useState(false);

  const { data: allTagsData } = useApi<{ tags: TagOption[] }>("/tags");
  const allTags = allTagsData?.tags ?? [];
  const availableTags = allTags.filter((t) => !doc?.tags.some((dt) => dt.id === t.id));

  const { data: casesData } = useApi<{ cases: CaseOption[] }>(doc ? "/cases" : null);
  const casesForClient = (casesData?.cases ?? []).filter((c) => c.client.id === doc?.client?.id);
  const { data: foldersData } = useApi<{ folders: FolderOption[] }>(doc ? "/folders" : null);
  const folders = foldersData?.folders ?? [];

  const { data: historyData } = useApi<{ entries: HistoryEntry[] }>(doc ? `/documents/${documentId}/history` : null);
  const history = historyData?.entries ?? [];

  async function handleDelete() {
    if (!doc) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/documents/${doc.id}`, { method: "DELETE" });
      router.push("/documents");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleDownload() {
    if (doc?.downloadUrl) {
      window.open(doc.downloadUrl, "_blank");
      return;
    }
    toast.info("No file is stored for this document yet — this record has no uploaded bytes to download.");
  }

  async function addTag(tagId: string) {
    if (!doc || !tagId) return;
    await apiFetch(`/documents/${doc.id}/tags`, { method: "POST", body: JSON.stringify({ tagId }) });
    refetch();
  }

  async function removeTag(tagId: string) {
    if (!doc) return;
    await apiFetch(`/documents/${doc.id}/tags/${tagId}`, { method: "DELETE" });
    refetch();
  }

  async function saveRename() {
    if (!doc || !nameDraft.trim() || nameDraft.trim() === doc.name) {
      setIsRenaming(false);
      return;
    }
    await apiFetch(`/documents/${doc.id}`, { method: "PATCH", body: JSON.stringify({ name: nameDraft.trim() }) });
    setIsRenaming(false);
    refetch();
  }

  async function updateStatus(status: string) {
    if (!doc) return;
    await apiFetch(`/documents/${doc.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    refetch();
  }

  async function moveCase(caseId: string) {
    if (!doc) return;
    await apiFetch(`/documents/${doc.id}`, { method: "PATCH", body: JSON.stringify({ caseId: caseId || null }) });
    toast.success("Document moved.");
    refetch();
  }

  async function moveFolder(folderId: string) {
    if (!doc) return;
    await apiFetch(`/documents/${doc.id}`, { method: "PATCH", body: JSON.stringify({ folderId: folderId || null }) });
    refetch();
  }

  if (isLoading) {
    return <LoadingState label="Loading document…" />;
  }

  if (error && !error.toLowerCase().includes("not found")) {
    return <InlineError message={error} onRetry={refetch} />;
  }

  if (!doc) {
    return (
      <EmptyState
        icon={FileX}
        title="Document not found"
        description="This document may have been removed, or the link is out of date."
        action={
          <Link href="/documents" className={buttonVariants({ size: "sm", variant: "outline" })}>
            Back to documents
          </Link>
        }
      />
    );
  }

  const isImage = IMAGE_TYPES.has(doc.fileType.toLowerCase());
  const isPdf = doc.fileType.toLowerCase() === "pdf";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <Card className="flex min-h-[420px] items-center justify-center overflow-hidden bg-muted/30 p-0">
          {doc.downloadUrl && isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doc.downloadUrl} alt={doc.name} className="max-h-[600px] w-full object-contain" />
          ) : doc.downloadUrl && isPdf ? (
            <iframe src={doc.downloadUrl} title={doc.name} className="h-[600px] w-full border-0" />
          ) : (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <FileText className="size-10 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {doc.hasStoredFile
                  ? "Preview isn't available for this file type — download to view it."
                  : "This is a scanned/uploaded document, but no file bytes are stored yet — download won't work until it's re-filed with storage configured."}
              </p>
            </div>
          )}
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <div>
              {isRenaming ? (
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveRename()}
                  onBlur={saveRename}
                  className="w-full rounded-lg border border-input bg-background px-1.5 py-1.5 text-sm font-medium text-foreground"
                />
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium break-words text-foreground">{doc.name}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(doc.name);
                      setIsRenaming(true);
                    }}
                    aria-label="Rename document"
                  >
                    <Pencil className="size-3.5 shrink-0 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              )}
              <div className="mt-1.5">
                <select
                  value={doc.status}
                  onChange={(e) => updateStatus(e.target.value)}
                  className="py-1 rounded-lg border border-input bg-background px-1 text-[11px] text-foreground"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {formatStatus(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Client</p>
                {doc.client ? (
                  <Link href={`/clients/${doc.client.id}`} className="text-brand hover:underline">
                    {doc.client.name}
                  </Link>
                ) : (
                  <p className="text-foreground">—</p>
                )}
              </div>
              <div>
                <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Case</p>
                <select
                  value={doc.case?.id ?? ""}
                  onChange={(e) => moveCase(e.target.value)}
                  className="mt-0.5 py-1.5 w-full rounded-lg border border-input bg-background px-1.5 text-xs text-foreground"
                >
                  <option value="">Unfiled</option>
                  {casesForClient.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Folder</p>
                <select
                  value={doc.folder?.id ?? ""}
                  onChange={(e) => moveFolder(e.target.value)}
                  className="mt-0.5 py-1.5 w-full rounded-lg border border-input bg-background px-1.5 text-xs text-foreground"
                >
                  <option value="">No folder</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                  Uploaded by
                </p>
                <p className="text-foreground">{doc.uploadedBy}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Modified</p>
                <p className="text-foreground">{doc.modified}</p>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Tags</p>
                  {availableTags.length > 0 ? (
                    isAddingTag ? (
                      <select
                        autoFocus
                        defaultValue=""
                        onChange={(e) => {
                          addTag(e.target.value);
                          setIsAddingTag(false);
                        }}
                        onBlur={() => setIsAddingTag(false)}
                        className="py-1 rounded-lg border border-input bg-background px-1 text-[11px] text-foreground"
                      >
                        <option value="" disabled>
                          Select tag…
                        </option>
                        {availableTags.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingTag(true)}
                        className="text-[11px] font-medium text-brand hover:underline"
                      >
                        + Add
                      </button>
                    )
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {doc.tags.length === 0 ? (
                    <p className="text-foreground">—</p>
                  ) : (
                    doc.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground"
                      >
                        <span className={`size-1.5 rounded-full ${tag.colorClass}`} />
                        {tag.name}
                        <button type="button" onClick={() => removeTag(tag.id)} aria-label={`Remove ${tag.name}`}>
                          <X className="size-2.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Signatures</p>
                {doc.signatures.length === 0 ? (
                  <p className="mt-1 text-foreground">Not yet signed.</p>
                ) : (
                  <ul className="mt-1 flex flex-col gap-1.5">
                    {doc.signatures.map((s) => (
                      <li key={s.id} className="rounded-lg border border-border px-2 py-1.5">
                        <p className="font-medium text-foreground">
                          {s.signerName}
                          {s.signerRole ? ` · ${s.signerRole}` : ""}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          {s.witnessedBy ? ` · witnessed by ${s.witnessedBy}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <Button className="w-full" onClick={handleDownload}>
              <Download />
              Download
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setSignDialogOpen(true)}>
              <PenLine />
              Sign document
            </Button>
            <Button variant="destructive" className="w-full" onClick={handleDelete} disabled={isDeleting}>
              <Trash2 />
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {doc ? (
        <SignDocumentDialog
          documentId={doc.id}
          documentName={doc.name}
          open={signDialogOpen}
          onOpenChange={setSignDialogOpen}
          onSigned={refetch}
        />
      ) : null}

      {history.length > 0 ? (
        <Card>
          <CardContent>
            <p className="mb-3 text-xs font-medium text-foreground">History</p>
            <ol className="space-y-3 border-l border-border pl-4">
              {history.map((entry) => (
                <li key={entry.id} className="relative">
                  <span className="absolute top-1 -left-[21px] size-2 rounded-full bg-brand" />
                  <p className="text-xs text-foreground">
                    {ACTION_LABELS[entry.action] ?? entry.action} · {entry.actor}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{entry.timestamp}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
