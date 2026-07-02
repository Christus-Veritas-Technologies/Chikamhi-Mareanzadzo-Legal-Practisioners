"use client";

import { RouteError } from "@/components/route-error";

export default function UsersRolesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} title="Couldn't load users & roles" />;
}
