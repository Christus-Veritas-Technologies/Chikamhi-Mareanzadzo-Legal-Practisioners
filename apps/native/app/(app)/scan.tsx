import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RouteError } from "@/components/route-error";

// Mock capture — swap the viewfinder for expo-camera once that package is installed
// (not available in this environment yet). Shutter press appends a placeholder "page".
export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [pages, setPages] = useState<string[]>([]);

  function capture() {
    setPages((p) => [...p, `Page ${p.length + 1}`]);
  }

  function done() {
    if (pages.length === 0) return;
    router.push({ pathname: "/scan-review", params: { count: String(pages.length) } });
    setPages([]);
  }

  return (
    <View className="flex-1 bg-ink" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-2">
        <Text className="text-xs font-medium text-ink-foreground/70">
          {pages.length > 0 ? `${pages.length} page${pages.length > 1 ? "s" : ""} captured` : "Ready to scan"}
        </Text>
        {pages.length > 0 ? (
          <Pressable onPress={done}>
            <Text className="text-xs font-semibold text-brand">Continue</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Mock viewfinder */}
      <View className="flex-1 items-center justify-center px-8">
        <View className="aspect-[3/4] w-full items-center justify-center rounded-2xl border-2 border-dashed border-brand/50">
          <Ionicons name="document-outline" size={40} color="#C89A54" />
          <Text className="mt-2 text-center text-xs text-ink-foreground/50">
            Position the document within the frame
          </Text>
        </View>
      </View>

      {pages.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-2">
          {pages.map((p, i) => (
            <View
              key={i}
              className="mr-2 h-16 w-12 items-center justify-center rounded-md bg-ink-foreground/10"
            >
              <Text className="text-[10px] text-ink-foreground/70">{i + 1}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View
        className="flex-row items-center justify-center px-8 pt-2"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        <Pressable
          onPress={capture}
          className="h-16 w-16 items-center justify-center rounded-full border-4 border-ink-foreground/30 bg-ink-foreground"
        >
          <View className="h-12 w-12 rounded-full bg-brand" />
        </Pressable>
      </View>
    </View>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Scanner hit a snag" />;
}
