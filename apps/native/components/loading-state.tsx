import { ActivityIndicator, Pressable, Text, View } from "react-native";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <View className="items-center justify-center gap-2 px-8 py-6">
      <ActivityIndicator />
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}

export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="items-center justify-center gap-2 px-8 py-6">
      <Text className="text-sm font-medium text-destructive">Couldn't load this</Text>
      <Text className="max-w-xs text-center text-xs text-muted-foreground">{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} className="mt-1">
          <Text className="text-xs font-medium text-brand">Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
