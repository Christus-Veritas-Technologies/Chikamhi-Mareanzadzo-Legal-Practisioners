import { Ionicons } from "@expo/vector-icons";
import { Button } from "heroui-native";
import { Text, View } from "react-native";

// Shared body for every screen's `ErrorBoundary` export — Expo Router's per-route error
// boundary convention (the native equivalent of Next.js's error.tsx files on web).
export function RouteError({
  error,
  retry,
  title = "Something went wrong",
}: {
  error: Error;
  retry: () => void;
  title?: string;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
        <Ionicons name="warning-outline" size={18} color="#B3413A" />
      </View>
      <Text className="text-center text-sm font-medium text-foreground">{title}</Text>
      <Text className="text-center text-xs text-muted-foreground">
        {error.message || "Please try again. If this keeps happening, contact IT support."}
      </Text>
      <Button size="sm" onPress={retry} className="mt-1">
        <Button.Label>Try again</Button.Label>
      </Button>
    </View>
  );
}
