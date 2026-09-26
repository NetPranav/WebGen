# Phase 7 Gate: Review Checklist

ROADMAP Phase 7's gate: each reference effect "can be *expressed* as a valid MDM document with no escape hatches (validator passes; review checklist signed)". The documents are built in `src/core/document/__tests__/fixtures/reference-effects.ts`. `src/core/document/__tests__/phase7-gate.test.ts` validates each one and checks it for escape hatches:
- no `generic` layers;
- no free-form object props;
- strict Phase 7 entities;
- every binding round-trips through its text form;
- every document reloads unchanged.

`motion-model.test.ts` plants one mistake at a time in these documents and checks each one is refused, so "valid" means something.

**Reviewer:** tick each row after reading its builder against the "Uses" column. Signature and date at the bottom.

## The 12 (v2 gate)

| # | Effect | Uses | ✓ |
|---|---|---|---|
| 1 | Split-text reveal | Text → Split group (letters, `a11y.label`, hidden source); entrance clip on the group with a first-class stagger (`each`, `targets: children`); tracks `transform.y`, `appearance.opacity`, `filter.blur` | [ ] |
| 2 | Magnet button | Button + `magnet` behaviour: radius, max 12 px (6.12), perceptual spring, while hovered, touch `static`. Expands to two `add`-blended bindings with a `state(Hover)` guard | [ ] |
| 3 | 3D tilt card | Frame + `tilt` behaviour: max angle, perspective, spring, glare. Expands to `rotateX` and `rotateY` bindings | [ ] |
| 4 | Aurora shader background | Instance of `fx_aurora_veil` 1.0.0 on the hero frame (prop and binding overrides, seed). The definition validates: props with descriptions, template, background surface with fallback to poster, affordances, default bindings, states, policies, routing, performance, export | [ ] |
| 5 | Stroke-draw logo | `svgPath` + entrance clip on `svg.strokeDashoffset` (320 → 0) | [ ] |
| 6 | Path morph icon | Icon + hover `morph` clip on `svg.path` (path interpolation), `back.out(1.7)`, direction `alternate` | [ ] |
| 7 | Scroll-parallax image | Image + `scrollProgress` clip, scrubbed `scrollTrigger`, `transform.y` 80 → −80 | [ ] |
| 8 | Dock magnification | Dock of 5 icons tagged `dockItem`; one binding on the dock: `proximity(self, center) \|> falloff(gaussian) \|> remap \|> spring -> tag:dockItem.transform.scale blend multiply` (`self` is each item) | [ ] |
| 9 | Count-up | Text + `content.counter.*` (comma separator, `+` suffix); `inView` clip on `content.counter.value` 0 → 12840 | [ ] |
| 10 | Click spark | Button + overlay particle surface (canvas2d → poster, `count` param); graph: `When Click on Buy → Burst(Sparks, 8)` | [ ] |
| 11 | Orbiting 3D object | Hidden pivot `object3D` with a planet child, camera and light; looping clip on `scene3d.rotation` with quaternion keyframes (slerp) | [ ] |
| 12 | State-machine toggle | Toggle with states Off/On; press transitions with perceptual springs; a per-property tween override on the colour | [ ] |

## The 4 interactive effects (v3.0 amendment)

| # | Effect | Uses | ✓ |
|---|---|---|---|
| 13 | Cursor-reactive shader background | Background surface (GLSL; declared uniforms); bindings `pointer.uv(local) \|> smooth -> Field.uniform.uWarpCenter` and `pointer.inside(parent) \|> smooth \|> mul -> Field.uniform.uWarp`; touch `autopilot` plus an autopilot input tape (seed 42) | [ ] |
| 14 | Dot field with a click shockwave | Spring-lattice simulation surface (declared params); two param bindings and `pointer.down \|> edge(rise) -> event(Shockwave)`; graph: `When Custom(Shockwave) → Impulse(Dots, radial, 5)` with the event declared | [ ] |
| 15 | Fluid splash cursor | Cursor-role fluid surface; `pointer.uv(page)` and `pointer.velocity \|> clamp` param bindings; touch `drag`, reduced motion `off` | [ ] |
| 16 | CTA intensifies the background; click bursts particles | Cross-layer binding `proximity(cta) … -> bg.uniform.uIntensity blend add`; a guarded magnet binding on the CTA; graph: `Click → Burst(sparks, 60), SetState(bg, Excited), Wait(1.2), SetState(bg, Default)` | [ ] |

## The reference build (v3.2 amendment, engine spec §12.7)

| # | Form | Uses | ✓ |
|---|---|---|---|
| 17a | Effector form | Helper ellipse (`render.role: helper`, 120×120) with Follow (pointer, **bottom-centre pin**, spring lag, touch while pressed) and Field (circle, hard edge). Split group of the 10 letters of `LAZYLAYOUT` (tag `letter`, seeded `random`, homes). A Keep-Out effector (margin 6, stays inside the card) and a Jitter effector (±12°) on the group's pieces | [ ] |
| 17b | Blueprint form | The same scene. Colliders (Cursor ↔ Letters masks), a kinematic body on the circle, dynamic letter bodies with home springs (the pieces 73.5 auto-attaches), and **the two rules** as one graph: `OverlapStay → KeepOut(other, 6), AddSpin(other, other.random × 12)`, and `OverlapEnd → SpringHome(other, 180, 14)`. `other.random × 12` is a `GetAttribute` → `Multiply` data chain. A recorded pointer tape lets the build scrub | [ ] |

## Findings from the gate

- **Spec gaps** fixed in engine spec §3 and recorded in decision 0004 §5: `pointer.velocity` was used in §12.3 but not defined, no operator picked one axis of a vector, and `spring-to` had no constant signal.
- **`effectSurface` uses the `Canvas` grammar type** until Phase 8 compiles grammar §13's 3.F types (`TODO(P8)` in `registry.ts`).

Reviewed by: ____________________  Date: __________
