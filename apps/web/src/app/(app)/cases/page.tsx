"use client";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@CMLP/ui/components/input-group";
import { FolderTree, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { StatusPill } from "@/components/status-pill";
import { CASES, getClient, type CaseStatus } from "@/lib/mock-data";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "Active", label: "Active" },
  { value: "Under review", label: "Under review" },
  { value: "Closed", label: "Closed" },
] as const;

type StatusFilter = (typeof STATUS_TABS)[number]["value"];

export default function CasesPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CASES.filter((c) => {
      const matchesStatus = status === "all" || c.status === (status as CaseStatus);
      const matchesQuery =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.caseNumber.toLowerCase().includes(q) ||
        (getClient(c.clientId)?.name ?? "").toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [query, status]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Cases</h1>
          <p className="text-sm text-muted-foreground">{CASES.length} cases across all clients</p>
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

      <div className="overflow-hidden rounded-none border border-border bg-card">
        {filtered.length === 0 ? (
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
                {filtered.map((c) => {
                  const client = getClient(c.clientId);
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link href={`/cases/${c.id}`} className="font-medium text-foreground hover:text-brand">
                          {c.title}
                        </Link>
                        <p className="text-[11px] text-muted-foreground">{c.caseNumber}</p>
                      </td>
                      <td className="px-4 py-3">
                        {client ? (
                          <Link href={`/clients/${client.id}`} className="text-brand hover:underline">
                            {client.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={c.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.matterType}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.documentCount}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.updated}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
