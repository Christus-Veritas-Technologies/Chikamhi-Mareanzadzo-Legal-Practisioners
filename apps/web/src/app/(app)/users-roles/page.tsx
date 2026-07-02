"use client";

import { Button } from "@CMLP/ui/components/button";
import { cn } from "@CMLP/ui/lib/utils";
import { UserPlus, Users } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { STAFF, type StaffMember, type StaffRole } from "@/lib/staff-data";

const ROLES: StaffRole[] = ["Admin", "Attorney", "Paralegal"];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function UsersRolesPage() {
  const [staff, setStaff] = useState<StaffMember[]>(STAFF);

  const activeCount = staff.filter((s) => s.active).length;

  function setRole(id: string, role: StaffRole) {
    setStaff((list) => list.map((s) => (s.id === id ? { ...s, role } : s)));
  }

  function toggleActive(id: string) {
    setStaff((list) => list.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Users & roles</h1>
          <p className="text-sm text-muted-foreground">
            {staff.length} staff accounts · {activeCount} active
          </p>
        </div>
        <Button>
          <UserPlus />
          Invite user
        </Button>
      </div>

      <div className="overflow-hidden rounded-none border border-border bg-card">
        {staff.length === 0 ? (
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
                      <select
                        value={member.role}
                        onChange={(e) => setRole(member.id, e.target.value as StaffRole)}
                        className="h-7 rounded-none border border-input bg-background px-2 text-xs text-foreground"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleActive(member.id)}
                        className="flex items-center gap-2"
                      >
                        <span
                          className={cn(
                            "flex h-4 w-7 items-center rounded-full px-0.5 transition-colors",
                            member.active ? "justify-end bg-success" : "justify-start bg-muted",
                          )}
                        >
                          <span className="size-3 rounded-full bg-white" />
                        </span>
                        <span className={member.active ? "text-success" : "text-muted-foreground"}>
                          {member.active ? "Active" : "Suspended"}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{member.lastActive}</td>
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
