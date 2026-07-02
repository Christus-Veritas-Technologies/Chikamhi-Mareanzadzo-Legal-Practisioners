import { Ionicons } from "@expo/vector-icons";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { StatusPill } from "@/components/status-pill";
import { useApi } from "@/hooks/use-api";
import { downloadDocument, isDownloaded } from "@/lib/downloads";
import { formatStatus } from "@/lib/format-status";

type DocumentDetail = {
  id: string;
  name: string;
  fileType: string;
  status: string;
  uploadedBy: string;
  modified: string;
  client: { id: string; name: string } | null;
  case: { id: string; title: string } | null;
  downloadUrl: string | null;
};

const IMAGE_TYPES = ["jpg", "jpeg", "png", "heic", "webp"];

export default function DocumentViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useApi<{ document: DocumentDetail }>(`/documents/${id}`);
  const doc = data?.document;
  const [isDownloading, setIsDownloading] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);

  useEffect(() => {
    if (doc) setSavedOffline(isDownloaded(doc.id));
  }, [doc]);

  async function handleDownload() {
    if (!doc) return;
    if (!doc.downloadUrl) {
      Alert.alert("No file stored yet", "This record has no uploaded bytes to download.");
      return;
    }
    setIsDownloading(true);
    try {
      await downloadDocument({ id: doc.id, name: doc.name, downloadUrl: doc.downloadUrl });
      setSavedOffline(true);
      Alert.alert("Downloaded", "Saved for offline access. Find it under Downloads in the menu.");
    } catch (err) {
      Alert.alert("Download failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  if (isLoading) {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Document" }} />
        <LoadingState label="Loading document…" />
      </Container>
    );
  }

  if (error && !error.toLowerCase().includes("not found")) {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Document" }} />
        <InlineError message={error} onRetry={refetch} />
      </Container>
    );
  }

  if (!doc) {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Document" }} />
        <EmptyState icon="document-outline" title="Document not found" />
      </Container>
    );
  }

  return (
    <Container className="px-5 pt-3">
      <Stack.Screen options={{ title: doc.name }} />

      <View className="h-64 items-center justify-center overflow-hidden rounded-xl bg-muted/15">
        {doc.downloadUrl && IMAGE_TYPES.includes(doc.fileType.toLowerCase()) ? (
          <Image source={{ uri: doc.downloadUrl }} className="h-full w-full" resizeMode="contain" />
        ) : (
          <>
            <Ionicons
              name={doc.fileType.toLowerCase() === "pdf" ? "document-text-outline" : "document-outline"}
              size={32}
              color="#8A8378"
            />
            <Text className="mt-2 text-center text-xs text-muted-foreground">
              {doc.downloadUrl
                ? "Preview isn't available for this file type — download to view it."
                : "No file stored yet for this record."}
            </Text>
          </>
        )}
      </View>

      <View className="mt-4">
        <Text className="text-sm font-medium text-foreground">{doc.name}</Text>
        <View className="mt-1.5">
          <StatusPill status={formatStatus(doc.status)} />
        </View>
      </View>

      <View className="mt-4 gap-3">
        <View>
          <Text className="text-[10px] tracking-wide text-muted-foreground uppercase">Client</Text>
          {doc.client ? (
            <Link href={`/client/${doc.client.id}`}>
              <Text className="text-sm text-brand">{doc.client.name}</Text>
            </Link>
          ) : (
            <Text className="text-sm text-foreground">—</Text>
          )}
        </View>
        <View>
          <Text className="text-[10px] tracking-wide text-muted-foreground uppercase">Case</Text>
          {doc.case ? (
            <Link href={`/case/${doc.case.id}`}>
              <Text className="text-sm text-brand">{doc.case.title}</Text>
            </Link>
          ) : (
            <Text className="text-sm text-foreground">—</Text>
          )}
        </View>
        <View>
          <Text className="text-[10px] tracking-wide text-muted-foreground uppercase">
            Uploaded by
          </Text>
          <Text className="text-sm text-foreground">{doc.uploadedBy}</Text>
        </View>
      </View>

      <Pressable
        onPress={handleDownload}
        disabled={isDownloading}
        className="mt-6 mb-6 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
      >
        {isDownloading ? (
          <ActivityIndicator color="#F5F0E6" size="small" />
        ) : (
          <Ionicons
            name={savedOffline ? "checkmark-circle-outline" : "download-outline"}
            size={16}
            color="#F5F0E6"
          />
        )}
        <Text className="text-sm font-semibold text-primary-foreground">
          {isDownloading ? "Downloading…" : savedOffline ? "Saved offline · Download again" : "Download"}
        </Text>
      </Pressable>
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load this document" />;
}
