"use client";

import { Button } from "@CMLP/ui/components/button";
import { Info, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { LoadMoreButton } from "@/components/load-more-button";
import { InlineError, LoadingState } from "@/components/loading-state";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { apiFetch, useApi } from "@/hooks/use-api";

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

export default function TrashPage() {
  const [tab, setTab] = useState<Tab>("documents");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Trash</h1>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-warning" />
        <p>
          Deleted items are retained for <span className="font-semibold">30 days</span>, then permanently purged.
          Restoring returns an item to where it was.
        </p>
      </div>

      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "documents" ? <DocumentsTrash /> : null}
      {tab === "cases" ? <CasesTrash /> : null}
      {tab === "clients" ? <ClientsTrash /> : null}
      {tab === "folders" ? <FoldersTrash /> : null}
      {tab === "tags" ? <TagsTrash /> : null}
    </div>
  );
}

function TrashShell({
  isLoading,
  error,
  onRetry,
  isEmpty,
  emptyDescription,
  children,
  pagination,
  shown,
  onLoadMore,
}: {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  isEmpty: boolean;
  emptyDescription: string;
  children: React.ReactNode;
  pagination?: Pagination;
  shown: number;
  onLoadMore: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {isLoading ? (
        <LoadingState label="Loading trash…" />
      ) : error ? (
        <InlineError message={error} onRetry={onRetry} />
      ) : isEmpty ? (
        <EmptyState icon={Trash2} title="Trash is empty" description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">{children}</table>
        </div>
      )}
      {pagination ? (
        <LoadMoreButton shown={shown} total={pagination.total} onClick={onLoadMore} loading={isLoading} />
      ) : null}
    </div>
  );
}

function PurgesCell({ days }: { days: number }) {
  return (
    <td className={`px-4 py-3 font-medium ${days <= 5 ? "text-destructive" : "text-muted-foreground"}`}>
      {days} days
    </td>
  );
}

function DocumentsTrash() {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, error, refetch } = useApi<{ documents: TrashedDocument[]; pagination: Pagination }>(
    `/documents/trash?limit=${limit}`,
    [limit],
  );
  const items = data?.documents ?? [];
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrashedDocument | null>(null);

  async function restore(id: string) {
    setPendingId(id);
    try {
      await apiFetch(`/documents/${id}/restore`, { method: "POST" });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't restore document.");
    } finally {
      setPendingId(null);
    }
  }

  async function permanentlyDelete() {
    if (!deleteTarget) return;
    setPendingId(deleteTarget.id);
    try {
      await apiFetch(`/documents/${deleteTarget.id}/permanent`, { method: "DELETE" });
      toast.success("Document permanently deleted.");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete document.");
    } finally {
      setPendingId(null);
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <TrashShell
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        isEmpty={items.length === 0}
        emptyDescription="Deleted documents will appear here for 30 days."
        pagination={data?.pagination}
        shown={items.length}
        onLoadMore={() => setLimit((l) => l + PAGE_SIZE)}
      >
        <thead>
          <tr className="border-b border-border text-[10px] tracking-wide text-muted-foreground uppercase">
            <th className="px-4 py-2.5 font-medium">Document</th>
            <th className="px-4 py-2.5 font-medium">Case · Client</th>
            <th className="px-4 py-2.5 font-medium">Deleted by</th>
            <th className="px-4 py-2.5 font-medium">Purges in</th>
            <th className="px-4 py-2.5 font-medium" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
              <td className="px-4 py-3 text-brand">{item.case?.title ?? item.client?.name ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{item.deletedBy}</td>
              <PurgesCell days={item.purgesInDays} />
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => restore(item.id)} disabled={pendingId === item.id}>
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteTarget(item)}
                    disabled={pendingId === item.id}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </TrashShell>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Permanently delete this document?"
        description={`"${deleteTarget?.name}" will be permanently removed and can't be recovered.`}
        confirmLabel="Delete permanently"
        destructive
        isLoading={pendingId === deleteTarget?.id}
        onConfirm={permanentlyDelete}
      />
    </>
  );
}

