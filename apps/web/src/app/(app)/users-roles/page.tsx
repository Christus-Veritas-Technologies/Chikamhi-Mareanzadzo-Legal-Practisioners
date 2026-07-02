"use client";

import { cn } from "@CMLP/ui/lib/utils";
import { Users } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { InviteUserDialog } from "@/components/invite-user-dialog";
import { LoadMoreButton } from "@/components/load-more-button";
import { InlineError, LoadingState } from "@/components/loading-state";
import { useCurrentUser } from "@/contexts/current-user-context";
import { apiFetch, useApi } from "@/hooks/use-api";
import { formatStatus } from "@/lib/format-status";
import { relativeTime } from "@/lib/format-time";

type Pagination = { total: number; limit: number; offset: number; hasMore: boolean };

type StaffMember = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: "ADMIN" | "ATTORNEY" | "PARALEGAL";
  isActive: boolean;
  lastActive: string | null;
};

const ROLES: StaffMember["role"][] = ["ADMIN", "ATTORNEY", "PARALEGAL"];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const PAGE_SIZE = 25;

export default function UsersRolesPage() {
  // Managing accounts (invite, role changes, suspend) is admin-only server-side — mirror
  // that here so non-admins see a read-only roster instead of controls that 403.
  const isAdmin = useCurrentUser().role === "ADMIN";
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, error, refetch } = useApi<{ users: StaffMember[]; pagination: Pagination }>(
    `/users?limit=${limit}`,
    [limit],
  );
  const staff = data?.users ?? [];

  const activeCount = staff.filter((s) => s.isActive).length;

  async function setRole(id: string, role: StaffMember["role"]) {
    await apiFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify({ role }) });
    refetch();
  }

  async function toggleActive(id: string, current: boolean) {
    await apiFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify({ isActive: !current }) });
    refetch();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Users & roles</h1>
          <p className="text-sm text-muted-foreground">
            {data?.pagination.total ?? staff.length} staff accounts · {activeCount} active
          </p>
        </div>
        {isAdmin ? <InviteUserDialog onSaved={refetch} /> : null}
      </div>

      <div className="overflow-hidden rounded-none border border-border bg-card">
        {isLoading ? (
          <LoadingState label="Loading users…" />
        ) : error ? (
          <InlineError message={error} onRetry={refetch} />
        ) : staff.length === 0 ? (
          <EmptyState icon={Users} title="No staff accounts" description="Invite your first colleague to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-2.5 font-medium">User</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Last active</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7 items-center justify-center rounded-full bg-brand-muted text-[10px] font-semibold text-brand-foreground">
                          {initials(member.name)}
                        </span>
                        <div>
                          <p className="font-medium text-foreground">{member.name}</p>
                          <p className="text-[11px] text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <select
                          value={member.role}
                          onChange={(e) => setRole(member.id, e.target.value as StaffMember["role"])}
                          className="h-7 rounded-none border border-input bg-background px-2 text-xs text-foreground"
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {formatStatus(role)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-foreground">{formatStatus(member.role)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => toggleActive(member.id, member.isActive)}
                          className="flex items-center gap-2"
                        >
                          <span
                            className={cn(
                              "flex h-4 w-7 items-center rounded-full px-0.5 transition-colors",
                              member.isActive ? "justify-end bg-success" : "justify-start bg-muted",
                            )}
                          >
                            <span className="size-3 rounded-full bg-white" />
                          </span>
                          <span className={member.isActive ? "text-success" : "text-muted-foreground"}>
                            {member.isActive ? "Active" : "Suspended"}
                          </span>
                        </button>
                      ) : (
                        <span className={member.isActive ? "text-xs text-success" : "text-xs text-muted-foreground"}>
                          {member.isActive ? "Active" : "Suspended"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {member.lastActive ? relativeTime(member.lastActive) : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data?.pagination ? (
          <LoadMoreButton
            shown={staff.length}
            total={data.pagination.total}
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            loading={isLoading}
          />
        ) : null}
      </div>
    </div>
  );
}
