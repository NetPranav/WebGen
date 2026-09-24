/**
 * Collision-resistant IDs: `prefix_` + 8 hex characters from `crypto.getRandomValues`.
 * Replaces ad-hoc `Date.now()` / `Math.random()` IDs (AUD-07). MDM v2 (Phase 2.3)
 * builds its document IDs on this.
 */
export function createId(prefix: string): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${hex}`;
}
