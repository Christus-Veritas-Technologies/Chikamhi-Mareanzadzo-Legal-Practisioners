"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { apiFetch, useApi } from "@/hooks/use-api";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  case: { id: string; title: string } | null;
  document: { id: string; name: string } | null;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, refetch } = useApi<{ notifications: NotificationItem[]; unreadCount: number }>(
    "/notifications?limit=10",
  );
  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function markOneRead(id: string) {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
      refetch();
    } catch {
      // Non-critical — the notification just stays unread until the next successful action.
    }
  }

  async function markAllRead() {
    try {
      await apiFetch("/notifications/read-all", { method: "PATCH" });
      refetch();
    } catch {
      // Non-critical — same as above.
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-8 items-center justify-center rounded-none border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-destructive" />
        ) : null}
      </button>

      {open ? (
        <div className="absolute top-full right-0 z-50 mt-2 w-80 rounded-none border border-border bg-popover shadow-md">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-xs font-medium text-foreground">
              Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
            </p>
            {unreadCount > 0 ? (
              <button type="button" onClick={markAllRead} className="text-[11px] text-brand hover:underline">
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">You're all caught up.</p>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.document ? `/documents/${n.document.id}` : n.case ? `/cases/${n.case.id}` : "#"}
                  onClick={() => {
                    setOpen(false);
                    if (!n.isRead) markOneRead(n.id);
                  }}
                  className={`block border-b border-border px-3 py-2.5 last:border-0 hover:bg-muted/40 ${
                    n.isRead ? "" : "bg-brand-muted/30"
                  }`}
                >
                  <p className="text-xs font-medium text-foreground">{n.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{n.createdAt}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
