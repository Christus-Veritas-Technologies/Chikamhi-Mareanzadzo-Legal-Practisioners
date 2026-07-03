import { Stack, router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { EmptyState } from "@/components/empty-state";
import {
  type CaseOption,
  type ClientOption,
  DestinationPickerSheet,
  EMPTY_DESTINATION,
  type FolderOption,
} from "@/components/destination-picker-sheet";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { useAuth } from "@/contexts/auth-context";
import { useApi } from "@/hooks/use-api";
import { assembleScanPdf } from "@/lib/pdf-assembly";
import { clearPages, getPages } from "@/lib/scan-session";
import { enqueueUpload, processQueue } from "@/lib/upload-queue";

export default function ScanAssignScreen() {
  const pages = useMemo(() => getPages(), []);
  const { token } = useAuth();
  const [destination, setDestination] = useState(EMPTY_DESTINATION);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filename, setFilename] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "combining" | "queuing">("idle");

  const { data: clientsData, isLoading: clientsLoading, error: clientsError, refetch: refetchClients } =
    useApi<{ clients: ClientOption[] }>("/clients");
  const { data: casesData } = useApi<{ cases: CaseOption[] }>("/cases");
  const { data: foldersData } = useApi<{ folders: FolderOption[] }>("/folders");
  const clients = clientsData?.clients ?? [];
  const cases = casesData?.cases ?? [];
  const folders = foldersData?.folders ?? [];

  const canConfirm = Boolean(destination.clientId && filename.trim() && !isSubmitting && pages.length > 0);

  async function confirm() {
    if (!destination.clientId || !filename.trim() || pages.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const baseName = filename.trim().replace(/\.[^/.]+$/, "");

    try {
      // Multi-page scans are combined client-side into a single multi-page PDF (via
      // pdf-lib) instead of filing each page as its own "(page N of M)" JPEG.
      const isMultiPage = pages.length > 1;
      let sourceUri: string;
      let name: string;
      let fileType: string;
      let contentType: string;
      let sizeBytes: number | undefined;

      if (isMultiPage) {
        setPhase("combining");
        const pdf = await assembleScanPdf(pages);
        sourceUri = pdf.uri;
        sizeBytes = pdf.sizeBytes;
        name = `${baseName}.pdf`;
        fileType = "pdf";
        contentType = "application/pdf";
      } else {
        sourceUri = pages[0];
        name = `${baseName}.jpg`;
        fileType = "jpg";
        contentType = "image/jpeg";
      }

      // Files into the persistent, offline-friendly upload queue instead of uploading
      // inline — the file is copied to durable app storage immediately, then the queue
      // screen (and expo-network reconnect listener) drives the actual upload attempts.
      setPhase("queuing");
      await enqueueUpload({
        name,
        clientId: destination.clientId,
        caseId: destination.caseId ?? undefined,
        folderId: destination.folderId ?? undefined,
        fileType,
        contentType,
        sizeBytes,
        sourceUri,
      });

      clearPages();
      void processQueue(token); // kick off an attempt now; no-op if offline
      router.replace({ pathname: "/upload-queue" });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Couldn't file this scan.");
    } finally {
      setIsSubmitting(false);
      setPhase("idle");
    }
  }

  if (pages.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Stack.Screen options={{ title: "Assign & upload" }} />
        <EmptyState icon="scan-outline" title="Nothing to file" description="Go back and capture a scan first." />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background px-5 pt-9" contentContainerStyle={{ paddingBottom: 32 }}>
      <Stack.Screen options={{ title: "Assign & upload" }} />

      <Text className="text-xs text-muted-foreground">
        {pages.length} page{pages.length > 1 ? "s" : ""} ready — file this scan under a client and case.
      </Text>

      <Text className="mt-4 mb-1 text-xs font-medium text-foreground">File name</Text>
      <TextInput
        value={filename}
        onChangeText={setFilename}
        placeholder="e.g. Rates Clearance Certificate"
        placeholderTextColor="#8A8378"
        className="rounded-xl border border-border px-3 py-2.5 text-sm text-foreground"
      />

      <Text className="mt-4 mb-1 text-xs font-medium text-foreground">Destination</Text>
      {clientsLoading ? (
        <LoadingState label="Loading clients…" />
      ) : clientsError ? (
        <InlineError message={clientsError} onRetry={refetchClients} />
      ) : (
        <Pressable
          onPress={() => setPickerOpen(true)}
          className="flex-row items-center justify-between rounded-xl border border-border px-3 py-2.5"
        >
          {destination.clientId ? (
            <View className="flex-1">
              <Text className="text-sm font-medium text-foreground">{destination.clientName}</Text>
              <Text className="text-[11px] text-muted-foreground">
                {destination.caseTitle ?? "Unfiled"}
                {destination.folderName ? ` · 📁 ${destination.folderName}` : ""}
              </Text>
            </View>
          ) : (
            <Text className="text-sm text-muted-foreground">Choose a client, case, or folder…</Text>
          )}
          <Text className="text-xs font-medium text-brand">{destination.clientId ? "Change" : "Choose"}</Text>
        </Pressable>
      )}

      {submitError ? <InlineError message={submitError} onRetry={confirm} /> : null}

      <Pressable
        onPress={confirm}
        disabled={!canConfirm}
        className={`mt-6 items-center rounded-xl py-3 ${canConfirm ? "bg-primary" : "bg-muted/30"}`}
      >
        <Text
          className={`text-sm font-semibold ${canConfirm ? "text-primary-foreground" : "text-muted-foreground"}`}
        >
          {phase === "combining" ? "Combining pages…" : phase === "queuing" ? "Filing…" : "Confirm & upload"}
        </Text>
      </Pressable>

      <DestinationPickerSheet
        visible={pickerOpen}
        onOpenChange={setPickerOpen}
        value={destination}
        onChange={setDestination}
        clients={clients}
        cases={cases}
        folders={folders}
      />
    </ScrollView>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't assign this scan" />;
}
