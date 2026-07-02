import { Ionicons } from "@expo/vector-icons";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Alert, Linking, Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { StatusPill } from "@/components/status-pill";
import { useApi } from "@/hooks/use-api";
import { formatStatus } from "@/lib/format-status";

type DocumentDetail = {
  id: string;
  name: string;
  status: string;
  uploadedBy: string;
  modified: string;
  client: { id: string; name: string } | null;
  case: { id: string; title: string } | null;
  downloadUrl: string | null;
};

export default function DocumentViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useApi<{ document: DocumentDetail }>(`/documents/${id}`);
  const doc = data?.document;

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

      <View className="h-64 items-center justify-center rounded-xl bg-muted/15">
        <Ionicons name="document-text-outline" size={32} color="#8A8378" />
        <Text className="mt-2 text-center text-xs text-muted-foreground">
          Preview isn't available in this build yet — download to view the file.
        </Text>
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
        onPress={() => {
          if (doc.downloadUrl) {
            Linking.openURL(doc.downloadUrl);
            return;
          }
          Alert.alert("No file stored yet", "This record has no uploaded bytes to download.");
        }}
        className="mt-6 mb-6 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
      >
        <Ionicons name="download-outline" size={16} color="#F5F0E6" />
        <Text className="text-sm font-semibold text-primary-foreground">Download</Text>
      </Pressable>
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load this document" />;
}
