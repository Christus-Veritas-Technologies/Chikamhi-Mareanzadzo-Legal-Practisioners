import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Container } from "@/components/container";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CreateFolderDialog } from "@/components/create-folder-dialog";
import { CreateTagDialog } from "@/components/create-tag-dialog";
import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { useAuth } from "@/contexts/auth-context";
import { useApi } from "@/hooks/use-api";
import { apiFetch } from "@/lib/api";

type Folder = { id: string; name: string; documentCount: number; tags: { id: string; name: string; colorClass: string }[] };
type Tag = { id: string; name: string; colorClass: string; documentCount: number };

export default function FoldersTagsScreen() {
  const { token } = useAuth();
  // Folders/tags are equal-access for both roles now — no admin gate here.
  const {
    data: foldersData,
    isLoading: foldersLoading,
    error: foldersError,
    refetch: refetchFolders,
  } = useApi<{ folders: Folder[] }>("/folders");
  const { data: tagsData, isLoading: tagsLoading, error: tagsError, refetch: refetchTags } =
    useApi<{ tags: Tag[] }>("/tags");

  const folders = foldersData?.folders ?? [];
  const tags = tagsData?.tags ?? [];

  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createTagOpen, setCreateTagOpen] = useState(false);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Folder | null>(null);
  const [deleteTagTarget, setDeleteTagTarget] = useState<Tag | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function createFolder(name: string, tagIds: string[]) {
    await apiFetch("/folders", { method: "POST", body: { name, tagIds }, token });
    setCreateFolderOpen(false);
    refetchFolders();
  }

  async function createTag(name: string, colorClass: string) {
    await apiFetch("/tags", { method: "POST", body: { name, colorClass }, token });
    setCreateTagOpen(false);
    refetchTags();
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
    await apiFetch(`/tags/${editingTagId}`, { method: "PATCH", body: { name: editingTagName.trim() }, token });
    setEditingTagId(null);
    refetchTags();
  }

  async function confirmDeleteFolder(deleteDocuments: boolean) {
    if (!deleteFolderTarget) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/folders/${deleteFolderTarget.id}`, { method: "DELETE", body: { deleteDocuments }, token });
      setDeleteFolderTarget(null);
      refetchFolders();
    } finally {
      setIsDeleting(false);
    }
  }

  async function confirmDeleteTag() {
    if (!deleteTagTarget) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/tags/${deleteTagTarget.id}`, { method: "DELETE", token });
      setDeleteTagTarget(null);
      refetchTags();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Container className="px-5 pt-3">
      <Stack.Screen options={{ title: "Folders & Tags" }} />

      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-foreground">Folders</Text>
        <Text className="text-xs text-muted-foreground">{folders.length} folders</Text>
      </View>

      {foldersLoading ? (
        <LoadingState label="Loading folders…" />
      ) : foldersError ? (
        <InlineError message={foldersError} onRetry={refetchFolders} />
      ) : (
        <View className="mt-2 gap-2">
          {folders.length === 0 ? <EmptyState icon="folder-open-outline" title="No folders yet" /> : null}

          {folders.map((folder) => (
            <Pressable
              key={folder.id}
              onLongPress={() => setDeleteFolderTarget(folder)}
              className="flex-row items-center gap-3 rounded-xl border border-border px-3 py-3"
            >
              <Ionicons name="folder-outline" size={18} color="#C89A54" />
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground">{folder.name}</Text>
                <Text className="text-xs text-muted-foreground">{folder.documentCount} documents</Text>
                {folder.tags.length > 0 ? (
                  <View className="mt-1 flex-row flex-wrap gap-1">
                    {folder.tags.map((tag) => (
                      <View key={tag.id} className="flex-row items-center gap-1 rounded-full bg-muted/40 px-1.5 py-0.5">
                        <View className={`h-1.5 w-1.5 rounded-full ${tag.colorClass}`} />
                        <Text className="text-[10px] text-muted-foreground">{tag.name}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
              <Pressable onPress={() => setDeleteFolderTarget(folder)} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color="#8A8378" />
              </Pressable>
            </Pressable>
          ))}

          <Pressable
            onPress={() => setCreateFolderOpen(true)}
            className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-3"
          >
            <Ionicons name="add" size={16} color="#8A8378" />
            <Text className="text-xs text-muted-foreground">New folder</Text>
          </Pressable>
        </View>
      )}

      <View className="mt-6 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-foreground">Tags</Text>
        <Pressable onPress={() => setCreateTagOpen(true)}>
          <Text className="text-xs font-semibold text-brand">+ New tag</Text>
        </Pressable>
      </View>

      {tagsLoading ? (
        <LoadingState label="Loading tags…" />
      ) : tagsError ? (
        <InlineError message={tagsError} onRetry={refetchTags} />
      ) : tags.length === 0 ? (
        <EmptyState icon="pricetags-outline" title="No tags yet" />
      ) : (
        // Compact wrapped chips instead of one full-width row per tag — tags are small
        // labels, they shouldn't each claim a whole row.
        <View className="mt-2 flex-row flex-wrap gap-2 pb-6">
          {tags.map((tag) => (
            <View
              key={tag.id}
              className="flex-row items-center gap-1.5 rounded-full border border-border py-1 pr-1.5 pl-2.5"
            >
              <View className={`h-2 w-2 rounded-full ${tag.colorClass}`} />
              {editingTagId === tag.id ? (
                <TextInput
                  autoFocus
                  value={editingTagName}
                  onChangeText={setEditingTagName}
                  onSubmitEditing={saveTagName}
                  onBlur={saveTagName}
                  className="w-20 text-xs text-foreground"
                />
              ) : (
                <Text className="text-xs text-foreground">{tag.name}</Text>
              )}
              <Text className="text-[10px] text-muted-foreground">· {tag.documentCount}</Text>
              <Pressable onPress={() => startEditingTag(tag)} hitSlop={6}>
                <Ionicons name="pencil-outline" size={11} color="#8A8378" />
              </Pressable>
              <Pressable onPress={() => setDeleteTagTarget(tag)} hitSlop={6}>
                <Ionicons name="trash-outline" size={11} color="#8A8378" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <CreateFolderDialog visible={createFolderOpen} onOpenChange={setCreateFolderOpen} tags={tags} onCreated={createFolder} />
      <CreateTagDialog visible={createTagOpen} onOpenChange={setCreateTagOpen} onCreated={createTag} />

      <ConfirmDialog
        visible={deleteFolderTarget !== null}
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
        visible={deleteTagTarget !== null}
        onOpenChange={(open) => !open && setDeleteTagTarget(null)}
        title={`Delete "${deleteTagTarget?.name}"?`}
        description="This moves the tag to Trash — it can be restored within 30 days. Documents keep their other tags."
        confirmLabel="Delete tag"
        destructive
        isLoading={isDeleting}
        onConfirm={confirmDeleteTag}
      />
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load folders & tags" />;
}
