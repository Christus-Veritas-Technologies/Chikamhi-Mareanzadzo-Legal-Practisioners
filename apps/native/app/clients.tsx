import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { useApi } from "@/hooks/use-api";

type ClientRow = {
  id: string;
  name: string;
  type: string;
  openCases: number;
  documents: number;
  updatedAt: string;
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function ClientsScreen() {
  const [query, setQuery] = useState("");
  const { data, isLoading, error, refetch } = useApi<{ clients: ClientRow[] }>("/clients");
  const clients = data?.clients ?? [];
  const totalOpenCases = clients.reduce((sum, c) => sum + c.openCases, 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
  }, [clients, query]);

  return (
    <Container className="px-5 pt-9">
      <Text className="mt-0.5 text-xs text-muted-foreground">
        {clients.length} active clients · {totalOpenCases} open cases
      </Text>

      <View className="mt-4 flex-row items-center gap-2 rounded-xl border border-border px-3 py-2.5">
        <Ionicons name="search" size={16} color="#8A8378" />
        <TextInput
          placeholder="Search clients or cases…"
          value={query}
          onChangeText={setQuery}
          className="flex-1 text-sm text-foreground"
          placeholderTextColor="#8A8378"
        />
      </View>

      {isLoading ? (
        <LoadingState label="Loading clients…" />
      ) : error ? (
        <InlineError message={error} onRetry={refetch} />
      ) : (
        <View className="mt-4 gap-2 pb-6">
          {filtered.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title={clients.length === 0 ? "No clients yet" : "No clients found"}
              description={clients.length === 0 ? "Add your first client to get started." : `Nothing matches "${query}".`}
            />
          ) : (
            filtered.map((client) => (
              <Link key={client.id} href={`/client/${client.id}`} asChild>
                <Pressable className="flex-row items-center gap-3 rounded-xl border border-border px-3 py-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-muted">
                    <Text className="text-xs font-semibold text-brand-foreground">
                      {initials(client.name)}
                    </Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="text-sm font-medium text-foreground">
                      {client.name}
                    </Text>
                    <Text numberOfLines={1} className="text-xs text-muted-foreground">
                      {client.type} · {client.openCases} open cases
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#8A8378" />
                </Pressable>
              </Link>
            ))
          )}
        </View>
      )}
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load clients" />;
}
