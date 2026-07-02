"use client";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@CMLP/ui/components/input-group";
import { FolderTree, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { StatusPill } from "@/components/status-pill";
import { useApi } from "@/hooks/use-api";
import { formatStatus } from "@/lib/format-status";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "Active", label: "Active" },
  { value: "Under review", label: "Under review" },
  { value: "Closed", label: "Closed" },
] as const;

type StatusFilter = (typeof STATUS_TABS)[number]["value"];

const STATUS_TO_ENUM: Record<Exclude<StatusFilter, "all">, string> = {
  Active: "ACTIVE",
  "Under review": "UNDER_REVIEW",
  Closed: "CLOSED",
};

type CaseRow = {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  matterType: string;
  documentCount: number;
  updated: string;
  client: { id: string; name: string };
};

export default function CasesPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const path = status === "all" ? "/cases" : `/cases?status=${STATUS_TO_ENUM[status]}`;
  const { data, isLoading, error, refetch } = useApi<{ cases: CaseRow[] }>(path, [path]);
  const cases = data?.cases ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.caseNumber.toLowerCase().includes(q) ||
        c.client.name.toLowerCase().includes(q),
    );
  }, [cases, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Cases</h1>
          <p className="text-sm text-muted-foreground">{cases.length} cases across all clients</p>
        </div>
        <div className="w-56">
          <InputGroup>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search cases…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </InputGroup>
        </div>
      </div>

      <SegmentedTabs tabs={STATUS_TABS} value={status} onChange={setStatus} />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? (
          <LoadingState label="Loading cases…" />
        ) : error ? (
          <InlineError message={error} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title="No cases found"
            description="Try a different search or status filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-2.5 font-medium">Case</th>
                  <th className="px-4 py-2.5 font-medium">Client</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Matter type</th>
                  <th className="px-4 py-2.5 font-medium">Documents</th>
                  <th className="px-4 py-2.5 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`/cases/${c.id}`} className="font-medium text-foreground hover:text-brand">
                        {c.title}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">{c.caseNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/clients/${c.client.id}`} className="text-brand hover:underline">
                        {c.client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={formatStatus(c.status)} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.matterType}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.documentCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
