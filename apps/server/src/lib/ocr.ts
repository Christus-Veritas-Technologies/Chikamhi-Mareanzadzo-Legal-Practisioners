import prisma from "@CMLP/db";
import { createWorker } from "tesseract.js";

import { getObjectBytes } from "@/lib/r2";

// Scans get filed as plain images (jpg/png) — those are the only file types OCR actually
// applies to here. PDFs, docx, etc. stay ocrStatus: NOT_APPLICABLE.
const OCR_ELIGIBLE_TYPES = new Set(["jpg", "jpeg", "png"]);

export function isOcrEligible(fileType: string): boolean {
  return OCR_ELIGIBLE_TYPES.has(fileType.toLowerCase());
}

// Runs tesseract.js against a document's stored bytes and persists the extracted text.
// Fire-and-forget from the caller's perspective — every failure path is caught here so a
// bad scan (or a transient R2/tesseract error) can never surface as an unhandled rejection
// or take the server down. No queue/worker infra: this is a small firm's document volume,
// and running OCR inline in the server process is a reasonable trade-off for that scale.
export async function runDocumentOcr(documentId: string): Promise<void> {
  try {
    await prisma.document.update({ where: { id: documentId }, data: { ocrStatus: "PROCESSING" } });

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: { uploadedBy: { select: { id: true, notifyOnOcrComplete: true } } },
    });

    if (!doc?.storageKey) {
      throw new Error("No stored file to run OCR against.");
    }

    const bytes = await getObjectBytes(doc.storageKey);
    if (!bytes) {
      throw new Error("Couldn't fetch the file from storage.");
    }

    const worker = await createWorker("eng");
    let text = "";
    try {
      const result = await worker.recognize(bytes);
      text = result.data.text.trim();
    } finally {
      await worker.terminate();
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { ocrStatus: "DONE", ocrText: text, ocrCompletedAt: new Date() },
    });

    await prisma.auditLogEntry.create({
      data: {
        action: "OCR_COMPLETED",
        targetLabel: doc.name,
        documentId: doc.id,
        caseId: doc.caseId,
      },
    });

    if (doc.uploadedBy.notifyOnOcrComplete) {
      await prisma.notification.create({
        data: {
          userId: doc.uploadedBy.id,
          type: "OCR_COMPLETE",
          title: "Text extraction complete",
          body: `"${doc.name}" has been scanned and is now searchable by its contents.`,
          documentId: doc.id,
          caseId: doc.caseId,
        },
      });
    }
  } catch (err) {
    console.error(`OCR failed for document ${documentId}:`, err);
    await prisma.document
      .update({ where: { id: documentId }, data: { ocrStatus: "FAILED" } })
      .catch(() => {
        // If even this write fails, the document is just stuck showing PROCESSING —
        // acceptable degradation rather than a crash.
      });
  }
}
