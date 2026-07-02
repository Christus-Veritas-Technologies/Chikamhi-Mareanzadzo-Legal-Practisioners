import { Stack, router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { useAuth } from "@/contexts/auth-context";
import { useApi } from "@/hooks/use-api";
import { apiFetch } from "@/lib/api";
import { clearPages, getPages } from "@/lib/scan-session";

type ClientOption = { id: string; name: string };
type CaseOption = { id: string; title: string; caseNumber: string; client: { id: string } };

export default function ScanAssignScreen() {
  const pages = useMemo(() => getPages(), []);
  const { token } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const { data: clientsData, isLoading: clientsLoading, error: clientsError, refetch: refetchClients } =
    useApi<{ clients: ClientOption[] }>("/clients");
  const { data: casesData } = useApi<{ cases: CaseOption[] }>("/cases");
  const clients = clientsData?.clients ?? [];
  const cases = casesData?.cases ?? [];

  const casesForClient = useMemo(
    () => (clientId ? cases.filter((c) => c.client.id === clientId) : []),
    [cases, clientId],
  );

  const canConfirm = Boolean(clientId && caseId && filename.trim() && !isSubmitting && pages.length > 0);

  async function confirm() {
    if (!clientId || !caseId || !filename.trim() || !token || pages.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setProgress(0);

    const baseName = filename.trim().replace(/\.[^/.]+$/, "");
    const filedNames: string[] = [];

    try {
      for (let i = 0; i < pages.length; i++) {
        const uri = pages[i];
        const name = pages.length > 1 ? `${baseName} (page ${i + 1} of ${pages.length}).jpg` : `${baseName}.jpg`;

        const { document, uploadUrl } = await apiFetch<{
          document: { id: string };
          uploadUrl: string | null;
        }>("/documents", {
          method: "POST",
          body: { name, fileType: "jpg", clientId, caseId, contentType: "image/jpeg" },
          token,
        });

        if (uploadUrl) {
          const blob = await (await fetch(uri)).blob();
          const putRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "image/jpeg" },
            body: blob,
          });
          if (!putRes.ok) throw new Error(`Couldn't upload page ${i + 1} to storage.`);
        }

        filedNames.push(name);
        setProgress(i + 1);
        void document;
      }

      clearPages();
      router.replace({ pathname: "/upload-queue", params: { justAdded: filedNames.join("|") } });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Couldn't file this scan.");
    } finally {
      setIsSubmitting(false);
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
    <ScrollView className="flex-1 bg-background px-5 pt-3" contentContainerStyle={{ paddingBottom: 32 }}>
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
        <Text
          className={`text-sm font-semibold ${canConfirm ? "text-primary-foreground" : "text-muted-foreground"}`}
        >
          {isSubmitting ? `Filing ${progress}/${pages.length}…` : "Confirm & upload"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't assign this scan" />;
}
