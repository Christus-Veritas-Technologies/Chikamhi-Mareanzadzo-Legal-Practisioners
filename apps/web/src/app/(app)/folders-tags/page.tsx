"use client";

import { FolderPlus, Pencil, Plus, Tags as TagsIcon } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { FOLDERS, TAGS, type Folder, type Tag } from "@/lib/folders-tags-data";

export default function FoldersTagsPage() {
  const [folders, setFolders] = useState<Folder[]>(FOLDERS);
  const [tags, setTags] = useState<Tag[]>(TAGS);
  const [newFolderName, setNewFolderName] = useState("");
  const [addingFolder, setAddingFolder] = useState(false);

  const totalDocs = folders.reduce((sum, f) => sum + f.documentCount, 0);

  function addFolder() {
    if (!newFolderName.trim()) return;
    setFolders((f) => [
      ...f,
      { id: newFolderName.toLowerCase().replace(/\s+/g, "-"), name: newFolderName, documentCount: 0 },
    ]);
    setNewFolderName("");
    setAddingFolder(false);
  }

  function addTag() {
    setTags((t) => [
      ...t,
      { id: `tag-${t.length + 1}`, name: "New tag", documentCount: 0, colorClass: "bg-muted-foreground" },
    ]);
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

        {folders.length === 0 ? (
          <EmptyState icon={FolderPlus} title="No folders yet" description="Create your first folder to start organizing documents." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {folders.map((folder) => (
              <div key={folder.id} className="rounded-none border border-border bg-card p-4">
                <FolderPlus className="size-4 text-brand" />
                <p className="mt-2 text-sm font-medium text-foreground">{folder.name}</p>
                <p className="text-xs text-muted-foreground">{folder.documentCount} documents</p>
              </div>
            ))}

            {addingFolder ? (
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
                  className="text-xs font-medium text-brand hover:underline"
                >
                  Add folder
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
          <button type="button" onClick={addTag} className="text-xs font-medium text-brand hover:underline">
            + New tag
          </button>
        </div>

        {tags.length === 0 ? (
          <EmptyState icon={TagsIcon} title="No tags yet" description="Tags help you find documents across clients and cases." />
        ) : (
          <div className="overflow-hidden rounded-none border border-border bg-card">
            {tags.map((tag, i) => (
              <div
                key={tag.id}
                className={`flex items-center justify-between px-4 py-2.5 ${i !== tags.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`size-2.5 rounded-full ${tag.colorClass}`} />
                  <span className="text-sm text-foreground">{tag.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{tag.documentCount} docs</span>
                  <Pencil className="size-3.5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
