/**
 * Escapes a string for use as HTML text or inside a double-quoted attribute.
 * The stage still builds its HTML from strings (until Phase 18 replaces it), and
 * layer text, names and ids come from documents a user may have imported, so
 * every value goes through this before it is interpolated (decision record 0008, F1).
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
