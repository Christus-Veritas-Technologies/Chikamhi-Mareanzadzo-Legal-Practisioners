import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";

import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";

// Reusable typed-name electronic signature modal — the same flow used by the document
// viewer, extracted so any "Sign" quick action (docs list, case documents, etc.) can
// trigger it without duplicating the form/consent/submit logic.
export function SignDocumentModal({
  documentId,
  documentName,
  visible,
  onOpenChange,
  onSigned,
  onError,
}: {
  documentId: string;
  documentName?: string;
  visible: boolean;
  onOpenChange: (open: boolean) => void;
  onSigned?: () => void;
  onError?: (message: string) => void;
}) {
  const { token } = useAuth();
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  function reset() {
    setSignerName("");
    setSignerRole("");
    setConsentChecked(false);
  }

  async function submitSignature() {
    if (!signerName.trim() || !consentChecked) return;
    setIsSigning(true);
    try {
      await apiFetch(`/documents/${documentId}/sign`, {
        method: "POST",
        body: { signerName: signerName.trim(), signerRole: signerRole.trim() || undefined, consent: true },
        token,
      });
      onOpenChange(false);
      reset();
      onSigned?.();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Couldn't sign document. Please try again.");
    } finally {
      setIsSigning(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/40 px-8">
        <View className="w-full gap-3 rounded-xl bg-background p-4">
          <Text className="text-sm font-semibold text-foreground">
            Sign document{documentName ? ` — ${documentName}` : ""}
          </Text>
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
            <Pressable
              onPress={() => {
                onOpenChange(false);
                reset();
              }}
              className="px-3 py-2"
            >
              <Text className="text-sm text-muted-foreground">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={submitSignature}
              disabled={isSigning || !signerName.trim() || !consentChecked}
              className="rounded-xl bg-primary px-4 py-2"
              style={{ opacity: isSigning || !signerName.trim() || !consentChecked ? 0.5 : 1 }}
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                {isSigning ? "Signing…" : "Confirm signature"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
