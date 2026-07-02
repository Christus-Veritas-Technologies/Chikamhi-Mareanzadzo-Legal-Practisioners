import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { LoadMoreButton } from "@/components/load-more-button";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { useAuth } from "@/contexts/auth-context";
import { useApi } from "@/hooks/use-api";
import { apiFetch } from "@/lib/api";

type Pagination = { total: number; limit: number; offset: number; hasMore: boolean };

type TrashedDoc = {
  id: string;
  name: string;
  client: { id: string; name: string } | null;
  case: { id: string; title: string } | null;
  deletedBy: string;
  deletedAt: string;
  purgesInDays: number;
};

const PAGE_SIZE = 25;

export default function TrashScreen() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, error, refetch } = useApi<{ documents: TrashedDoc[]; pagination: Pagination }>(
    `/documents/trash?limit=${limit}`,
    [limit],
  );
  const items = data?.documents ?? [];
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function restore(id: string) {
    setPendingId(id);
    try {
      await apiFetch(`/documents/${id}/restore`, { method: "POST", token });
      refetch();
    } finally {
      setPendingId(null);
    }
  }

  function confirmDelete(id: string, name: string) {
    Alert.alert("Permanently delete?", `"${name}" can't be recovered after this.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setPendingId(id);
          try {
            await apiFetch(`/documents/${id}/permanent`, { method: "DELETE", token });
            refetch();
          } catch (err) {
            Alert.alert("Couldn't delete", err instanceof Error ? err.message : "Please try again.");
          } finally {
            setPendingId(null);
          }
        },
      },
    ]);
  }

  return (
    <Container className="px-5 pt-3">
      <Stack.Screen options={{ title: "Trash" }} />

      <View className="flex-row items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5">
        <Ionicons name="information-circle-outline" size={16} color="#B08A3E" />
        <Text className="flex-1 text-xs text-foreground">
          Deleted documents are retained for 30 days, then permanently purged.
        </Text>
      </View>

      {isLoading ? (
        <LoadingState label="Loading trash…" />
      ) : error ? (
        <InlineError message={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="trash-outline" title="Trash is empty" description="Deleted documents appear here for 30 days." />
      ) : (
        <View className="mt-4 gap-2 pb-6">
          {items.map((item) => (
            <View key={item.id} className="rounded-xl border border-border px-3 py-3">
              <Text className="text-sm font-medium text-foreground">{item.name}</Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">
                {item.case?.title ?? item.client?.name ?? "—"} · Deleted by {item.deletedBy}
              </Text>
              <Text
                className={`mt-0.5 text-xs font-medium ${item.purgesInDays <= 5 ? "text-destructive" : "text-muted-foreground"}`}
              >
                Purges in {item.purgesInDays} days
              </Text>
              <View className="mt-2.5 flex-row gap-3">
                <Pressable
                  onPress={() => restore(item.id)}
                  disabled={pendingId === item.id}
                  className="flex-1 items-center rounded-lg border border-border py-2"
                >
                  <Text className="text-xs font-medium text-foreground">Restore</Text>
                </Pressable>
                {isAdmin ? (
                  <Pressable
                    onPress={() => confirmDelete(item.id, item.name)}
                    disabled={pendingId === item.id}
                    className="flex-1 items-center rounded-lg bg-destructive/10 py-2"
                  >
                    <Text className="text-xs font-medium text-destructive">Delete</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
          {data?.pagination ? (
            <LoadMoreButton
              shown={items.length}
              total={data.pagination.total}
              onPress={() => setLimit((l) => l + PAGE_SIZE)}
              loading={isLoading}
            />
          ) : null}
        </View>
      )}
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load trash" />;
}
