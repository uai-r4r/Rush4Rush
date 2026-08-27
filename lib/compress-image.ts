/**
 * Client-side screenshot compression.
 *
 * A modern phone camera produces 2–4 MB screenshots. At 400 manual-UPI
 * payments that is most of a 1 GB storage allowance, and — more pressingly —
 * a 3 MB upload over congested fest wifi times out where 150 KB does not.
 *
 * Resizing to 1400px on the long edge keeps a UPI reference number comfortably
 * legible when a club admin opens the proof, which is the only thing the image
 * is actually for.
 *
 * Uses canvas, which every browser has. No library, nothing added to the
 * bundle.
 */

const MAX_EDGE = 1400;
const QUALITY = 0.8;
/** Below this, compressing costs more than it saves. */
const SKIP_UNDER_BYTES = 400 * 1024;

export async function compressImage(file: File): Promise<File> {
  // Not an image, or already small — hand it back untouched.
  if (!file.type.startsWith("image/") || file.size < SKIP_UNDER_BYTES) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);

    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );

    if (!blob) return file;

    // If compression somehow made it bigger (already-optimised JPEGs can do
    // this), keep the original.
    if (blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    /**
     * Never block a payment over compression. A failure here — unsupported
     * format, out of memory on an old phone — means the original goes up, and
     * the server's own 5 MB limit still applies.
     */
    return file;
  }
}

/** For showing the person what happened, e.g. "2.4 MB → 180 KB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
