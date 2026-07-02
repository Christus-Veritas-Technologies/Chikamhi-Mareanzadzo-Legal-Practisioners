import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AlertDialog, ConfirmDialog } from "@/components/confirm-dialog";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { LoadMoreButton } from "@/components/load-more-button";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { useAuth } from "@/contexts/auth-context";
import { useApi } from "@/hooks/use-api";
import { apiFetch } from "@/lib/api";

type Pagination = { total: number; limit: number; offset: number; hasMore: boolean };

type TrashedDocument = {
  id: string;
  name: string;
  client: { id: string; name: string } | null;
  case: { id: string; title: string } | null;
  deletedBy: string;
  deletedAt: string;
  purgesInDays: number;
};

type TrashedCase = {
  id: string;
  caseNumber: string;
  title: string;
  client: { id: string; name: string } | null;
  documentCount: number;
  deletedBy: string;
  deletedAt: string;
  purgesInDays: number;
};

type TrashedClient = {
  id: string;
  name: string;
  caseCount: number;
  deletedBy: string;
  deletedAt: string;
  purgesInDays: number;
};

type TrashedFolder = {
  id: string;
  name: string;
  documentCount: number;
  deletedBy: string;
  deletedAt: string;
  purgesInDays: number;
};

type TrashedTag = {
  id: string;
  name: string;
  colorClass: string;
  deletedBy: string;
  deletedAt: string;
  purgesInDays: number;
};

const TABS = [
  { value: "documents", label: "Documents" },
  { value: "cases", label: "Cases" },
  { value: "clients", label: "Clients" },
  { value: "folders", label: "Folders" },
  { value: "tags", label: "Tags" },
] as const;

type Tab = (typeof TABS)[number]["value"];

const PAGE_SIZE = 25;

export default function TrashScreen() {
  const [tab, setTab] = useState<Tab>("documents");

  return (
    <Container className="px-5 pt-3">
      <Stack.Screen options={{ title: "Trash" }} />

      <View className="flex-row items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5">
        <Ionicons name="information-circle-outline" size={16} color="#B08A3E" />
        <Text className="flex-1 text-xs text-foreground">
          Deleted items are retained for 30 days, then permanently purged.
        </Text>
      </View>

      <View className="mt-3">
        <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />
      </View>

      {tab === "documents" ? <DocumentsTrash /> : null}
      {tab === "cases" ? <CasesTrash /> : null}
      {tab === "clients" ? <ClientsTrash /> : null}
      {tab === "folders" ? <FoldersTrash /> : null}
      {tab === "tags" ? <TagsTrash /> : null}
    </Container>
  );
}

