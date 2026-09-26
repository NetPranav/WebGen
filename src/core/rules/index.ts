"use client";

/**
 * ============================================================================
 * PHASE 8 — EXECUTABLE MOTION RULES ENGINE (QUERY API, SUB-PHASE 8.2)
 * ============================================================================
 * `lazylayout_element_grammer.md` and the animation engine spec become one
 * executable rule table that the UI, AI and export all consult (ROADMAP
 * Phase 8's goal). This module is that table's query surface:
 *   - `canAdd`     — Sub-Phase 8.4's UI contract: the "+" menus and drop
 *                    targets render ONLY this function's results.
 *   - `validate`   — a full-document sweep emitting `[ANIM_COMPAT]`,
 *                    `[STA_CONFLICT]`, `[PERF_LAYOUT]` and `[A11Y_FLASH]`.
 *   - `explain` / `suggestFix` — diagnostic → human message / machine fix.
 *   - `route`      — Sub-Phase 8.3 (Stage 1): which surface an animation runs on.
 *
 * It is a facade over the already-correct legacy engines (`ElementGrammarEngine`,
 * `AnimationValidator`) rather than a rewrite — Sub-Phase 8.1 explicitly asks
 * to reuse that logic, merged into one table. What's new here: the ⚠️/🔒
 * conditional-and-subsumed tier (`conditional-gates.ts`), the bridge from the
 * real MDM v4 `Clip` model to the legacy `AnimationBinding` shape those
 * engines expect (`clip-adapter.ts`), and the performance/accessibility/
 * routing rule families the legacy engines never had.
 * ============================================================================
 */

import { ElementGrammarEngine, TYPE_REGISTRY, type EvaluatedElement } from "../engine/ElementGrammarEngine";
import { AnimationValidator } from "../engine/AnimationValidator";
import { getArchetype } from "../document/registry";
import type { Clip, MotionDocument } from "../document/schema";
import type { AnimationBinding, AnimationCategory, GrammarElementType } from "../types/element-grammar";
import { getCategoryCompatibilityKind, passesConditionalGate } from "./conditional-gates";
import { convertClipsToGrammarBindings, CLIP_TYPE_TO_CATEGORY } from "./clip-adapter";
import { findLayoutPerformanceViolations } from "./performance";
import { exceedsFlashLimit, estimateFlashesPerSecond } from "./accessibility";
import { findReactiveRuleViolations } from "./reactive-rules";
import { animCompatDiagnostic, staConflictDiagnostic, perfLayoutDiagnostic, a11yFlashDiagnostic, explain, suggestFix } from "./diagnostics";
import { routeAnimation } from "./routing";
import type { CanAddResult, PromotionContext, RuleDiagnostic } from "./types";

export * from "./types";
export { getCategoryCompatibilityKind, getConditionalGate, passesConditionalGate } from "./conditional-gates";
export { CLIP_TYPE_TO_CATEGORY, TRIGGER_TO_TRIGGER_TYPE, PHASE8_SCHEMA_GAPS, convertClipsToGrammarBindings } from "./clip-adapter";
export { isLayoutTriggeringProperty, isFilterCostProperty, isContinuousCategory, findLayoutPerformanceViolations } from "./performance";
export { MAX_FLASHES_PER_SECOND, resolveReducedMotion, applyReducedMotionFallback, isFlashableProperty, estimateFlashesPerSecond, exceedsFlashLimit } from "./accessibility";
export { routeAnimation } from "./routing";
export { explain, suggestFix, emitRuleDiagnostic } from "./diagnostics";
export { findBlendConflicts, findSignalCycles, findTouchParityViolations, findEventBridgingViolations, findReactiveRuleViolations, REACTIVE_RULE_GAPS } from "./reactive-rules";

/** Track-level compatibility (a property track against an archetype) — Sub-Phase 8.1's other reused engine. */
export const validateTrackCompatibility = AnimationValidator.validateSampleForElement.bind(AnimationValidator);

/** 7.3.1 explicit promotion's authoring-time flag, expressed as a layer tag. */
export const EXPLICIT_PROMOTION_TAG = "interactive";