function CasesTrash() {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, error, refetch } = useApi<{ cases: TrashedCase[]; pagination: Pagination }>(
    `/cases/trash?limit=${limit}`,
    [limit],
  );
  const items = data?.cases ?? [];
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrashedCase | null>(null);

  async function restore(id: string) {
    setPendingId(id);
    try {
      await apiFetch(`/cases/${id}/restore`, { method: "POST" });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't restore case.");
    } finally {
      setPendingId(null);
    }
  }

  async function permanentlyDelete() {
    if (!deleteTarget) return;
    setPendingId(deleteTarget.id);
    try {
      await apiFetch(`/cases/${deleteTarget.id}/permanent`, { method: "DELETE" });
      toast.success("Case permanently deleted.");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete case.");
    } finally {
      setPendingId(null);
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <TrashShell
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        isEmpty={items.length === 0}
        emptyDescription="Deleted cases will appear here for 30 days."
        pagination={data?.pagination}
        shown={items.length}
        onLoadMore={() => setLimit((l) => l + PAGE_SIZE)}
      >
        <thead>
          <tr className="border-b border-border text-[10px] tracking-wide text-muted-foreground uppercase">
            <th className="px-4 py-2.5 font-medium">Case</th>
            <th className="px-4 py-2.5 font-medium">Client</th>
            <th className="px-4 py-2.5 font-medium">Documents</th>
            <th className="px-4 py-2.5 font-medium">Deleted by</th>
            <th className="px-4 py-2.5 font-medium">Purges in</th>
            <th className="px-4 py-2.5 font-medium" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="text-[11px] text-muted-foreground">{item.caseNumber}</p>
              </td>
              <td className="px-4 py-3 text-brand">{item.client?.name ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{item.documentCount}</td>
              <td className="px-4 py-3 text-muted-foreground">{item.deletedBy}</td>
              <PurgesCell days={item.purgesInDays} />
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => restore(item.id)} disabled={pendingId === item.id}>
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteTarget(item)}
                    disabled={pendingId === item.id}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </TrashShell>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Permanently delete this case?"
        description={`"${deleteTarget?.title}" and its ${deleteTarget?.documentCount ?? 0} document(s) will be permanently removed and can't be recovered.`}
        confirmLabel="Delete permanently"
        destructive
        isLoading={pendingId === deleteTarget?.id}
        onConfirm={permanentlyDelete}
      />
    </>
  );
}

function ClientsTrash() {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, error, refetch } = useApi<{ clients: TrashedClient[]; pagination: Pagination }>(
    `/clients/trash?limit=${limit}`,
    [limit],
  );
  const items = data?.clients ?? [];
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrashedClient | null>(null);

  async function restore(id: string) {
    setPendingId(id);
    try {
      await apiFetch(`/clients/${id}/restore`, { method: "POST" });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't restore client.");
    } finally {
      setPendingId(null);
    }
  }

  async function permanentlyDelete() {
    if (!deleteTarget) return;
    setPendingId(deleteTarget.id);
    try {
      await apiFetch(`/clients/${deleteTarget.id}/permanent`, { method: "DELETE" });
      toast.success("Client permanently deleted.");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete client.");
    } finally {
      setPendingId(null);
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <TrashShell
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        isEmpty={items.length === 0}
        emptyDescription="Deleted clients will appear here for 30 days."
        pagination={data?.pagination}
        shown={items.length}
        onLoadMore={() => setLimit((l) => l + PAGE_SIZE)}
      >
        <thead>
          <tr className="border-b border-border text-[10px] tracking-wide text-muted-foreground uppercase">
            <th className="px-4 py-2.5 font-medium">Client</th>
            <th className="px-4 py-2.5 font-medium">Cases</th>
            <th className="px-4 py-2.5 font-medium">Deleted by</th>
            <th className="px-4 py-2.5 font-medium">Purges in</th>
            <th className="px-4 py-2.5 font-medium" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{item.caseCount}</td>
              <td className="px-4 py-3 text-muted-foreground">{item.deletedBy}</td>
              <PurgesCell days={item.purgesInDays} />
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => restore(item.id)} disabled={pendingId === item.id}>
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteTarget(item)}
                    disabled={pendingId === item.id}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </TrashShell>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Permanently delete this client?"
        description={`"${deleteTarget?.name}" and its ${deleteTarget?.caseCount ?? 0} case(s) will be permanently removed and can't be recovered.`}
        confirmLabel="Delete permanently"
        destructive
        isLoading={pendingId === deleteTarget?.id}
        onConfirm={permanentlyDelete}
      />
    </>
  );
}

