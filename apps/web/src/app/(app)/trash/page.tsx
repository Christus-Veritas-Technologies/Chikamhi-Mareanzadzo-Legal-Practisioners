"use client";

import { Button } from "@CMLP/ui/components/button";
import { Info, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { LoadMoreButton } from "@/components/load-more-button";
import { InlineError, LoadingState } from "@/components/loading-state";
import { useCurrentUser } from "@/contexts/current-user-context";
import { apiFetch, useApi } from "@/hooks/use-api";

type Pagination = { total: number; limit: number; offset: number; hasMore: boolean };

type TrashedDoc = {
  id: string;
  name: string;
  client: { id: string; name: string } | null;
  case: { id: string; title: string } | null;
  deletedBy: string;
  deletedAt: string;
  purgesInDays: number;
};

const PAGE_SIZE = 25;

export default function TrashPage() {
  const isAdmin = useCurrentUser().role === "ADMIN";
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, error, refetch } = useApi<{ documents: TrashedDoc[]; pagination: Pagination }>(
    `/documents/trash?limit=${limit}`,
    [limit],
  );
  const items = data?.documents ?? [];
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function restore(id: string) {
    setPendingId(id);
    try {
      await apiFetch(`/documents/${id}/restore`, { method: "POST" });
      refetch();
    } finally {
      setPendingId(null);
    }
  }

  async function permanentlyDelete(id: string, name: string) {
    if (!window.confirm(`Permanently delete "${name}"? This can't be undone.`)) return;
    setPendingId(id);
    try {
      await apiFetch(`/documents/${id}/permanent`, { method: "DELETE" });
      toast.success("Document permanently deleted.");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete document.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Trash</h1>
      </div>

      <div className="flex items-start gap-2 rounded-none border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-warning" />
        <p>
          Deleted documents are retained for <span className="font-semibold">30 days</span>, then permanently purged
          from R2. Restoring returns a document to its original case.
        </p>
      </div>

      <div className="overflow-hidden rounded-none border border-border bg-card">
        {isLoading ? (
          <LoadingState label="Loading trash…" />
        ) : error ? (
          <InlineError message={error} onRetry={refetch} />
        ) : items.length === 0 ? (
          <EmptyState icon={Trash2} title="Trash is empty" description="Deleted documents will appear here for 30 days." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
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
                    <td
                      className={`px-4 py-3 font-medium ${item.purgesInDays <= 5 ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {item.purgesInDays} days
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restore(item.id)}
                          disabled={pendingId === item.id}
                        >
                          Restore
                        </Button>
                        {isAdmin ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => permanentlyDelete(item.id, item.name)}
                            disabled={pendingId === item.id}
                          >
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data?.pagination ? (
          <LoadMoreButton
            shown={items.length}
            total={data.pagination.total}
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            loading={isLoading}
          />
        ) : null}
      </div>
    </div>
  );
}
