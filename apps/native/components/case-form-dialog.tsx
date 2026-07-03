import { Ionicons } from "@expo/vector-icons";
import { Dialog } from "heroui-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { useAuth } from "@/contexts/auth-context";
import { useApi } from "@/hooks/use-api";
import { apiFetch } from "@/lib/api";

type ClientOption = { id: string; name: string };
type UserOption = { id: string; name: string };

// No case-creation flow existed anywhere in native before this — mirrors the web
// CaseFormDialog (packages/web/src/components/case-form-dialog.tsx). Client is picked
// from a searchable list here (rather than a dropdown, which RN has no native equivalent
// of) unless a clientId is passed in for a client-scoped entry point.
export function CaseFormDialog({
  visible,
  onOpenChange,
  clientId,
  onCreated,
}: {
  visible: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  onCreated: () => void;
}) {
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [matterType, setMatterType] = useState("");
  const [location, setLocation] = useState("");
  const [registry, setRegistry] = useState("");
  const [leadAttorneyId, setLeadAttorneyId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedClientName, setSelectedClientName] = useState("");
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const needsClientPicker = !clientId;
  const { data: clientsData } = useApi<{ clients: ClientOption[] }>(
    visible && needsClientPicker ? "/clients" : null,
  );
  const clients = clientsData?.clients ?? [];

  const { data: usersData } = useApi<{ users: UserOption[] }>(visible ? "/users" : null);
  const users = usersData?.users ?? [];

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, clientQuery]);

  const resolvedClientId = clientId ?? selectedClientId;

  function reset() {
    setTitle("");
    setMatterType("");
    setLocation("");
    setRegistry("");
    setLeadAttorneyId("");
    setSelectedClientId("");
    setSelectedClientName("");
    setClientPickerOpen(false);
    setClientQuery("");
  }

  function selectClient(client: ClientOption) {
    setSelectedClientId(client.id);
    setSelectedClientName(client.name);
    setClientPickerOpen(false);
    setClientQuery("");
  }

  async function save() {
    if (!title.trim() || !matterType.trim() || !resolvedClientId) return;
    setIsSaving(true);
    try {
      await apiFetch("/cases", {
        method: "POST",
        body: {
          title: title.trim(),
          clientId: resolvedClientId,
          matterType: matterType.trim(),
          location: location.trim() || undefined,
          registry: registry.trim() || undefined,
          leadAttorneyId: leadAttorneyId || undefined,
        },
        token,
      });
      reset();
      onCreated();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      isOpen={visible}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content className="gap-3 rounded-2xl bg-background p-4">
          <Dialog.Title className="font-serif text-base font-semibold text-foreground">New case</Dialog.Title>
          <Dialog.Description className="text-xs text-muted-foreground">
            {needsClientPicker ? "Pick a client and open a new case." : "Open a new case for this client."}
          </Dialog.Description>

          {needsClientPicker ? (
            <View>
              <Pressable
                onPress={() => setClientPickerOpen((v) => !v)}
                className="flex-row items-center justify-between rounded-lg border border-border px-3 py-2.5"
              >
                <Text className={selectedClientName ? "text-sm text-foreground" : "text-sm text-muted-foreground"}>
                  {selectedClientName || "Select a client…"}
                </Text>
                <Ionicons name={clientPickerOpen ? "chevron-up" : "chevron-down"} size={14} color="#8A8378" />
              </Pressable>

              {clientPickerOpen ? (
                <View className="mt-2 rounded-lg border border-border p-2">
                  <TextInput
                    autoFocus
                    value={clientQuery}
                    onChangeText={setClientQuery}
                    placeholder="Search clients…"
                    placeholderTextColor="#8A8378"
                    className="rounded-md border border-border px-2.5 py-2 text-xs text-foreground"
                  />
                  <ScrollView className="mt-2 max-h-40" keyboardShouldPersistTaps="handled">
                    {filteredClients.length === 0 ? (
                      <Text className="px-1 py-3 text-center text-xs text-muted-foreground">No matches.</Text>
                    ) : (
                      filteredClients.map((c) => (
                        <Pressable
                          key={c.id}
                          onPress={() => selectClient(c)}
                          className="rounded-md px-2 py-2 active:bg-muted/60"
                        >
                          <Text className="text-sm text-foreground">{c.name}</Text>
                        </Pressable>
                      ))
                    )}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          ) : null}

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title (e.g. Stand 4471 — Transfer)"
            placeholderTextColor="#8A8378"
            className="rounded-lg border border-border px-3 py-2.5 text-sm text-foreground"
          />
          <TextInput
            value={matterType}
            onChangeText={setMatterType}
            placeholder="Matter type (e.g. Conveyancing)"
            placeholderTextColor="#8A8378"
            className="rounded-lg border border-border px-3 py-2.5 text-sm text-foreground"
          />
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Location (optional)"
            placeholderTextColor="#8A8378"
            className="rounded-lg border border-border px-3 py-2.5 text-sm text-foreground"
          />
          <TextInput
            value={registry}
            onChangeText={setRegistry}
            placeholder="Registry (optional)"
            placeholderTextColor="#8A8378"
            className="rounded-lg border border-border px-3 py-2.5 text-sm text-foreground"
          />

          {users.length > 0 ? (
            <View>
              <Text className="mb-1.5 text-xs text-muted-foreground">Lead attorney</Text>
              <View className="flex-row flex-wrap gap-2">
                <Pressable
                  onPress={() => setLeadAttorneyId("")}
                  className={`rounded-full border px-2.5 py-1.5 ${leadAttorneyId === "" ? "border-brand bg-brand/10" : "border-border"}`}
                >
                  <Text className="text-xs text-foreground">Unassigned</Text>
                </Pressable>
                {users.map((u) => (
                  <Pressable
                    key={u.id}
                    onPress={() => setLeadAttorneyId(u.id)}
                    className={`rounded-full border px-2.5 py-1.5 ${leadAttorneyId === u.id ? "border-brand bg-brand/10" : "border-border"}`}
                  >
                    <Text className="text-xs text-foreground">{u.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View className="mt-1 flex-row justify-end gap-3">
            <Pressable onPress={() => onOpenChange(false)} disabled={isSaving} className="px-3 py-2">
              <Text className="text-sm text-muted-foreground">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={isSaving || !title.trim() || !matterType.trim() || !resolvedClientId}
              className="rounded-xl bg-primary px-4 py-2"
              style={{ opacity: isSaving || !title.trim() || !matterType.trim() || !resolvedClientId ? 0.5 : 1 }}
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                {isSaving ? "Creating…" : "Create case"}
              </Text>
            </Pressable>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