function TrashRow({
  title,
  subtitle,
  purgesInDays,
  onRestore,
  onDelete,
  isPending,
}: {
  title: React.ReactNode;
  subtitle: string;
  purgesInDays: number;
  onRestore: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  return (
    <View className="rounded-xl border border-border px-3 py-3">
      {title}
      <Text className="mt-0.5 text-xs text-muted-foreground">{subtitle}</Text>
      <Text className={`mt-0.5 text-xs font-medium ${purgesInDays <= 5 ? "text-destructive" : "text-muted-foreground"}`}>
        Purges in {purgesInDays} days
      </Text>
      <View className="mt-2.5 flex-row gap-3">
        <Pressable
          onPress={onRestore}
          disabled={isPending}
          className="flex-1 items-center rounded-lg border border-border py-2"
        >
          <Text className="text-xs font-medium text-foreground">Restore</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          disabled={isPending}
          className="flex-1 items-center rounded-lg bg-destructive/10 py-2"
        >
          <Text className="text-xs font-medium text-destructive">Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DocumentsTrash() {
  const { token } = useAuth();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, error, refetch } = useApi<{ documents: TrashedDocument[]; pagination: Pagination }>(
    `/documents/trash?limit=${limit}`,
    [limit],
  );
  const items = data?.documents ?? [];
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrashedDocument | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function restore(id: string) {
    setPendingId(id);
    try {
      await apiFetch(`/documents/${id}/restore`, { method: "POST", token });
      refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't restore document.");
    } finally {
      setPendingId(null);
    }
  }

  async function permanentlyDelete() {
    if (!deleteTarget) return;
    setPendingId(deleteTarget.id);
    try {
      await apiFetch(`/documents/${deleteTarget.id}/permanent`, { method: "DELETE", token });
      refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't delete document.");
    } finally {
      setPendingId(null);
      setDeleteTarget(null);
    }
  }

  if (isLoading) return <LoadingState label="Loading trash…" />;
  if (error) return <InlineError message={error} onRetry={refetch} />;
  if (items.length === 0) {
    return <EmptyState icon="trash-outline" title="Trash is empty" description="Deleted documents appear here for 30 days." />;
  }

  return (
    <View className="mt-4 gap-2 pb-6">
      {items.map((item) => (
        <TrashRow
          key={item.id}
          title={<Text className="text-sm font-medium text-foreground">{item.name}</Text>}
          subtitle={`${item.case?.title ?? item.client?.name ?? "—"} · Deleted by ${item.deletedBy}`}
          purgesInDays={item.purgesInDays}
          isPending={pendingId === item.id}
          onRestore={() => restore(item.id)}
          onDelete={() => setDeleteTarget(item)}
        />
      ))}
      {data?.pagination ? (
        <LoadMoreButton shown={items.length} total={data.pagination.total} onPress={() => setLimit((l) => l + PAGE_SIZE)} loading={isLoading} />
      ) : null}

      <ConfirmDialog
        visible={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Permanently delete this document?"
        description={`"${deleteTarget?.name}" can't be recovered after this.`}
        confirmLabel="Delete permanently"
        destructive
        isLoading={pendingId === deleteTarget?.id}
        onConfirm={permanentlyDelete}
      />
      <AlertDialog visible={Boolean(errorMessage)} onOpenChange={(open) => !open && setErrorMessage(null)} title="Couldn't delete" description={errorMessage ?? undefined} />
    </View>
  );
}

function CasesTrash() {
  const { token } = useAuth();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, error, refetch } = useApi<{ cases: TrashedCase[]; pagination: Pagination }>(
    `/cases/trash?limit=${limit}`,
    [limit],
  );
  const items = data?.cases ?? [];
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrashedCase | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function restore(id: string) {
    setPendingId(id);
    try {
      await apiFetch(`/cases/${id}/restore`, { method: "POST", token });
      refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't restore case.");
    } finally {
      setPendingId(null);
    }
  }

  async function permanentlyDelete() {
    if (!deleteTarget) return;
    setPendingId(deleteTarget.id);
    try {
      await apiFetch(`/cases/${deleteTarget.id}/permanent`, { method: "DELETE", token });
      refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't delete case.");
    } finally {
      setPendingId(null);
      setDeleteTarget(null);
    }
  }

  if (isLoading) return <LoadingState label="Loading trash…" />;
  if (error) return <InlineError message={error} onRetry={refetch} />;
  if (items.length === 0) {
    return <EmptyState icon="trash-outline" title="Trash is empty" description="Deleted cases appear here for 30 days." />;
  }

  return (
    <View className="mt-4 gap-2 pb-6">
      {items.map((item) => (
        <TrashRow
          key={item.id}
          title={
            <>
              <Text className="text-sm font-medium text-foreground">{item.title}</Text>
              <Text className="text-[11px] text-muted-foreground">{item.caseNumber}</Text>
            </>
          }
          subtitle={`${item.client?.name ?? "—"} · ${item.documentCount} document(s) · Deleted by ${item.deletedBy}`}
          purgesInDays={item.purgesInDays}
          isPending={pendingId === item.id}
          onRestore={() => restore(item.id)}
          onDelete={() => setDeleteTarget(item)}
        />
      ))}
      {data?.pagination ? (
        <LoadMoreButton shown={items.length} total={data.pagination.total} onPress={() => setLimit((l) => l + PAGE_SIZE)} loading={isLoading} />
      ) : null}

      <ConfirmDialog
        visible={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Permanently delete this case?"
        description={`"${deleteTarget?.title}" and its ${deleteTarget?.documentCount ?? 0} document(s) can't be recovered after this.`}
        confirmLabel="Delete permanently"
        destructive
        isLoading={pendingId === deleteTarget?.id}
        onConfirm={permanentlyDelete}
      />
      <AlertDialog visible={Boolean(errorMessage)} onOpenChange={(open) => !open && setErrorMessage(null)} title="Couldn't delete" description={errorMessage ?? undefined} />
    </View>
  );
}

function ClientsTrash() {
  const { token } = useAuth();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, error, refetch } = useApi<{ clients: TrashedClient[]; pagination: Pagination }>(
    `/clients/trash?limit=${limit}`,
    [limit],
  );
  const items = data?.clients ?? [];
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrashedClient | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function restore(id: string) {
    setPendingId(id);
    try {
      await apiFetch(`/clients/${id}/restore`, { method: "POST", token });
      refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't restore client.");
    } finally {
      setPendingId(null);
    }
  }

  async function permanentlyDelete() {
    if (!deleteTarget) return;
    setPendingId(deleteTarget.id);
    try {
      await apiFetch(`/clients/${deleteTarget.id}/permanent`, { method: "DELETE", token });
      refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't delete client.");
    } finally {
      setPendingId(null);
      setDeleteTarget(null);
    }
  }

  if (isLoading) return <LoadingState label="Loading trash…" />;
  if (error) return <InlineError message={error} onRetry={refetch} />;
  if (items.length === 0) {
    return <EmptyState icon="trash-outline" title="Trash is empty" description="Deleted clients appear here for 30 days." />;
  }

  return (
    <View className="mt-4 gap-2 pb-6">
      {items.map((item) => (
        <TrashRow
          key={item.id}
          title={<Text className="text-sm font-medium text-foreground">{item.name}</Text>}
          subtitle={`${item.caseCount} case(s) · Deleted by ${item.deletedBy}`}
          purgesInDays={item.purgesInDays}
          isPending={pendingId === item.id}
          onRestore={() => restore(item.id)}
          onDelete={() => setDeleteTarget(item)}
        />
      ))}
      {data?.pagination ? (
        <LoadMoreButton shown={items.length} total={data.pagination.total} onPress={() => setLimit((l) => l + PAGE_SIZE)} loading={isLoading} />
      ) : null}

      <ConfirmDialog
        visible={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Permanently delete this client?"
        description={`"${deleteTarget?.name}" and its ${deleteTarget?.caseCount ?? 0} case(s) can't be recovered after this.`}
        confirmLabel="Delete permanently"
        destructive
        isLoading={pendingId === deleteTarget?.id}
        onConfirm={permanentlyDelete}
      />
      <AlertDialog visible={Boolean(errorMessage)} onOpenChange={(open) => !open && setErrorMessage(null)} title="Couldn't delete" description={errorMessage ?? undefined} />
    </View>
  );
}

function FoldersTrash() {
  const { token } = useAuth();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, error, refetch } = useApi<{ folders: TrashedFolder[]; pagination: Pagination }>(
    `/folders/trash?limit=${limit}`,
    [limit],
  );
  const items = data?.folders ?? [];
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrashedFolder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function restore(id: string) {
    setPendingId(id);
    try {
      await apiFetch(`/folders/${id}/restore`, { method: "POST", token });
      refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't restore folder.");
    } finally {
      setPendingId(null);
    }
  }

  async function permanentlyDelete() {
    if (!deleteTarget) return;
    setPendingId(deleteTarget.id);
    try {
      await apiFetch(`/folders/${deleteTarget.id}/permanent`, { method: "DELETE", token });
      refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't delete folder.");
    } finally {
      setPendingId(null);
      setDeleteTarget(null);
    }
  }

  if (isLoading) return <LoadingState label="Loading trash…" />;
  if (error) return <InlineError message={error} onRetry={refetch} />;
  if (items.length === 0) {
    return <EmptyState icon="trash-outline" title="Trash is empty" description="Deleted folders appear here for 30 days." />;
  }

  return (
    <View className="mt-4 gap-2 pb-6">
      {items.map((item) => (
        <TrashRow
          key={item.id}
          title={<Text className="text-sm font-medium text-foreground">{item.name}</Text>}
          subtitle={`${item.documentCount} document(s) · Deleted by ${item.deletedBy}`}
          purgesInDays={item.purgesInDays}
          isPending={pendingId === item.id}
          onRestore={() => restore(item.id)}
          onDelete={() => setDeleteTarget(item)}
        />
      ))}
      {data?.pagination ? (
        <LoadMoreButton shown={items.length} total={data.pagination.total} onPress={() => setLimit((l) => l + PAGE_SIZE)} loading={isLoading} />
      ) : null}

      <ConfirmDialog
        visible={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Permanently delete this folder?"
        description={`"${deleteTarget?.name}" can't be recovered after this. Documents inside it are unaffected.`}
        confirmLabel="Delete permanently"
        destructive
        isLoading={pendingId === deleteTarget?.id}
        onConfirm={permanentlyDelete}
      />
      <AlertDialog visible={Boolean(errorMessage)} onOpenChange={(open) => !open && setErrorMessage(null)} title="Couldn't delete" description={errorMessage ?? undefined} />
    </View>
  );
}

function TagsTrash() {
  const { token } = useAuth();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, error, refetch } = useApi<{ tags: TrashedTag[]; pagination: Pagination }>(
    `/tags/trash?limit=${limit}`,
    [limit],
  );
  const items = data?.tags ?? [];
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrashedTag | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function restore(id: string) {
    setPendingId(id);
    try {
      await apiFetch(`/tags/${id}/restore`, { method: "POST", token });
      refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't restore tag.");
    } finally {
      setPendingId(null);
    }
  }

  async function permanentlyDelete() {
    if (!deleteTarget) return;
    setPendingId(deleteTarget.id);
    try {
      await apiFetch(`/tags/${deleteTarget.id}/permanent`, { method: "DELETE", token });
      refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't delete tag.");
    } finally {
      setPendingId(null);
      setDeleteTarget(null);
    }
  }

  if (isLoading) return <LoadingState label="Loading trash…" />;
  if (error) return <InlineError message={error} onRetry={refetch} />;
  if (items.length === 0) {
    return <EmptyState icon="trash-outline" title="Trash is empty" description="Deleted tags appear here for 30 days." />;
  }

  return (
    <View className="mt-4 gap-2 pb-6">
      {items.map((item) => (
        <TrashRow
          key={item.id}
          title={
            <View className={`self-start rounded-full px-2 py-0.5 ${item.colorClass}`}>
              <Text className="text-[11px] font-medium">{item.name}</Text>
            </View>
          }
          subtitle={`Deleted by ${item.deletedBy}`}
          purgesInDays={item.purgesInDays}
          isPending={pendingId === item.id}
          onRestore={() => restore(item.id)}
          onDelete={() => setDeleteTarget(item)}
        />
      ))}
      {data?.pagination ? (
        <LoadMoreButton shown={items.length} total={data.pagination.total} onPress={() => setLimit((l) => l + PAGE_SIZE)} loading={isLoading} />
      ) : null}

      <ConfirmDialog
        visible={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Permanently delete this tag?"
        description={`"${deleteTarget?.name}" can't be recovered after this.`}
        confirmLabel="Delete permanently"
        destructive
        isLoading={pendingId === deleteTarget?.id}
        onConfirm={permanentlyDelete}
      />
      <AlertDialog visible={Boolean(errorMessage)} onOpenChange={(open) => !open && setErrorMessage(null)} title="Couldn't delete" description={errorMessage ?? undefined} />
    </View>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load trash" />;
}
