import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Container } from "@/components/container";
import { AlertDialog, ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { StatusPill } from "@/components/status-pill";
import { useAuth } from "@/contexts/auth-context";
import { useApi } from "@/hooks/use-api";
import { apiFetch } from "@/lib/api";
import { formatStatus } from "@/lib/format-status";

type Deadline = {
  id: string;
  title: string;
  dueAt: string;
  notes: string | null;
  completedAt: string | null;
};

const DOC_TABS = [
  { value: "all", label: "All" },
  { value: "Signed", label: "Signed" },
  { value: "Draft", label: "Draft" },
] as const;

type DocFilter = (typeof DOC_TABS)[number]["value"];

type CaseDetail = {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  matterType: string;
  location: string | null;
  registry: string | null;
  leadAttorney: string;
  opened: string;
  client: { id: string; name: string };
  documents: { id: string; name: string; status: string; modified: string }[];
  timeline: { id: string; description: string; actor: string; timestamp: string }[];
};

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [docFilter, setDocFilter] = useState<DocFilter>("all");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { token } = useAuth();
  const { data, isLoading, error, refetch } = useApi<{ case: CaseDetail }>(`/cases/${id}`);
  const matter = data?.case;

  const { data: deadlinesData, refetch: refetchDeadlines } = useApi<{ deadlines: Deadline[] }>(
    `/deadlines?caseId=${id}`,
  );
  const deadlines = useMemo(
    () => [...(deadlinesData?.deadlines ?? [])].sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    [deadlinesData],
  );
  const [isAddingDeadline, setIsAddingDeadline] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function addDeadline() {
    if (!newTitle.trim() || !newDue.trim() || !id) return;
    setIsSaving(true);
    try {
      await apiFetch("/deadlines", {
        method: "POST",
        body: { caseId: id, title: newTitle.trim(), dueAt: newDue.trim() },
        token,
      });
      setNewTitle("");
      setNewDue("");
      setIsAddingDeadline(false);
      refetchDeadlines();
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleComplete(deadlineId: string, completed: boolean) {
    await apiFetch(`/deadlines/${deadlineId}`, { method: "PATCH", body: { completed }, token });
    refetchDeadlines();
  }

  async function removeDeadline(deadlineId: string) {
    await apiFetch(`/deadlines/${deadlineId}`, { method: "DELETE", token });
    refetchDeadlines();
  }

  async function deleteCase(deleteDocuments: boolean) {
    if (!id) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/cases/${id}`, { method: "DELETE", body: { deleteDocuments }, token });
      setDeleteOpen(false);
      router.replace(matter?.client ? `/client/${matter.client.id}` : "/cases");
    } catch (err) {
      setDeleteOpen(false);
      setDeleteError(err instanceof Error ? err.message : "Couldn't delete case.");
    } finally {
      setIsDeleting(false);
    }
  }

  const filteredDocs = useMemo(() => {
    const documents = matter?.documents ?? [];
    if (docFilter === "all") return documents;
    return documents.filter((d) => formatStatus(d.status) === docFilter);
  }, [matter, docFilter]);

  if (isLoading) {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Case" }} />
        <LoadingState label="Loading case…" />
      </Container>
    );
  }

  if (error && !error.toLowerCase().includes("not found")) {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Case" }} />
        <InlineError message={error} onRetry={refetch} />
      </Container>
    );
  }

  if (!matter) {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Case" }} />
        <EmptyState icon="folder-open-outline" title="Case not found" />
      </Container>
    );
  }

  const timeline = matter.timeline;

  return (
    <Container className="px-5 pt-3">
      <Stack.Screen options={{ title: matter.caseNumber }} />

      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-[11px] text-muted-foreground">{matter.caseNumber}</Text>
            <StatusPill status={formatStatus(matter.status)} />
          </View>
          <Text className="mt-1 font-serif text-lg font-semibold text-foreground">{matter.title}</Text>
          {matter.client ? (
            <Text className="text-xs text-muted-foreground">{matter.client.name}</Text>
          ) : null}
        </View>
        <Pressable onPress={() => setDeleteOpen(true)} hitSlop={8} className="mt-1 p-1">
          <Ionicons name="trash-outline" size={18} color="#B3413A" />
        </Pressable>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-x-6 gap-y-2 border-y border-border py-3">
        <View>
          <Text className="text-[10px] tracking-wide text-muted-foreground uppercase">
            Matter type
          </Text>
          <Text className="text-sm text-foreground">{matter.matterType}</Text>
        </View>
        <View>
          <Text className="text-[10px] tracking-wide text-muted-foreground uppercase">
            Lead attorney
          </Text>
          <Text className="text-sm text-foreground">{matter.leadAttorney}</Text>
        </View>
        <View>
          <Text className="text-[10px] tracking-wide text-muted-foreground uppercase">Opened</Text>
          <Text className="text-sm text-foreground">{matter.opened}</Text>
        </View>
      </View>

      <View className="mt-4">
        <SegmentedTabs tabs={DOC_TABS} value={docFilter} onChange={setDocFilter} />
      </View>

      <View className="mt-2 gap-2">
        {filteredDocs.length === 0 ? (
          <EmptyState
            icon="document-outline"
            title="No documents here"
            description={
              docFilter === "all"
                ? "Upload the first document for this case."
                : `Nothing marked "${docFilter}".`
            }
          />
        ) : (
          filteredDocs.map((doc) => (
            <View
              key={doc.id}
              className="flex-row items-center justify-between rounded-xl border border-border px-3 py-3"
            >
              <View className="min-w-0 flex-1 pr-2">
                <Text numberOfLines={1} className="text-sm font-medium text-foreground">
                  {doc.name}
                </Text>
                <Text className="text-xs text-muted-foreground">{doc.modified}</Text>
              </View>
              <StatusPill status={formatStatus(doc.status)} />
            </View>
          ))
        )}
      </View>

      <View className="mt-6 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-foreground">Deadlines</Text>
        <Pressable onPress={() => setIsAddingDeadline((s) => !s)} hitSlop={8}>
          <Text className="text-xs font-medium text-brand">{isAddingDeadline ? "Cancel" : "+ Add"}</Text>
        </Pressable>
      </View>

      {isAddingDeadline ? (
        <View className="mt-2 gap-2 rounded-xl border border-dashed border-border p-3">
          <TextInput
            autoFocus
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="e.g. File heads of argument"
            placeholderTextColor="#8A8378"
            className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
          />
          <TextInput
            value={newDue}
            onChangeText={setNewDue}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#8A8378"
            className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
          />
          <Pressable
            onPress={addDeadline}
            disabled={isSaving || !newTitle.trim() || !newDue.trim()}
            className="items-center rounded-xl bg-primary py-2"
          >
            <Text className="text-sm font-semibold text-primary-foreground">
              {isSaving ? "Adding…" : "Add deadline"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {deadlines.length === 0 ? (
        <Text className="mt-2 text-xs text-muted-foreground">No deadlines set for this case.</Text>
      ) : (
        <View className="mt-2 gap-2">
          {deadlines.map((d) => {
            const isOverdue = !d.completedAt && new Date(d.dueAt) < new Date();
            return (
              <View
                key={d.id}
                className="flex-row items-start justify-between gap-2 rounded-xl border border-border px-3 py-2.5"
              >
                <View className="flex-1 flex-row items-start gap-2">
                  <Pressable
                    onPress={() => toggleComplete(d.id, !d.completedAt)}
                    className={`mt-0.5 h-4 w-4 items-center justify-center rounded-full border ${d.completedAt ? "border-success bg-success" : "border-input"}`}
                  >
                    {d.completedAt ? <Ionicons name="checkmark" size={10} color="white" /> : null}
                  </Pressable>
                  <View className="flex-1">
                    <Text className={`text-xs font-medium ${d.completedAt ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {d.title}
                    </Text>
                    <Text className={`text-[11px] ${isOverdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                      {new Date(d.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {isOverdue ? " · Overdue" : ""}
                    </Text>
                  </View>
                </View>
                <Pressable onPress={() => removeDeadline(d.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={14} color="#8A8378" />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <Text className="mt-6 mb-2 text-sm font-medium text-foreground">Timeline</Text>
      {timeline.length === 0 ? (
        <EmptyState icon="time-outline" title="No activity yet" />
      ) : (
        <View className="gap-3 border-l border-border pl-3 pb-6">
          {timeline.map((event) => (
            <View key={event.id}>
              <Text className="text-xs text-foreground">{event.description}</Text>
              <Text className="text-[11px] text-muted-foreground">{event.timestamp}</Text>
            </View>
          ))}
        </View>
      )}

      <ConfirmDialog
        visible={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this case?"
        description={`${matter.title} will be moved to Trash and can be restored within 30 days.`}
        cascadeLabel={
          matter.documents.length > 0
            ? `Also delete the ${matter.documents.length} document${matter.documents.length === 1 ? "" : "s"} inside this case`
            : undefined
        }
        confirmLabel="Delete case"
        destructive
        isLoading={isDeleting}
        onConfirm={deleteCase}
      />
      <AlertDialog
        visible={Boolean(deleteError)}
        onOpenChange={(open) => !open && setDeleteError(null)}
        title="Couldn't delete case"
        description={deleteError ?? undefined}
      />
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load this case" />;
}
