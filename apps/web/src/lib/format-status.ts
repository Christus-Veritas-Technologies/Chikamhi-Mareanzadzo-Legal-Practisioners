// Converts Prisma enum values (e.g. "UNDER_REVIEW") into the title-case labels
// StatusPill's style map expects (e.g. "Under review").
export function formatStatus(status: string) {
  const lower = status.toLowerCase().replace(/_/g, " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
