"use client";

import { Button, buttonVariants } from "@CMLP/ui/components/button";
import { Card, CardContent } from "@CMLP/ui/components/card";
import { Activity, Contact, FileText, Trash2, UserX } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CaseFormDialog } from "@/components/case-form-dialog";
import { ClientFormDialog } from "@/components/client-form-dialog";
import { ContactFormDialog } from "@/components/contact-form-dialog";
import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { StatusPill } from "@/components/status-pill";
import { apiFetch, useApi } from "@/hooks/use-api";
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
  attorneyOfRecordId: string | null;
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

type Contact = { id: string; name: string; role: string | null; email: string | null; phone: string | null };
type AuditEntry = { id: string; actor: string; isSystem: boolean; action: string; target: string; timestamp: string };
type ClientDocument = {
  id: string;
  name: string;
  status: string;
  uploadedBy: string;
  modified: string;
  case: { id: string; title: string } | null;
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

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [tab, setTab] = useState<Tab>("cases");

  const { data, isLoading, error, refetch } = useApi<{ client: ClientDetail }>(`/clients/${clientId}`);
  const client = data?.client;

  const { data: contactsData, refetch: refetchContacts } = useApi<{ contacts: Contact[] }>(
    tab === "contacts" ? `/clients/${clientId}/contacts` : null,
  );
  const contacts = contactsData?.contacts ?? [];

  const { data: activityData, isLoading: activityLoading, error: activityError, refetch: refetchActivity } =
    useApi<{ entries: AuditEntry[] }>(tab === "activity" ? `/audit-log?clientId=${clientId}` : null);
  const activity = activityData?.entries ?? [];

  const { data: docsData, isLoading: docsLoading, error: docsError, refetch: refetchDocs } = useApi<{
    documents: ClientDocument[];
  }>(tab === "documents" ? `/documents?clientId=${clientId}` : null);
  const clientDocuments = docsData?.documents ?? [];

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

  async function removeContact(contactId: string) {
    try {
      await apiFetch(`/clients/${clientId}/contacts/${contactId}`, { method: "DELETE" });
      refetchContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove contact.");
    }
  }

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
          <ClientFormDialog
            mode="edit"
            clientId={client.id}
            initial={{
              name: client.name,
              type: client.type,
              regNumber: client.regNumber,
              attorneyOfRecordId: client.attorneyOfRecordId,
            }}
            onSaved={refetch}
            trigger={<Button variant="outline">Edit client</Button>}
          />
          <CaseFormDialog clientId={client.id} onSaved={refetch} trigger={<Button>New case</Button>} />
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
            action={<CaseFormDialog clientId={client.id} onSaved={refetch} trigger={<Button size="sm">New case</Button>} />}
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
        docsLoading ? (
          <LoadingState label="Loading documents…" />
        ) : docsError ? (
          <InlineError message={docsError} onRetry={refetchDocs} />
        ) : clientDocuments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Documents uploaded for this client will show up here."
            action={
              <Link href="/upload" className={buttonVariants({ size: "sm", variant: "outline" })}>
                Upload a document
              </Link>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-none border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] tracking-wide text-muted-foreground uppercase">
                    <th className="px-4 py-2.5 font-medium">Document</th>
                    <th className="px-4 py-2.5 font-medium">Case</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Uploaded by</th>
                    <th className="px-4 py-2.5 font-medium">Modified</th>
                  </tr>
                </thead>
                <tbody>
                  {clientDocuments.map((doc) => (
                    <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link href={`/documents/${doc.id}`} className="font-medium text-foreground hover:text-brand">
                          {doc.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-brand">
                        {doc.case ? (
                          <Link href={`/cases/${doc.case.id}`} className="hover:underline">
                            {doc.case.title}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
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
          </div>
        )
      ) : null}

      {tab === "contacts" ? (
        contacts.length === 0 ? (
          <EmptyState
            icon={Contact}
            title="No contacts added"
            description="Add key contacts for this client — directors, next of kin, or instructing parties."
            action={
              <ContactFormDialog clientId={client.id} onSaved={refetchContacts} trigger={<Button size="sm">Add contact</Button>} />
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <ContactFormDialog clientId={client.id} onSaved={refetchContacts} trigger={<Button size="sm">Add contact</Button>} />
            </div>
            <div className="overflow-hidden rounded-none border border-border bg-card">
              {contacts.map((contact, i) => (
                <div
                  key={contact.id}
                  className={`flex items-center justify-between px-4 py-3 ${i !== contacts.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[contact.role, contact.email, contact.phone].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <button type="button" onClick={() => removeContact(contact.id)} aria-label={`Remove ${contact.name}`}>
                    <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      ) : null}

      {tab === "activity" ? (
        activityLoading ? (
          <LoadingState label="Loading activity…" />
        ) : activityError ? (
          <InlineError message={activityError} onRetry={refetchActivity} />
        ) : activity.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No recent activity"
            description="Views, uploads, and edits for this client's documents will appear here."
          />
        ) : (
          <div className="overflow-hidden rounded-none border border-border bg-card">
            {activity.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between px-4 py-3 ${i !== activity.length - 1 ? "border-b border-border" : ""}`}
              >
                <div>
                  <p className="text-sm text-foreground">
                    {ACTION_LABELS[entry.action] ?? entry.action} · {entry.target}
                  </p>
                  <p className="text-xs text-muted-foreground">{entry.isSystem ? "System" : entry.actor}</p>
                </div>
                <p className="text-[11px] text-muted-foreground">{entry.timestamp}</p>
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
