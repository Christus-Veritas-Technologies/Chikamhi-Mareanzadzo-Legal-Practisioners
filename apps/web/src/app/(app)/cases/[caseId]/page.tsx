"use client";

import { buttonVariants } from "@CMLP/ui/components/button";
import { Card, CardContent } from "@CMLP/ui/components/card";
import { FileX2, FolderX, History, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { StatusPill } from "@/components/status-pill";
import { useApi } from "@/hooks/use-api";
import { formatStatus } from "@/lib/format-status";

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

export default function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const [docFilter, setDocFilter] = useState<DocFilter>("all");

  const { data, isLoading, error, refetch } = useApi<{ case: CaseDetail }>(`/cases/${caseId}`);
  const matter = data?.case;

  const filteredDocs = useMemo(() => {
    const documents = matter?.documents ?? [];
    if (docFilter === "all") return documents;
    return documents.filter((d) => formatStatus(d.status) === docFilter);
  }, [matter, docFilter]);

  if (isLoading) {
    return <LoadingState label="Loading case…" />;
  }

  if (error && !error.toLowerCase().includes("not found")) {
    return <InlineError message={error} onRetry={refetch} />;
  }

  if (!matter) {
    return (
      <EmptyState
        icon={FolderX}
        title="Case not found"
        description="This case may have been removed, or the link is out of date."
        action={
          <Link href="/cases" className={buttonVariants({ size: "sm", variant: "outline" })}>
            Back to cases
          </Link>
        }
      />
    );
  }

  const client = matter.client;
  const timeline = matter.timeline;
  const documents = matter.documents;

  const docTabs = DOC_TABS.map((t) => ({
    ...t,
    label: t.value === "all" ? `All ${documents.length}` : t.label,
  }));

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        <Link href="/clients" className="hover:text-foreground hover:underline">
          Clients
        </Link>{" "}
        /{" "}
        {client ? (
          <Link href={`/clients/${client.id}`} className="hover:text-foreground hover:underline">
            {client.name}
          </Link>
        ) : (
          "Client"
        )}{" "}
        / {matter.title}
      </p>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{matter.caseNumber}</span>
            <StatusPill status={formatStatus(matter.status)} />
          </div>
          <h1 className="mt-1 font-serif text-xl font-semibold text-foreground">{matter.title}</h1>
        </div>
        <Link href="/upload" className={buttonVariants()}>
          <Plus />
          Upload to case
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 border-y border-border py-4 sm:grid-cols-3 lg:grid-cols-5">
        <div>
          <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Matter type</p>
          <p className="mt-0.5 text-sm text-foreground">{matter.matterType}</p>
        </div>
        <div>
          <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Lead attorney</p>
          <p className="mt-0.5 text-sm text-foreground">{matter.leadAttorney}</p>
        </div>
        <div>
          <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Opened</p>
          <p className="mt-0.5 text-sm text-foreground">{matter.opened}</p>
        </div>
        <div>
          <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Registry</p>
          <p className="mt-0.5 text-sm text-foreground">{matter.registry ?? "—"}</p>
        </div>
        <div>
          <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Documents</p>
          <p className="mt-0.5 text-sm text-foreground">{documents.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <Card className="p-0">
          <div className="px-4 pt-3">
            <SegmentedTabs tabs={docTabs} value={docFilter} onChange={setDocFilter} />
          </div>
          <CardContent className="p-0">
            {filteredDocs.length === 0 ? (
              <EmptyState
                icon={FileX2}
                title="No documents here"
                description={
                  docFilter === "all"
                    ? "Upload the first document for this case."
                    : `No documents are currently marked "${docFilter}".`
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-[10px] tracking-wide text-muted-foreground uppercase">
                      <th className="px-4 py-2.5 font-medium">Document</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((doc) => (
                      <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                        <td className="px-4 py-2.5 font-medium text-foreground">{doc.name}</td>
                        <td className="px-4 py-2.5">
                          <StatusPill status={formatStatus(doc.status)} />
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{doc.modified}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="mb-3 text-xs font-medium text-foreground">Case timeline</p>
            {timeline.length === 0 ? (
              <EmptyState icon={History} title="No activity yet" />
            ) : (
              <ol className="space-y-4 border-l border-border pl-4">
                {timeline.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute top-1 -left-[21px] size-2 rounded-full bg-brand" />
                    <p className="text-xs text-foreground">
                      {event.description}
                      {event.actor !== "System" ? ` · ${event.actor}` : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{event.timestamp}</p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
