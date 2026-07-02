import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useThemeColor } from "heroui-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { LoadMoreButton } from "@/components/load-more-button";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { StatusPill } from "@/components/status-pill";
import { useAppDrawer } from "@/contexts/drawer-context";
import { useApi } from "@/hooks/use-api";
import { formatStatus } from "@/lib/format-status";

type Pagination = { total: number; limit: number; offset: number; hasMore: boolean };

type DocumentRow = {
  id: string;
  name: string;
  status: string;
  modified: string;
  client: { id: string; name: string } | null;
  case: { id: string; title: string } | null;
};

type ClientOption = { id: string; name: string };
type CaseOption = { id: string; title: string; client: { id: string } };
type TagOption = { id: string; name: string };

type FilterKind = "client" | "case" | "tag" | "status" | null;

const STATUSES = ["DRAFT", "UNDER_REVIEW", "FILED", "SIGNED", "EXECUTED"] as const;
const PAGE_SIZE = 25;

export default function DocsScreen() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [tagId, setTagId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [openPicker, setOpenPicker] = useState<FilterKind>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const foreground = useThemeColor("foreground");
  const { open } = useAppDrawer();

  const params = new URLSearchParams();
  if (clientId) params.set("clientId", clientId);
  if (caseId) params.set("caseId", caseId);
  if (tagId) params.set("tagId", tagId);
  if (status) params.set("status", status);
  params.set("limit", String(limit));
  const search = params.toString();
  const path = `/documents?${search}`;

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [clientId, caseId, tagId, status]);

  const { data, isLoading, error, refetch } = useApi<{ documents: DocumentRow[]; pagination: Pagination }>(path, [
    path,
  ]);
  const documents = data?.documents ?? [];

  const { data: clientsData } = useApi<{ clients: ClientOption[] }>("/clients");
  const { data: casesData } = useApi<{ cases: CaseOption[] }>("/cases");
  const { data: tagsData } = useApi<{ tags: TagOption[] }>("/tags");
  const clients = clientsData?.clients ?? [];
  const cases = (casesData?.cases ?? []).filter((c) => !clientId || c.client.id === clientId);
  const tags = tagsData?.tags ?? [];

  const selectedClientName = clients.find((c) => c.id === clientId)?.name;
  const selectedCaseTitle = cases.find((c) => c.id === caseId)?.title;
  const selectedTagName = tags.find((t) => t.id === tagId)?.name;
  const hasFilters = Boolean(clientId || caseId || tagId || status);

  function clearFilters() {
    setClientId(null);
    setCaseId(null);
    setTagId(null);
    setStatus(null);
    setOpenPicker(null);
  }

  return (
    <Container className="px-5 pt-3">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="font-serif text-xl font-semibold text-foreground">Documents</Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">
            {data?.pagination.total ?? documents.length} documents
            {hasFilters ? " matching filters" : " across all clients and cases"}
          </Text>
        </View>
        <Pressable hitSlop={8} onPress={open}>
          <Ionicons name="menu" size={22} color={foreground} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
        <View className="flex-row gap-2">
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
                  setCaseId(null);
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

          <Pressable
            onPress={() => setOpenPicker(openPicker === "status" ? null : "status")}
            className={`flex-row items-center gap-1 rounded-full border px-3 py-1 ${status || openPicker === "status" ? "border-brand bg-brand-muted" : "border-border"}`}
          >
            <Text className={`text-xs ${status ? "font-medium text-brand-foreground" : "text-muted-foreground"}`}>
              {status ? formatStatus(status) : "Status"}
            </Text>
            {status ? (
              <Ionicons
                name="close"
                size={12}
                color="#211D17"
                onPress={() => {
                  setStatus(null);
                  setOpenPicker(null);
                }}
              />
            ) : null}
          </Pressable>

          {hasFilters ? (
            <Pressable onPress={clearFilters} className="flex-row items-center gap-1 rounded-full px-3 py-1">
              <Text className="text-xs text-muted-foreground underline">Clear all</Text>
            </Pressable>
          ) : null}
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
                    setCaseId(null);
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
            {openPicker === "status" &&
              STATUSES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => {
                    setStatus(s);
                    setOpenPicker(null);
                  }}
                  className="rounded-full border border-border px-3 py-1"
                >
                  <Text className="text-xs text-foreground">{formatStatus(s)}</Text>
                </Pressable>
              ))}
          </View>
        </ScrollView>
      ) : null}

      {isLoading ? (
        <LoadingState label="Loading documents…" />
      ) : error ? (
        <InlineError message={error} onRetry={refetch} />
      ) : (
        <View className="mt-4 gap-2 pb-6">
          {documents.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No documents found"
              description={hasFilters ? "Try a different filter combination." : "Documents you scan or upload will show up here."}
            />
          ) : (
            documents.map((doc) => (
              <Link key={doc.id} href={`/doc/${doc.id}`} asChild>
                <Pressable className="flex-row items-center justify-between rounded-xl border border-border px-3 py-3">
                  <View className="min-w-0 flex-1 pr-2">
                    <Text numberOfLines={1} className="text-sm font-medium text-foreground">
                      {doc.name}
                    </Text>
                    <Text numberOfLines={1} className="text-xs text-muted-foreground">
                      {doc.case?.title ?? doc.client?.name ?? "—"} · {doc.modified}
                    </Text>
                  </View>
                  <StatusPill status={formatStatus(doc.status)} />
                </Pressable>
              </Link>
            ))
          )}
          {data?.pagination ? (
            <LoadMoreButton
              shown={documents.length}
              total={data.pagination.total}
              onPress={() => setLimit((l) => l + PAGE_SIZE)}
              loading={isLoading}
            />
          ) : null}
        </View>
      )}
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load documents" />;
}
