import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { useAuth } from "@/contexts/auth-context";
import { useApi } from "@/hooks/use-api";
import { clearGalleryItems, getGalleryItems, removeGalleryItem, updateGalleryItemName } from "@/lib/gallery-session";
import { enqueueUpload, processQueue } from "@/lib/upload-queue";

type ClientOption = { id: string; name: string };
type CaseOption = { id: string; title: string; caseNumber: string; client: { id: string } };

function extensionOf(name: string) {
  const match = /\.([a-zA-Z0-9]+)$/.exec(name);
  return match ? match[1].toLowerCase() : "jpg";
}

export default function GalleryAssignScreen() {
  const [items, setLocalItems] = useState(() => getGalleryItems());
  const { token } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: clientsData, isLoading: clientsLoading, error: clientsError, refetch: refetchClients } =
    useApi<{ clients: ClientOption[] }>("/clients");
  const { data: casesData } = useApi<{ cases: CaseOption[] }>("/cases");
  const clients = clientsData?.clients ?? [];
  const cases = casesData?.cases ?? [];

  const casesForClient = useMemo(
    () => (clientId ? cases.filter((c) => c.client.id === clientId) : []),
    [cases, clientId],
  );

  const canConfirm = Boolean(
    clientId && caseId && !isSubmitting && items.length > 0 && items.every((item) => item.name.trim()),
  );

  function removeAt(index: number) {
    removeGalleryItem(index);
    setLocalItems(getGalleryItems());
  }

  function renameAt(index: number, name: string) {
    updateGalleryItemName(index, name);
    setLocalItems(getGalleryItems());
  }

  async function confirm() {
    if (!clientId || !caseId || items.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Each picked file uploads as its own independent document — unlike the camera
      // flow, gallery picks aren't combined into a single multi-page scan.
      for (const item of items) {
        await enqueueUpload({
          name: item.name.trim(),
          clientId,
          caseId,
          fileType: extensionOf(item.name),
          contentType: item.mimeType,
          sizeBytes: item.sizeBytes,
          sourceUri: item.uri,
        });
      }

      clearGalleryItems();
      void processQueue(token); // kick off an attempt now; no-op if offline
      router.replace({ pathname: "/upload-queue" });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Couldn't file these files.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Stack.Screen options={{ title: "Assign & upload" }} />
        <EmptyState icon="images-outline" title="Nothing to file" description="Go back and choose files from your gallery first." />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background px-5 pt-3" contentContainerStyle={{ paddingBottom: 32 }}>
      <Stack.Screen options={{ title: "Assign & upload" }} />

      <Text className="text-xs text-muted-foreground">
        {items.length} file{items.length > 1 ? "s" : ""} ready — file {items.length > 1 ? "these" : "this"} under a
        client and case.
      </Text>

      <Text className="mt-4 mb-1 text-xs font-medium text-foreground">Files</Text>
      <View className="gap-2">
        {items.map((item, index) => (
          <View key={`${item.uri}-${index}`} className="flex-row items-center gap-2 rounded-xl border border-border p-2">
            <Image source={{ uri: item.uri }} className="h-12 w-12 rounded-lg bg-muted" resizeMode="cover" />
            <TextInput
              value={item.name}
              onChangeText={(text) => renameAt(index, text)}
              placeholderTextColor="#8A8378"
              className="flex-1 rounded-lg border border-border px-2.5 py-2 text-xs text-foreground"
            />
            <Pressable onPress={() => removeAt(index)} hitSlop={8} className="p-1">
              <Ionicons name="close" size={16} color="#8A8378" />
            </Pressable>
          </View>
        ))}
      </View>

      <Text className="mt-4 mb-1 text-xs font-medium text-foreground">Client</Text>
      {clientsLoading ? (
        <LoadingState label="Loading clients…" />
      ) : clientsError ? (
        <InlineError message={clientsError} onRetry={refetchClients} />
      ) : clients.length === 0 ? (
        <EmptyState icon="people-outline" title="No clients available" />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {clients.map((c) => (
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

      {submitError ? <InlineError message={submitError} onRetry={confirm} /> : null}

      <Pressable
        onPress={confirm}
        disabled={!canConfirm}
        className={`mt-6 items-center rounded-xl py-3 ${canConfirm ? "bg-primary" : "bg-muted/30"}`}
      >
        <Text className={`text-sm font-semibold ${canConfirm ? "text-primary-foreground" : "text-muted-foreground"}`}>
          {isSubmitting ? "Filing…" : `Confirm & upload ${items.length > 1 ? `(${items.length})` : ""}`}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't assign these files" />;
}