function layerContext(doc: MotionDocument, layerId: string): PromotionContext {
  const layer = doc.layers[layerId];
  if (!layer) return {};

  const explicitPromotion = layer.tags?.includes(EXPLICIT_PROMOTION_TAG) ?? false;

  let singleChildPromotion = false;
  if (layer.parentId) {
    const parent = doc.layers[layer.parentId];
    if (parent) {
      const parentGrammarType = getArchetype(parent.archetype).grammarType;
      singleChildPromotion = (parentGrammarType === "Button" || parentGrammarType === "Link") && parent.children.length === 1;
    }
  }

  return { explicitPromotion, singleChildPromotion };
}

/**
 * Sub-Phase 8.2/8.4's core: the same question `canAdd` answers, without
 * needing a real `MotionDocument` — just a grammar type and its current
 * bindings. This is what editor panels not yet wired to the document store
 * (e.g. `ContentBrowser.tsx`'s local `elementTracks` state) can call directly,
 * so the "+" menu still renders only rules-engine results (8.4) even before
 * that panel's own migration to `doc.clips` (tracked separately — decision
 * 0005 §5). `canAdd(doc, layerId, ...)` below is a thin wrapper around this.
 */
export function canAddFromBindings(
  type: GrammarElementType,
  bindings: AnimationBinding[],
  candidate?: { category: AnimationCategory },
  context: PromotionContext = {},
  elementRef: Omit<EvaluatedElement, "type" | "bindings"> = { id: "unknown" }
): CanAddResult {
  const base = ElementGrammarEngine.evaluatePlusIcon({ ...elementRef, type, bindings });
  if (!base.visible) return { visible: false, reason: base.reason };

  const candidates = base.candidates.filter((c) => passesConditionalGate(type, c.category, context));
  const scoped = candidate ? candidates.filter((c) => c.category === candidate.category) : candidates;

  if (scoped.length === 0) {
    if (candidate) {
      const kind = getCategoryCompatibilityKind(type, candidate.category);
      const gateNote = kind === "conditional" ? " (its promotion gate is not satisfied)" : "";
      return { visible: false, reason: `"${candidate.category}" is not currently offered for ${type}${gateNote}.` };
    }
    return { visible: false, reason: "All allowed categories or property slots are occupied." };
  }

  return {
    visible: true,
    candidates: scoped.map((c) => ({ category: c.category, trigger: c.defaultTrigger, properties: c.suggestedProperties, description: c.description })),
  };
}

/**
 * Sub-Phase 8.2/8.4: is `candidate` (or, with no candidate, is *anything*)
 * addable to this layer? The "+" menu and drop targets render only this.
 */
function canAdd(
  doc: MotionDocument,
  layerId: string,
  candidate?: { category: AnimationCategory },
  context: PromotionContext = {}
): CanAddResult {
  const layer = doc.layers[layerId];
  if (!layer) return { visible: false, reason: `No layer with id "${layerId}".` };

  const grammarType = getArchetype(layer.archetype).grammarType;
  const existingClips = Object.values(doc.clips).filter((clip) => clip.layerId === layerId);
  const bindings = convertClipsToGrammarBindings(existingClips);
  const mergedContext = { ...layerContext(doc, layerId), ...context };

  return canAddFromBindings(grammarType, bindings, candidate, mergedContext, { id: layerId, hasInFlightTransition: false });
}

