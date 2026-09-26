# Decision 0005: Phase 8 — The Executable Motion Rules Engine

**Status: ✅ Phase 8 complete — Verification Gate passed 2026-09-26.** All of 8.1 (rule table, including the v0.2 Reactive-category/3.F growth), 8.2 (query API), 8.3 (engine routing, with device-tier scoring), 8.4 (UI contract + grep gate) and 8.5 (source reconciliation) are done. **Owner:** ROADMAP Phase 8. **Code:** `src/core/rules/` (`types.ts`, `conditional-gates.ts`, `clip-adapter.ts`, `performance.ts`, `accessibility.ts`, `reactive-rules.ts`, `routing.ts`, `diagnostics.ts`, `index.ts`), `scripts/check-no-adhoc-compat.mts`, `tests/e2e/phase8-rules-engine.spec.ts`.

Phase 8's goal is one executable rule table that `lazylayout_element_grammer.md` and the animation engine spec both compile into, so the UI, the AI and export all consult the same source. This record covers the reconciliation Sub-Phase 8.5 requires before that table could be built at all (AUD-52), the table itself (8.1, including the v0.2 Reactive category), its query API (8.2), engine routing (8.3), and the UI contract migration (8.4).

**Verification Gate, checked 2026-09-26:**
- Grammar §9's full compatibility matrix (32×10, 320 cells) **and** §13.5–§13.6's v0.2 cells (the Reactive column for all 32 types, plus the 7 new 3.F Effect Surface types × 11 categories) are a table-driven test — `src/core/rules/__tests__/compatibility-matrix.test.ts`, 432 assertions, all green.
- The Playwright test "try to add an illegal animation shows the disabled item with a reason" — `tests/e2e/phase8-rules-engine.spec.ts`, green on Chromium, Firefox and WebKit against a real production build.
- Zero compatibility logic remains in editor components — `scripts/check-no-adhoc-compat.mts` (wired into CI's `verify` job), 0 violations across all 151 `src/editor/**` source files.

## 1. Source reconciliation (Sub-Phase 8.5)

`ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md` §7's per-type tables were written independently of `lazylayout_element_grammer.md` §9's compatibility matrix and drifted from it. Per the ROADMAP's instruction, **the grammar wins** in every case; the spec's §7 and §13.5 are corrected to match. Five contradictions, each verified by `src/core/rules/__tests__/reconciliation.test.ts`:

| # | Cell(s) | Grammar §9 (kept) | Engine spec §7 (was wrong) |
|---|---|---|---|
| 1 | Badge × Hover / StateTransition | Hover ❌, StateTransition ✅ | Hover ✅, StateTransition ❌ (exactly swapped) |
| 2 | Spinner | Ambient-only, 1 track | Also allowed Entrance/Exit, 2 tracks |
| 3 | Link / Avatar / Container track caps | 4 / 4 / 5 | 3 / 3 / 4 |
| 4 | Container × Press | ⚠️ conditional (promotion-gated, §7.3.1) | ❌ blocked outright |
| 5 | "Media & Data Elements (6)" (§13.5) | The grammar's 32-type taxonomy has 3 Media types (Video, SVG, Canvas); Table/List/Chart don't exist | §13.5 claimed `Table`, `List`, `Chart` were covered, with no §7 entry ever defining them |

Items 1–3 required no code change: `TYPE_REGISTRY` (`ElementGrammarEngine.ts`) already matched the grammar; only the spec prose was wrong and is corrected in place. Item 4 was a real gap — see §2. Item 5 is a documentation-only fix: Table/List/Chart are compositions of Grid/Stack/Text (grammar §12.4), not new element types, and the spec's checklist is corrected to say so.

## 2. The ⚠️/🔒 tier the type system never modelled

`ElementTypeContract.allowedCategories`/`blockedCategories` (added pre-Phase-8) is a boolean split. Grammar §9 has four cell values: ✅ allowed, ❌ blocked, ⚠️ conditional (gated by a promotion mechanism, §7.3.1/§7.3.2, or a context rule, §7.2.4/§7.4), and 🔒 subsumed (merged into another category, never independently bindable, §6.3/§6.5). The ⚠️ tier was entirely unmodelled — every conditional cell was silently treated as unconditionally `allowed`, including Container's Press (item 4 above), Icon's Hover/Press, Card's Press/Focus, Avatar's Press, SVG's Hover/StateTransition, Checkbox's Entrance/Exit, and Radio's LayoutTransition.

Rather than editing `TYPE_REGISTRY` (risking the existing, passing `ElementGrammarEngine` tests), `src/core/rules/conditional-gates.ts` adds this as an overlay: `getCategoryCompatibilityKind(type, category)` is the single function that returns the true four-value grammar §9 answer, and `passesConditionalGate(type, category, context)` resolves a ⚠️ cell given a `PromotionContext` (explicit promotion via an `"interactive"` layer tag, single-child promotion via parent/children structure, stagger-context, or group-indicator). `rules.canAdd` filters the legacy engine's candidate list through this gate; the legacy engine itself is untouched. `src/core/rules/__tests__/compatibility-matrix.test.ts` asserts all 320 cells (32 types × 10 categories) against a direct transcription of grammar §9.

## 3. The document schema speaks a different vocabulary than the grammar

Phase 7 (`src/core/document/motion.ts`) already shipped the real, schema-validated motion model: `Clip.type` is one of 6 `ClipType`s (`entrance`, `hover`, `tap`, `scroll`, `loop`, `morph`), not the grammar's 10 `AnimationCategory` values, and `Clip.trigger` is one of 10 `Trigger`s, not the legacy 13-value `TriggerType`. These were never reconciled — `ElementGrammarEngine`/`AnimationValidator` (pre-Phase-7) still operate on the older `AnimationBinding`/`ArchetypeId`-track model, disconnected from `MotionDocument`.

`src/core/rules/clip-adapter.ts` is that reconciliation for the cells with a clean mapping (`CLIP_TYPE_TO_CATEGORY`, `TRIGGER_TO_TRIGGER_TYPE`), and an explicit, tested audit trail (`PHASE8_SCHEMA_GAPS`) for the ones without:

- **Exit** has no schema representation — no `ClipType` or `Trigger` distinguishes leaving from entering.
- **Focus** exists as a `Trigger` but not as its own `ClipType`.
- **Stagger** is a modifier (`Clip.stagger` / `Sequence.stagger`), not its own category — it can't appear as a `canAdd` candidate the way grammar's Stagger does.
- **LayoutTransition** has no schema representation at all yet.
- **`pointerMove`/`drag`/`time` triggers** have no lossless equivalent in the legacy `TriggerType` union; `TRIGGER_TO_TRIGGER_TYPE` approximates them (to `Ambient`/`OnPress`) for conflict-checking only, not for authoring semantics.

None of these block `rules.canAdd`/`rules.validate` for the categories that do map — they are tracked here as the next schema amendment, not silently absorbed.

## 4. Query API (Sub-Phase 8.2)

`rules.canAdd(doc, layerId, candidate?, context?)`, `rules.validate(doc)`, `rules.explain(diagnostic)` and `rules.suggestFix(diagnostic)` operate on the real `MotionDocument` (`doc.layers`, `doc.clips`, `doc.transitions`, `doc.bindings`, `doc.surfaces`), not a hand-built `EvaluatedElement`. `rules.validate` emits six stable diagnostic codes — `[ANIM_COMPAT]`, `[STA_CONFLICT]`, `[PERF_LAYOUT]`, `[A11Y_FLASH]`, `[SIGNAL_CYCLE]`, `[INPUT_TOUCH]` (all added to `DiagnosticChannel`) — covering: blocked/subsumed/ungated-conditional categories, track-capacity overflow, duplicate `<From>→<To>` StateTransition edges (§6.8), continuous bindings on layout-triggering properties (§6.8 v0.2), sustained flashing above 3/second (WCAG 2.3.1), Reactive signal cycles (§6.10) and unparitied pointer-driven bindings (§6.11).

`canAddFromBindings(type, bindings, candidate?, context?)` (`index.ts`) is the document-free core `canAdd` wraps: given just a grammar type and its current bindings, it answers the same question. This is what lets a panel not yet wired to the document store (see §5) still route every decision through the rules engine.

## 5. The Reactive category and the 7 Effect Surface types (Sub-Phase 8.1 growth, v0.2)

Grammar §13 (v0.2) adds an 11th `AnimationCategory` (`Reactive`) and 7 new element types (3.F: `EffectSurface`, `ShaderLayer`, `ParticleSystem`, `SimulationLayer`, `CursorLayer`, `TextureSource`, `CodeComponent`). This is now fully in the type system and the rule table, not deferred:

- `AnimationCategory` gains `"Reactive"`, inserted into `CATEGORY_PRIORITY_ORDER` between `StateTransition` and `ScrollLinked` per §13.2 (`Focus > Press > Hover > StateTransition > Reactive > ScrollLinked > Entrance/Exit > Ambient`). `TriggerType` gains `"Continuous"` (§13.1).
- `TYPE_REGISTRY` (`ElementGrammarEngine.ts`) has all 39 entries now (the original 32 plus the 7 3.F types), with `Reactive` added to every existing type's allowed/blocked list per §13.5's column, and the 7 new types' full category contracts per §13.3/§13.6.
- The ⚠️ cells §13.5/§13.6 add two gate kinds `conditional-gates.ts` didn't have: `non-spatial-reactive` (Reactive is legal only on non-transform properties — Input, Badge, Section, Canvas) and `component-declared` (legal only when a Code Component's or Canvas's own controls declare it).
- `src/core/rules/__tests__/compatibility-matrix.test.ts` asserts all of it: the Reactive column for the 32 v0.1 types (32 cells) and the full 11-column matrix for the 7 v0.2 types (77 cells) — 432 assertions total in the file.
- **What this does *not* include:** a working Reactive *runtime*. Grammar §13.2 says as much — "the engine design... lives in `INTERACTIVE_EFFECTS_ENGINE_SPECIFICATION.md`" — and that engine needs Track X (Phases 59–61: Signals & Input Bus, Reactivity, GPU Surface Compositor), which the execution order (`DOCS/order.md`) runs after Phase 8. This phase makes the grammar *compile*; it does not make Reactive bindings *run*.

`src/core/rules/reactive-rules.ts` implements the grammar §13.4 rules that are checkable statically against today's schema: **6.9** (channel blending — conflicting explicit blend modes on one channel), **6.10** (cross-layer signal cycles — a real graph-reachability check over `doc.bindings`, using `bindingLayerRefs`), and **6.16** (event bridging — a `Continuous(...) -> event(...)` target needs an upstream `threshold`/`edge` operator). **6.11** (touch parity) is checked for Surface-backed layers, where `touch` is already schema-required; a plain Reactive layer has no touch field to check, which is named, not silently passed. **6.12** (target stability), **6.13** (surface budget) and **6.14** (dynamic contrast) are explicitly not attempted — the engine spec's own check-type column marks them "Sampled"/"Runtime", needing frame sampling (Phase 29/71) or device-tier/GPU data (Track X) this static module doesn't have. All five gaps are named in `REACTIVE_RULE_GAPS`, tested for presence, not silently assumed away.

## 6. Engine routing (Sub-Phase 8.3)

`rules.route(animation)` (`routing.ts`) routes today's property catalogue lightest-first (CSS → SVG → Canvas2D → WebGL2 → WebGPU → three.js for real 3D), and never returns a GSAP backend by construction (`RouteBackend` has no `"gsap"` member) — Phase 14's licence gate (`LICENSES.md` GATE-01) keeps GSAP an export-only target.

It is scored on two independent axes, both tested: what the properties need (a floor a Pro override may raise but never lower), and what a device tier can sustain (`DEVICE_TIERS`/`MAX_BACKEND_BY_TIER`, FX-PERF-02) — a ceiling that downgrades the choice, with the reason explained, unless the caller explicitly forces past it. No device-tier telemetry exists yet (that's Phase 61's compositor and Phase 84's device matrix); this function is the decision tree those phases call into once it does, already fully scored against the tiers and backends the engine spec names today, not a stub awaiting a rewrite.

## 7. Sub-Phase 8.4: the UI contract

The "+" menus, drop targets and property enablement now render only `rules.canAdd`-family results, with zero ad-hoc compatibility checks left in `src/editor/**` (enforced by `scripts/check-no-adhoc-compat.mts` in CI):

- **`ContentBrowser.tsx`** had two decision points. `evaluatePlusIcon` (the "Grammar Offers" tab) now calls `canAddFromBindings` instead of `ElementGrammarEngine` directly. The **Curated Presets grid** was a real, previously-undetected instance of exactly the ad-hoc pattern this gate exists to catch: it read `activeContract.allowedCategories.includes(cat)` / `.blockedCategories.includes(cat)` directly, which — because it bypassed the conditional-gate overlay entirely — showed Container's Hover/Press/StateTransition presets as unconditionally enabled. Verified live in a running dev server (Playwright against the Content Browser panel): before the fix, those three presets rendered as clickable; after, they render disabled with "Blocked", and clicking one surfaces `"Hover animations aren't allowed on Container"` instead of silently adding an illegal track. This is the exact scenario `tests/e2e/phase8-rules-engine.spec.ts` checks.
- **`AnimationEditor.tsx`** and **`OutputConsole.tsx`** called `AnimationValidator.validateSampleForElement` directly; both now call `validateTrackCompatibility` (a thin `rules` re-export of the same function — Sub-Phase 8.1 already established this engine was correct, so the migration is about having one import path, not new logic).
- `TYPE_REGISTRY` reads for pure metadata display (track-capacity counts, the contract's category label) are unaffected and remain direct — the gate targets compatibility *decisions*, not data lookups.
