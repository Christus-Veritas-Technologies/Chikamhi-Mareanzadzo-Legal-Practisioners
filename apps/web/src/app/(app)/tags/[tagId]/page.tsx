"use client";

import { Button, buttonVariants } from "@CMLP/ui/components/button";
import { Card, CardContent } from "@CMLP/ui/components/card";
import { FileX2, FolderOpen, PenLine, Tags as TagsIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { SignDocumentDialog } from "@/components/sign-document-dialog";
import { StatusPill } from "@/components/status-pill";
import { apiFetch, useApi } from "@/hooks/use-api";
import { formatStatus } from "@/lib/format-status";

type TagDetail = {
  id: string;
  name: string;
  colorClass: string;
  createdAt: string;
  documents: {
    id: string;
    name: string;
    status: string;
    modified: string;
    client: { id: string; name: string } | null;
    case: { id: string; title: string } | null;
  }[];
  folders: { id: string; name: string; documentCount: number }[];
};

export default function TagDetailPage() {
  const { tagId } = useParams<{ tagId: string }>();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [signTarget, setSignTarget] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, error, refetch } = useApi<{ tag: TagDetail }>(`/tags/${tagId}`);
  const tag = data?.tag;

  async function deleteTag() {
    setIsDeleting(true);
    try {
      await apiFetch(`/tags/${tagId}`, { method: "DELETE" });
      toast.success("Tag moved to trash.");
      router.push("/folders-tags");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete tag.");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading tag…" />;
  }

  if (error && !error.toLowerCase().includes("not found")) {
    return <InlineError message={error} onRetry={refetch} />;
  }

  if (!tag) {
    return (
      <EmptyState
        icon={TagsIcon}
        title="Tag not found"
        description="This tag may have been removed, or the link is out of date."
        action={
          <Link href="/folders-tags" className={buttonVariants({ size: "sm", variant: "outline" })}>
            Back to folders & tags
          </Link>
        }
      />
    );
  }

  const documents = tag.documents;
  const folders = tag.folders;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        <Link href="/folders-tags" className="hover:text-foreground hover:underline">
          Folders & tags
        </Link>{" "}
        / {tag.name}
      </p>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
            <span className={`size-4 rounded-full ${tag.colorClass}`} />
          </span>
          <div>
            <h1 className="font-serif text-xl font-semibold text-foreground">{tag.name}</h1>
            <p className="text-xs text-muted-foreground">Created {tag.createdAt}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete tag
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-xl font-semibold text-foreground">{documents.length}</p>
            <p className="text-xs text-muted-foreground">Documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xl font-semibold text-foreground">{folders.length}</p>
            <p className="text-xs text-muted-foreground">Folders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xl font-semibold text-foreground">
              {documents.filter((d) => d.status === "FILED").length}
            </p>
            <p className="text-xs text-muted-foreground">Awaiting signature</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">Folders</h2>
        {folders.length === 0 ? (
          <p className="text-xs text-muted-foreground">No folders carry this tag.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {folders.map((folder) => (
              <Link key={folder.id} href={`/folders/${folder.id}`}>
                <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40">
                  <FolderOpen className="size-4 text-brand" />
                  <p className="mt-2 text-sm font-medium text-foreground">{folder.name}</p>
                  <p className="text-xs text-muted-foreground">{folder.documentCount} documents</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">Documents</h2>
        <Card className="p-0">
          {documents.length === 0 ? (
            <EmptyState
              icon={FileX2}
              title="No documents yet"
              description="Documents tagged with this label will show up here."
              action={
                <Link href="/upload" className={buttonVariants({ size: "sm", variant: "outline" })}>
                  Upload a document
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] tracking-wide text-muted-foreground uppercase">
                    <th className="px-4 py-2.5 font-medium">Document</th>
                    <th className="px-4 py-2.5 font-medium">Client</th>
                    <th className="px-4 py-2.5 font-medium">Case</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Modified</th>
                    <th className="px-4 py-2.5 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        <Link href={`/documents/${doc.id}`} className="hover:text-brand">
                          {doc.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {doc.client ? (
                          <Link href={`/clients/${doc.client.id}`} className="hover:text-brand hover:underline">
                            {doc.client.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {doc.case ? (
                          <Link href={`/cases/${doc.case.id}`} className="hover:text-brand hover:underline">
                            {doc.case.title}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={formatStatus(doc.status)} />
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{doc.modified}</td>
                      <td className="px-4 py-2.5 text-right">
                        {doc.status === "FILED" ? (
                          <button
                            type="button"
                            onClick={() => setSignTarget({ id: doc.id, name: doc.name })}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
                          >
                            <PenLine className="size-3" />
                            Sign
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this tag?"
        description={`${tag.name} will be moved to Trash and can be restored within 30 days. Documents and folders keep their other tags.`}
        confirmLabel="Delete tag"
        destructive
        isLoading={isDeleting}
        onConfirm={deleteTag}
      />

      {signTarget ? (
        <SignDocumentDialog
          documentId={signTarget.id}
          documentName={signTarget.name}
          open={Boolean(signTarget)}
          onOpenChange={(open) => !open && setSignTarget(null)}
          onSigned={refetch}
        />
      ) : null}
    </div>
  );
}
