"use client";

import { Button, buttonVariants } from "@CMLP/ui/components/button";
import { Card, CardContent } from "@CMLP/ui/components/card";
import { FileX2, FolderX, FolderOpen, PenLine, Trash2 } from "lucide-react";
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

type FolderDetail = {
  id: string;
  name: string;
  createdAt: string;
  tags: { id: string; name: string; colorClass: string }[];
  documents: {
    id: string;
    name: string;
    status: string;
    modified: string;
    client: { id: string; name: string } | null;
    case: { id: string; title: string } | null;
  }[];
};

export default function FolderDetailPage() {
  const { folderId } = useParams<{ folderId: string }>();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [signTarget, setSignTarget] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, error, refetch } = useApi<{ folder: FolderDetail }>(`/folders/${folderId}`);
  const folder = data?.folder;

  async function deleteFolder(deleteDocuments: boolean) {
    setIsDeleting(true);
    try {
      await apiFetch(`/folders/${folderId}`, {
        method: "DELETE",
        body: JSON.stringify({ deleteDocuments }),
      });
      toast.success("Folder moved to trash.");
      router.push("/folders-tags");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete folder.");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading folder…" />;
  }

  if (error && !error.toLowerCase().includes("not found")) {
    return <InlineError message={error} onRetry={refetch} />;
  }

  if (!folder) {
    return (
      <EmptyState
        icon={FolderX}
        title="Folder not found"
        description="This folder may have been removed, or the link is out of date."
        action={
          <Link href="/folders-tags" className={buttonVariants({ size: "sm", variant: "outline" })}>
            Back to folders & tags
          </Link>
        }
      />
    );
  }

  const documents = folder.documents;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        <Link href="/folders-tags" className="hover:text-foreground hover:underline">
          Folders & tags
        </Link>{" "}
        / {folder.name}
      </p>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-muted">
            <FolderOpen className="size-5 text-brand-foreground" />
          </span>
          <div>
            <h1 className="font-serif text-xl font-semibold text-foreground">{folder.name}</h1>
            <p className="text-xs text-muted-foreground">Created {folder.createdAt}</p>
            {folder.tags.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {folder.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="flex items-center gap-1 rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    <span className={`size-1.5 rounded-full ${tag.colorClass}`} />
                    {tag.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/upload" className={buttonVariants()}>
            Upload to folder
          </Link>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete folder
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
            <p className="text-xl font-semibold text-foreground">{folder.tags.length}</p>
            <p className="text-xs text-muted-foreground">Tags</p>
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

      <Card className="p-0">
        {documents.length === 0 ? (
          <EmptyState
            icon={FileX2}
            title="No documents yet"
            description="Documents added to this folder will show up here."
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

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this folder?"
        description={`${folder.name} will be moved to Trash and can be restored within 30 days.`}
        cascadeLabel={
          documents.length > 0
            ? `Also delete the ${documents.length} document${documents.length === 1 ? "" : "s"} inside this folder`
            : undefined
        }
        confirmLabel="Delete folder"
        destructive
        isLoading={isDeleting}
        onConfirm={deleteFolder}
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
