import { Ionicons } from "@expo/vector-icons";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, Text, TextInput, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { StatusPill } from "@/components/status-pill";
import { useAuth } from "@/contexts/auth-context";
import { useApi } from "@/hooks/use-api";
import { apiFetch } from "@/lib/api";
import { downloadDocument, isDownloaded } from "@/lib/downloads";
import { formatStatus } from "@/lib/format-status";

type Signature = {
  id: string;
  signerName: string;
  signerRole: string | null;
  witnessedBy: string | null;
  createdAt: string;
};

type DocumentDetail = {
  id: string;
  name: string;
  fileType: string;
  status: string;
  uploadedBy: string;
  modified: string;
  client: { id: string; name: string } | null;
  case: { id: string; title: string } | null;
  downloadUrl: string | null;
  signatures: Signature[];
};

const IMAGE_TYPES = ["jpg", "jpeg", "png", "heic", "webp"];

export default function DocumentViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const { data, isLoading, error, refetch } = useApi<{ document: DocumentDetail }>(`/documents/${id}`);
  const doc = data?.document;
  const [isDownloading, setIsDownloading] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);

  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  async function submitSignature() {
    if (!doc || !signerName.trim() || !consentChecked) return;
    setIsSigning(true);
    try {
      await apiFetch(`/documents/${doc.id}/sign`, {
        method: "POST",
        body: { signerName: signerName.trim(), signerRole: signerRole.trim() || undefined, consent: true },
        token,
      });
      setSignModalOpen(false);
      setSignerName("");
      setSignerRole("");
      setConsentChecked(false);
      refetch();
      Alert.alert("Signature recorded", "This document's signature has been added to its audit trail.");
    } catch (err) {
      Alert.alert("Couldn't sign document", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setIsSigning(false);
    }
  }

  useEffect(() => {
    if (doc) setSavedOffline(isDownloaded(doc.id));
  }, [doc]);

  async function handleDownload() {
    if (!doc) return;
    if (!doc.downloadUrl) {
      Alert.alert("No file stored yet", "This record has no uploaded bytes to download.");
      return;
    }
    setIsDownloading(true);
    try {
      await downloadDocument({ id: doc.id, name: doc.name, downloadUrl: doc.downloadUrl });
      setSavedOffline(true);
      Alert.alert("Downloaded", "Saved for offline access. Find it under Downloads in the menu.");
    } catch (err) {
      Alert.alert("Download failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  if (isLoading) {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Document" }} />
        <LoadingState label="Loading document…" />
      </Container>
    );
  }

  if (error && !error.toLowerCase().includes("not found")) {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Document" }} />
        <InlineError message={error} onRetry={refetch} />
      </Container>
    );
  }

  if (!doc) {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Document" }} />
        <EmptyState icon="document-outline" title="Document not found" />
      </Container>
    );
  }

  return (
    <Container className="px-5 pt-3">
      <Stack.Screen options={{ title: doc.name }} />

      <View className="h-64 items-center justify-center overflow-hidden rounded-xl bg-muted/15">
        {doc.downloadUrl && IMAGE_TYPES.includes(doc.fileType.toLowerCase()) ? (
          <Image source={{ uri: doc.downloadUrl }} className="h-full w-full" resizeMode="contain" />
        ) : (
          <>
            <Ionicons
              name={doc.fileType.toLowerCase() === "pdf" ? "document-text-outline" : "document-outline"}
              size={32}
              color="#8A8378"
            />
            <Text className="mt-2 text-center text-xs text-muted-foreground">
              {doc.downloadUrl
                ? "Preview isn't available for this file type — download to view it."
                : "No file stored yet for this record."}
            </Text>
          </>
        )}
      </View>

      <View className="mt-4">
        <Text className="text-sm font-medium text-foreground">{doc.name}</Text>
        <View className="mt-1.5">
          <StatusPill status={formatStatus(doc.status)} />
        </View>
      </View>

      <View className="mt-4 gap-3">
        <View>
          <Text className="text-[10px] tracking-wide text-muted-foreground uppercase">Client</Text>
          {doc.client ? (
            <Link href={`/client/${doc.client.id}`}>
              <Text className="text-sm text-brand">{doc.client.name}</Text>
            </Link>
          ) : (
            <Text className="text-sm text-foreground">—</Text>
          )}
        </View>
        <View>
          <Text className="text-[10px] tracking-wide text-muted-foreground uppercase">Case</Text>
          {doc.case ? (
            <Link href={`/case/${doc.case.id}`}>
              <Text className="text-sm text-brand">{doc.case.title}</Text>
            </Link>
          ) : (
            <Text className="text-sm text-foreground">—</Text>
          )}
        </View>
        <View>
          <Text className="text-[10px] tracking-wide text-muted-foreground uppercase">
            Uploaded by
          </Text>
          <Text className="text-sm text-foreground">{doc.uploadedBy}</Text>
        </View>
        <View>
          <Text className="text-[10px] tracking-wide text-muted-foreground uppercase">Signatures</Text>
          {doc.signatures.length === 0 ? (
            <Text className="text-sm text-foreground">Not yet signed.</Text>
          ) : (
            <View className="mt-1 gap-1.5">
              {doc.signatures.map((s) => (
                <View key={s.id} className="rounded-lg border border-border px-2.5 py-1.5">
                  <Text className="text-xs font-medium text-foreground">
                    {s.signerName}
                    {s.signerRole ? ` · ${s.signerRole}` : ""}
                  </Text>
                  <Text className="text-[11px] text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {s.witnessedBy ? ` · witnessed by ${s.witnessedBy}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <Pressable
        onPress={handleDownload}
        disabled={isDownloading}
        className="mt-6 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
      >
        {isDownloading ? (
          <ActivityIndicator color="#F5F0E6" size="small" />
        ) : (
          <Ionicons
            name={savedOffline ? "checkmark-circle-outline" : "download-outline"}
            size={16}
            color="#F5F0E6"
          />
        )}
        <Text className="text-sm font-semibold text-primary-foreground">
          {isDownloading ? "Downloading…" : savedOffline ? "Saved offline · Download again" : "Download"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => setSignModalOpen(true)}
        className="mt-3 mb-6 flex-row items-center justify-center gap-2 rounded-xl border border-border py-3"
      >
        <Ionicons name="create-outline" size={16} color="#211D17" />
        <Text className="text-sm font-semibold text-foreground">Sign document</Text>
      </Pressable>

      <Modal visible={signModalOpen} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/40 px-8">
          <View className="w-full gap-3 rounded-xl bg-background p-4">
            <Text className="text-sm font-semibold text-foreground">Sign document</Text>
            <Text className="text-xs text-muted-foreground">
              Records a typed-name electronic signature — name, role, timestamp, and your account as
              witness are permanently attached to this document's audit trail.
            </Text>
            <TextInput
              value={signerName}
              onChangeText={setSignerName}
              placeholder="Signer's full name"
              placeholderTextColor="#8A8378"
              className="rounded-lg border border-border px-3 py-2.5 text-sm text-foreground"
            />
            <TextInput
              value={signerRole}
              onChangeText={setSignerRole}
              placeholder="Role (optional) — e.g. Client, Witness"
              placeholderTextColor="#8A8378"
              className="rounded-lg border border-border px-3 py-2.5 text-sm text-foreground"
            />
            <Pressable onPress={() => setConsentChecked((c) => !c)} className="flex-row items-start gap-2">
              <View
                className={`mt-0.5 h-4 w-4 items-center justify-center rounded-sm border ${consentChecked ? "border-success bg-success" : "border-input"}`}
              >
                {consentChecked ? <Ionicons name="checkmark" size={10} color="white" /> : null}
              </View>
              <Text className="flex-1 text-xs text-muted-foreground">
                I confirm {signerName.trim() || "the signer"} has reviewed this document and intends this as
                their legally binding electronic signature.
              </Text>
            </Pressable>
            <View className="flex-row justify-end gap-3">
              <Pressable onPress={() => setSignModalOpen(false)} className="px-3 py-2">
                <Text className="text-sm text-muted-foreground">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={submitSignature}
                disabled={isSigning || !signerName.trim() || !consentChecked}
                className="rounded-xl bg-primary px-4 py-2"
              >
                <Text className="text-sm font-semibold text-primary-foreground">
                  {isSigning ? "Signing…" : "Confirm signature"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load this document" />;
}
