"use client";

import { Button, buttonVariants } from "@CMLP/ui/components/button";
import { Card, CardContent } from "@CMLP/ui/components/card";
import { Input } from "@CMLP/ui/components/input";
import { CalendarClock, Check, FileX2, FolderX, History, PenLine, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CaseEditDialog } from "@/components/case-edit-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { SignDocumentDialog } from "@/components/sign-document-dialog";
import { StatusPill } from "@/components/status-pill";
import { apiFetch, useApi } from "@/hooks/use-api";
import { formatStatus } from "@/lib/format-status";

type Deadline = {
  id: string;
  title: string;
  dueAt: string;
  notes: string | null;
  completedAt: string | null;
  createdBy: { id: string; name: string };
};

const DOC_TABS = [
  { value: "all", label: "All" },
  { value: "Filed", label: "Filed" },
  { value: "Signed", label: "Signed" },
  { value: "Executed", label: "Executed" },
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
  leadAttorneyId: string | null;
  leadAttorney: string;
  opened: string;
  client: { id: string; name: string };
  documents: { id: string; name: string; status: string; modified: string }[];
  timeline: { id: string; description: string; actor: string; timestamp: string }[];
};

export default function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const [docFilter, setDocFilter] = useState<DocFilter>("all");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [signTarget, setSignTarget] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, error, refetch } = useApi<{ case: CaseDetail }>(`/cases/${caseId}`);
  const matter = data?.case;

  const { data: deadlinesData, refetch: refetchDeadlines } = useApi<{ deadlines: Deadline[] }>(
    `/deadlines?caseId=${caseId}`,
  );
  const deadlines = useMemo(
    () => [...(deadlinesData?.deadlines ?? [])].sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    [deadlinesData],
  );
  const [isAddingDeadline, setIsAddingDeadline] = useState(false);
  const [newDeadlineTitle, setNewDeadlineTitle] = useState("");
  const [newDeadlineDue, setNewDeadlineDue] = useState("");
  const [isSavingDeadline, setIsSavingDeadline] = useState(false);

  async function addDeadline() {
    if (!newDeadlineTitle.trim() || !newDeadlineDue || !caseId) return;
    setIsSavingDeadline(true);
    try {
      await apiFetch("/deadlines", {
        method: "POST",
        body: JSON.stringify({ caseId, title: newDeadlineTitle.trim(), dueAt: newDeadlineDue }),
      });
      setNewDeadlineTitle("");
      setNewDeadlineDue("");
      setIsAddingDeadline(false);
      refetchDeadlines();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add deadline.");
    } finally {
      setIsSavingDeadline(false);
    }
  }

  async function toggleDeadlineComplete(id: string, completed: boolean) {
    await apiFetch(`/deadlines/${id}`, { method: "PATCH", body: JSON.stringify({ completed }) });
    refetchDeadlines();
  }

  async function removeDeadline(id: string) {
    await apiFetch(`/deadlines/${id}`, { method: "DELETE" });
    refetchDeadlines();
  }

  async function deleteCase(deleteDocuments: boolean) {
    if (!caseId) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/cases/${caseId}`, {
        method: "DELETE",
        body: JSON.stringify({ deleteDocuments }),
      });
      toast.success("Case moved to trash.");
      router.push(matter?.client ? `/clients/${matter.client.id}` : "/cases");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete case.");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

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
        <div className="flex items-center gap-2">
          <CaseEditDialog
            caseId={matter.id}
            initial={{
              status: matter.status,
              matterType: matter.matterType,
              location: matter.location,
              registry: matter.registry,
              leadAttorneyId: matter.leadAttorneyId,
            }}
            onSaved={refetch}
            trigger={<Button variant="outline">Edit case</Button>}
          />
          <Link href="/upload" className={buttonVariants()}>
            <Plus />
            Upload to case
          </Link>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete case
          </Button>
        </div>
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
                      <th className="px-4 py-2.5 font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((doc) => (
                      <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                        <td className="px-4 py-2.5 font-medium text-foreground">
                          <Link href={`/documents/${doc.id}`} className="hover:text-brand">
                            {doc.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusPill status={formatStatus(doc.status)} />
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{doc.modified}</td>
                        <td className="px-4 py-2.5 text-right">
                          {doc.status === "FILED" ? (
                            <button
                              type="button"
                              onClick={() => setSignTarget({ id: doc.id, name: doc.name })}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
                            >
                              <PenLine className="size-3" />
                              Sign
                            </button>
                          ) : null}
                        </td>
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
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">Deadlines</p>
              <button
                type="button"
                onClick={() => setIsAddingDeadline((s) => !s)}
                className="flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
              >
                <Plus className="size-3" />
                Add
              </button>
            </div>

            {isAddingDeadline ? (
              <div className="mb-3 flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
                <Input
                  autoFocus
                  placeholder="e.g. File heads of argument"
                  value={newDeadlineTitle}
                  onChange={(e) => setNewDeadlineTitle(e.target.value)}
                />
                <Input type="date" value={newDeadlineDue} onChange={(e) => setNewDeadlineDue(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsAddingDeadline(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={addDeadline}
                    disabled={isSavingDeadline || !newDeadlineTitle.trim() || !newDeadlineDue}
                  >
                    {isSavingDeadline ? "Adding…" : "Add deadline"}
                  </Button>
                </div>
              </div>
            ) : null}

            {deadlines.length === 0 ? (
              <p className="text-xs text-muted-foreground">No deadlines set for this case.</p>
            ) : (
              <ul className="mb-5 flex flex-col gap-2">
                {deadlines.map((d) => {
                  const isOverdue = !d.completedAt && new Date(d.dueAt) < new Date();
                  return (
                    <li
                      key={d.id}
                      className="flex items-start justify-between gap-2 rounded-lg border border-border px-3 py-2"
                    >
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => toggleDeadlineComplete(d.id, !d.completedAt)}
                          aria-label={d.completedAt ? "Mark incomplete" : "Mark complete"}
                          className={`mt-0.5 flex size-4 items-center justify-center rounded-full border ${d.completedAt ? "border-success bg-success text-success-foreground" : "border-input"}`}
                        >
                          {d.completedAt ? <Check className="size-2.5" /> : null}
                        </button>
                        <div>
                          <p
                            className={`text-xs font-medium ${d.completedAt ? "text-muted-foreground line-through" : "text-foreground"}`}
                          >
                            {d.title}
                          </p>
                          <p className={`text-[11px] ${isOverdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                            <CalendarClock className="mr-1 inline size-2.5" />
                            {new Date(d.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            {isOverdue ? " · Overdue" : ""}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDeadline(d.id)}
                        aria-label={`Remove deadline ${d.title}`}
                      >
                        <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

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

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this case?"
        description={`${matter.title} will be moved to Trash and can be restored within 30 days.`}
        cascadeLabel={
          documents.length > 0
            ? `Also delete the ${documents.length} document${documents.length === 1 ? "" : "s"} inside this case`
            : undefined
        }
        confirmLabel="Delete case"
        destructive
        isLoading={isDeleting}
        onConfirm={deleteCase}
      />

      {signTarget ? (
        <SignDocumentDialog
          documentId={signTarget.id}
          documentName={signTarget.name}
          open={Boolean(signTarget)}
          onOpenChange={(open) => !open && setSignTarget(null)}
          onSigned={refetch}
        />
      ) : null}
    </div>
  );
}
