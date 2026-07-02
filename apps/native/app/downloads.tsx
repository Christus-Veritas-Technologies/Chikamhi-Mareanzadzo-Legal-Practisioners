import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { RouteError } from "@/components/route-error";
import { type DownloadedDoc, listDownloads, removeDownload } from "@/lib/downloads";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DownloadsScreen() {
  const [items, setItems] = useState<DownloadedDoc[]>([]);

  useFocusEffect(
    useCallback(() => {
      setItems(listDownloads());
    }, []),
  );

  async function openFile(item: DownloadedDoc) {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert("Can't open file", "Sharing isn't available on this device.");
      return;
    }
    try {
      await Sharing.shareAsync(item.uri);
    } catch {
      Alert.alert("Can't open file", "This file couldn't be opened.");
    }
  }

  function confirmRemove(item: DownloadedDoc) {
    Alert.alert("Remove download?", `"${item.name}" will be deleted from this device.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          removeDownload(item.id);
          setItems(listDownloads());
        },
      },
    ]);
  }

  return (
    <Container className="px-5 pt-3">
      <Stack.Screen options={{ title: "Downloads" }} />
      <Text className="text-xs text-muted-foreground">
        Documents saved to this device for offline access.
      </Text>

      {items.length === 0 ? (
        <EmptyState
          icon="download-outline"
          title="No offline documents"
          description="Download a document from its detail screen to view it without a connection."
        />
      ) : (
        <View className="mt-4 gap-2 pb-6">
          {items.map((item) => (
            <View
              key={item.id}
              className="flex-row items-center gap-3 rounded-xl border border-border px-3 py-3"
            >
              <View className="h-9 w-9 items-center justify-center rounded-lg bg-muted/15">
                <Ionicons name="document-text-outline" size={18} color="#8A8378" />
              </View>
              <Pressable onPress={() => openFile(item)} className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-sm font-medium text-foreground">
                  {item.name}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {formatBytes(item.sizeBytes)} · Saved{" "}
                  {new Date(item.downloadedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </Text>
              </Pressable>
              <Pressable onPress={() => confirmRemove(item)} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color="#B3413A" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load downloads" />;
}
