"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@CMLP/ui/components/card";
import { FileText, FileX2, FolderOpen, HardDrive, PenLine } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { InlineError, LoadingState } from "@/components/loading-state";
import { StatusPill } from "@/components/status-pill";
import { useCurrentUser } from "@/contexts/current-user-context";
import { useApi } from "@/hooks/use-api";
import { formatStatus } from "@/lib/format-status";

type DashboardSummary = {
  stats: {
    filedThisWeek: number;
    awaitingSignature: number;
    openCases: number;
    storageUsed: string;
    storageQuotaGb: number;
    storagePercentUsed: number;
  };
  recentDocuments: { id: string; name: string; status: string; modified: string; matter: string }[];
};

export default function DashboardPage() {
  const user = useCurrentUser();
  const { data, isLoading, error, refetch } = useApi<DashboardSummary>("/dashboard/summary");

  const stats = data?.stats;
  const recentDocuments = data?.recentDocuments ?? [];

  const statCards = stats
    ? [
        { label: "Filed this week", value: String(stats.filedThisWeek), icon: FileText },
        { label: "Awaiting signature", value: String(stats.awaitingSignature), icon: PenLine },
        { label: "Open cases", value: String(stats.openCases), icon: FolderOpen },
        {
          label: "R2 storage used",
          value: stats.storageUsed,
          delta: `of ${stats.storageQuotaGb} GB`,
          icon: HardDrive,
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {user.name.split(" ")[0]}.</p>
      </div>

      {isLoading ? (
        <LoadingState label="Loading dashboard…" />
      ) : error ? (
        <InlineError message={error} onRetry={refetch} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statCards.map(({ label, value, delta, icon: Icon }) => (
              <Card key={label}>
                <CardContent className="flex items-start justify-between">
                  <div>
                    <p className="text-xl font-semibold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    {delta ? <p className="mt-1 text-[11px] text-muted-foreground">{delta}</p> : null}
                  </div>
                  <Icon className="size-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base font-semibold">Recent documents</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentDocuments.length === 0 ? (
                <EmptyState
                  icon={FileX2}
                  title="No documents yet"
                  description="Documents uploaded across the firm will show up here."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-[10px] tracking-wide text-muted-foreground uppercase">
                        <th className="px-4 py-2 font-medium">Document</th>
                        <th className="px-4 py-2 font-medium">Case · Client</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                        <th className="px-4 py-2 font-medium">Modified</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentDocuments.map((doc) => (
                        <tr key={doc.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2.5 font-medium text-foreground">{doc.name}</td>
                          <td className="px-4 py-2.5 text-brand">{doc.matter}</td>
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
        </>
      )}
    </div>
  );
}
