"use client";

import { Button, buttonVariants } from "@CMLP/ui/components/button";
import { Card, CardContent } from "@CMLP/ui/components/card";
import { Activity, Contact, FileText, Plus, UserX } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { StatusPill } from "@/components/status-pill";
import { useApi } from "@/hooks/use-api";
import { formatStatus } from "@/lib/format-status";
import { relativeTime } from "@/lib/format-time";

const TABS = [
  { value: "cases", label: "Cases" },
  { value: "documents", label: "Documents" },
  { value: "contacts", label: "Contacts" },
  { value: "activity", label: "Activity" },
] as const;

type Tab = (typeof TABS)[number]["value"];

type ClientDetail = {
  id: string;
  name: string;
  type: string;
  regNumber: string | null;
  attorneyOfRecord: string;
  clientSince: string;
  documents: number;
  storage: string;
  cases: {
    id: string;
    caseNumber: string;
    title: string;
    status: string;
    matterType: string;
    location: string | null;
    updatedAt: string;
  }[];
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [tab, setTab] = useState<Tab>("cases");

  const { data, isLoading, error, refetch } = useApi<{ client: ClientDetail }>(`/clients/${clientId}`);
  const client = data?.client;

  if (isLoading) {
    return <LoadingState label="Loading client…" />;
  }

  if (error && !error.toLowerCase().includes("not found")) {
    return <InlineError message={error} onRetry={refetch} />;
  }

  if (!client) {
    return (
      <EmptyState
        icon={UserX}
        title="Client not found"
        description="This client may have been removed, or the link is out of date."
        action={
          <Link href="/clients" className={buttonVariants({ size: "sm", variant: "outline" })}>
            Back to clients
          </Link>
        }
      />
    );
  }

  const cases = client.cases;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        <Link href="/clients" className="hover:text-foreground hover:underline">
          Clients
        </Link>{" "}
        / {client.name}
      </p>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-muted text-sm font-semibold text-brand-foreground">
            {initials(client.name)}
          </span>
          <div>
            <h1 className="font-serif text-xl font-semibold text-foreground">{client.name}</h1>
            <p className="text-xs text-muted-foreground">
              {client.type}
              {client.regNumber ? ` · Reg. ${client.regNumber}` : ""} · Attorney of record:{" "}
              {client.attorneyOfRecord} · Client since {client.clientSince}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">Edit client</Button>
          <Button>
            <Plus />
            New case
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <p className="text-xl font-semibold text-foreground">{cases.length}</p>
            <p className="text-xs text-muted-foreground">Open cases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xl font-semibold text-foreground">{client.documents}</p>
            <p className="text-xs text-muted-foreground">Documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xl font-semibold text-foreground">{client.storage}</p>
            <p className="text-xs text-muted-foreground">Storage</p>
          </CardContent>
        </Card>
      </div>

      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "cases" ? (
        cases.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No cases yet"
            description="Cases opened for this client will show up here."
            action={<Button size="sm">New case</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {cases.map((c) => (
              <Link key={c.id} href={`/cases/${c.id}`}>
                <Card className="h-full transition-colors hover:bg-muted/40">
                  <CardContent>
                    <div className="flex items-start justify-between">
                      <p className="text-[11px] text-muted-foreground">{c.caseNumber}</p>
                      <StatusPill status={formatStatus(c.status)} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-foreground">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.matterType}
                      {c.location ? ` · ${c.location}` : ""}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Updated {relativeTime(c.updatedAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )
      ) : null}

      {tab === "documents" ? (
        <EmptyState
          icon={FileText}
          title="Documents view coming soon"
          description="Browse this client's documents directly from the global Documents library for now."
          action={
            <Link
              href="/documents"
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Go to Documents
            </Link>
          }
        />
      ) : null}

      {tab === "contacts" ? (
        <EmptyState
          icon={Contact}
          title="No contacts added"
          description="Add key contacts for this client — directors, next of kin, or instructing parties."
          action={<Button size="sm">Add contact</Button>}
        />
      ) : null}

      {tab === "activity" ? (
        <EmptyState
          icon={Activity}
          title="No recent activity"
          description="Views, uploads, and edits for this client's documents will appear here."
        />
      ) : null}
    </div>
  );
}
