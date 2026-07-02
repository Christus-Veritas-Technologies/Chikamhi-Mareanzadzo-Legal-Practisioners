import { File, Paths } from "expo-file-system";

// A snapshot of the last successful response for every GET path the app has fetched,
// keyed by the exact path (including query string) so filtered/paginated views each get
// their own cache entry. Every screen goes through useApi, so this one file is what makes
// the whole app "work offline, read-only, from last-known state" without touching each
// screen individually.

type Snapshot = { data: unknown; savedAt: string };
type SnapshotIndex = Record<string, Snapshot>;

const cacheFile = new File(Paths.document, "api-cache.json");

function readAll(): SnapshotIndex {
  try {
    if (!cacheFile.exists) return {};
    const raw = cacheFile.textSync();
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(index: SnapshotIndex) {
  try {
    if (!cacheFile.exists) cacheFile.create();
    cacheFile.write(JSON.stringify(index));
  } catch {
    // Best-effort — a failed cache write just means this path won't be available offline.
  }
}

export function saveSnapshot(path: string, data: unknown): void {
  const index = readAll();
  index[path] = { data, savedAt: new Date().toISOString() };
  writeAll(index);
}

export function readSnapshot<T>(path: string): { data: T; savedAt: string } | null {
  const entry = readAll()[path];
  if (!entry) return null;
  return { data: entry.data as T, savedAt: entry.savedAt };
}
