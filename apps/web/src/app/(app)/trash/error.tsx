"use client";

import { RouteError } from "@/components/route-error";

export default function TrashError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} title="Couldn't load trash" />;
}
