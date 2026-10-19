/**
 * Limits and value checks the renderer applies to document data (decision
 * record 0008, rules R5–R7). A value that fails is dropped or clamped, never
 * passed through, and rendering degrades instead of freezing the tab.
 */

export const MAX_TEXT_LENGTH = 20_000;
export const MAX_PATH_LENGTH = 100_000;
export const MAX_RENDERED_LAYERS = 5_000;
export const MAX_TREE_DEPTH = 64;

export function clampText(text: string): string {
  return text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
}

const IMAGE_DATA_URL = /^data:image\/(png|jpe?g|gif|webp|avif|bmp|svg\+xml)[;,]/i;

/**
 * An image source the stage may load: http(s), blob, an inline image, an app-relative path or an
 * asset reference. `javascript:`, `data:text/html` and anything else is refused (returns `null`).
 */
export function safeImageSrc(src: string): string | null {
  const value = src.trim();
  if (value === "") return null;
  if (/^(https?:|blob:|asset:)/i.test(value)) return value;
  if (IMAGE_DATA_URL.test(value)) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return null;
}

const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9eE+\-.,\s]*$/;

/** SVG path data, or an empty string if it holds anything but path commands and numbers, or is too long. */
export function safePathData(d: string): string {
  return d.length <= MAX_PATH_LENGTH && PATH_DATA.test(d) ? d : "";
}

/** A `use` reference to something in the same document (`#id`) and nothing else. */
export function safeFragmentHref(href: string): string | null {
  return /^#[A-Za-z0-9_-]+$/.test(href.trim()) ? href.trim() : null;
}

/** A finite number clamped to a range; anything else gives `fallback`. */
export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
