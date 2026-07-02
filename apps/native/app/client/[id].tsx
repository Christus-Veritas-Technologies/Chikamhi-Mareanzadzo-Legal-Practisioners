import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { RouteError } from "@/components/route-error";
import { StatusPill } from "@/components/status-pill";
import { getCasesForClient, getClient } from "@/lib/mock-data";

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = getClient(id);

  if (!client) {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Client" }} />
        <EmptyState icon="person-remove-outline" title="Client not found" />
      </Container>
    );
  }

  const cases = getCasesForClient(client.id);

  return (
    <Container className="px-5 pt-3">
      <Stack.Screen options={{ title: client.name }} />

      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-muted">
          <Text className="text-sm font-semibold text-brand-foreground">{client.initials}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-serif text-lg font-semibold text-foreground">{client.name}</Text>
          <Text className="text-xs text-muted-foreground">
            {client.type} · Attorney: {client.attorneyOfRecord}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 rounded-xl border border-border px-3 py-3">
          <Text className="text-lg font-semibold text-foreground">{client.openCases}</Text>
          <Text className="text-xs text-muted-foreground">Open cases</Text>
        </View>
        <View className="flex-1 rounded-xl border border-border px-3 py-3">
          <Text className="text-lg font-semibold text-foreground">{client.documents}</Text>
          <Text className="text-xs text-muted-foreground">Documents</Text>
        </View>
        <View className="flex-1 rounded-xl border border-border px-3 py-3">
          <Text className="text-lg font-semibold text-foreground">{client.storage}</Text>
          <Text className="text-xs text-muted-foreground">Storage</Text>
        </View>
      </View>

      <Text className="mt-6 mb-2 text-sm font-medium text-foreground">Cases</Text>

      {cases.length === 0 ? (
        <EmptyState icon="folder-open-outline" title="No cases yet" />
      ) : (
        <View className="gap-2 pb-6">
          {cases.map((c) => (
            <Link key={c.id} href={`/case/${c.id}`} asChild>
              <Pressable className="rounded-xl border border-border px-3 py-3">
                <View className="flex-row items-start justify-between">
                  <Text className="text-[11px] text-muted-foreground">{c.caseNumber}</Text>
                  <StatusPill status={c.status} />
                </View>
                <Text className="mt-1 text-sm font-semibold text-foreground">{c.title}</Text>
                <Text className="text-xs text-muted-foreground">
                  {c.matterType}
                  {c.location ? ` · ${c.location}` : ""}
                </Text>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-[11px] text-muted-foreground">
                    {c.documentCount} documents
                  </Text>
                  <Text className="text-[11px] text-muted-foreground">Updated {c.updated}</Text>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      )}
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load this client" />;
}
