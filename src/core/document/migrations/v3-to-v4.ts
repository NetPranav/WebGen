/**
 * MDM v3 → v4 (ROADMAP Phase 7): the complete motion model.
 *
 *  - Adds the Phase 7 collections, empty: sequences, transitions, bindings,
 *    surfaces, inputTapes, graphs, effects, components, generators.
 *  - Behaviours get typed params. v3 stored `params` as a free props bag with
 *    no reader, so each behaviour takes its type's defaults and keeps any v3
 *    param whose name and type match; the rest is reported and dropped.
 *  - Clip data is made valid for the v4 checks: keyframes sorted by time (a
 *    stable sort, so equal times stay an instant jump), keyframe and state
 *    values typed by their property (`"20px"` → 20; unreadable values take
 *    the property's default), a clip's duration extended to its last
 *    keyframe, easings the grammar doesn't know become the GSAP default
 *    `power1.out`, a keyframe `ease` it doesn't know is removed, and a
 *    stagger with both or neither of `each`/`amount` keeps `amount`.
 *    Everything changed is reported.
 */

import { BEHAVIOUR_TYPES, isEasing } from "../motion";
import { coercePropertyValue, getPropertyDefinition } from "../properties";
import type { PropValue } from "../registry";
import type { MigrationReportEntry, V3Document } from "./v2-to-v3";
/** v4 data: a v5 document without compositions (v4-to-v5.ts adds them). */
export type V4Document = Record<string, unknown> & { schemaVersion: 4 };

type Loose = Record<string, unknown>;
const isObject = (v: unknown): v is Loose => typeof v === "object" && v !== null && !Array.isArray(v);

const PHASE_7_COLLECTIONS = ["sequences", "transitions", "bindings", "surfaces", "inputTapes", "graphs", "effects", "components", "generators"] as const;

const gentle = { bounce: 0.2, time: 0.5 };

/** Default params for each behaviour type (also what the inspector creates). */
export const DEFAULT_BEHAVIOUR_PARAMS: Record<(typeof BEHAVIOUR_TYPES)[number], Loose> = {
  "follow-pointer": { space: "parent", lag: { type: "spring", spring: gentle }, axis: "both", touch: "while-pressed", reducedMotion: "snap" },
  magnet: { radius: 120, maxOffset: 12, spring: gentle, whileHovered: true, touch: "static" },
  tilt: { maxAngle: 10, perspective: 800, spring: gentle, glare: false, touch: "static" },
  proximity: { property: "transform.scale", near: 1.2, far: 1, radius: 160, measure: "center", falloff: "smoothstep", touch: "static" },
  "spring-to": { property: "transform.scale", value: 1, spring: gentle },
  inertia: { axis: "both", decay: 0.8, bounds: "parent" },
  noise: { targets: [{ property: "transform.y", amplitude: 4 }], frequency: 0.5, seed: 0 },
  loop: { property: "transform.y", from: 0, to: -8, duration: 2, easing: "sine.inOut", yoyo: true },
  "shader-uniform": { uniform: "uTime", source: "time", scale: 1, offset: 0 },
};

/** v4 names of v3 behaviour param keys that meant the same thing. */
const PARAM_ALIASES: Record<string, string> = { strength: "maxOffset", maxTilt: "maxAngle", angle: "maxAngle", speed: "frequency", uniformName: "uniform" };

