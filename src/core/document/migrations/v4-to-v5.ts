/**
 * MDM v4 → v5 (ROADMAP Phase 46): compositions.
 *
 * Adds the `main` composition and places every existing clip, with no
 * visible change (decision 0002):
 *  - `mount` and `time` clips go into `main`, at offset 0 (a clip's own
 *    `delay` still delays it, exactly as before);
 *  - every other clip becomes an interaction composition `comp_<clipId>`
 *    that its trigger drives (hover → play-reverse, press → restart,
 *    scroll with scrub → scrub, …);
 *  - `main` is at least 5 s and long enough for one pass of every clip in it.
 *
 * Nothing that existed in v4 changes; every placement is reported.
 */

import { syncCompositions, MAIN_COMPOSITION_ID, type Composition } from "../compositions";
import type { MigrationReportEntry } from "./v2-to-v3";
import type { V4Document } from "./v3-to-v4";
import type { MotionDocument } from "../schema";
import type { Clip } from "../motion";

type Loose = Record<string, unknown>;
const isObject = (v: unknown): v is Loose => typeof v === "object" && v !== null && !Array.isArray(v);

export function migrateV4ToV5(input: V4Document | Loose): { document: MotionDocument; report: MigrationReportEntry[] } {
  const doc = structuredClone(input) as Loose;
  const report: MigrationReportEntry[] = [];
  if (!isObject(doc.compositions)) doc.compositions = {};
  const layers = isObject(doc.layers) ? doc.layers : {};
  const clips = (isObject(doc.clips) ? doc.clips : {}) as Record<string, Clip>;
  // Only well-formed clips are placed; anything else is left for validation / repair.
  const placeable = Object.fromEntries(
    Object.entries(clips).filter(([, c]) => isObject(c) && typeof c.id === "string" && typeof c.trigger === "string" && typeof c.duration === "number")
  ) as Record<string, Clip>;

  const target = { layers, clips: placeable, compositions: doc.compositions as Record<string, Composition> };
  syncCompositions(target);

  for (const comp of Object.values(target.compositions)) {
    for (const p of comp.clips) {
      report.push({
        at: `clips.${p.clipId}`,
        message: comp.id === MAIN_COMPOSITION_ID ? "Placed in the main composition." : `Became interaction composition "${comp.id}" (${comp.trigger?.on} → ${comp.trigger?.playback}).`,
      });
    }
  }
  doc.schemaVersion = 5;
  return { document: doc as unknown as MotionDocument, report };
}
