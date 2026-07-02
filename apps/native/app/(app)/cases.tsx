import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useThemeColor } from "heroui-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { StatusPill } from "@/components/status-pill";
import { useAppDrawer } from "@/contexts/drawer-context";
import { useApi } from "@/hooks/use-api";
import { formatStatus } from "@/lib/format-status";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "CLOSED", label: "Closed" },
] as const;

type StatusFilter = (typeof STATUS_TABS)[number]["value"];

type CaseRow = {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  matterType: string;
  location: string | null;
  documentCount: number;
  updated: string;
  client: { id: string; name: string };
};

export default function CasesScreen() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const foreground = useThemeColor("foreground");
  const { open } = useAppDrawer();

  const path = statusFilter === "all" ? "/cases" : `/cases?status=${statusFilter}`;
  const { data, isLoading, error, refetch } = useApi<{ cases: CaseRow[] }>(path, [path]);
  const cases = data?.cases ?? [];

  const { data: allData } = useApi<{ cases: CaseRow[] }>("/cases");
  const counts = useMemo(() => {
    const all = allData?.cases ?? [];
    return {
      all: all.length,
      ACTIVE: all.filter((c) => c.status === "ACTIVE").length,
      UNDER_REVIEW: all.filter((c) => c.status === "UNDER_REVIEW").length,
      CLOSED: all.filter((c) => c.status === "CLOSED").length,
    };
  }, [allData]);

  return (
    <Container className="px-5 pt-3">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="font-serif text-xl font-semibold text-foreground">Cases</Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">
            {counts.all} cases · {counts.ACTIVE} active
          </Text>
        </View>
        <Pressable hitSlop={8} onPress={open}>
          <Ionicons name="menu" size={22} color={foreground} />
        </Pressable>
      </View>

      <View className="mt-3">
        <SegmentedTabs tabs={STATUS_TABS} value={statusFilter} onChange={setStatusFilter} />
      </View>

      {isLoading ? (
        <LoadingState label="Loading cases…" />
      ) : error ? (
        <InlineError message={error} onRetry={refetch} />
      ) : (
        <View className="mt-4 gap-2 pb-6">
          {cases.length === 0 ? (
            <EmptyState
              icon="briefcase-outline"
              title="No cases here"
              description={
                statusFilter === "all" ? "Open a case from a client to get started." : "Nothing matches this status."
              }
            />
          ) : (
            cases.map((matter) => (
              <Link key={matter.id} href={`/case/${matter.id}`} asChild>
                <Pressable className="rounded-xl border border-border px-3 py-3">
                  <View className="flex-row items-start justify-between">
                    <Text className="text-[11px] text-muted-foreground">{matter.caseNumber}</Text>
                    <StatusPill status={formatStatus(matter.status)} />
                  </View>
                  <Text className="mt-1 text-sm font-semibold text-foreground">{matter.title}</Text>
                  <Text className="text-xs text-muted-foreground">
                    {matter.client.name} · {matter.matterType}
                  </Text>
                  <Text className="mt-1 text-[11px] text-muted-foreground">
                    {matter.documentCount} documents · Updated {matter.updated}
                  </Text>
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
  return <RouteError error={error} retry={retry} title="Couldn't load cases" />;
}
