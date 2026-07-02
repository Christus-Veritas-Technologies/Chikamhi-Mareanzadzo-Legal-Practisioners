"use client";

import { Button, buttonVariants } from "@CMLP/ui/components/button";
import { Card, CardContent } from "@CMLP/ui/components/card";
import { Download, FileText, FileX, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { StatusPill } from "@/components/status-pill";
import { apiFetch, useApi } from "@/hooks/use-api";
import { formatStatus } from "@/lib/format-status";

type DocumentDetail = {
  id: string;
  name: string;
  status: string;
  uploadedBy: string;
  modified: string;
  client: { id: string; name: string } | null;
  case: { id: string; title: string } | null;
  tags: { id: string; name: string; colorClass: string }[];
  hasStoredFile: boolean;
  downloadUrl: string | null;
};

type TagOption = { id: string; name: string; colorClass: string };

export default function DocumentViewerPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const router = useRouter();
  const { data, isLoading, error, refetch } = useApi<{ document: DocumentDetail }>(`/documents/${documentId}`);
  const doc = data?.document;
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);

  const { data: allTagsData } = useApi<{ tags: TagOption[] }>("/tags");
  const allTags = allTagsData?.tags ?? [];
  const availableTags = allTags.filter((t) => !doc?.tags.some((dt) => dt.id === t.id));

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

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
      <Card className="flex min-h-[420px] items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-2 text-center">
          <FileText className="size-10 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Preview isn't available in this build yet — download to view the file.
          </p>
        </div>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium break-words text-foreground">{doc.name}</p>
            <div className="mt-1.5">
              <StatusPill status={formatStatus(doc.status)} />
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
              {doc.case ? (
                <Link href={`/cases/${doc.case.id}`} className="text-brand hover:underline">
                  {doc.case.title}
                </Link>
              ) : (
                <p className="text-foreground">—</p>
              )}
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
                      className="h-6 rounded-none border border-input bg-background px-1 text-[11px] text-foreground"
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
          </div>

          <Button className="w-full" onClick={handleDownload}>
            <Download />
            Download
          </Button>
          <Button variant="outline" className="w-full" onClick={handleDelete} disabled={isDeleting}>
            <Trash2 />
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
