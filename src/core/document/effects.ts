/**
 * ============================================================================
 * SURFACES, INPUT TAPES & EFFECT INSTANCES (MDM, ROADMAP 7.4 – 7.5, types only)
 * ============================================================================
 *   - Surface: where an effect draws (engine spec §7): role, program
 *     reference, fallback chain ending in a poster (Graceful Degradation Law),
 *     cost tier, declared uniforms/params, touch and reduced-motion policies.
 *   - InputTape: signals recorded or authored over time (engine spec §4), so
 *     reactive layers scrub, render and test deterministically (Law 15).
 *   - EffectInstance: a document's use of a library effect by id and version,
 *     storing only prop and binding overrides plus its seed (engine spec §11).
 *
 * The effect *definition* format (7.4) is in `effect-definition.ts`; it is not
 * part of the document. Runtimes: compositor (61), programs (62–65), tapes
 * (59.3), effect SDK (67).
 * ============================================================================
 */

import { z } from "zod";
import { PropValueSchema, ReducedMotionBehaviourSchema, TouchBehaviourSchema } from "./motion";
import { SignalSchema } from "./signals";

const Id = z.string().min(1);
const Finite = z.number().refine(Number.isFinite, "Must be a finite number.");
const Ident = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Must be an identifier (letters, digits, _).");

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export const SURFACE_ROLES = ["background", "inline", "overlay", "cursor", "texture-source"] as const;
export const SURFACE_BACKENDS = ["webgpu", "webgl2", "canvas2d", "svg", "css"] as const;
export const SIM_KINDS = ["fluid", "springLattice", "verlet", "rigid", "metaballs", "reactionDiffusion"] as const;
export const DEVICE_TIERS = ["T0", "T1", "T2", "T3"] as const;

export const ProgramSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("shaderGraph"), ref: z.string().min(1) }),
  z.strictObject({ kind: z.literal("glsl"), ref: z.string().min(1) }),
  z.strictObject({ kind: z.literal("particles"), ref: z.string().min(1) }),
  z.strictObject({ kind: z.literal("sim"), sim: z.enum(SIM_KINDS), ref: z.string().min(1) }),
  z.strictObject({ kind: z.literal("canvas2d"), ref: z.string().min(1) }),
  z.strictObject({ kind: z.literal("css"), ref: z.string().min(1) }),
]);

/**
 * One step of a fallback chain: a backend, optionally naming the authored
 * variant (`css:linear-gradient`), or the terminal `poster`.
 */
export const FallbackStepSchema = z
  .string()
  .regex(new RegExp(`^(?:(?:${SURFACE_BACKENDS.join("|")})(?::[A-Za-z0-9_-]+)?|poster)$`), "A fallback step is a backend (`webgl2`, `css:gradient`, …) or `poster`.");

/** A uniform or simulation/particle parameter the program declares (bindings are checked against it). */
export const ParamDeclSchema = z
  .strictObject({
    name: Ident,
    type: z.enum(["float", "int", "bool", "vec2", "vec3", "vec4", "color"]),
    default: PropValueSchema,
    min: Finite.optional(),
    max: Finite.optional(),
  })
  .refine((p) => p.min === undefined || p.max === undefined || p.min <= p.max, "min must be ≤ max.");

const surfaceShape = {
  role: z.enum(SURFACE_ROLES),
  program: ProgramSchema,
  /** Ordered pass stack: `program`, `feedback`, `post:<name>` (engine spec §7.6). */
  passes: z.array(z.string().regex(/^(program|feedback|post:[a-z][a-z0-9-]*)$/)).optional(),
  fallback: z.array(FallbackStepSchema).min(1),
  cost: z.strictObject({ tier: z.enum(DEVICE_TIERS), estimateMsAt1080p: z.number().min(0).optional() }),
  uniforms: z.array(ParamDeclSchema).optional(),
  params: z.array(ParamDeclSchema).optional(),
  policies: z.strictObject({
    touch: TouchBehaviourSchema,
    reducedMotion: z.strictObject({ mode: ReducedMotionBehaviourSchema, at: z.number().min(0).optional() }),
  }),
  poster: z.strictObject({ at: z.number().min(0) }),
};

