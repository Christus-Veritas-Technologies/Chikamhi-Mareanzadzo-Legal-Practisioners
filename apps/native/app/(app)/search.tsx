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
  case: { id: string; title: string } | null;
};

type ClientOption = { id: string; name: string };
type CaseOption = { id: string; title: string };
type TagOption = { id: string; name: string };

type FilterKind = "client" | "case" | "tag" | null;

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"pdf" | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [tagId, setTagId] = useState<string | null>(null);
  const [openPicker, setOpenPicker] = useState<FilterKind>(null);
  // Real recent-search history, built from what's actually been searched this session —
  // no seeded example terms.
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (clientId) params.set("clientId", clientId);
  if (caseId) params.set("caseId", caseId);
  if (tagId) params.set("tagId", tagId);
  const search = params.toString();
  const path = search ? `/documents?${search}` : "/documents";

  const { data, isLoading, error, refetch } = useApi<{ documents: DocumentRow[] }>(path, [path]);
  const documents = data?.documents ?? [];

  const { data: clientsData } = useApi<{ clients: ClientOption[] }>("/clients");
  const { data: casesData } = useApi<{ cases: CaseOption[] }>("/cases");
  const { data: tagsData } = useApi<{ tags: TagOption[] }>("/tags");
  const clients = clientsData?.clients ?? [];
  const cases = casesData?.cases ?? [];
  const tags = tagsData?.tags ?? [];

  const results = useMemo(() => {
    if (!typeFilter) return documents;
    return documents.filter((doc) => doc.fileType === typeFilter);
  }, [documents, typeFilter]);

  function submitSearch(term: string) {
    setQuery(term);
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => [trimmed, ...prev.filter((t) => t !== trimmed)].slice(0, 5));
  }

  const selectedClientName = clients.find((c) => c.id === clientId)?.name;
  const selectedCaseTitle = cases.find((c) => c.id === caseId)?.title;
  const selectedTagName = tags.find((t) => t.id === tagId)?.name;

  return (
    <Container className="px-5 pt-9">
      <Text className="font-serif text-xl font-semibold text-foreground">Search</Text>

      <View className="mt-3 flex-row items-center gap-2 rounded-xl border border-border px-3 py-2.5">
        <Ionicons name="search" size={16} color="#8A8378" />
        <TextInput
          placeholder="Search name or contents…"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => submitSearch(query)}
          returnKeyType="search"
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
          ) : (
            <Pressable
              onPress={() => setTypeFilter("pdf")}
              className="rounded-full border border-border px-3 py-1"
            >
              <Text className="text-xs text-muted-foreground">Type: PDF</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => setOpenPicker(openPicker === "client" ? null : "client")}
            className={`flex-row items-center gap-1 rounded-full border px-3 py-1 ${clientId || openPicker === "client" ? "border-brand bg-brand-muted" : "border-border"}`}
          >
            <Text className={`text-xs ${clientId ? "font-medium text-brand-foreground" : "text-muted-foreground"}`}>
              {selectedClientName ?? "Client"}
            </Text>
            {clientId ? (
              <Ionicons
                name="close"
                size={12}
                color="#211D17"
                onPress={() => {
                  setClientId(null);
                  setOpenPicker(null);
                }}
              />
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => setOpenPicker(openPicker === "case" ? null : "case")}
            className={`flex-row items-center gap-1 rounded-full border px-3 py-1 ${caseId || openPicker === "case" ? "border-brand bg-brand-muted" : "border-border"}`}
          >
            <Text className={`text-xs ${caseId ? "font-medium text-brand-foreground" : "text-muted-foreground"}`}>
              {selectedCaseTitle ?? "Case"}
            </Text>
            {caseId ? (
              <Ionicons
                name="close"
                size={12}
                color="#211D17"
                onPress={() => {
                  setCaseId(null);
                  setOpenPicker(null);
                }}
              />
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => setOpenPicker(openPicker === "tag" ? null : "tag")}
            className={`flex-row items-center gap-1 rounded-full border px-3 py-1 ${tagId || openPicker === "tag" ? "border-brand bg-brand-muted" : "border-border"}`}
          >
            <Text className={`text-xs ${tagId ? "font-medium text-brand-foreground" : "text-muted-foreground"}`}>
              {selectedTagName ?? "Tag"}
            </Text>
            {tagId ? (
              <Ionicons
                name="close"
                size={12}
                color="#211D17"
                onPress={() => {
                  setTagId(null);
                  setOpenPicker(null);
                }}
              />
            ) : null}
          </Pressable>
        </View>
      </ScrollView>

      {openPicker ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
          <View className="flex-row gap-2">
            {openPicker === "client" &&
              clients.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setClientId(c.id);
                    setOpenPicker(null);
                  }}
                  className="rounded-full border border-border px-3 py-1"
                >
                  <Text className="text-xs text-foreground">{c.name}</Text>
                </Pressable>
              ))}
            {openPicker === "case" &&
              cases.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setCaseId(c.id);
                    setOpenPicker(null);
                  }}
                  className="rounded-full border border-border px-3 py-1"
                >
                  <Text className="text-xs text-foreground">{c.title}</Text>
                </Pressable>
              ))}
            {openPicker === "tag" &&
              tags.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => {
                    setTagId(t.id);
                    setOpenPicker(null);
                  }}
                  className="rounded-full border border-border px-3 py-1"
                >
                  <Text className="text-xs text-foreground">{t.name}</Text>
                </Pressable>
              ))}
          </View>
        </ScrollView>
      ) : null}

      {!query && recentSearches.length > 0 && (
        <View className="mt-5">
          <Text className="text-[10px] tracking-wide text-muted-foreground uppercase">
            Recent searches
          </Text>
          <View className="mt-2 gap-2">
            {recentSearches.map((term) => (
              <Pressable
                key={term}
                onPress={() => submitSearch(term)}
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
