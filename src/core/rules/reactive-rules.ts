"use client";

/**
 * ============================================================================
 * PHASE 8, SUB-PHASE 8.1 (v0.2 GROWTH) — RULES 6.9–6.16
 * ============================================================================
 * The grammar's Reactive-category rules (`lazylayout_element_grammer.md`
 * §13.4) that this module implements as static, document-level checks:
 *   - 6.9  Channel Blending: conflicting explicit blend modes on one channel.
 *   - 6.10 Cross-Layer Signals: a signal chain that depends on its own target
 *          (directly or through other bindings) is a cycle — `[SIGNAL_CYCLE]`.
 *   - 6.16 Event Bridging: a `Continuous(...) -> event(...)` edge needs an
 *          upstream `threshold` or `edge` operator.
 * `[INPUT_TOUCH]` (6.11) is checked where the schema can support it today
 * (a binding's owner layer has a `Surface`, whose `touch` field is already
 * schema-required); the schema has no touch field for a plain Reactive layer
 * yet, so that half is named in `REACTIVE_RULE_GAPS`, not silently assumed.
 *
 * 6.12 (target stability), 6.13 (surface budget) and 6.14 (dynamic contrast)
 * are explicitly **not** implemented here: the engine spec's own check-type
 * column marks them "Sampled" or "Runtime", not static — they need frame
 * sampling (Phase 29/71) or device-tier/GPU-budget data (Track X) this
 * module doesn't have. Listed in `REACTIVE_RULE_GAPS` rather than faked with
 * an unreliable heuristic. See decision 0005 §6.
 * ============================================================================
 */

import { bindingLayerRefs, type Binding } from "../document/signals";
import type { MotionDocument } from "../document/schema";
import { inputTouchDiagnostic, signalCycleDiagnostic, animCompatDiagnostic } from "./diagnostics";
import type { RuleDiagnostic } from "./types";

export interface ReactiveRuleGap {
  rule: string;
  note: string;
}

/** What 6.9–6.16 need that this static module can't check — see the header. */
export const REACTIVE_RULE_GAPS: ReactiveRuleGap[] = [
  { rule: "6.11 (partial)", note: "A plain Reactive layer (no Surface) has no schema field to declare a touch behaviour on; only Surface-backed effects (3.F types) are fully checked." },
  { rule: "6.12", note: "Target stability (≤ 12px displacement) needs the binding actually evaluated (springs, clamps); the engine spec marks this check 'Static' but a sound static bound needs operator-range analysis this module doesn't attempt." },
  { rule: "6.13", note: "Surface budget needs device-tier and live GPU-context data (Track X, Phase 61); not available before then." },
  { rule: "6.14", note: "Dynamic contrast needs sampling rendered frames under an input tape (Phase 29/71); this is a runtime/visual check, not a static one." },
  { rule: "6.15 (partial)", note: "Reduced-motion policy is schema-required on every Surface already; a plain Reactive layer with no effect-family default resolvable yet has no fallback to check against." },
];

function resolveRef(ref: string, ownerLayerId: string, doc: MotionDocument): string {
  if (ref === "self") return ownerLayerId;
  if (ref === "parent") return doc.layers[ownerLayerId]?.parentId ?? ownerLayerId;
  return ref;
}

function targetKey(binding: Binding): string {
  const t = binding.target;
  const on = "on" in t ? `${t.on.kind}:${"ref" in t.on ? t.on.ref : t.on.tag}` : "";
  const name = "name" in t ? t.name : "path" in t ? t.path : "pin" in t ? t.pin : "";
  return `${binding.ownerLayerId}::${t.kind}::${on}::${name}`;
}

/** 6.9: two bindings on the identical channel with different *explicit* blend modes conflict. */
export function findBlendConflicts(doc: MotionDocument): RuleDiagnostic[] {
  const byChannel = new Map<string, Binding[]>();
  for (const binding of Object.values(doc.bindings)) {
    if (!binding.enabled || !binding.blend) continue;
    const key = targetKey(binding);
    const list = byChannel.get(key) ?? [];
    list.push(binding);
    byChannel.set(key, list);
  }

  const diagnostics: RuleDiagnostic[] = [];
  for (const bindings of byChannel.values()) {
    const blends = new Set(bindings.map((b) => b.blend));
    if (blends.size > 1) {
      diagnostics.push(
        animCompatDiagnostic({
          layerId: bindings[0].ownerLayerId,
          message: `${bindings.length} bindings target the same channel with conflicting blend modes (${[...blends].join(", ")}) (grammar §6.9).`,
          suggestion: "Give every binding on this channel the same blend mode, or split them onto different targets.",
        })
      );
    }
  }
  return diagnostics;
}

