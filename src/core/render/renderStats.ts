/**
 * Render counting for the "editing one layer re-renders no other layer" gate (ROADMAP Phase 19).
 * Counts only while a test has installed `globalThis.__LL_RENDER_STATS__ = {}` before the app loads;
 * otherwise `recordRender` is a property read and nothing else.
 */
type Stats = Record<string, number>;

export function recordRender(layerId: string): void {
  const stats = (globalThis as { __LL_RENDER_STATS__?: Stats }).__LL_RENDER_STATS__;
  if (stats) stats[layerId] = (stats[layerId] ?? 0) + 1;
}
