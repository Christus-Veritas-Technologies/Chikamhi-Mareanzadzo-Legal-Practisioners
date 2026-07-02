"use client";

import { Button } from "@CMLP/ui/components/button";
import { Download, History } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { LoadMoreButton } from "@/components/load-more-button";
import { InlineError, LoadingState } from "@/components/loading-state";
import { useApi } from "@/hooks/use-api";

type Pagination = { total: number; limit: number; offset: number; hasMore: boolean };

type AuditEntry = {
  id: string;
  actorId: string | null;
  actor: string;
  isSystem: boolean;
  action: string;
  target: string;
  sourceIp: string;
  timestamp: string;
};

const ACTION_LABELS: Record<string, string> = {
  VIEWED: "Viewed",
  UPLOADED: "Uploaded",
  SIGNED: "Signed",
  FILED: "Filed",
  MOVED: "Moved",
  DELETED: "Deleted",
  RESTORED: "Restored",
  OCR_COMPLETED: "OCR",
  CASE_OPENED: "Case opened",
};

const ACTION_STYLES: Record<string, string> = {
  VIEWED: "bg-muted text-muted-foreground",
  UPLOADED: "bg-brand-muted text-brand-foreground",
  SIGNED: "bg-success/15 text-success",
  FILED: "bg-success/15 text-success",
  MOVED: "bg-brand-muted text-brand-foreground",
  DELETED: "bg-destructive/10 text-destructive",
  RESTORED: "bg-success/15 text-success",
  OCR_COMPLETED: "bg-muted text-muted-foreground",
  CASE_OPENED: "bg-brand-muted text-brand-foreground",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const PAGE_SIZE = 50;

export default function AuditLogPage() {
  const [actorFilter, setActorFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [actorFilter, actionFilter]);

  const params = new URLSearchParams();
  if (actorFilter) params.set("actorId", actorFilter);
  if (actionFilter) params.set("action", actionFilter);
  params.set("limit", String(limit));
  const query = params.toString();
  const path = `/audit-log?${query}`;

  const { data, isLoading, error, refetch } = useApi<{ entries: AuditEntry[]; pagination: Pagination }>(path, [
    path,
  ]);
  const entries = data?.entries ?? [];

  // Unfiltered baseline so the filter dropdowns don't shrink as filters are applied.
  // Uses a large limit since this call only feeds dropdown options, not the visible table.
  const { data: allData } = useApi<{ entries: AuditEntry[] }>("/audit-log?limit=500");
  const allEntries = allData?.entries ?? [];

  const actors = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of allEntries) {
      if (e.actorId) map.set(e.actorId, e.actor);
    }
    return Array.from(map.entries());
  }, [allEntries]);
  const actions = useMemo(() => Array.from(new Set(allEntries.map((e) => e.action))), [allEntries]);

  function exportCsv() {
    const header = ["Actor", "Action", "Target", "Timestamp", "Source IP"];
    const rows = entries.map((e) => [
      e.actor,
      ACTION_LABELS[e.action] ?? e.action,
      e.target,
      e.timestamp,
      e.sourceIp,
    ]);
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Audit log</h1>
          <p className="text-sm text-muted-foreground">
            Every action on every document. Tamper-evident and retained for 7 years.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={entries.length === 0}>
          <Download />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          className="h-8 rounded-none border border-input bg-background px-2 text-xs text-foreground"
        >
          <option value="">All actors</option>
          {actors.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-8 rounded-none border border-input bg-background px-2 text-xs text-foreground"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a] ?? a}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-none border border-border bg-card">
        {isLoading ? (
          <LoadingState label="Loading audit log…" />
        ) : error ? (
          <InlineError message={error} onRetry={refetch} />
        ) : entries.length === 0 ? (
          <EmptyState icon={History} title="No matching activity" description="Try a different actor or action filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-2.5 font-medium">Actor</th>
                  <th className="px-4 py-2.5 font-medium">Action</th>
                  <th className="px-4 py-2.5 font-medium">Target</th>
                  <th className="px-4 py-2.5 font-medium">Timestamp</th>
                  <th className="px-4 py-2.5 font-medium">Source IP</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex size-6 items-center justify-center rounded-full text-[10px] font-semibold ${entry.isSystem ? "bg-muted text-muted-foreground" : "bg-brand-muted text-brand-foreground"}`}
                        >
                          {entry.isSystem ? "•" : initials(entry.actor)}
                        </span>
                        <span className="text-foreground">{entry.actor}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ACTION_STYLES[entry.action] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-brand">{entry.target}</td>
                    <td className="px-4 py-3 text-muted-foreground">{entry.timestamp}</td>
                    <td className="px-4 py-3 text-muted-foreground">{entry.sourceIp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data?.pagination ? (
          <LoadMoreButton
            shown={entries.length}
            total={data.pagination.total}
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            loading={isLoading}
          />
        ) : null}
      </div>
    </div>
  );
}
