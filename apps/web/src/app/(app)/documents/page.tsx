"use client";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@CMLP/ui/components/input-group";
import { FileX, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { LoadMoreButton } from "@/components/load-more-button";
import { InlineError, LoadingState } from "@/components/loading-state";
import { StatusPill } from "@/components/status-pill";
import { useApi } from "@/hooks/use-api";
import { formatStatus } from "@/lib/format-status";

type Pagination = { total: number; limit: number; offset: number; hasMore: boolean };

type DocumentRow = {
  id: string;
  name: string;
  status: string;
  uploadedBy: string;
  modified: string;
  client: { id: string; name: string } | null;
  case: { id: string; title: string } | null;
};

type ClientOption = { id: string; name: string };
type CaseOption = { id: string; title: string; client: { id: string } };
type TagOption = { id: string; name: string };

const STATUSES = ["DRAFT", "UNDER_REVIEW", "FILED", "SIGNED", "EXECUTED"] as const;
const PAGE_SIZE = 25;

export default function DocumentsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading documents…" />}>
      <DocumentsPageInner />
    </Suspense>
  );
}

function DocumentsPageInner() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [clientFilter, setClientFilter] = useState("");
  const [caseFilter, setCaseFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Reset back to the first page whenever the filters change, so "Load more" always
  // starts fresh instead of carrying over a stale page size from a previous filter set.
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [query, clientFilter, caseFilter, tagFilter, statusFilter]);

  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (clientFilter) params.set("clientId", clientFilter);
  if (caseFilter) params.set("caseId", caseFilter);
  if (tagFilter) params.set("tagId", tagFilter);
  if (statusFilter) params.set("status", statusFilter);
  params.set("limit", String(limit));
  const search = params.toString();
  const path = search ? `/documents?${search}` : "/documents";

  const { data, isLoading, error, refetch } = useApi<{ documents: DocumentRow[]; pagination: Pagination }>(path, [
    path,
  ]);
  const { data: clientsData } = useApi<{ clients: ClientOption[] }>("/clients");
  const { data: casesData } = useApi<{ cases: CaseOption[] }>("/cases");
  const { data: tagsData } = useApi<{ tags: TagOption[] }>("/tags");
  const documents = data?.documents ?? [];
  const clients = clientsData?.clients ?? [];
  const cases = (casesData?.cases ?? []).filter((c) => !clientFilter || c.client.id === clientFilter);
  const tags = tagsData?.tags ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Documents</h1>
        <p className="text-sm text-muted-foreground">
          {data?.pagination.total ?? documents.length} documents across all clients and cases
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-64">
          <InputGroup>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search by name or contents…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </InputGroup>
        </div>
        <select
          value={clientFilter}
          onChange={(e) => {
            setClientFilter(e.target.value);
            setCaseFilter("");
          }}
          className="h-8 rounded-none border border-input bg-background px-2 text-xs text-foreground"
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={caseFilter}
          onChange={(e) => setCaseFilter(e.target.value)}
          className="h-8 rounded-none border border-input bg-background px-2 text-xs text-foreground"
        >
          <option value="">All cases</option>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="h-8 rounded-none border border-input bg-background px-2 text-xs text-foreground"
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded-none border border-input bg-background px-2 text-xs text-foreground"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {formatStatus(s)}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-none border border-border bg-card">
        {isLoading ? (
          <LoadingState label="Loading documents…" />
        ) : error ? (
          <InlineError message={error} onRetry={refetch} />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileX}
            title="No documents found"
            description="Try a different search or filter, or upload a new document."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-2.5 font-medium">Document</th>
                  <th className="px-4 py-2.5 font-medium">Case · Client</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Uploaded by</th>
                  <th className="px-4 py-2.5 font-medium">Modified</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`/documents/${doc.id}`} className="font-medium text-foreground hover:text-brand">
                        {doc.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-brand">{doc.case?.title ?? doc.client?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={formatStatus(doc.status)} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{doc.uploadedBy}</td>
                    <td className="px-4 py-3 text-muted-foreground">{doc.modified}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data?.pagination ? (
          <LoadMoreButton
            shown={documents.length}
            total={data.pagination.total}
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            loading={isLoading}
          />
        ) : null}
      </div>
    </div>
  );
}
