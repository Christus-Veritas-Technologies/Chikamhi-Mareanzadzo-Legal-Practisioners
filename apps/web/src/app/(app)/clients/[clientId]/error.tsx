"use client";

import { RouteError } from "@/components/route-error";

export default function ClientDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} title="Couldn't load this client" />;
}