export function migrateV3ToV4(input: V3Document | Loose): { document: V4Document; report: MigrationReportEntry[] } {
  const doc = structuredClone(input) as Loose;
  const report: MigrationReportEntry[] = [];

  for (const name of PHASE_7_COLLECTIONS) if (!isObject(doc[name])) doc[name] = {};

  const behaviours = isObject(doc.behaviours) ? doc.behaviours : {};
  for (const [key, b] of Object.entries(behaviours)) {
    if (!isObject(b)) continue;
    const type = b.type as (typeof BEHAVIOUR_TYPES)[number];
    const defaults = DEFAULT_BEHAVIOUR_PARAMS[type];
    if (!defaults) continue; // left for validation / repair
    const old = isObject(b.params) ? b.params : {};
    const params: Loose = structuredClone(defaults);
    for (const [rawKey, value] of Object.entries(old)) {
      const k = PARAM_ALIASES[rawKey] ?? rawKey;
      if (k in params && typeof params[k] === typeof value && Array.isArray(params[k]) === Array.isArray(value)) params[k] = value;
      else report.push({ at: `behaviours.${key}.params.${rawKey}`, message: `"${rawKey}" is not a ${type} parameter in v4; dropped.` });
    }
    b.params = params;
  }

  const clips = isObject(doc.clips) ? doc.clips : {};
  for (const [key, clip] of Object.entries(clips)) {
    if (!isObject(clip)) continue;
    if (typeof clip.easing === "string" && !isEasing(clip.easing)) {
      report.push({ at: `clips.${key}.easing`, message: `Unknown easing "${clip.easing}"; using power1.out.` });
      clip.easing = "power1.out";
    }
    if (isObject(clip.stagger)) {
      const s = clip.stagger;
      if ((s.each === undefined) === (s.amount === undefined)) {
        if (s.amount === undefined) s.amount = typeof s.each === "number" ? s.each : 0;
        delete s.each;
        report.push({ at: `clips.${key}.stagger`, message: "A stagger sets exactly one of each/amount; kept amount." });
      }
      if (s.axis !== undefined && s.grid === undefined) {
        delete s.axis;
        report.push({ at: `clips.${key}.stagger.axis`, message: "axis without a grid; dropped." });
      }
    }
    if (!Array.isArray(clip.tracks)) continue;
    let lastTime = 0;
    for (const track of clip.tracks) {
      if (!isObject(track) || !Array.isArray(track.keyframes)) continue;
      const def = typeof track.property === "string" ? getPropertyDefinition(track.property) : undefined;
      const keyframes = (track.keyframes as unknown[]).filter(isObject);
      for (const kf of keyframes) {
        const at = `clips.${key}.tracks.${String(track.id)}.keyframes.${String(kf.id)}`;
        if (typeof kf.ease === "string" && !isEasing(kf.ease)) {
          report.push({ at: `${at}.ease`, message: `Unknown easing "${kf.ease}"; removed.` });
          delete kf.ease;
        }
        if (def && kf.value !== undefined) {
          const typed = coercePropertyValue(def, kf.value as PropValue);
          if (typed !== kf.value) {
            report.push({ at: `${at}.value`, message: `${JSON.stringify(kf.value)} is not a ${def.valueType}; stored as ${JSON.stringify(typed)}.` });
            kf.value = typed;
          }
        }
        if (typeof kf.time === "number") lastTime = Math.max(lastTime, kf.time);
      }
      // Sorted by time; the sort is stable, so keyframes at one time keep their order (an instant jump).
      track.keyframes = keyframes.sort((a, b) => (a.time as number) - (b.time as number));
    }
    if (typeof clip.duration === "number" && lastTime > clip.duration) {
      report.push({ at: `clips.${key}.duration`, message: `Extended from ${clip.duration}s to ${lastTime}s to cover its last keyframe.` });
      clip.duration = lastTime;
    }
  }

  // State snapshot values are typed by their property too.
  const states = isObject(doc.states) ? doc.states : {};
  for (const [key, state] of Object.entries(states)) {
    if (!isObject(state) || !isObject(state.props)) continue;
    for (const [path, value] of Object.entries(state.props)) {
      const def = getPropertyDefinition(path);
      if (!def) continue;
      const typed = coercePropertyValue(def, value as PropValue);
      if (typed !== value) {
        report.push({ at: `states.${key}.props.${path}`, message: `${JSON.stringify(value)} is not a ${def.valueType}; stored as ${JSON.stringify(typed)}.` });
        state.props[path] = typed;
      }
    }
  }

  doc.schemaVersion = 4;
  return { document: doc as V4Document, report };
}
