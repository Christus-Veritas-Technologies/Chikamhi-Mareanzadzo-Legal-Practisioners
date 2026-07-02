"use client";

import { Button, buttonVariants } from "@CMLP/ui/components/button";
import { Card, CardContent } from "@CMLP/ui/components/card";
import { Download, FileText, FileX } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { StatusPill } from "@/components/status-pill";
import { getCase, getClient, getDocument } from "@/lib/mock-data";

export default function DocumentViewerPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const doc = getDocument(documentId);

  if (!doc) {
    return (
      <EmptyState
        icon={FileX}
        title="Document not found"
        description="This document may have been removed, or the link is out of date."
        action={
          <Link href="/documents" className={buttonVariants({ size: "sm", variant: "outline" })}>
            Back to documents
          </Link>
        }
      />
    );
  }

  const client = getClient(doc.clientId);
  const matter = doc.caseId ? getCase(doc.caseId) : undefined;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
      <Card className="flex min-h-[420px] items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-2 text-center">
          <FileText className="size-10 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Preview isn't available in this build yet — download to view the file.
          </p>
        </div>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium break-words text-foreground">{doc.name}</p>
            <div className="mt-1.5">
              <StatusPill status={doc.status} />
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Client</p>
              {client ? (
                <Link href={`/clients/${client.id}`} className="text-brand hover:underline">
                  {client.name}
                </Link>
              ) : (
                <p className="text-foreground">—</p>
              )}
            </div>
            <div>
              <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Case</p>
              {matter ? (
                <Link href={`/cases/${matter.id}`} className="text-brand hover:underline">
                  {matter.title}
                </Link>
              ) : (
                <p className="text-foreground">—</p>
              )}
            </div>
            <div>
              <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                Uploaded by
              </p>
              <p className="text-foreground">{doc.uploadedBy}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Modified</p>
              <p className="text-foreground">{doc.modified}</p>
            </div>
          </div>

          <Button className="w-full">
            <Download />
            Download
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
