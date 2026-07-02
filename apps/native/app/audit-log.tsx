import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { LoadMoreButton } from "@/components/load-more-button";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { useAuth } from "@/contexts/auth-context";
import { useApi } from "@/hooks/use-api";

type Pagination = { total: number; limit: number; offset: number; hasMore: boolean };

type AuditEntry = {
  id: string;
  actorId: string | null;
  actor: string;
  isSystem: boolean;
  action: string;
  target: string;
  sourceIp: string;
  timestamp: string;
};

const ACTION_LABELS: Record<string, string> = {
  VIEWED: "Viewed",
  UPLOADED: "Uploaded",
  SIGNED: "Signed",
  FILED: "Filed",
  MOVED: "Moved",
  DELETED: "Deleted",
  RESTORED: "Restored",
  OCR_COMPLETED: "OCR",
  CASE_OPENED: "Case opened",
};

const ACTION_CLASSES: Record<string, string> = {
  VIEWED: "bg-muted",
  UPLOADED: "bg-brand-muted",
  SIGNED: "bg-success/15",
  FILED: "bg-success/15",
  MOVED: "bg-brand-muted",
  DELETED: "bg-destructive/10",
  RESTORED: "bg-success/15",
  OCR_COMPLETED: "bg-muted",
  CASE_OPENED: "bg-brand-muted",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const PAGE_SIZE = 50;

export default function AuditLogScreen() {
  const { user } = useAuth();
  // Attorney-only — the API would 403 anyway, but this avoids a confusing error state.
  if (user?.role !== "ATTORNEY") {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Audit Log" }} />
        <EmptyState icon="lock-closed-outline" title="Attorneys only" description="The Audit Log is only available to attorneys." />
      </Container>
    );
  }
  return <AuditLogContent />;
}

function AuditLogContent() {
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [actionFilter]);

  // Unfiltered baseline (large limit) so the action chips don't shrink as filters are applied.
  const { data: allData } = useApi<{ entries: AuditEntry[] }>("/audit-log?limit=500");
  const allEntries = allData?.entries ?? [];
  const actions = Array.from(new Set(allEntries.map((e) => e.action)));

  const params = new URLSearchParams();
  if (actionFilter) params.set("action", actionFilter);
  params.set("limit", String(limit));
  const path = `/audit-log?${params.toString()}`;
  const { data, isLoading, error, refetch } = useApi<{ entries: AuditEntry[]; pagination: Pagination }>(path, [
    path,
  ]);
  const entries = data?.entries ?? [];

  return (
    <Container className="px-5 pt-3">
      <Stack.Screen options={{ title: "Audit Log" }} />
      <Text className="text-xs text-muted-foreground">
        Every action on every document. Retained for 7 years.
      </Text>

      {actions.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setActionFilter(null)}
              className={`rounded-full border px-3 py-1 ${!actionFilter ? "border-brand bg-brand-muted" : "border-border"}`}
            >
              <Text className={`text-xs ${!actionFilter ? "font-medium text-brand-foreground" : "text-muted-foreground"}`}>
                All
              </Text>
            </Pressable>
            {actions.map((a) => (
              <Pressable
                key={a}
                onPress={() => setActionFilter(a)}
                className={`rounded-full border px-3 py-1 ${actionFilter === a ? "border-brand bg-brand-muted" : "border-border"}`}
              >
                <Text
                  className={`text-xs ${actionFilter === a ? "font-medium text-brand-foreground" : "text-muted-foreground"}`}
                >
                  {ACTION_LABELS[a] ?? a}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {isLoading ? (
        <LoadingState label="Loading audit log…" />
      ) : error ? (
        <InlineError message={error} onRetry={refetch} />
      ) : entries.length === 0 ? (
        <EmptyState icon="time-outline" title="No matching activity" />
      ) : (
        <View className="mt-4 gap-2 pb-6">
          {entries.map((entry) => (
            <View key={entry.id} className="rounded-xl border border-border px-3 py-3">
              <View className="flex-row items-center gap-2.5">
                <View
                  className={`h-6 w-6 items-center justify-center rounded-full ${entry.isSystem ? "bg-muted" : "bg-brand-muted"}`}
                >
                  <Text className="text-[10px] font-semibold text-brand-foreground">
                    {entry.isSystem ? "•" : initials(entry.actor)}
                  </Text>
                </View>
                <Text className="flex-1 text-sm text-foreground">{entry.actor}</Text>
                <View className={`rounded-full px-2 py-0.5 ${ACTION_CLASSES[entry.action] ?? "bg-muted"}`}>
                  <Text className="text-[10px] font-medium text-foreground">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </Text>
                </View>
              </View>
              <Text className="mt-1.5 text-xs text-brand">{entry.target}</Text>
              <Text className="mt-0.5 text-[11px] text-muted-foreground">{entry.timestamp}</Text>
            </View>
          ))}
          {data?.pagination ? (
            <LoadMoreButton
              shown={entries.length}
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
  return <RouteError error={error} retry={retry} title="Couldn't load the audit log" />;
}
