import { Stack, router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { EmptyState } from "@/components/empty-state";
import { RouteError } from "@/components/route-error";
import { CASES, CLIENTS } from "@/lib/mock-data";

export default function ScanAssignScreen() {
  const { count } = useLocalSearchParams<{ count: string }>();
  const [clientId, setClientId] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [filename, setFilename] = useState("");

  const casesForClient = useMemo(
    () => (clientId ? CASES.filter((c) => c.clientId === clientId) : []),
    [clientId],
  );

  const canConfirm = Boolean(clientId && caseId && filename.trim());

  function confirm() {
    if (!canConfirm) return;
    router.replace({ pathname: "/upload-queue", params: { justAdded: filename } });
  }

  return (
    <ScrollView className="flex-1 bg-background px-5 pt-3" contentContainerStyle={{ paddingBottom: 32 }}>
      <Stack.Screen options={{ title: "Assign & upload" }} />

      <Text className="text-xs text-muted-foreground">
        {count} page{Number(count) > 1 ? "s" : ""} ready — file this scan under a client and case.
      </Text>

      <Text className="mt-4 mb-1 text-xs font-medium text-foreground">File name</Text>
      <TextInput
        value={filename}
        onChangeText={setFilename}
        placeholder="e.g. Rates Clearance Certificate.jpg"
        placeholderTextColor="#8A8378"
        className="rounded-xl border border-border px-3 py-2.5 text-sm text-foreground"
      />

      <Text className="mt-4 mb-1 text-xs font-medium text-foreground">Client</Text>
      {CLIENTS.length === 0 ? (
        <EmptyState icon="people-outline" title="No clients available" />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {CLIENTS.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  setClientId(c.id);
                  setCaseId(null);
                }}
                className={`rounded-full border px-3 py-1.5 ${clientId === c.id ? "border-brand bg-brand-muted" : "border-border"}`}
              >
                <Text
                  className={`text-xs ${clientId === c.id ? "font-medium text-brand-foreground" : "text-foreground"}`}
                >
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      <Text className="mt-4 mb-1 text-xs font-medium text-foreground">Case</Text>
      {!clientId ? (
        <Text className="text-xs text-muted-foreground">Pick a client first.</Text>
      ) : casesForClient.length === 0 ? (
        <EmptyState icon="folder-open-outline" title="No open cases for this client" />
      ) : (
        <View className="gap-2">
          {casesForClient.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCaseId(c.id)}
              className={`rounded-xl border px-3 py-2.5 ${caseId === c.id ? "border-brand bg-brand-muted" : "border-border"}`}
            >
              <Text
                className={`text-sm ${caseId === c.id ? "font-medium text-brand-foreground" : "text-foreground"}`}
              >
                {c.title}
              </Text>
              <Text className="text-[11px] text-muted-foreground">{c.caseNumber}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        onPress={confirm}
        disabled={!canConfirm}
        className={`mt-6 items-center rounded-xl py-3 ${canConfirm ? "bg-primary" : "bg-muted/30"}`}
      >
        <Text
          className={`text-sm font-semibold ${canConfirm ? "text-primary-foreground" : "text-muted-foreground"}`}
        >
          Confirm & upload
        </Text>
      </Pressable>
    </ScrollView>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't assign this scan" />;
}