/** Sub-Phase 8.2: a full-document sweep. Everything a static read of `doc` can decide. */
function validate(doc: MotionDocument): RuleDiagnostic[] {
  const diagnostics: RuleDiagnostic[] = [];

  const clipsByLayer = new Map<string, Clip[]>();
  for (const clip of Object.values(doc.clips)) {
    const list = clipsByLayer.get(clip.layerId) ?? [];
    list.push(clip);
    clipsByLayer.set(clip.layerId, list);
  }

  const transitionsByLayer = new Map<string, Array<(typeof doc.transitions)[string]>>();
  for (const transition of Object.values(doc.transitions)) {
    const list = transitionsByLayer.get(transition.layerId) ?? [];
    list.push(transition);
    transitionsByLayer.set(transition.layerId, list);
  }

  const layerIds = new Set<string>([...clipsByLayer.keys(), ...transitionsByLayer.keys()]);

  for (const layerId of layerIds) {
    const clips = clipsByLayer.get(layerId) ?? [];
    const layer = doc.layers[layerId];
    if (!layer) continue;
    const grammarType = getArchetype(layer.archetype).grammarType;
    const contract = TYPE_REGISTRY[grammarType];
    const context = layerContext(doc, layerId);

    if (clips.length > contract.maxSimultaneousTracks) {
      diagnostics.push(
        staConflictDiagnostic({
          layerId,
          message: `${grammarType} has ${clips.length} clips, above its ${contract.maxSimultaneousTracks}-track capacity.`,
          suggestion: "Remove or merge clips to stay within the type's track capacity.",
        })
      );
    }

    for (const clip of clips) {
      const category = CLIP_TYPE_TO_CATEGORY[clip.type];
      const kind = getCategoryCompatibilityKind(grammarType, category);

      if (kind === "blocked") {
        diagnostics.push(
          animCompatDiagnostic({
            layerId,
            message: `${grammarType} does not support "${category}" animation (grammar §9).`,
            suggestion: `Remove this clip, or change the layer's archetype to a type that allows "${category}".`,
            clipId: clip.id,
          })
        );
      } else if (kind === "subsumed") {
        diagnostics.push(
          animCompatDiagnostic({
            layerId,
            message: `${grammarType}'s "${category}" is subsumed into its Open/Closed or Checked/Unchecked StateTransition (grammar §6.3/§6.5), not independently bindable.`,
            suggestion: "Author this as the type's StateTransition instead of a standalone clip.",
            clipId: clip.id,
          })
        );
      } else if (kind === "conditional" && !passesConditionalGate(grammarType, category, context)) {
        diagnostics.push(
          animCompatDiagnostic({
            layerId,
            message: `${grammarType}'s "${category}" requires a promotion this layer doesn't have (grammar §9.1).`,
            suggestion: `Tag the layer "${EXPLICIT_PROMOTION_TAG}" (explicit promotion, §7.3.1), or verify it is the sole interactive child of its Button/Link parent (§7.3.2).`,
            clipId: clip.id,
          })
        );
      }

      const layoutViolations = findLayoutPerformanceViolations(category, clip.tracks.map((t) => t.property));
      if (layoutViolations.length > 0) {
        diagnostics.push(
          perfLayoutDiagnostic({
            layerId,
            message: `A continuous "${category}" binding targets layout-triggering propert${layoutViolations.length > 1 ? "ies" : "y"} (${layoutViolations.join(", ")}), which has no acceptable frame cost (grammar §6.8, v0.2).`,
            suggestion: "Retarget to a transform/opacity/filter property, or use a discrete StateTransition/LayoutTransition instead.",
            clipId: clip.id,
          })
        );
      }

      if (exceedsFlashLimit(clip)) {
        diagnostics.push(
          a11yFlashDiagnostic({
            layerId,
            message: `This clip sustains ~${estimateFlashesPerSecond(clip).toFixed(1)} flashes/second, above the ${3}/second accessibility limit.`,
            suggestion: "Slow the oscillation, reduce its repeat count, or lower its brightness/opacity delta.",
            clipId: clip.id,
          })
        );
      }
    }

    // 6.8: two StateTransitions on the identical <From> -> <To> edge is a hard conflict.
    const transitionsForLayer = Object.values(doc.transitions).filter((t) => t.layerId === layerId);
    for (let i = 0; i < transitionsForLayer.length; i++) {
      for (let j = i + 1; j < transitionsForLayer.length; j++) {
        if (transitionsForLayer[i].from === transitionsForLayer[j].from && transitionsForLayer[i].to === transitionsForLayer[j].to) {
          diagnostics.push(
            staConflictDiagnostic({
              layerId,
              message: `Duplicate StateTransition on the same "${transitionsForLayer[i].from} -> ${transitionsForLayer[i].to}" edge (grammar §6.8).`,
              suggestion: "Merge the two transitions into one, or give one of them a different edge.",
            })
          );
        }
      }
    }
  }

  diagnostics.push(...findReactiveRuleViolations(doc));

  return diagnostics;
}

export const rules = {
  canAdd,
  validate,
  explain,
  suggestFix,
  route: routeAnimation,
};
