import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { StatusPill } from "@/components/status-pill";
import { useApi } from "@/hooks/use-api";
import { formatStatus } from "@/lib/format-status";

type DocumentRow = {
  id: string;
  name: string;
  fileType: string;
  status: string;
  client: { id: string; name: string } | null;
};

const RECENT_SEARCHES = ["deed of sale 4471", "ncube affidavit"];
const FILTER_CHIPS = ["Client", "Case", "Tag"] as const;

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"pdf" | null>("pdf");

  const path = query.trim() ? `/documents?q=${encodeURIComponent(query.trim())}` : "/documents";
  const { data, isLoading, error, refetch } = useApi<{ documents: DocumentRow[] }>(path, [path]);
  const documents = data?.documents ?? [];

  const results = useMemo(() => {
    if (!typeFilter) return documents;
    return documents.filter((doc) => doc.fileType === typeFilter);
  }, [documents, typeFilter]);

  return (
    <Container className="px-5 pt-3">
      <Text className="font-serif text-xl font-semibold text-foreground">Search</Text>

      <View className="mt-3 flex-row items-center gap-2 rounded-xl border border-border px-3 py-2.5">
        <Ionicons name="search" size={16} color="#8A8378" />
        <TextInput
          placeholder="Search name or contents…"
          value={query}
          onChangeText={setQuery}
          className="flex-1 text-sm text-foreground"
          placeholderTextColor="#8A8378"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
        <View className="flex-row gap-2">
          {typeFilter ? (
            <Pressable
              onPress={() => setTypeFilter(null)}
              className="flex-row items-center gap-1 rounded-full border border-brand bg-brand-muted px-3 py-1"
            >
              <Text className="text-xs font-medium text-brand-foreground">Type: PDF</Text>
              <Ionicons name="close" size={12} color="#211D17" />
            </Pressable>
          ) : null}
          {FILTER_CHIPS.map((chip) => (
            <View key={chip} className="rounded-full border border-border px-3 py-1">
              <Text className="text-xs text-muted-foreground">{chip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {!query && (
        <View className="mt-5">
          <Text className="text-[10px] tracking-wide text-muted-foreground uppercase">
            Recent searches
          </Text>
          <View className="mt-2 gap-2">
            {RECENT_SEARCHES.map((term) => (
              <Pressable
                key={term}
                onPress={() => setQuery(term)}
                className="flex-row items-center gap-2"
              >
                <Ionicons name="time-outline" size={14} color="#8A8378" />
                <Text className="text-sm text-foreground">{term}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Text className="mt-5 mb-2 text-[10px] tracking-wide text-muted-foreground uppercase">
        Results · {results.length}
      </Text>

      {isLoading ? (
        <LoadingState label="Searching…" />
      ) : error ? (
        <InlineError message={error} onRetry={refetch} />
      ) : results.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No matches"
          description="Try a different search term or clear filters."
        />
      ) : (
        <View className="gap-2 pb-6">
          {results.map((doc) => (
            <Link key={doc.id} href={`/doc/${doc.id}`} asChild>
              <Pressable className="flex-row items-center justify-between rounded-xl border border-border px-3 py-3">
                <View className="min-w-0 flex-1 pr-2">
                  <Text numberOfLines={1} className="text-sm font-medium text-foreground">
                    {doc.name}
                  </Text>
                  <Text numberOfLines={1} className="text-xs text-muted-foreground">
                    {doc.client?.name ?? "—"}
                  </Text>
                </View>
                <StatusPill status={formatStatus(doc.status)} />
              </Pressable>
            </Link>
          ))}
        </View>
      )}
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Search hit a snag" />;
}