/** 6.10: a signal chain that depends on its own target, directly or transitively. */
export function findSignalCycles(doc: MotionDocument): RuleDiagnostic[] {
  const dependsOn = new Map<string, Set<string>>();
  for (const binding of Object.values(doc.bindings)) {
    if (!binding.enabled) continue;
    const owner = binding.ownerLayerId;
    for (const { ref, role } of bindingLayerRefs(binding)) {
      if (role !== "signal") continue;
      const source = resolveRef(ref, owner, doc);
      if (!dependsOn.has(owner)) dependsOn.set(owner, new Set());
      dependsOn.get(owner)!.add(source);
    }
  }

  function reachesSelf(start: string): boolean {
    const visited = new Set<string>();
    const stack = [...(dependsOn.get(start) ?? [])];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (node === start) return true;
      if (visited.has(node)) continue;
      visited.add(node);
      for (const next of dependsOn.get(node) ?? []) stack.push(next);
    }
    return false;
  }

  const diagnostics: RuleDiagnostic[] = [];
  for (const owner of dependsOn.keys()) {
    if (reachesSelf(owner)) {
      diagnostics.push(
        signalCycleDiagnostic({
          layerId: owner,
          message: "This layer's Reactive signal chain depends on its own target, directly or through other bindings (grammar §6.10).",
          suggestion: "Break the cycle: read a different layer's signal, or remove the binding that feeds back into this one.",
        })
      );
    }
  }
  return diagnostics;
}

const POINTER_DRIVEN_SIGNALS = new Set(["pointer", "pointerIn", "pointerInside", "layerState", "proximity"]);

/** 6.11 (partial): a pointer/hover/proximity-driven binding on a Surface must have that Surface's touch behaviour declared. */
export function findTouchParityViolations(doc: MotionDocument): RuleDiagnostic[] {
  const surfaceByLayer = new Map(Object.values(doc.surfaces).map((s) => [s.layerId, s]));
  const diagnostics: RuleDiagnostic[] = [];
  const flaggedLayers = new Set<string>();

  for (const binding of Object.values(doc.bindings)) {
    if (!binding.enabled || flaggedLayers.has(binding.ownerLayerId)) continue;
    const isPointerDriven = POINTER_DRIVEN_SIGNALS.has(binding.expr.signal.kind);
    if (!isPointerDriven) continue;

    const surface = surfaceByLayer.get(binding.ownerLayerId);
    if (!surface) {
      // No Surface on this layer: the schema has no touch field to check (REACTIVE_RULE_GAPS).
      // A Surface-backed layer's `policies.touch` is already schema-required, so nothing to flag there.
      diagnostics.push(
        inputTouchDiagnostic({
          layerId: binding.ownerLayerId,
          message: "A pointer/hover/proximity-driven Reactive binding has no declared touch behaviour (grammar §6.11): this layer has no Surface, and plain layers have no touch field yet.",
          suggestion: "Wrap this effect in an Effect Surface (which requires a touch behaviour), or mark the reaction decorative-optional.",
        })
      );
      flaggedLayers.add(binding.ownerLayerId);
    }
  }
  return diagnostics;
}

const EDGE_DETECTING_OPS = new Set(["threshold", "edge"]);

/** 6.16: a Continuous(...) -> event(...) target needs an upstream threshold/edge operator. */
export function findEventBridgingViolations(doc: MotionDocument): RuleDiagnostic[] {
  const diagnostics: RuleDiagnostic[] = [];
  for (const binding of Object.values(doc.bindings)) {
    if (!binding.enabled || binding.target.kind !== "event") continue;
    const hasEdgeDetector = binding.expr.operators.some((op) => EDGE_DETECTING_OPS.has(op.op));
    if (!hasEdgeDetector) {
      diagnostics.push(
        animCompatDiagnostic({
          layerId: binding.ownerLayerId,
          message: `A Reactive binding targeting event("${binding.target.name}") has no upstream threshold/edge operator (grammar §6.16): a continuous signal can't fire a discrete event without one.`,
          suggestion: "Add a `threshold(on, off)` or `edge(rise|fall|both)` operator before the event target.",
        })
      );
    }
  }
  return diagnostics;
}

export function findReactiveRuleViolations(doc: MotionDocument): RuleDiagnostic[] {
  return [...findBlendConflicts(doc), ...findSignalCycles(doc), ...findTouchParityViolations(doc), ...findEventBridgingViolations(doc)];
}
