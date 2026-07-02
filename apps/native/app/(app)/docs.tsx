import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { RouteError } from "@/components/route-error";
import { StatusPill } from "@/components/status-pill";
import { DOCUMENTS, getClient } from "@/lib/mock-data";

export default function DocsScreen() {
  return (
    <Container className="px-5 pt-3">
      <Text className="font-serif text-xl font-semibold text-foreground">Documents</Text>
      <Text className="mt-0.5 text-xs text-muted-foreground">
        {DOCUMENTS.length} documents across all clients and cases
      </Text>

      <View className="mt-4 gap-2 pb-6">
        {DOCUMENTS.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No documents yet"
            description="Documents you scan or upload will show up here."
          />
        ) : (
          DOCUMENTS.map((doc) => {
            const client = getClient(doc.clientId);
            return (
              <Link key={doc.id} href={`/doc/${doc.id}`} asChild>
                <Pressable className="flex-row items-center justify-between rounded-xl border border-border px-3 py-3">
                  <View className="min-w-0 flex-1 pr-2">
                    <Text numberOfLines={1} className="text-sm font-medium text-foreground">
                      {doc.name}
                    </Text>
                    <Text numberOfLines={1} className="text-xs text-muted-foreground">
                      {client?.name ?? "—"} · {doc.modified}
                    </Text>
                  </View>
                  <StatusPill status={doc.status} />
                </Pressable>
              </Link>
            );
          })
        )}
      </View>
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load documents" />;
}
