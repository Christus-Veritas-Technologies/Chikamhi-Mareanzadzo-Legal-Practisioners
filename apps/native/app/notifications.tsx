import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { LoadMoreButton } from "@/components/load-more-button";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { useApi } from "@/hooks/use-api";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

type Pagination = { total: number; limit: number; offset: number; hasMore: boolean };

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  case: { id: string; title: string } | null;
  document: { id: string; name: string } | null;
  isRead: boolean;
  createdAt: string;
};

const PAGE_SIZE = 25;

export default function NotificationsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, error, refetch } = useApi<{
    notifications: NotificationItem[];
    unreadCount: number;
    pagination: Pagination;
  }>(`/notifications?limit=${limit}`, [limit]);
  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  async function markOneRead(id: string) {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH", token });
      refetch();
    } catch {
      // Non-critical — the notification just stays unread until the next successful action.
    }
  }

  async function markAllRead() {
    try {
      await apiFetch("/notifications/read-all", { method: "PATCH", token });
      refetch();
    } catch {
      // Non-critical — same as above.
    }
  }

  function openNotification(n: NotificationItem) {
    if (!n.isRead) markOneRead(n.id);
    if (n.document) {
      router.push(`/doc/${n.document.id}`);
    } else if (n.case) {
      router.push(`/case/${n.case.id}`);
    }
  }

  return (
    <Container className="px-5 pt-9">
      <Stack.Screen options={{ title: "Notifications" }} />

      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
        </Text>
        {unreadCount > 0 ? (
          <Pressable onPress={markAllRead}>
            <Text className="text-xs font-semibold text-brand">Mark all read</Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <LoadingState label="Loading notifications…" />
      ) : error ? (
        <InlineError message={error} onRetry={refetch} />
      ) : notifications.length === 0 ? (
        <EmptyState icon="notifications-outline" title="No notifications yet" description="Case uploads and status changes will show up here." />
      ) : (
        <View className="mt-3 gap-2 pb-6">
          {notifications.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => openNotification(n)}
              className={`rounded-xl border px-3 py-3 ${n.isRead ? "border-border" : "border-brand bg-brand-muted/30"}`}
            >
              <Text className="text-sm font-medium text-foreground">{n.title}</Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">{n.body}</Text>
              <Text className="mt-1 text-[11px] text-muted-foreground">{n.createdAt}</Text>
            </Pressable>
          ))}
          {data?.pagination ? (
            <LoadMoreButton
              shown={notifications.length}
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
  return <RouteError error={error} retry={retry} title="Couldn't load notifications" />;
}
