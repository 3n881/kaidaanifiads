// Browser only: renders the first pages of a PDF to images with PDF.js, so
// the dashboard can upload them as sample-reader pages together with the PDF
// (the server re-encodes them to WebP sizes, see src/lib/reader-pages.ts).
const PDFJS_BASE = "/vendor/pdfjs-6.3.289";

export async function renderPdfPages(file: File, count = 6, width = 1600): Promise<File[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.mjs`;
  const loading = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    standardFontDataUrl: `${PDFJS_BASE}/standard_fonts/`,
    wasmUrl: `${PDFJS_BASE}/wasm/`,
    iccUrl: `${PDFJS_BASE}/iccs/`,
  });
  try {
    const doc = await loading.promise;
    const files: File[] = [];
    for (let n = 1; n <= Math.min(count, doc.numPages); n++) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      // "print" draws the page in one go (no animation-frame pacing), so it
      // also finishes while the admin's tab is in the background.
      await page.render({ canvas, viewport, background: "#ffffff", intent: "print" }).promise;
      // WebP where supported (Safari falls back to PNG); quality is set again on the server.
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.92));
      if (!blob) throw new Error(`Page ${n} could not be converted`);
      const ext = blob.type === "image/webp" ? "webp" : "png";
      files.push(new File([blob], `page-${n}.${ext}`, { type: blob.type }));
      page.cleanup();
    }
    return files;
  } finally {
    await loading.destroy();
  }
}
