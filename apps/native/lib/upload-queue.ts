import { Directory, File, Paths } from "expo-file-system";
import * as Network from "expo-network";

import { apiFetch } from "@/lib/api";

// Persistent offline-friendly upload queue for scanned documents. Captured files are
// copied into a stable app-storage directory (so they survive even if the OS clears the
// cache dir the camera/PDF-assembly wrote to first), tracked in a small JSON index, and
// drained whenever there's connectivity — on enqueue, on screen focus, and automatically
// when expo-network reports the device coming back online.

export type QueueStatus = "pending" | "uploading" | "failed";

export type QueuedUpload = {
  id: string;
  name: string;
  clientId: string;
  caseId: string;
  fileType: string;
  contentType: string;
  sizeBytes?: number;
  localUri: string;
  status: QueueStatus;
  error?: string;
  createdAt: string;
};

const queueDir = new Directory(Paths.document, "upload-queue");
const indexFile = new File(Paths.document, "upload-queue-index.json");

async function ensureDir() {
  // Awaited defensively — some File/Directory methods on this SDK resolve asynchronously
  // even though they don't always look like it; awaiting a non-promise value is harmless.
  if (!queueDir.exists) {
    await queueDir.create({ intermediates: true });
  }
}

function readIndex(): QueuedUpload[] {
  try {
    if (!indexFile.exists) return [];
    const raw = indexFile.textSync();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(items: QueuedUpload[]) {
  try {
    if (!indexFile.exists) indexFile.create();
    indexFile.write(JSON.stringify(items));
  } catch {
    // Best-effort — a failed index write just means the queue won't persist across restarts.
  }
}

export function listQueue(): QueuedUpload[] {
  return readIndex().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function updateEntry(id: string, patch: Partial<QueuedUpload>) {
  writeIndex(readIndex().map((e) => (e.id === id ? { ...e, ...patch } : e)));
}

function removeEntry(id: string) {
  const entry = readIndex().find((e) => e.id === id);
  if (entry) {
    try {
      const file = new File(entry.localUri);
      if (file.exists) file.delete();
    } catch {
      // File may already be gone — still drop it from the index below.
    }
  }
  writeIndex(readIndex().filter((e) => e.id !== id));
}

export async function enqueueUpload(job: {
  name: string;
  clientId: string;
  caseId: string;
  fileType: string;
  contentType: string;
  sizeBytes?: number;
  sourceUri: string;
}): Promise<QueuedUpload> {
  await ensureDir();

  const id = `q${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const safeName = job.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "scan";
  const destination = new File(queueDir, `${id}-${safeName}`);
  const source = new File(job.sourceUri);
  // copy() resolves asynchronously on this SDK — await it so the queued file is fully in
  // place before the entry is recorded as ready to upload.
  await source.copy(destination);

  const entry: QueuedUpload = {
    id,
    name: job.name,
    clientId: job.clientId,
    caseId: job.caseId,
    fileType: job.fileType,
    contentType: job.contentType,
    sizeBytes: job.sizeBytes,
    localUri: destination.uri,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const index = readIndex();
  index.push(entry);
  writeIndex(index);

  return entry;
}

export function retryEntry(id: string) {
  updateEntry(id, { status: "pending", error: undefined });
}

let isProcessing = false;

// Drains every pending/failed entry it can while the device is online. Safe to call
// repeatedly (e.g. on mount, on network-reconnect, after a manual retry) — it no-ops if
// already running or offline, and each entry is retried independently so one failure
// doesn't block the rest of the queue.
export async function processQueue(token: string | null): Promise<void> {
  if (isProcessing || !token) return;
  isProcessing = true;

  try {
    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected) return;

    const toProcess = readIndex().filter((e) => e.status === "pending" || e.status === "failed");

    for (const entry of toProcess) {
      updateEntry(entry.id, { status: "uploading", error: undefined });

      try {
        const { document, uploadUrl } = await apiFetch<{
          document: { id: string };
          uploadUrl: string | null;
        }>("/documents", {
          method: "POST",
          body: {
            name: entry.name,
            fileType: entry.fileType,
            clientId: entry.clientId,
            caseId: entry.caseId,
            contentType: entry.contentType,
            sizeBytes: entry.sizeBytes,
          },
          token,
        });

        if (uploadUrl) {
          const blob = await (await fetch(entry.localUri)).blob();
          const putRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": entry.contentType },
            body: blob,
          });
          if (!putRes.ok) throw new Error("Couldn't upload this scan to storage.");

          // Tells the server the bytes have actually landed in R2 — that's what kicks off
          // OCR for eligible file types (plain image scans). Best-effort: OCR just won't
          // run for this document if the confirmation call itself fails.
          await apiFetch(`/documents/${document.id}/confirm-upload`, { method: "POST", token }).catch(() => {});
        }

        removeEntry(entry.id);
      } catch (err) {
        updateEntry(entry.id, {
          status: "failed",
          error: err instanceof Error ? err.message : "Upload failed. Will retry when you're back online.",
        });
      }
    }
  } finally {
    isProcessing = false;
  }
}
