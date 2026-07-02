import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { StatusPill } from "@/components/status-pill";
import { useApi } from "@/hooks/use-api";
import { formatStatus } from "@/lib/format-status";

type ClientDetail = {
  id: string;
  name: string;
  type: string;
  regNumber: string | null;
  attorneyOfRecord: string;
  clientSince: string;
  documents: number;
  storage: string;
  cases: {
    id: string;
    caseNumber: string;
    title: string;
    status: string;
    matterType: string;
    location: string | null;
    updatedAt: string;
  }[];
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useApi<{ client: ClientDetail }>(`/clients/${id}`);
  const client = data?.client;

  if (isLoading) {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Client" }} />
        <LoadingState label="Loading client…" />
      </Container>
    );
  }

  if (error && !error.toLowerCase().includes("not found")) {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Client" }} />
        <InlineError message={error} onRetry={refetch} />
      </Container>
    );
  }

  if (!client) {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Client" }} />
        <EmptyState icon="person-remove-outline" title="Client not found" />
      </Container>
    );
  }

  const cases = client.cases;

  return (
    <Container className="px-5 pt-3">
      <Stack.Screen options={{ title: client.name }} />

      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-muted">
          <Text className="text-sm font-semibold text-brand-foreground">{initials(client.name)}</Text>
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
          <Text className="text-lg font-semibold text-foreground">{cases.length}</Text>
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
                  <StatusPill status={formatStatus(c.status)} />
                </View>
                <Text className="mt-1 text-sm font-semibold text-foreground">{c.title}</Text>
                <Text className="text-xs text-muted-foreground">
                  {c.matterType}
                  {c.location ? ` · ${c.location}` : ""}
                </Text>
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
