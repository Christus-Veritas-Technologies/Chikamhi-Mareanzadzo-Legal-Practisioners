// Shared across every soft-deletable entity (documents, folders, tags, cases, clients) so the
// retention window and "days until purge" math stay in one place instead of copy-pasted per
// controller.
export const TRASH_RETENTION_DAYS = 30;

export function purgesInDays(deletedAt: Date): number {
  const daysElapsed = Math.floor((Date.now() - deletedAt.getTime()) / 86_400_000);
  return Math.max(0, TRASH_RETENTION_DAYS - daysElapsed);
}
