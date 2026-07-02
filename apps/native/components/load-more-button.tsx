import { Pressable, Text, View } from "react-native";

// Shared footer for paginated lists: shows "N of total" plus a "Load more" button that
// bumps the caller's `limit` state. Renders nothing once everything is loaded.
export function LoadMoreButton({
  shown,
  total,
  onPress,
  loading,
}: {
  shown: number;
  total: number;
  onPress: () => void;
  loading?: boolean;
}) {
  if (shown >= total) return null;

  return (
    <View className="mt-2 flex-row items-center justify-between px-1 pb-4">
      <Text className="text-[11px] text-muted-foreground">
        Showing {shown} of {total}
      </Text>
      <Pressable
        onPress={onPress}
        disabled={loading}
        className="rounded-full border border-border px-3 py-1.5"
      >
        <Text className="text-xs font-medium text-foreground">{loading ? "Loading…" : "Load more"}</Text>
      </Pressable>
    </View>
  );
}
