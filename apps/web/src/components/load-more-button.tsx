"use client";

import { Button } from "@CMLP/ui/components/button";

// Shared footer for paginated tables/lists: shows "N of total" plus a "Load more" button
// that bumps the caller's `limit` state. Renders nothing once everything is loaded.
export function LoadMoreButton({
  shown,
  total,
  onClick,
  loading,
}: {
  shown: number;
  total: number;
  onClick: () => void;
  loading?: boolean;
}) {
  if (shown >= total) return null;

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3">
      <p className="text-[11px] text-muted-foreground">
        Showing {shown} of {total}
      </p>
      <Button size="sm" variant="outline" onClick={onClick} disabled={loading}>
        {loading ? "Loading…" : "Load more"}
      </Button>
    </div>
  );
}
