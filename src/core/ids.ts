/**
 * Collision-resistant IDs: `prefix_` + 8 hex characters from `crypto.getRandomValues`.
 * Replaces ad-hoc `Date.now()` / `Math.random()` IDs (AUD-07). MDM v2 (Phase 2.3)
 * builds its document IDs on this.
 */
/**
 * An id no one in `taken` has. `createId` is 32 bits wide, so in a document with thousands of layers a fresh id can
 * collide with an existing one; anything that inserts many layers at once should draw through this.
 */
export function createUniqueId(prefix: string, taken: { has(id: string): boolean }): string {
  for (let i = 0; i < 32; i++) {
    const id = createId(prefix);
    if (!taken.has(id)) return id;
  }
  throw new Error(`Could not find an unused id for "${prefix}".`);
}

export function createId(prefix: string): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${hex}`;
}
