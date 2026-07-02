"use client";

import { Button } from "@CMLP/ui/components/button";
import { Download, History } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { AUDIT_LOG, type AuditAction } from "@/lib/audit-log-data";

const ACTION_STYLES: Record<AuditAction, string> = {
  Signed: "bg-success/15 text-success",
  OCR: "bg-muted text-muted-foreground",
  Moved: "bg-brand-muted text-brand-foreground",
  Uploaded: "bg-brand-muted text-brand-foreground",
  Viewed: "bg-muted text-muted-foreground",
  Deleted: "bg-destructive/10 text-destructive",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AuditLogPage() {
  const [actorFilter, setActorFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const actors = useMemo(() => Array.from(new Set(AUDIT_LOG.map((e) => e.actor))), []);
  const actions = useMemo(() => Array.from(new Set(AUDIT_LOG.map((e) => e.action))), []);

  const filtered = AUDIT_LOG.filter(
    (e) => (!actorFilter || e.actor === actorFilter) && (!actionFilter || e.action === actionFilter),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Audit log</h1>
          <p className="text-sm text-muted-foreground">
            Every action on every document. Tamper-evident and retained for 7 years.
          </p>
        </div>
        <Button variant="outline" size="sm">
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
          {actors.map((a) => (
            <option key={a} value={a}>
              {a}
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
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-none border border-border bg-card">
        {filtered.length === 0 ? (
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
                {filtered.map((entry) => (
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
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ACTION_STYLES[entry.action]}`}>
                        {entry.action}
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
      </div>
    </div>
  );
}