function checkSurface(s: { fallback: string[]; uniforms?: { name: string }[]; params?: { name: string }[] }, ctx: z.RefinementCtx) {
  if (s.fallback[s.fallback.length - 1] !== "poster") {
    ctx.addIssue({ code: "custom", path: ["fallback"], message: "A fallback chain must end in `poster` (Graceful Degradation Law)." });
  }
  if (s.fallback.slice(0, -1).includes("poster")) ctx.addIssue({ code: "custom", path: ["fallback"], message: "`poster` can only be the last step." });
  for (const key of ["uniforms", "params"] as const) {
    const names = (s[key] ?? []).map((d) => d.name);
    if (new Set(names).size !== names.length) ctx.addIssue({ code: "custom", path: [key], message: `Duplicate ${key} name.` });
  }
}

/** A surface inside an effect definition (its layer is the template's). */
export const SurfaceBodySchema = z.strictObject({ id: Ident, ...surfaceShape }).superRefine(checkSurface);

/** A surface in a document: drawn by an `effectSurface` layer. */
export const SurfaceSchema = z.strictObject({ id: Id, layerId: Id, ...surfaceShape }).superRefine(checkSurface);
export type Surface = z.infer<typeof SurfaceSchema>;

// ---------------------------------------------------------------------------
// Input tapes
// ---------------------------------------------------------------------------

const SampleValue = z.union([Finite, z.boolean(), z.tuple([Finite, Finite])]);

export const InputTapeSchema = z
  .strictObject({
    id: Id,
    name: z.string().min(1),
    /** `autopilot` and `scripted` tapes are generated from their seed/script; recorded and authored ones store samples. */
    origin: z.enum(["recorded", "authored", "autopilot", "scripted"]),
    duration: z.number().gt(0),
    /** Recording rate, for recorded tapes. */
    fps: z.number().gt(0).max(240).optional(),
    seed: z.number().int().min(0).optional(),
    channels: z.array(
      z.strictObject({
        signal: SignalSchema,
        samples: z.array(z.strictObject({ t: z.number().min(0), v: SampleValue })),
      })
    ),
  })
  .superRefine((tape, ctx) => {
    if (tape.origin === "autopilot" && tape.seed === undefined) ctx.addIssue({ code: "custom", path: ["seed"], message: "An autopilot tape needs a seed." });
    tape.channels.forEach((ch, c) => {
      ch.samples.forEach((s, i) => {
        if (s.t > tape.duration + 1e-9) ctx.addIssue({ code: "custom", path: ["channels", c, "samples", i, "t"], message: "Sample after the tape's end." });
        if (i > 0 && !(s.t > ch.samples[i - 1].t)) ctx.addIssue({ code: "custom", path: ["channels", c, "samples", i, "t"], message: "Sample times must strictly increase." });
      });
      if ((tape.origin === "recorded" || tape.origin === "authored") && ch.samples.length === 0) {
        ctx.addIssue({ code: "custom", path: ["channels", c, "samples"], message: `A ${tape.origin} channel needs samples.` });
      }
    });
  });
export type InputTape = z.infer<typeof InputTapeSchema>;

// ---------------------------------------------------------------------------
// Effect instances
// ---------------------------------------------------------------------------

export const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export const EffectInstanceSchema = z.strictObject({
  id: Id,
  /** The layer the effect is placed on; its template renders inside it. */
  layerId: Id,
  effectId: z.string().regex(/^fx_[a-z0-9_]+$/, "Effect ids look like `fx_aurora_veil`."),
  version: z.string().regex(SEMVER, "Versions are semver (`1.0.0`)."),
  propOverrides: z.record(Ident, PropValueSchema),
  /** Keyed by the definition's binding key; strength scales the binding's output. */
  bindingOverrides: z.record(z.string().min(1), z.strictObject({ enabled: z.boolean().optional(), strength: z.number().min(0).max(2).optional() })),
  seed: z.number().int().min(0),
});
export type EffectInstance = z.infer<typeof EffectInstanceSchema>;
