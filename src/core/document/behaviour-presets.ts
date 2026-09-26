/**
 * ============================================================================
 * BEHAVIOURS AS BINDING PRESETS (MDM, ROADMAP Phase 7.5)
 * ============================================================================
 * "Behaviour primitives (7.3) are recorded as named binding presets over these
 * types, so there is one reactive model, not two." Every behaviour expands to
 * the bindings (and, where a binding can't say it, the components or clips)
 * that mean the same thing. The Phase 12 runtime runs the expansion; the
 * inspector shows the behaviour; Pro mode can "open" it into its bindings.
 * ============================================================================
 */

import type { Behaviour, ClipTemplate, Lag } from "./schema";
import type { BindingDraft, Operator, SignalExpr } from "./signals";
import type { Component } from "./kinetics";

/** A component without document identity (`id`/`layerId` come from the behaviour). */
export type ComponentDraft = Component extends infer C ? (C extends Component ? Omit<C, "id" | "layerId"> : never) : never;

export interface BehaviourExpansion {
  bindings: BindingDraft[];
  components: ComponentDraft[];
  clips: Omit<ClipTemplate, "id">[];
}

const self = { kind: "layer" as const, ref: "self" };

function lagOperators(lag: Lag): Operator[] {
  if (lag.type === "smooth") return [{ op: "smooth", tau: lag.time }];
  if (lag.type === "spring") return [{ op: "spring", spring: lag.spring }];
  return [];
}

const expr = (signal: SignalExpr["signal"], ...operators: Operator[]): SignalExpr => ({ signal, operators });

export function behaviourToBindings(b: Behaviour): BehaviourExpansion {
  const out: BehaviourExpansion = { bindings: [], components: [], clips: [] };
  switch (b.type) {
    case "follow-pointer": {
      const p = b.params;
      out.bindings.push({
        expr: expr({ kind: "pointerIn", channel: "px", space: p.space }, ...lagOperators(p.lag)),
        target: { kind: "position", on: self, pin: "center", ...(p.axis === "both" ? {} : { axis: p.axis }) },
      });
      break;
    }
    case "magnet": {
      const p = b.params;
      for (const axis of ["x", "y"] as const) {
        out.bindings.push({
          expr: expr(
            { kind: "pointerIn", channel: "px", space: "local" },
            { op: "component", axis },
            { op: "clamp", min: -p.radius, max: p.radius },
            { op: "remap", inMin: -p.radius, inMax: p.radius, outMin: -p.maxOffset, outMax: p.maxOffset, clamp: true },
            { op: "spring", spring: p.spring }
          ),
          target: { kind: "property", on: self, path: `transform.${axis}` },
          blend: "add",
          ...(p.whileHovered ? { guard: { conditions: [{ kind: "state", name: "Hover" }], joins: [] } } : {}),
        });
      }
      break;
    }
    case "tilt": {
      const p = b.params;
      // Pointer right (ndc.x > 0) turns the card right (rotateY +); pointer down (ndc.y > 0) tips it back (rotateX −).
      for (const [axis, path, sign] of [["x", "transform.rotateY", 1], ["y", "transform.rotateX", -1]] as const) {
        out.bindings.push({
          expr: expr(
            { kind: "pointerIn", channel: "ndc", space: "local" },
            { op: "component", axis },
            { op: "remap", inMin: -1, inMax: 1, outMin: -p.maxAngle * sign, outMax: p.maxAngle * sign, clamp: true },
            { op: "spring", spring: p.spring }
          ),
          target: { kind: "property", on: self, path },
          blend: "add",
        });
      }
      break;
    }
    case "proximity": {
      const p = b.params;
      const near = typeof p.near === "number" ? p.near : 1;
      const far = typeof p.far === "number" ? p.far : 0;
      out.bindings.push({
        expr: expr(
          { kind: "proximity", layer: "self", measure: p.measure },
          { op: "falloff", shape: p.falloff, radius: p.radius },
          { op: "remap", inMin: 0, inMax: 1, outMin: far, outMax: near },
          ...(p.spring ? [{ op: "spring" as const, spring: p.spring }] : [])
        ),
        target: { kind: "property", on: self, path: p.property },
      });
      break;
    }
    case "spring-to": {
      const p = b.params;
      if (typeof p.value === "number") {
        out.bindings.push({
          expr: expr({ kind: "constant", value: p.value }, { op: "spring", spring: p.spring }),
          target: { kind: "property", on: self, path: p.property },
        });
      }
      break;
    }
    case "inertia": {
      // Momentum after release is a draggable body (91.2), not a signal chain.
      const p = b.params;
      out.components.push({
        type: "body",
        enabled: b.enabled,
        body: "kinematic",
        mass: 1,
        damping: 1 / p.decay,
        bounciness: 0,
        friction: 0,
        gravityScale: 0,
        rotation: false,
        sleep: true,
        draggable: { throw: true, bounds: p.bounds, ...(p.snap ? { snapPoints: p.snap } : {}) },
      });
      break;
    }
    case "noise": {
      const p = b.params;
      p.targets.forEach((t, i) =>
        out.bindings.push({
          expr: expr({ kind: "time" }, { op: "noise", frequency: p.frequency, amplitude: t.amplitude, seed: p.seed + i }),
          target: { kind: "property", on: self, path: t.property },
          blend: "add",
        })
      );
      break;
    }
    case "loop": {
      // A timed cycle is a looping clip, not a binding.
      const p = b.params;
      out.clips.push({
        name: "Loop",
        type: "loop",
        trigger: "mount",
        duration: p.duration,
        easing: p.easing,
        repeat: -1,
        ...(p.yoyo ? { direction: "alternate" as const } : {}),
        enabled: b.enabled,
        tracks: [
          {
            id: "track_loop",
            property: p.property,
            keyframes: [
              { id: "kf_from", time: 0, value: p.from },
              { id: "kf_to", time: p.duration, value: p.to },
            ],
          },
        ],
      });
      break;
    }
    case "shader-uniform": {
      const p = b.params;
      const [head, channel] = p.source.split(".");
      const signal: SignalExpr["signal"] =
        head === "time" ? { kind: "time" } : head === "scroll" ? { kind: "scroll", channel: "progress" } : { kind: "pointer", channel: channel as "x" | "y" | "speed" };
      out.bindings.push({
        expr: expr(signal, { op: "mul", x: p.scale }, { op: "add", x: p.offset }),
        target: { kind: "uniform", on: self, name: p.uniform },
      });
      break;
    }
  }
  return out;
}
