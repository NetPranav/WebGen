/**
 * MDM v5 → v6 (ROADMAP Phase 53): the animation grammar's schema gaps.
 *
 * v6 adds clip types `exit`, `focus`, `stagger` and `layout` and triggers
 * `unmount` and `layoutChange`. Every v5 value is still valid, so no data
 * is rewritten: this only moves `schemaVersion`.
 */

import type { MigrationReportEntry } from "./v2-to-v3";
import type { MotionDocument } from "../schema";

type Loose = Record<string, unknown>;

export function migrateV5ToV6(input: Loose): { document: MotionDocument; report: MigrationReportEntry[] } {
  const doc = structuredClone(input) as Loose;
  doc.schemaVersion = 6;
  return { document: doc as unknown as MotionDocument, report: [] };
}
