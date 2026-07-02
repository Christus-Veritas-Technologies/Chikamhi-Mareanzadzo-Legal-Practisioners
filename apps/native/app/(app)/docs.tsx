import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useThemeColor } from "heroui-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AlertDialog, ConfirmDialog } from "@/components/confirm-dialog";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { LoadMoreButton } from "@/components/load-more-button";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { StatusPill } from "@/components/status-pill";
import { useAppDrawer } from "@/contexts/drawer-context";
import { useAuth } from "@/contexts/auth-context";
import { useApi } from "@/hooks/use-api";
import { apiFetch } from "@/lib/api";
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
  const { token } = useAuth();

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPicker, setBulkPicker] = useState<"tag" | "move" | null>(null);
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  function toggleSelectMode() {
    setSelectMode((s) => !s);
    setSelected(new Set());
    setBulkPicker(null);
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applyBulkTag(bulkTagId: string) {
    setBulkPicker(null);
    setIsBulkWorking(true);
    try {
      await apiFetch("/documents/bulk/tag", {
        method: "POST",
        body: { documentIds: Array.from(selected), tagId: bulkTagId },
        token,
      });
      setSelected(new Set());
      setSelectMode(false);
      refetch();
    } catch {
      setAlertMessage("Couldn't apply tag. Please try again.");
    } finally {
      setIsBulkWorking(false);
    }
  }

  async function applyBulkMove(bulkCaseId: string) {
    setBulkPicker(null);
    setIsBulkWorking(true);
    try {
      await apiFetch("/documents/bulk/move", {
        method: "POST",
        body: { documentIds: Array.from(selected), caseId: bulkCaseId },
        token,
      });
      setSelected(new Set());
      setSelectMode(false);
      refetch();
    } catch {
      setAlertMessage("Couldn't move documents. Please try again.");
    } finally {
      setIsBulkWorking(false);
    }
  }

  async function bulkDelete() {
    setIsBulkWorking(true);
    try {
      await apiFetch("/documents/bulk/delete", {
        method: "POST",
        body: { documentIds: Array.from(selected) },
        token,
      });
      setSelected(new Set());
      setSelectMode(false);
      refetch();
    } catch {
      setAlertMessage("Couldn't delete documents. Please try again.");
    } finally {
      setIsBulkWorking(false);
      setBulkDeleteOpen(false);
    }
  }

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
    <View className="flex-1">
      <Container className="px-5 pt-3">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="font-serif text-xl font-semibold text-foreground">Documents</Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">
            {data?.pagination.total ?? documents.length} documents
            {hasFilters ? " matching filters" : " across all clients and cases"}
          </Text>
        </View>
        <View className="flex-row items-center gap-4">
          <Pressable hitSlop={8} onPress={toggleSelectMode}>
            <Text className="text-xs font-medium text-brand">{selectMode ? "Cancel" : "Select"}</Text>
          </Pressable>
          <Pressable hitSlop={8} onPress={open}>
            <Ionicons name="menu" size={22} color={foreground} />
          </Pressable>
        </View>
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
            documents.map((doc) =>
              selectMode ? (
                <Pressable
                  key={doc.id}
                  onPress={() => toggleSelected(doc.id)}
                  className="flex-row items-center justify-between rounded-xl border border-border px-3 py-3"
                >
                  <View className="flex-row items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <Ionicons
                      name={selected.has(doc.id) ? "checkmark-circle" : "ellipse-outline"}
                      size={18}
                      color={selected.has(doc.id) ? "#C99A3F" : "#8A8378"}
                    />
                    <View className="min-w-0 flex-1">
                      <Text numberOfLines={1} className="text-sm font-medium text-foreground">
                        {doc.name}
                      </Text>
                      <Text numberOfLines={1} className="text-xs text-muted-foreground">
                        {doc.case?.title ?? doc.client?.name ?? "—"} · {doc.modified}
                      </Text>
                    </View>
                  </View>
                  <StatusPill status={formatStatus(doc.status)} />
                </Pressable>
              ) : (
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
              ),
            )
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

      {selectMode && selected.size > 0 ? (
        <View className="absolute right-0 bottom-0 left-0 gap-2 border-t border-border bg-background px-5 pt-2 pb-4">
          {bulkPicker ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
              <View className="flex-row gap-2">
                {bulkPicker === "tag" &&
                  tags.map((t) => (
                    <Pressable
                      key={t.id}
                      onPress={() => applyBulkTag(t.id)}
                      className="rounded-full border border-border px-3 py-1"
                    >
                      <Text className="text-xs text-foreground">{t.name}</Text>
                    </Pressable>
                  ))}
                {bulkPicker === "move" &&
                  (casesData?.cases ?? []).map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => applyBulkMove(c.id)}
                      className="rounded-full border border-border px-3 py-1"
                    >
                      <Text className="text-xs text-foreground">{c.title}</Text>
                    </Pressable>
                  ))}
              </View>
            </ScrollView>
          ) : null}
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-medium text-foreground">{selected.size} selected</Text>
            <View className="flex-row gap-4">
              <Pressable
                disabled={isBulkWorking}
                onPress={() => setBulkPicker(bulkPicker === "tag" ? null : "tag")}
              >
                <Text className="text-xs font-medium text-brand">Tag</Text>
              </Pressable>
              <Pressable
                disabled={isBulkWorking}
                onPress={() => setBulkPicker(bulkPicker === "move" ? null : "move")}
              >
                <Text className="text-xs font-medium text-brand">Move</Text>
              </Pressable>
              <Pressable disabled={isBulkWorking} onPress={() => setBulkDeleteOpen(true)}>
                <Text className="text-xs font-medium text-destructive">Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <ConfirmDialog
        visible={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selected.size} document(s)?`}
        description="They'll be moved to Trash."
        confirmLabel="Delete"
        destructive
        isLoading={isBulkWorking}
        onConfirm={bulkDelete}
      />
      <AlertDialog visible={Boolean(alertMessage)} onOpenChange={(open) => !open && setAlertMessage(null)} title="Couldn't complete action" description={alertMessage ?? undefined} />
    </View>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load documents" />;
}
