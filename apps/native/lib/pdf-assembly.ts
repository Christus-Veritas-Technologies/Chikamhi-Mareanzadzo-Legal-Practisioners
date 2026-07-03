import { File, Paths } from "expo-file-system";
import { PDFDocument } from "pdf-lib";

// Combines captured scan photos (JPEG file URIs, in page order) into a single multi-page
// PDF, written to a temp file in the cache directory. Pure-JS (pdf-lib) — no native module
// or build config required, unlike most PDF libraries.
export async function assembleScanPdf(pageUris: string[]): Promise<{ uri: string; sizeBytes: number }> {
  const pdfDoc = await PDFDocument.create();

  for (const uri of pageUris) {
    const file = new File(uri);
    const bytes = await file.bytes();
    const jpg = await pdfDoc.embedJpg(bytes);
    const page = pdfDoc.addPage([jpg.width, jpg.height]);
    page.drawImage(jpg, { x: 0, y: 0, width: jpg.width, height: jpg.height });
  }

  const pdfBytes = await pdfDoc.save();

  const outFile = new File(Paths.cache, `scan-${Date.now()}.pdf`);
  if (outFile.exists) outFile.delete();
  outFile.create();
  // write() resolves asynchronously — await it so the file is fully flushed to disk before
  // the caller reads it back (the upload queue reads this file directly via UploadTask).
  await outFile.write(pdfBytes);

  return { uri: outFile.uri, sizeBytes: pdfBytes.byteLength };
}
