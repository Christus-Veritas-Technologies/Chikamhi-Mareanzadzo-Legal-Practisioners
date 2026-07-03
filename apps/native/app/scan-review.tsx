import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { RouteError } from "@/components/route-error";
import { getPages, removePage, setPages } from "@/lib/scan-session";

export default function ScanReviewScreen() {
  const [pages, setLocalPages] = useState<string[]>(() => getPages());

  function removeAt(index: number) {
    removePage(index);
    setLocalPages(getPages());
  }

  function continueToAssign() {
    setPages(pages);
    router.push({ pathname: "/scan-assign", params: { count: String(pages.length) } });
  }

  return (
    <Container className="px-5 pt-9">
      <Stack.Screen options={{ title: "Review scan" }} />

      {pages.length === 0 ? (
        <EmptyState
          icon="scan-outline"
          title="No pages to review"
          description="Go back and capture at least one page."
          action={
            <Pressable onPress={() => router.back()}>
              <Text className="text-xs font-semibold text-brand">Back to scan</Text>
            </Pressable>
          }
        />
      ) : (
        <>
          <Text className="text-xs text-muted-foreground">
            {pages.length} page{pages.length > 1 ? "s" : ""} captured — remove any before continuing.
          </Text>

          <ScrollView className="mt-3">
            <View className="flex-row flex-wrap gap-3">
              {pages.map((uri, index) => (
                <View key={uri} className="items-center gap-1">
                  <View className="h-28 w-20 overflow-hidden rounded-lg bg-muted">
                    <Image source={{ uri }} className="h-full w-full" resizeMode="cover" />
                  </View>
                  <Pressable
                    onPress={() => removeAt(index)}
                    className="flex-row items-center gap-1"
                    hitSlop={6}
                  >
                    <Ionicons name="trash-outline" size={12} color="#B3413A" />
                    <Text className="text-[10px] text-destructive">Remove</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable
                onPress={() => router.back()}
                className="h-28 w-20 items-center justify-center rounded-lg border border-dashed border-border"
              >
                <Ionicons name="add" size={20} color="#8A8378" />
                <Text className="mt-1 text-[10px] text-muted-foreground">Add page</Text>
              </Pressable>
            </View>
          </ScrollView>

          <Pressable
            onPress={continueToAssign}
            className="mt-6 items-center rounded-xl bg-primary py-3"
          >
            <Text className="text-sm font-semibold text-primary-foreground">Continue</Text>
          </Pressable>
        </>
      )}
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't review this scan" />;
}
