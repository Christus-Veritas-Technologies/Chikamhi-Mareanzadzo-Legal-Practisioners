import { Ionicons } from "@expo/vector-icons";
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AlertDialog, ConfirmDialog } from "@/components/confirm-dialog";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { SignDocumentModal } from "@/components/sign-document-modal";
import { StatusPill } from "@/components/status-pill";
import { useAuth } from "@/contexts/auth-context";
import { useApi } from "@/hooks/use-api";
import { apiFetch } from "@/lib/api";
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

export default function FolderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [signTarget, setSignTarget] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, error, refetch } = useApi<{ folder: FolderDetail }>(`/folders/${id}`);
  const folder = data?.folder;

  async function deleteFolder(deleteDocuments: boolean) {
    if (!id) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/folders/${id}`, { method: "DELETE", body: { deleteDocuments }, token });
      setDeleteOpen(false);
      router.replace("/folders-tags");
    } catch (err) {
      setDeleteOpen(false);
      setDeleteError(err instanceof Error ? err.message : "Couldn't delete folder.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Folder" }} />
        <LoadingState label="Loading folder…" />
      </Container>
    );
  }

  if (error && !error.toLowerCase().includes("not found")) {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Folder" }} />
        <InlineError message={error} onRetry={refetch} />
      </Container>
    );
  }

  if (!folder) {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Folder" }} />
        <EmptyState icon="folder-open-outline" title="Folder not found" />
      </Container>
    );
  }

  const documents = folder.documents;

  return (
    <Container className="px-5 pt-9">
      <Stack.Screen options={{ title: folder.name }} />

      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-muted">
          <Ionicons name="folder-outline" size={20} color="#C89A54" />
        </View>
        <View className="flex-1">
          <Text className="font-serif text-lg font-semibold text-foreground">{folder.name}</Text>
          <Text className="text-xs text-muted-foreground">Created {folder.createdAt}</Text>
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
        <Pressable onPress={() => setDeleteOpen(true)} hitSlop={8} className="p-1">
          <Ionicons name="trash-outline" size={18} color="#B3413A" />
        </Pressable>
      </View>

      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 rounded-xl border border-border px-3 py-3">
          <Text className="text-lg font-semibold text-foreground">{documents.length}</Text>
          <Text className="text-xs text-muted-foreground">Documents</Text>
        </View>
        <View className="flex-1 rounded-xl border border-border px-3 py-3">
          <Text className="text-lg font-semibold text-foreground">
            {documents.filter((d) => d.status === "FILED").length}
          </Text>
          <Text className="text-xs text-muted-foreground">Awaiting signature</Text>
        </View>
      </View>

      <Text className="mt-6 mb-2 text-sm font-medium text-foreground">Documents</Text>

      {documents.length === 0 ? (
        <EmptyState icon="document-outline" title="No documents yet" />
      ) : (
        <View className="gap-2 pb-6">
          {documents.map((doc) => (
            <View key={doc.id} className="rounded-xl border border-border">
              <Link href={`/doc/${doc.id}`} asChild>
                <Pressable className="flex-row items-center justify-between px-3 py-3">
                  <View className="min-w-0 flex-1 pr-2">
                    <Text numberOfLines={1} className="text-sm font-medium text-foreground">
                      {doc.name}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {doc.client?.name ? `${doc.client.name} · ` : ""}
                      {doc.modified}
                    </Text>
                  </View>
                  <StatusPill status={formatStatus(doc.status)} />
                </Pressable>
              </Link>
              {doc.status === "FILED" ? (
                <Pressable
                  onPress={() => setSignTarget({ id: doc.id, name: doc.name })}
                  className="flex-row items-center gap-1 border-t border-border px-3 py-2"
                >
                  <Ionicons name="create-outline" size={13} color="#C99A3F" />
                  <Text className="text-xs font-medium text-brand">Sign</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <ConfirmDialog
        visible={deleteOpen}
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
      <AlertDialog
        visible={Boolean(deleteError)}
        onOpenChange={(open) => !open && setDeleteError(null)}
        title="Couldn't delete folder"
        description={deleteError ?? undefined}
      />

      {signTarget ? (
        <SignDocumentModal
          documentId={signTarget.id}
          documentName={signTarget.name}
          visible={Boolean(signTarget)}
          onOpenChange={(open) => !open && setSignTarget(null)}
          onSigned={refetch}
        />
      ) : null}
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load this folder" />;
}
