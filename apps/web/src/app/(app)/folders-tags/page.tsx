"use client";

import { FolderPlus, Pencil, Plus, Tags as TagsIcon } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { useCurrentUser } from "@/contexts/current-user-context";
import { apiFetch, useApi } from "@/hooks/use-api";

type Folder = { id: string; name: string; documentCount: number };
type Tag = { id: string; name: string; colorClass: string; documentCount: number };

export default function FoldersTagsPage() {
  // Creating/renaming folders and tags is admin-only server-side — mirror that here so
  // non-admins aren't shown controls that will just 403.
  const isAdmin = useCurrentUser().role === "ADMIN";

  const { data: foldersData, isLoading: foldersLoading, error: foldersError, refetch: refetchFolders } =
    useApi<{ folders: Folder[] }>("/folders");
  const { data: tagsData, isLoading: tagsLoading, error: tagsError, refetch: refetchTags } =
    useApi<{ tags: Tag[] }>("/tags");

  const folders = foldersData?.folders ?? [];
  const tags = tagsData?.tags ?? [];

  const [newFolderName, setNewFolderName] = useState("");
  const [addingFolder, setAddingFolder] = useState(false);
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [isSavingTag, setIsSavingTag] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");

  const totalDocs = folders.reduce((sum, f) => sum + f.documentCount, 0);

  async function addFolder() {
    if (!newFolderName.trim()) return;
    setIsSavingFolder(true);
    try {
      await apiFetch("/folders", { method: "POST", body: JSON.stringify({ name: newFolderName.trim() }) });
      setNewFolderName("");
      setAddingFolder(false);
      refetchFolders();
    } finally {
      setIsSavingFolder(false);
    }
  }

  async function addTag() {
    setIsSavingTag(true);
    try {
      await apiFetch("/tags", { method: "POST", body: JSON.stringify({ name: "New tag" }) });
      refetchTags();
    } finally {
      setIsSavingTag(false);
    }
  }

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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Folders & tags</h1>
        <p className="text-sm text-muted-foreground">
          Cross-cutting organisation layered over clients and cases. Drag a tag onto another to merge.
        </p>
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
        ) : folders.length === 0 && !addingFolder ? (
          <EmptyState
            icon={FolderPlus}
            title="No folders yet"
            description="Create your first folder to start organizing documents."
            action={
              isAdmin ? (
                <button
                  type="button"
                  onClick={() => setAddingFolder(true)}
                  className="text-xs font-medium text-brand hover:underline"
                >
                  New folder
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {folders.map((folder) => (
              <div key={folder.id} className="rounded-none border border-border bg-card p-4">
                <FolderPlus className="size-4 text-brand" />
                <p className="mt-2 text-sm font-medium text-foreground">{folder.name}</p>
                <p className="text-xs text-muted-foreground">{folder.documentCount} documents</p>
              </div>
            ))}

            {!isAdmin ? null : addingFolder ? (
              <div className="flex flex-col gap-2 rounded-none border border-dashed border-border p-4">
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addFolder()}
                  placeholder="Folder name"
                  className="h-7 rounded-none border border-input bg-background px-2 text-xs text-foreground"
                />
                <button
                  type="button"
                  onClick={addFolder}
                  disabled={isSavingFolder}
                  className="text-xs font-medium text-brand hover:underline disabled:opacity-50"
                >
                  {isSavingFolder ? "Adding…" : "Add folder"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingFolder(true)}
                className="flex flex-col items-center justify-center gap-1 rounded-none border border-dashed border-border p-4 text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-4" />
                <span className="text-xs">New folder</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Tags</h2>
          {isAdmin ? (
            <button
              type="button"
              onClick={addTag}
              disabled={isSavingTag}
              className="text-xs font-medium text-brand hover:underline disabled:opacity-50"
            >
              {isSavingTag ? "Adding…" : "+ New tag"}
            </button>
          ) : null}
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
          <div className="overflow-hidden rounded-none border border-border bg-card">
            {tags.map((tag, i) => (
              <div
                key={tag.id}
                className={`flex items-center justify-between px-4 py-2.5 ${i !== tags.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`size-2.5 rounded-full ${tag.colorClass}`} />
                  {editingTagId === tag.id ? (
                    <input
                      autoFocus
                      value={editingTagName}
                      onChange={(e) => setEditingTagName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveTagName()}
                      onBlur={saveTagName}
                      className="h-6 rounded-none border border-input bg-background px-1.5 text-sm text-foreground"
                    />
                  ) : (
                    <span className="text-sm text-foreground">{tag.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{tag.documentCount} docs</span>
                  {isAdmin ? (
                    <button type="button" onClick={() => startEditingTag(tag)} aria-label={`Rename ${tag.name}`}>
                      <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
