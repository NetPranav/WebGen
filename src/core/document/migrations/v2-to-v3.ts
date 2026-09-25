/**
 * MDM v2 → v3 (ROADMAP Phase 42.2): one property vocabulary.
 *
 * Every layer prop key, state snapshot key and track path is rewritten to its
 * canonical path in `properties.ts`, resolved with the owning layer's
 * archetype (a v2 `color` is text colour on a button but line colour on a
 * divider). Split legacy objects (`filter`, `overlay`, `focalPoint`, 3D
 * `material`) become leaf paths; values whose unit changed are rescaled
 * (image `opacity` 0–100 → 0–1), including their keyframes.
 *
 * Keys and tracks with no canonical meaning for their layer are dropped and
 * reported, rather than failing the whole load.
 */

import { canonicalizeProps, canonicalizeTrackPath, rescaleValue, type PropIssue } from "../properties";
import { isArchetypeId, type ArchetypeId, type PropValue } from "../registry";
import { SCHEMA_VERSION, type MotionDocument } from "../schema";

export interface MigrationReportEntry {
  /** e.g. `layers.btn.properties.colour` or `clips.c1.tracks.t1`. */
  at: string;
  message: string;
}

type Loose = Record<string, unknown>;
const isObject = (v: unknown): v is Loose => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Migrates v2 document data in place-free fashion and returns v3 data plus a
 * report of anything dropped. The input is treated as untrusted JSON: shapes
 * the v3 schema rejects are left for validation / repair to handle.
 */
export function migrateV2ToV3(input: unknown): { document: MotionDocument; report: MigrationReportEntry[] } {
  const doc = structuredClone(input) as Loose;
  const report: MigrationReportEntry[] = [];
  const note = (at: string, issues: PropIssue[]) => {
    for (const issue of issues) report.push({ at: `${at}.${issue.key}`, message: issue.message });
  };

  const layers = isObject(doc.layers) ? doc.layers : {};
  const archetypeOf = (layerId: unknown): ArchetypeId | undefined => {
    const layer = typeof layerId === "string" ? layers[layerId] : undefined;
    return isObject(layer) && isArchetypeId(layer.archetype) ? layer.archetype : undefined;
  };

  for (const [key, layer] of Object.entries(layers)) {
    if (!isObject(layer) || !isArchetypeId(layer.archetype) || !isObject(layer.properties)) continue;
    const { props, dropped } = canonicalizeProps(layer.archetype, layer.properties as Record<string, PropValue>);
    layer.properties = props;
    note(`layers.${key}.properties`, dropped);
  }

  const states = isObject(doc.states) ? doc.states : {};
  for (const [key, state] of Object.entries(states)) {
    const archetype = isObject(state) ? archetypeOf(state.layerId) : undefined;
    if (!isObject(state) || !archetype || !isObject(state.props)) continue;
    const { props, dropped } = canonicalizeProps(archetype, state.props as Record<string, PropValue>);
    state.props = props;
    note(`states.${key}.props`, dropped);
  }

  const clips = isObject(doc.clips) ? doc.clips : {};
  for (const [key, clip] of Object.entries(clips)) {
    const archetype = isObject(clip) ? archetypeOf(clip.layerId) : undefined;
    if (!isObject(clip) || !archetype || !Array.isArray(clip.tracks)) continue;
    clip.tracks = clip.tracks.filter((track: unknown) => {
      if (!isObject(track) || typeof track.property !== "string") return true; // left for validation
      const resolved = canonicalizeTrackPath(track.property, archetype);
      if (!resolved) {
        report.push({ at: `clips.${key}.tracks.${String(track.id)}`, message: `Track "${track.property}" has no meaning on ${archetype}; dropped.` });
        return false;
      }
      track.property = resolved.path;
      if (resolved.scale !== undefined && Array.isArray(track.keyframes)) {
        for (const keyframe of track.keyframes) {
          if (isObject(keyframe)) keyframe.value = rescaleValue(keyframe.value as PropValue, resolved.scale);
        }
      }
      return true;
    });
  }

  doc.schemaVersion = SCHEMA_VERSION;
  return { document: doc as unknown as MotionDocument, report };
}
