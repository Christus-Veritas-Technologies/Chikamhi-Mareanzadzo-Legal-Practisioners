"use client";

import { RouteError } from "@/components/route-error";

export default function UploadError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} title="Upload page hit a snag" />;
}
