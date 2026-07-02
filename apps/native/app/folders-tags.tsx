import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { useAuth } from "@/contexts/auth-context";
import { useApi } from "@/hooks/use-api";
import { apiFetch } from "@/lib/api";

type Folder = { id: string; name: string; documentCount: number };
type Tag = { id: string; name: string; colorClass: string; documentCount: number };

export default function FoldersTagsScreen() {
  const { token, user } = useAuth();
  // Creating/renaming folders and tags is admin-only server-side — mirror that here.
  const isAdmin = user?.role === "ADMIN";
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

  const [newFolderName, setNewFolderName] = useState("");
  const [addingFolder, setAddingFolder] = useState(false);
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [isSavingTag, setIsSavingTag] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");

  async function addFolder() {
    if (!newFolderName.trim()) return;
    setIsSavingFolder(true);
    try {
      await apiFetch("/folders", { method: "POST", body: { name: newFolderName.trim() }, token });
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
      await apiFetch("/tags", { method: "POST", body: { name: "New tag" }, token });
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
      body: { name: editingTagName.trim() },
      token,
    });
    setEditingTagId(null);
    refetchTags();
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
          {folders.length === 0 && !addingFolder ? (
            <EmptyState icon="folder-open-outline" title="No folders yet" />
          ) : (
            folders.map((folder) => (
              <View
                key={folder.id}
                className="flex-row items-center gap-3 rounded-xl border border-border px-3 py-3"
              >
                <Ionicons name="folder-outline" size={18} color="#C89A54" />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground">{folder.name}</Text>
                  <Text className="text-xs text-muted-foreground">{folder.documentCount} documents</Text>
                </View>
              </View>
            ))
          )}

          {!isAdmin ? null : addingFolder ? (
            <View className="flex-row items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2">
              <TextInput
                autoFocus
                value={newFolderName}
                onChangeText={setNewFolderName}
                onSubmitEditing={addFolder}
                placeholder="Folder name"
                placeholderTextColor="#8A8378"
                className="flex-1 text-sm text-foreground"
              />
              <Pressable onPress={addFolder} disabled={isSavingFolder}>
                <Text className="text-xs font-semibold text-brand">
                  {isSavingFolder ? "Adding…" : "Add"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setAddingFolder(true)}
              className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-3"
            >
              <Ionicons name="add" size={16} color="#8A8378" />
              <Text className="text-xs text-muted-foreground">New folder</Text>
            </Pressable>
          )}
        </View>
      )}

      <View className="mt-6 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-foreground">Tags</Text>
        {isAdmin ? (
          <Pressable onPress={addTag} disabled={isSavingTag}>
            <Text className="text-xs font-semibold text-brand">{isSavingTag ? "Adding…" : "+ New tag"}</Text>
          </Pressable>
        ) : null}
      </View>

      {tagsLoading ? (
        <LoadingState label="Loading tags…" />
      ) : tagsError ? (
        <InlineError message={tagsError} onRetry={refetchTags} />
      ) : tags.length === 0 ? (
        <EmptyState icon="pricetags-outline" title="No tags yet" />
      ) : (
        <View className="mt-2 gap-2 pb-6">
          {tags.map((tag) => (
            <View
              key={tag.id}
              className="flex-row items-center justify-between rounded-xl border border-border px-3 py-2.5"
            >
              <View className="flex-row items-center gap-2.5">
                <View className={`h-2.5 w-2.5 rounded-full ${tag.colorClass}`} />
                {editingTagId === tag.id ? (
                  <TextInput
                    autoFocus
                    value={editingTagName}
                    onChangeText={setEditingTagName}
                    onSubmitEditing={saveTagName}
                    onBlur={saveTagName}
                    className="text-sm text-foreground"
                  />
                ) : (
                  <Text className="text-sm text-foreground">{tag.name}</Text>
                )}
              </View>
              <View className="flex-row items-center gap-3">
                <Text className="text-xs text-muted-foreground">{tag.documentCount} docs</Text>
                {isAdmin ? (
                  <Pressable onPress={() => startEditingTag(tag)} hitSlop={6}>
                    <Ionicons name="pencil-outline" size={14} color="#8A8378" />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load folders & tags" />;
}
