"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@CMLP/ui/components/card";
import { FileText, FolderOpen, HardDrive, Timer } from "lucide-react";

import { useCurrentUser } from "@/contexts/current-user-context";

// Mock data — swap for real queries once the Client/Matter/Document Prisma models exist.
const STATS = [
  { label: "Filed this week", value: "128", delta: "+18%", icon: FileText },
  { label: "Pending OCR", value: "7", delta: null, icon: Timer },
  { label: "Open cases", value: "43", delta: "+3", icon: FolderOpen },
  { label: "R2 storage used", value: "64.2 GB", delta: "of 200 GB", icon: HardDrive },
] as const;

const RECENT_DOCUMENTS = [
  { name: "Deed of Sale — Stand 4471.pdf", matter: "Moyo Holdings", status: "Executed", modified: "2h ago" },
  { name: "Affidavit of Service.pdf", matter: "Estate of T. Ncube", status: "Filed", modified: "Today" },
  { name: "Heads of Argument — Appeal.docx", matter: "Sibanda v. Moyo", status: "Under review", modified: "Yesterday" },
  { name: "Shareholders Agreement (draft 3).docx", matter: "Chikamhi Ventures", status: "Draft", modified: "2d ago" },
  { name: "Notice of Set Down.pdf", matter: "Dube Divorce", status: "Signed", modified: "3d ago" },
] as const;

const STATUS_STYLES: Record<string, string> = {
  Executed: "bg-brand-muted text-brand-foreground",
  Filed: "bg-success/15 text-success",
  Signed: "bg-success/15 text-success",
  "Under review": "bg-warning/15 text-warning",
  Draft: "bg-muted text-muted-foreground",
};

export default function DashboardPage() {
  const user = useCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {user.name.split(" ")[0]}.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map(({ label, value, delta, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-start justify-between">
              <div>
                <p className="text-xl font-semibold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
                {delta ? <p className="mt-1 text-[11px] text-success">{delta}</p> : null}
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
                {RECENT_DOCUMENTS.map((doc) => (
                  <tr key={doc.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium text-foreground">{doc.name}</td>
                    <td className="px-4 py-2.5 text-brand">{doc.matter}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[doc.status] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{doc.modified}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
