"use client";

import { FolderPlus, Pencil, Tags as TagsIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { CreateFolderDialog } from "@/components/create-folder-dialog";
import { CreateTagDialog } from "@/components/create-tag-dialog";
import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { apiFetch, useApi } from "@/hooks/use-api";

type Folder = { id: string; name: string; documentCount: number; tags: { id: string; name: string; colorClass: string }[] };
type Tag = { id: string; name: string; colorClass: string; documentCount: number };

export default function FoldersTagsPage() {
  // Folders/tags are equal-access for both roles now — no admin gate here (the only two
  // attorney-only areas in the app are the Audit Log and Users & Roles).
  const { data: foldersData, isLoading: foldersLoading, error: foldersError, refetch: refetchFolders } =
    useApi<{ folders: Folder[] }>("/folders");
  const { data: tagsData, isLoading: tagsLoading, error: tagsError, refetch: refetchTags } =
    useApi<{ tags: Tag[] }>("/tags");

  const folders = foldersData?.folders ?? [];
  const tags = tagsData?.tags ?? [];

  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");

  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Folder | null>(null);
  const [deleteTagTarget, setDeleteTagTarget] = useState<Tag | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalDocs = folders.reduce((sum, f) => sum + f.documentCount, 0);

  function startEditingTag(tag: Tag) {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
  }

  async function saveTagName() {
    if (!editingTagId || !editingTagName.trim()) {
      setEditingTagId(null);
      return;
    }
    await apiFetch(`/tags/${editingTagId}`, {
      method: "PATCH",
      body: JSON.stringify({ name: editingTagName.trim() }),
    });
    setEditingTagId(null);
    refetchTags();
  }

  async function confirmDeleteFolder(deleteDocuments: boolean) {
    if (!deleteFolderTarget) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/folders/${deleteFolderTarget.id}`, {
        method: "DELETE",
        body: JSON.stringify({ deleteDocuments }),
      });
      toast.success("Folder moved to trash.");
      setDeleteFolderTarget(null);
      refetchFolders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete folder.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function confirmDeleteTag() {
    if (!deleteTagTarget) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/tags/${deleteTagTarget.id}`, { method: "DELETE" });
      toast.success("Tag moved to trash.");
      setDeleteTagTarget(null);
      refetchTags();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete tag.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Folders & tags</h1>
        <p className="text-sm text-muted-foreground">Cross-cutting organisation layered over clients and cases.</p>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Folders</h2>
          <p className="text-xs text-muted-foreground">
            {folders.length} folders · {totalDocs.toLocaleString()} documents
          </p>
        </div>

        {foldersLoading ? (
          <LoadingState label="Loading folders…" />
        ) : foldersError ? (
          <InlineError message={foldersError} onRetry={refetchFolders} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {folders.map((folder) => (
              <div key={folder.id} className="group relative rounded-xl border border-border bg-card p-4">
                <button
                  type="button"
                  onClick={() => setDeleteFolderTarget(folder)}
                  aria-label={`Delete ${folder.name}`}
                  className="absolute top-2.5 right-2.5 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                </button>
                <FolderPlus className="size-4 text-brand" />
                <Link href={`/folders/${folder.id}`} className="block">
                  <p className="mt-2 pr-4 text-sm font-medium text-foreground hover:text-brand hover:underline">
                    {folder.name}
                  </p>
                </Link>
                <p className="text-xs text-muted-foreground">{folder.documentCount} documents</p>
                {folder.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
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
            ))}

            <CreateFolderDialog tags={tags} onCreated={refetchFolders} />
          </div>
        )}

        {!foldersLoading && !foldersError && folders.length === 0 ? (
          <EmptyState icon={FolderPlus} title="No folders yet" description="Create your first folder to start organizing documents." />
        ) : null}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Tags</h2>
          <CreateTagDialog onCreated={refetchTags} />
        </div>

        {tagsLoading ? (
          <LoadingState label="Loading tags…" />
        ) : tagsError ? (
          <InlineError message={tagsError} onRetry={refetchTags} />
        ) : tags.length === 0 ? (
          <EmptyState
            icon={TagsIcon}
            title="No tags yet"
            description="Tags help you find documents across clients and cases."
          />
        ) : (
          // Compact wrapped chips instead of one full-width row per tag — tags are small
          // labels, they shouldn't each claim a whole table row.
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="group flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pr-1.5 pl-2.5 text-xs"
              >
                <span className={`size-2 rounded-full ${tag.colorClass}`} />
                {editingTagId === tag.id ? (
                  <input
                    autoFocus
                    value={editingTagName}
                    onChange={(e) => setEditingTagName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveTagName()}
                    onBlur={saveTagName}
                    className="w-20 rounded border border-input bg-background px-1 text-xs text-foreground"
                  />
                ) : (
                  <Link href={`/tags/${tag.id}`} className="text-foreground hover:text-brand hover:underline">
                    {tag.name}
                  </Link>
                )}
                <span className="text-muted-foreground">· {tag.documentCount}</span>
                <button type="button" onClick={() => startEditingTag(tag)} aria-label={`Rename ${tag.name}`} className="ml-0.5">
                  <Pencil className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTagTarget(tag)}
                  aria-label={`Delete ${tag.name}`}
                >
                  <Trash2 className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteFolderTarget !== null}
        onOpenChange={(open) => !open && setDeleteFolderTarget(null)}
        title={`Delete "${deleteFolderTarget?.name}"?`}
        description="This moves the folder to Trash — it can be restored within 30 days."
        confirmLabel="Delete folder"
        destructive
        isLoading={isDeleting}
        cascadeLabel={
          deleteFolderTarget && deleteFolderTarget.documentCount > 0
            ? `Also delete the ${deleteFolderTarget.documentCount} document${deleteFolderTarget.documentCount === 1 ? "" : "s"} inside this folder`
            : undefined
        }
        onConfirm={confirmDeleteFolder}
      />

      <ConfirmDialog
        open={deleteTagTarget !== null}
        onOpenChange={(open) => !open && setDeleteTagTarget(null)}
        title={`Delete "${deleteTagTarget?.name}"?`}
        description="This moves the tag to Trash — it can be restored within 30 days. Documents keep their other tags."
        confirmLabel="Delete tag"
        destructive
        isLoading={isDeleting}
        onConfirm={confirmDeleteTag}
      />
    </div>
  );
}