function FoldersTrash() {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, error, refetch } = useApi<{ folders: TrashedFolder[]; pagination: Pagination }>(
    `/folders/trash?limit=${limit}`,
    [limit],
  );
  const items = data?.folders ?? [];
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrashedFolder | null>(null);

  async function restore(id: string) {
    setPendingId(id);
    try {
      await apiFetch(`/folders/${id}/restore`, { method: "POST" });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't restore folder.");
    } finally {
      setPendingId(null);
    }
  }

  async function permanentlyDelete() {
    if (!deleteTarget) return;
    setPendingId(deleteTarget.id);
    try {
      await apiFetch(`/folders/${deleteTarget.id}/permanent`, { method: "DELETE" });
      toast.success("Folder permanently deleted.");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete folder.");
    } finally {
      setPendingId(null);
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <TrashShell
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        isEmpty={items.length === 0}
        emptyDescription="Deleted folders will appear here for 30 days."
        pagination={data?.pagination}
        shown={items.length}
        onLoadMore={() => setLimit((l) => l + PAGE_SIZE)}
      >
        <thead>
          <tr className="border-b border-border text-[10px] tracking-wide text-muted-foreground uppercase">
            <th className="px-4 py-2.5 font-medium">Folder</th>
            <th className="px-4 py-2.5 font-medium">Documents</th>
            <th className="px-4 py-2.5 font-medium">Deleted by</th>
            <th className="px-4 py-2.5 font-medium">Purges in</th>
            <th className="px-4 py-2.5 font-medium" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{item.documentCount}</td>
              <td className="px-4 py-3 text-muted-foreground">{item.deletedBy}</td>
              <PurgesCell days={item.purgesInDays} />
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => restore(item.id)} disabled={pendingId === item.id}>
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteTarget(item)}
                    disabled={pendingId === item.id}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </TrashShell>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Permanently delete this folder?"
        description={`"${deleteTarget?.name}" will be permanently removed and can't be recovered. Documents inside it are unaffected.`}
        confirmLabel="Delete permanently"
        destructive
        isLoading={pendingId === deleteTarget?.id}
        onConfirm={permanentlyDelete}
      />
    </>
  );
}

function TagsTrash() {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, error, refetch } = useApi<{ tags: TrashedTag[]; pagination: Pagination }>(
    `/tags/trash?limit=${limit}`,
    [limit],
  );
  const items = data?.tags ?? [];
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrashedTag | null>(null);

  async function restore(id: string) {
    setPendingId(id);
    try {
      await apiFetch(`/tags/${id}/restore`, { method: "POST" });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't restore tag.");
    } finally {
      setPendingId(null);
    }
  }

  async function permanentlyDelete() {
    if (!deleteTarget) return;
    setPendingId(deleteTarget.id);
    try {
      await apiFetch(`/tags/${deleteTarget.id}/permanent`, { method: "DELETE" });
      toast.success("Tag permanently deleted.");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete tag.");
    } finally {
      setPendingId(null);
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <TrashShell
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        isEmpty={items.length === 0}
        emptyDescription="Deleted tags will appear here for 30 days."
        pagination={data?.pagination}
        shown={items.length}
        onLoadMore={() => setLimit((l) => l + PAGE_SIZE)}
      >
        <thead>
          <tr className="border-b border-border text-[10px] tracking-wide text-muted-foreground uppercase">
            <th className="px-4 py-2.5 font-medium">Tag</th>
            <th className="px-4 py-2.5 font-medium">Deleted by</th>
            <th className="px-4 py-2.5 font-medium">Purges in</th>
            <th className="px-4 py-2.5 font-medium" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${item.colorClass}`}>{item.name}</span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{item.deletedBy}</td>
              <PurgesCell days={item.purgesInDays} />
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => restore(item.id)} disabled={pendingId === item.id}>
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteTarget(item)}
                    disabled={pendingId === item.id}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </TrashShell>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Permanently delete this tag?"
        description={`"${deleteTarget?.name}" will be permanently removed and can't be recovered.`}
        confirmLabel="Delete permanently"
        destructive
        isLoading={pendingId === deleteTarget?.id}
        onConfirm={permanentlyDelete}
      />
    </>
  );
}
