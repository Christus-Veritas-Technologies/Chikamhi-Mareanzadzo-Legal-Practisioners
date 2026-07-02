import { Ionicons } from "@expo/vector-icons";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { RouteError } from "@/components/route-error";
import { StatusPill } from "@/components/status-pill";
import { getCase, getClient, getDocument } from "@/lib/mock-data";

export default function DocumentViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const doc = getDocument(id);

  if (!doc) {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Document" }} />
        <EmptyState icon="document-outline" title="Document not found" />
      </Container>
    );
  }

  const client = getClient(doc.clientId);
  const matter = doc.caseId ? getCase(doc.caseId) : undefined;

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
          <StatusPill status={doc.status} />
        </View>
      </View>

      <View className="mt-4 gap-3">
        <View>
          <Text className="text-[10px] tracking-wide text-muted-foreground uppercase">Client</Text>
          {client ? (
            <Link href={`/client/${client.id}`}>
              <Text className="text-sm text-brand">{client.name}</Text>
            </Link>
          ) : (
            <Text className="text-sm text-foreground">—</Text>
          )}
        </View>
        <View>
          <Text className="text-[10px] tracking-wide text-muted-foreground uppercase">Case</Text>
          {matter ? (
            <Link href={`/case/${matter.id}`}>
              <Text className="text-sm text-brand">{matter.title}</Text>
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

      <Pressable className="mt-6 mb-6 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3">
        <Ionicons name="download-outline" size={16} color="#F5F0E6" />
        <Text className="text-sm font-semibold text-primary-foreground">Download</Text>
      </Pressable>
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load this document" />;
}
