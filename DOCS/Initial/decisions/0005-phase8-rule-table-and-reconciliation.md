# Decision 0005: Phase 8 — The Executable Motion Rules Engine (Sub-Phases 8.1, 8.2, 8.3 Stage 1, 8.5)

**Status:** Decided (8.1 core, 8.2 core, 8.3 Stage 1, 8.5 reconciliation). **8.4 (UI contract migration) not started — see §5.** **Date:** 2026-09-26. **Owner:** ROADMAP Phase 8. **Code:** `src/core/rules/` (`types.ts`, `conditional-gates.ts`, `clip-adapter.ts`, `performance.ts`, `accessibility.ts`, `routing.ts`, `diagnostics.ts`, `index.ts`).

Phase 8's goal is one executable rule table that `lazylayout_element_grammer.md` and the animation engine spec both compile into, so the UI, the AI and export all consult the same source. This record covers the reconciliation Sub-Phase 8.5 requires before that table could be built at all (AUD-52), the table itself (8.1), its query API (8.2), and a first, intentionally partial cut of engine routing (8.3).

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

## 4. Query API (Sub-Phase 8.2) and routing (Sub-Phase 8.3, Stage 1)

`rules.canAdd(doc, layerId, candidate?, context?)`, `rules.validate(doc)`, `rules.explain(diagnostic)` and `rules.suggestFix(diagnostic)` operate on the real `MotionDocument` (`doc.layers`, `doc.clips`, `doc.transitions`), not a hand-built `EvaluatedElement`. `rules.validate` emits the four stable diagnostic codes named in the goal statement — `[ANIM_COMPAT]`, `[STA_CONFLICT]`, `[PERF_LAYOUT]`, `[A11Y_FLASH]` (added to `DiagnosticChannel`) — covering: blocked/subsumed/ungated-conditional categories, track-capacity overflow, duplicate `<From>→<To>` StateTransition edges (§6.8), continuous bindings on layout-triggering properties (§6.8 v0.2), and sustained flashing above 3/second (WCAG 2.3.1).

`rules.route(animation)` (`routing.ts`) is explicitly **Stage 1**: it routes today's property catalogue lightest-first (CSS → SVG → three.js for real 3D), and never returns a GSAP backend by construction (`RouteBackend` has no `"gsap"` member) — Phase 14's licence gate (`LICENSES.md` GATE-01) keeps GSAP an export-only target. It does not yet know about device tiers, GPU memory budgets, or the Phase 61 compositor; that full decision tree needs Track X (Phases 59–61), which the execution order (`DOCS/order.md`) places after Phase 8. Extending `routing.ts` when Track X lands is the intended seam.

## 5. What Sub-Phase 8.4 (UI contract) still needs

The ROADMAP asks that the "+" menus, drop targets and property enablement render **only** `rules.canAdd` results, with every ad-hoc compatibility check removed from `src/editor/**`. The one concrete call site found (`ContentBrowser.tsx`, calling `ElementGrammarEngine.evaluatePlusIcon` directly) is not itself ad-hoc — it already delegates to the grammar engine — but it reads from `elementTracks`, the editor's own local component state, which was never wired to `doc.clips`. Migrating it means first connecting that local state to the real document store, a live-UI change this pass did not make: `AGENTS.md` requires verifying UI changes in a running dev server before calling them done, and that verification did not happen in this session. Left as an explicit follow-up rather than an unverified edit.
