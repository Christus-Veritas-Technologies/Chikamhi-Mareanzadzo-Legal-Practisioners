import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import * as Network from "expo-network";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { RouteError } from "@/components/route-error";
import { useAuth } from "@/contexts/auth-context";
import { listQueue, processQueue, retryEntry, type QueuedUpload } from "@/lib/upload-queue";

export default function UploadQueueScreen() {
  const { token } = useAuth();
  const [queue, setQueue] = useState<QueuedUpload[]>(() => listQueue());
  const [isOffline, setIsOffline] = useState(false);

  function refresh() {
    setQueue(listQueue());
  }

  useEffect(() => {
    refresh();
    processQueue(token).then(refresh);

    Network.getNetworkStateAsync().then((state) => setIsOffline(state.isConnected === false));

    // Auto-retry the whole queue the moment connectivity comes back, so a scan captured
    // offline files itself without the user having to remember to come back and tap retry.
    const subscription = Network.addNetworkStateListener((state) => {
      setIsOffline(state.isConnected === false);
      if (state.isConnected) {
        processQueue(token).then(refresh);
      }
    });

    // Lightweight poll while this screen is open so "uploading" -> "done"/"failed"
    // transitions happening inside processQueue are reflected without extra plumbing.
    const interval = setInterval(refresh, 1200);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [token]);

  function retry(id: string) {
    retryEntry(id);
    refresh();
    void processQueue(token).then(refresh);
  }

  return (
    <Container className="px-5 pt-9">
      <Stack.Screen options={{ title: "Upload queue" }} />

      {isOffline ? (
        <View className="flex-row items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5">
          <Ionicons name="cloud-offline-outline" size={16} color="#B08A3E" />
          <Text className="flex-1 text-xs text-foreground">
            You're offline — queued scans will upload automatically once you're back online.
          </Text>
        </View>
      ) : null}

      {queue.length === 0 ? (
        <EmptyState
          icon="cloud-upload-outline"
          title="Nothing queued"
          description="Scans you capture will show up here while they upload."
        />
      ) : (
        <View className="mt-3 gap-2 pb-6">
          {queue.map((item) => (
            <View key={item.id} className="rounded-xl border border-border p-3">
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name={
                    item.status === "uploading"
                      ? "cloud-upload-outline"
                      : item.status === "failed"
                        ? "alert-circle"
                        : "time-outline"
                  }
                  size={16}
                  color={item.status === "failed" ? "#B3413A" : "#8A8378"}
                />
                <Text numberOfLines={1} className="flex-1 text-sm font-medium text-foreground">
                  {item.name}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {item.status === "uploading" ? "Uploading…" : item.status === "failed" ? "Failed" : "Queued"}
                </Text>
              </View>

              {item.status === "failed" ? (
                <View className="mt-2 flex-row items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-2">
                  <Text className="flex-1 text-xs text-destructive">
                    {item.error ?? "Upload failed."}
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
