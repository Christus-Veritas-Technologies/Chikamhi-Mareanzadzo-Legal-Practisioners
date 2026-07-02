"use client";

import { Button } from "@CMLP/ui/components/button";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

// Shared body for every Next.js `error.tsx` boundary in the app — keeps the fallback
// consistent while each route still gets its own boundary (per-segment, per Next.js convention).
export function RouteError({
  error,
  reset,
  title = "Something went wrong",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        {error.message || "Please try again. If this keeps happening, contact IT support."}
      </p>
      <Button size="sm" onClick={reset} className="mt-1">
        Try again
      </Button>
    </div>
  );
}
