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
 * See `DOCS/Initial/decisions/0005-phase8-rule-table-and-reconciliation.md`.
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
};

/**
 * Best-effort `Trigger` → `TriggerType` mapping, used only to feed the legacy
 * conflict detector (`ElementGrammarEngine.conflictsWithExisting`, grammar
 * §6.1: same trigger + shared property = hard conflict). `pointerMove`,
 * `drag` and `time` have no lossless equivalent in the 13-value legacy union
 * — see `PHASE8_SCHEMA_GAPS`.
 */
export const TRIGGER_TO_TRIGGER_TYPE: Record<Trigger, TriggerType> = {
  mount: "OnLoad",
  hover: "OnHoverEnter",
  press: "OnPress",
  focus: "OnFocus",
  inView: "OnScrollEnter",
  scrollProgress: "OnScrollScrub",
  pointerMove: "Ambient",
  drag: "OnPress",
  time: "Ambient",
  custom: "OnChildEvent",
};

export interface SchemaGap {
  category: AnimationCategory | "trigger-vocabulary";
  note: string;
}

/**
 * Grammar categories and trigger nuances Phase 7's MDM v4 schema cannot yet
 * express independently. `rules.canAdd`/`rules.validate` can only evaluate
 * what the schema can represent; this list is the audit trail for the rest,
 * tracked as a follow-up under AUD-52 rather than silently dropped.
 */
export const PHASE8_SCHEMA_GAPS: SchemaGap[] = [
  {
    category: "Exit",
    note:
      "No ClipType or Trigger distinguishes an element leaving from entering; `entrance`-type clips only express Entrance today.",
  },
  {
    category: "Focus",
    note:
      "`focus` exists as a Trigger but not as its own ClipType — a Focus effect must be authored as another clip type (typically `hover`) triggered by `focus`.",
  },
  {
    category: "Stagger",
    note: "Stagger is a modifier on `Clip.stagger`/`Sequence.stagger`, not its own ClipType, so it cannot appear as a `canAdd` candidate the way grammar's Stagger category does.",
  },
  {
    category: "LayoutTransition",
    note: "No ClipType or dedicated FLIP/layout-transition primitive exists yet in the MDM v4 schema.",
  },
  {
    category: "trigger-vocabulary",
    note: "`pointerMove`, `drag` and `time` triggers have no lossless equivalent in the legacy 13-value TriggerType union; TRIGGER_TO_TRIGGER_TYPE approximates them for conflict-checking only.",
  },
];

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
