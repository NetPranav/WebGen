/**
 * Thumbnails (ROADMAP Phase 36): a small preview of each raster image, made off the main thread. A worker (made
 * from a Blob URL, so there is no bundler setting to get wrong) decodes the file with `createImageBitmap`, draws it
 * small on an `OffscreenCanvas` and sends back a WebP or PNG. Where a worker or `OffscreenCanvas` doesn't exist
 * the same work runs on the main thread. SVG and fonts need none: an SVG is its own preview.
 */

export const THUMB_SIZE = 256;

/** The worker's body. It must not use anything from this module: it is turned into text. */
function thumbnailWorker() {
  const scope = self as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage: (m: unknown) => void };
  scope.onmessage = async (e: MessageEvent<{ id: number; blob: Blob; size: number }>) => {
    const { id, blob, size } = e.data;
    try {
      const bitmap = await createImageBitmap(blob);
      const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = new OffscreenCanvas(w, h);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
      bitmap.close();
      const out = await canvas.convertToBlob({ type: "image/webp", quality: 0.8 });
      scope.postMessage({ id, blob: out });
    } catch {
      scope.postMessage({ id, blob: null });
    }
  };
}

let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, (b: Blob | null) => void>();

function getWorker(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined" || typeof URL === "undefined") return null;
  try {
    const url = URL.createObjectURL(new Blob([`(${thumbnailWorker.toString()})()`], { type: "text/javascript" }));
    worker = new Worker(url);
    worker.onmessage = (e: MessageEvent<{ id: number; blob: Blob | null }>) => {
      waiting.get(e.data.id)?.(e.data.blob);
      waiting.delete(e.data.id);
    };
    worker.onerror = () => {
      for (const done of waiting.values()) done(null);
      waiting.clear();
      worker = null;
    };
    return worker;
  } catch {
    return null;
  }
}

async function onMainThread(blob: Blob, size: number): Promise<Blob | null> {
  if (typeof createImageBitmap === "undefined" || typeof document === "undefined") return null;
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.8));
  } catch {
    return null;
  }
}

/** A thumbnail of a raster image, or null when it can't be decoded here. */
export function makeThumbnail(blob: Blob, size = THUMB_SIZE): Promise<Blob | null> {
  const w = getWorker();
  if (!w) return onMainThread(blob, size);
  return new Promise((resolve) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      waiting.delete(id);
      resolve(null);
    }, 15_000);
    waiting.set(id, (b) => {
      clearTimeout(timer);
      resolve(b);
    });
    w.postMessage({ id, blob, size });
  });
}
