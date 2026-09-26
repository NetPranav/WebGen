/**
 * Scrub hot-patch: the inline styles the Sequencer sends to the live stage for
 * the tracks under the playhead. Pure, so the mapping from canonical track
 * paths to CSS is testable without a browser (ROADMAP Phase 42 gate: a preset
 * authored with `transform.translateY` migrates to `transform.y` and moves the
 * layer when scrubbed).
 */

import type { Track } from "@/core/document/schema";
import { synthesizeSingleTransformMatrix, type TransformComponents } from "@/core/runtime/EngineAdapters";

type Interpolate = (track: Track, time: number) => unknown;

/**
 * Interpolates value of a track at given timestamp t.
 */
export function interpolateTrackValue(track: Track, time: number): unknown {
  if (!track.keyframes || track.keyframes.length === 0) return undefined;
  if (track.keyframes.length === 1) return track.keyframes[0].value;

  const sorted = [...track.keyframes].sort((a, b) => a.time - b.time);
  if (time <= sorted[0].time) return sorted[0].value;
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;

  for (let i = 0; i < sorted.length - 1; i++) {
    const kf0 = sorted[i];
    const kf1 = sorted[i + 1];
    if (time >= kf0.time && time <= kf1.time) {
      const span = kf1.time - kf0.time;
      const progress = span > 0 ? (time - kf0.time) / span : 0;

      const v0 = parseFloat(String(kf0.value).replace(/[^0-9.-]/g, ""));
      const v1 = parseFloat(String(kf1.value).replace(/[^0-9.-]/g, ""));
      if (!isNaN(v0) && !isNaN(v1)) {
        const val = v0 + (v1 - v0) * progress;
        const unit = String(kf1.value).replace(/[0-9.-]/g, "").trim();
        return unit ? `${val.toFixed(2)}${unit}` : val.toFixed(2);
      }
      return progress > 0.5 ? kf1.value : kf0.value;
    }
  }
  return sorted[sorted.length - 1].value;
}


const NUMERIC_TRANSFORMS: Partial<Record<string, keyof TransformComponents>> = {
  "transform.scale": "scale",
  "transform.scaleX": "scaleX",
  "transform.scaleY": "scaleY",
  "transform.rotate": "rotate",
  "transform.rotateX": "rotateX",
  "transform.rotateY": "rotateY",
};

const OFFSET_TRANSFORMS: Partial<Record<string, "x" | "y" | "z">> = {
  "transform.x": "x",
  "transform.y": "y",
  "transform.z": "z",
};

/** Inline styles for the tracks at `time`; transforms are composed into one `transform`. */
export function scrubStylesForTracks(tracks: Track[], time: number, interpolate: Interpolate): Record<string, string> {
  const styles: Record<string, string> = {};
  const transform: Partial<TransformComponents> = {};

  for (const track of tracks) {
    if (track.muted) continue;
    const val = interpolate(track, time);
    if (val === undefined) continue;

    const offset = OFFSET_TRANSFORMS[track.property];
    const numeric = NUMERIC_TRANSFORMS[track.property];
    if (offset) {
      transform[offset] = String(val);
    } else if (numeric) {
      const num = parseFloat(String(val));
      if (!isNaN(num)) (transform as Record<string, number>)[numeric] = num;
    } else if (track.property === "appearance.opacity") {
      styles.opacity = String(val);
    } else if (track.property === "appearance.background.color") {
      styles.backgroundColor = String(val);
    } else if (track.property === "filter.blur") {
      styles.filter = `blur(${val})`;
    } else if (track.property === "media.filter.grayscale") {
      styles.filter = `grayscale(${val})`;
    } else if (track.property === "divider.length") {
      styles.width = `${val}`;
    }
  }

  const unified = synthesizeSingleTransformMatrix(transform);
  if (unified !== "none") styles.transform = unified;
  return styles;
}
