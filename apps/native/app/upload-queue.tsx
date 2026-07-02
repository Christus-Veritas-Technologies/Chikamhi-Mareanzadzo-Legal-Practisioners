import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { RouteError } from "@/components/route-error";

type QueueItem = {
  id: string;
  name: string;
  state: "uploading" | "done" | "failed";
  progress: number;
};

export default function UploadQueueScreen() {
  const { justAdded } = useLocalSearchParams<{ justAdded?: string }>();

  // scan-assign.tsx only navigates here after its POST /documents calls already succeeded,
  // so anything arriving via justAdded is already filed — no fake in-progress state to fake.
  // Multiple filed pages arrive pipe-delimited (one document per captured page).
  const [queue, setQueue] = useState<QueueItem[]>(() => {
    if (!justAdded) return [];
    return justAdded
      .split("|")
      .filter(Boolean)
      .map((name, i) => ({ id: `u${i}`, name, state: "done" as const, progress: 100 }));
  });

  function retry(id: string) {
    setQueue((q) => q.map((i) => (i.id === id ? { ...i, state: "uploading", progress: 0 } : i)));
  }

  return (
    <Container className="px-5 pt-3">
      <Stack.Screen options={{ title: "Upload queue" }} />

      {queue.length === 0 ? (
        <EmptyState icon="cloud-upload-outline" title="Nothing queued" description="Scans you capture will show up here while they upload." />
      ) : (
        <View className="gap-2 pb-6">
          {queue.map((item) => (
            <View key={item.id} className="rounded-xl border border-border p-3">
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name={
                    item.state === "done"
                      ? "checkmark-circle"
                      : item.state === "failed"
                        ? "alert-circle"
                        : "cloud-upload-outline"
                  }
                  size={16}
                  color={item.state === "done" ? "#3E8F5C" : item.state === "failed" ? "#B3413A" : "#8A8378"}
                />
                <Text numberOfLines={1} className="flex-1 text-sm font-medium text-foreground">
                  {item.name}
                </Text>
                {item.state === "uploading" ? (
                  <Text className="text-xs text-muted-foreground">{item.progress}%</Text>
                ) : null}
              </View>

              {item.state === "uploading" ? (
                <View className="mt-2 h-1 overflow-hidden rounded-full bg-muted/20">
                  <View className="h-full rounded-full bg-brand" style={{ width: `${item.progress}%` }} />
                </View>
              ) : null}

              {item.state === "failed" ? (
                <View className="mt-2 flex-row items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-2">
                  <Text className="flex-1 text-xs text-destructive">
                    Network interrupted — not saved to R2.
                  </Text>
                  <Pressable onPress={() => retry(item.id)}>
                    <Text className="text-xs font-semibold text-brand">Retry</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load the upload queue" />;
}
