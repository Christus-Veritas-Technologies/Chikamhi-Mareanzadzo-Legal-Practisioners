import { Directory, File, Paths } from "expo-file-system";

// Offline document store: downloads a document's bytes into the app's document directory
// and keeps a small JSON index (id, name, local uri, downloadedAt) alongside it so the
// Downloads screen can list what's available without hitting the network.

export type DownloadedDoc = {
  id: string;
  name: string;
  uri: string;
  sizeBytes: number;
  downloadedAt: string;
};

const downloadsDir = new Directory(Paths.document, "downloads");
const indexFile = new File(Paths.document, "downloads-index.json");

function ensureDir() {
  if (!downloadsDir.exists) {
    downloadsDir.create({ intermediates: true });
  }
}

function readIndex(): DownloadedDoc[] {
  try {
    if (!indexFile.exists) return [];
    const raw = indexFile.textSync();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(items: DownloadedDoc[]) {
  try {
    if (!indexFile.exists) indexFile.create();
    indexFile.write(JSON.stringify(items));
  } catch {
    // Best-effort — a failed index write just means this document won't show in the list.
  }
}

export function listDownloads(): DownloadedDoc[] {
  return readIndex().sort((a, b) => (a.downloadedAt < b.downloadedAt ? 1 : -1));
}

export function isDownloaded(documentId: string): boolean {
  return readIndex().some((d) => d.id === documentId);
}

export async function downloadDocument(doc: {
  id: string;
  name: string;
  downloadUrl: string;
}): Promise<DownloadedDoc> {
  ensureDir();

  const safeName = doc.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "document";
  const destination = new File(downloadsDir, `${doc.id}-${safeName}`);

  if (destination.exists) {
    destination.delete();
  }

  const output = await File.downloadFileAsync(doc.downloadUrl, destination);

  const entry: DownloadedDoc = {
    id: doc.id,
    name: doc.name,
    uri: output.uri,
    sizeBytes: output.size ?? 0,
    downloadedAt: new Date().toISOString(),
  };

  const index = readIndex().filter((d) => d.id !== doc.id);
  index.push(entry);
  writeIndex(index);

  return entry;
}

export function removeDownload(documentId: string) {
  const index = readIndex();
  const entry = index.find((d) => d.id === documentId);
  if (entry) {
    try {
      const file = new File(entry.uri);
      if (file.exists) file.delete();
    } catch {
      // File may already be gone — still drop it from the index below.
    }
  }
  writeIndex(index.filter((d) => d.id !== documentId));
}
