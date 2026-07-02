import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useThemeColor } from "heroui-native";
import { Alert, Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { StatusPill } from "@/components/status-pill";
import { useAuth } from "@/contexts/auth-context";
import { useAppDrawer } from "@/contexts/drawer-context";
import { useApi } from "@/hooks/use-api";
import { formatStatus } from "@/lib/format-status";

type DashboardSummary = {
  stats: {
    filedThisWeek: number;
    underReview: number;
    openCases: number;
    storageUsed: string;
    storageQuotaGb: number;
    storagePercentUsed: number;
  };
  recentDocuments: { id: string; name: string; status: string; modified: string; matter: string }[];
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { open } = useAppDrawer();
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const firstName = user?.name.split(" ")[0] ?? "there";

  const { data, isLoading, error, refetch } = useApi<DashboardSummary>("/dashboard/summary");
  const stats = data?.stats;
  const recentDocuments = data?.recentDocuments ?? [];

  return (
    <Container className="px-5 pt-3">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable hitSlop={8} onPress={open}>
            <Ionicons name="menu" size={22} color={foreground} />
          </Pressable>
          <View>
            <Text className="text-xs text-muted-foreground">{greeting()}</Text>
            <Text className="font-serif text-xl font-semibold text-foreground">{firstName}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-3">
          <Pressable
            hitSlop={8}
            onPress={() => Alert.alert("No new notifications", "There's no notification system wired up yet.")}
          >
            <Ionicons name="notifications-outline" size={20} color={foreground} />
          </Pressable>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-muted">
            <Text className="text-xs font-semibold text-brand-foreground">
              {(user?.name ?? "?")
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")}
            </Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <LoadingState label="Loading your dashboard…" />
      ) : error ? (
        <InlineError message={error} onRetry={refetch} />
      ) : (
        <>
          {/* Jump back in */}
          <View className="mt-5 flex-row gap-3">
            <Link href="/cases" asChild>
              <Pressable className="flex-1 rounded-xl bg-ink px-4 py-4">
                <Text className="text-xl font-semibold text-ink-foreground">{stats?.openCases ?? 0}</Text>
                <Text className="mt-0.5 text-xs text-ink-foreground/60">Open cases</Text>
              </Pressable>
            </Link>
            <View className="flex-1 rounded-xl border border-border px-4 py-4">
              <Text className="text-xl font-semibold text-foreground">{stats?.underReview ?? 0}</Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">Under review</Text>
            </View>
          </View>

          {/* Recent documents */}
          <View className="mt-6 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-foreground">Recent documents</Text>
            <Link href="/docs" asChild>
              <Pressable>
                <Text className="text-xs text-brand">See all</Text>
              </Pressable>
            </Link>
          </View>

          <View className="mt-2 gap-2 pb-6">
            {recentDocuments.length === 0 ? (
              <EmptyState
                icon="document-text-outline"
                title="No documents yet"
                description="Scan or upload your first document to see it here."
              />
            ) : (
              recentDocuments.map((doc) => (
                <View
                  key={doc.id}
                  className="flex-row items-center gap-3 rounded-xl border border-border px-3 py-3"
                >
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-muted/15">
                    <Ionicons name="document-text-outline" size={18} color={muted} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="text-sm font-medium text-foreground">
                      {doc.name}
                    </Text>
                    <Text numberOfLines={1} className="text-xs text-muted-foreground">
                      {doc.matter} · {doc.modified}
                    </Text>
                  </View>
                  <StatusPill status={formatStatus(doc.status)} />
                </View>
              ))
            )}
          </View>
        </>
      )}
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load your home screen" />;
}
