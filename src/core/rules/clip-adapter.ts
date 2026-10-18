"use client";

/**
 * ============================================================================
 * PHASE 8 — MDM v4 `Clip` ↔ GRAMMAR `AnimationCategory`/`TriggerType` ADAPTER
 * ============================================================================
 * The grammar (`lazylayout_element_grammer.md` §2–§9) and the legacy
 * `ElementGrammarEngine`/`AnimationBinding` model speak in 10 `AnimationCategory`
 * values and 13 `TriggerType` values. The *real*, schema-validated document
 * model that Phase 7 shipped (`src/core/document/motion.ts`) speaks in 6
 * `ClipType` values and 10 `Trigger` values instead — the two vocabularies
 * were never reconciled. This adapter is that reconciliation for the cells
 * where a clean mapping exists, and an explicit, checked list of the cells
 * where one does not yet exist in the schema (`PHASE8_SCHEMA_GAPS`).
 *
 * See `DOCS/INITIAL/decisions/0005-phase8-rule-table-and-reconciliation.md`.
 * ============================================================================
 */

import type { Clip, ClipType, Trigger } from "../document/motion";
import type { AnimationBinding, AnimationCategory, TriggerType } from "../types/element-grammar";

/** Every `ClipType` maps onto exactly one grammar `AnimationCategory`. */
export const CLIP_TYPE_TO_CATEGORY: Record<ClipType, AnimationCategory> = {
  entrance: "Entrance",
  hover: "Hover",
  tap: "Press",
  scroll: "ScrollLinked",
  loop: "Ambient",
  // A morph is a state-driven shape/property change; StateTransition is the
  // closest existing category (no dedicated ClipType exists for it).
  morph: "StateTransition",
  exit: "Exit",
  focus: "Focus",
  stagger: "Stagger",
  layout: "LayoutTransition",
};

/**
 * `Trigger` → `TriggerType` mapping, used to feed the legacy conflict detector
 * (`ElementGrammarEngine.conflictsWithExisting`, grammar §6.1: same trigger +
 * shared property = hard conflict). Lossless since v6: one `TriggerType` per `Trigger`.
 */
export const TRIGGER_TO_TRIGGER_TYPE: Record<Trigger, TriggerType> = {
  mount: "OnLoad",
  hover: "OnHoverEnter",
  press: "OnPress",
  focus: "OnFocus",
  inView: "OnScrollEnter",
  scrollProgress: "OnScrollScrub",
  pointerMove: "OnPointerMove",
  drag: "OnDrag",
  time: "OnTime",
  custom: "OnChildEvent",
  unmount: "OnUnmount",
  layoutChange: "OnLayoutChange",
};

export interface SchemaGap {
  category: AnimationCategory | "trigger-vocabulary";
  note: string;
}

/**
 * Grammar categories and trigger nuances the schema cannot express
 * independently. Empty since MDM v6 (Phase 53, AUD-59): every `AnimationCategory` has a
 * `ClipType` and every `Trigger` has its own `TriggerType`. It stays as the audit trail; add
 * a gap here rather than dropping one silently.
 */
export const PHASE8_SCHEMA_GAPS: SchemaGap[] = [];

/**
 * Converts a layer's real `Clip`s into the legacy `AnimationBinding[]` shape
 * so `ElementGrammarEngine`'s conflict detector and priority resolver — both
 * already correct against grammar §6 — can run against real document data
 * instead of the editor's disconnected `elementTracks` state.
 */
export function convertClipsToGrammarBindings(clips: Clip[]): AnimationBinding[] {
  return clips.map((clip) => ({
    id: clip.id,
    targetElementId: clip.layerId,
    category: CLIP_TYPE_TO_CATEGORY[clip.type],
    trigger: TRIGGER_TO_TRIGGER_TYPE[clip.trigger],
    properties: clip.tracks.map((track) => track.property),
    priority: 0,
    timing: {
      duration: Math.round(clip.duration * 1000),
      delay: clip.delay ? Math.round(clip.delay * 1000) : 0,
      ease: typeof clip.easing === "string" ? clip.easing : undefined,
    },
  }));
}
