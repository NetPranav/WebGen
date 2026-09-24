# IMPLEMENTATION ROADMAP & MILESTONES — EXISTING PROJECT IMPORT

## Project Name: Visual Web Application Engine — Legacy/Existing Project Import Subsystem
**Internal Codename:** "Salvage Engine"
**Document Version:** 1.0.0
**Status:** Planned — Not Started
**File Location:** `DOCS/ROADMAP_EXISTING.md`
**Relationship to `DOCS/ROADMAP.md`:** This is a standalone phase track, not a renumbering of the main roadmap. It does not modify, reorder, or reopen any phase in `ROADMAP.md`. It is written to be read *alongside* `ROADMAP.md` v3.0.0 and assumes several of its systems already exist (see §2, Dependencies).

---

## 0. Why This Exists, and the One Rule Everything Else Follows

`ROADMAP.md` is entirely about the *forward* direction: prompt or visual action → validated graph → generated code. This document is about the *reverse* direction: arbitrary, already-existing, possibly messy, possibly years-old code → validated graph. That direction is strictly harder, because the input was never constrained by your archetype system, your property matrix, or your node registry — it was written by humans (or other AI) with no awareness that LazyLayout would ever try to read it.

**Reality check before you plan a timeline around this:** a bidirectional sync engine for code *you generated* (Phase 21) is already flagged in your own roadmap as the hardest problem in the project. Importing code you *didn't* generate is the same problem with the difficulty dial turned up, because there is no guarantee the input even has a clean archetype-shaped structure to find. Budget accordingly — this is not a two-sprint feature.

**The one rule that makes this tractable anyway:** the importer is allowed to fail to understand something. It is never allowed to guess and be wrong silently. Every phase below enforces this the same way.

---

## 1. New Architectural Laws (Import-Specific)

These extend, and do not replace, the Architectural Laws in `ROADMAP.md` §2. All five of those still apply. These four are additional and specific to this subsystem.

1. **Fidelity-First Import Law:** If the importer cannot map a piece of existing code to a native archetype, node, or animation sample with high confidence, it must wrap it as an explicit, clearly-labeled passthrough (a `LegacyBlock`, `LegacyFunctionNode`, or `LegacyAnimationBlock` — defined in Phases EX-2, EX-4, EX-5) that continues to render and behave exactly as the original code did. It must never approximate, "clean up," or drop code to force a fit into the native model.
2. **Static-First Analysis Law:** All analysis of imported code must be static (AST-based) wherever possible. Where dynamic analysis is genuinely required (e.g., observing a runtime API response shape), it must execute only inside the existing Phase 13 `SandboxHost` iframe boundary — never on the host machine, never with network access beyond what the sandbox already permits, and never before the Phase 20 Security Gate has scanned the code.
3. **Confidence Scoring Law:** Every automatically classified element, node, schema field, or animation carries a numeric confidence score (0.0–1.0) and a human-readable reason string. Anything below a configurable threshold (default 0.85) is routed to the Import Review Panel (Phase EX-6.2) and treated as a passthrough until a human explicitly promotes it — this is the import-specific instance of the existing No Silent AI Writes Law.
4. **Non-Destructive Origin Law:** The original project directory is never modified in place. Import is a read-then-generate operation against a copy. A user must be able to abandon an import at any point and have the original project completely untouched.

---

## 2. Dependencies & Recommended Insertion Point

This subsystem reuses substantial existing infrastructure rather than duplicating it. Do not start Phase EX-1 until these exist and are verified:

| Existing System (from `ROADMAP.md`) | Why This Subsystem Needs It |
|---|---|
| Phase 2.1 — Database Core & `ArchetypePropertyBindingMatrix` | Target schema for reverse-engineered elements and DB fields |
| Phase 3.1–3.3 — Node Registry, TypeChecker, DAGSorter | Target validation for reverse-engineered logic graphs |
| Phase 5.1–5.2 — NodeScript Grammar & Round-Trip Serializer | Canonical output format; imported graphs must round-trip identically to hand-built ones |
| Phase 9.1 — Motion Track Abstraction Layer | Target format for reverse-engineered animation |
| Phase 13.1 — SandboxHost | Required execution boundary for any dynamic analysis |
| Phase 17.2 — Framework-Agnostic Component IR | Normalization layer between "arbitrary React code" and "LazyLayout's component model" |
| Phase 20.1–20.4 — Security & Compliance Gate | Imported code is untrusted by definition; must be scanned before it is ever rendered or executed |

**Recommended insertion point:** start Phase EX-1 no earlier than immediately after Phase 17.2 is verified complete, and do not attempt Phase EX-3 (database reverse-engineering) until Phase 20.2 (Secret Scanner) exists, since schema introspection frequently touches connection strings and credentials that must be scanned before anything else happens.

---

## 3. Phase Overview

| # | Name | Sub-Phases | Key Deliverable | Status |
|---|---|---|---|---|
| EX-0 | Governing Scope & Supported Input Matrix | 0.1–0.2 | Explicit in/out-of-scope input matrix, confidence threshold config | 📋 PLANNED |
| EX-1 | Project Ingestion & Static Analysis Pipeline | 1.1–1.5 | Whole-project AST + dependency graph + style classification | 📋 PLANNED |
| EX-2 | Archetype Classification & Legacy Passthrough | 2.1–2.4 | Confidence-scored element mapping, `LegacyBlock` fallback, review UI | 📋 PLANNED |
| EX-3 | Database & API Schema Reverse-Engineering | 3.1–3.4 | Prisma/SQL/inferred schema import into Database Studio | 📋 PLANNED |
| EX-4 | Logic & Event Handler Reverse-Engineering | 4.1–4.4 | Pattern-matched node graphs + `LegacyFunctionNode` fallback | 📋 PLANNED |
| EX-5 | Animation & Motion Reverse-Engineering | 5.1–5.4 | GSAP/CSS/Framer Motion import into Animation Samples | 📋 PLANNED |
| EX-6 | Import Orchestration, Fidelity Verification & Review UI | 6.1–6.5 | Import Wizard, confidence dashboard, screenshot-diff proof | 📋 PLANNED |
| EX-7 | Incremental Two-Way Re-Sync (Stretch) | 7.1–7.2 | Ongoing sync with a live external repo during migration | 📋 PLANNED (stretch) |

---

# PHASE EX-0: Governing Scope & Supported Input Matrix

**Goal:** Decide, in writing, exactly what kinds of projects this subsystem promises to handle before any parsing code is written. An importer with an undefined scope will either overpromise or silently misbehave on inputs nobody planned for.

### Sub-Phase EX-0.1: Supported Input Matrix
- [ ] `DOCS/IMPORT_SUPPORTED_INPUTS.md` — explicit table of supported project types for v1: React 18/19 function components, TypeScript or JavaScript, bundled via Next.js (Pages or App Router), Vite, or Create React App
- [ ] Explicit **out of scope for v1** (must fail fast with a clear message, not a partial silent attempt): Vue, Angular, Svelte, class-component-only legacy React (pre-hooks), server-rendered non-JS templating (PHP/Django/Rails views), no-bundler script-tag sites
- [ ] `src/import/detectors/ProjectTypeDetector.ts` — reads `package.json` + config files (`next.config.*`, `vite.config.*`) to classify the project and immediately reject/flag unsupported types before any deeper analysis runs
- [ ] Verify: Pointing the detector at a Next.js project, a Vite project, and an Angular project correctly identifies the first two as supported and the third as an explicit, clearly-worded rejection — not a crash, not a silent partial run.

### Sub-Phase EX-0.2: Confidence Threshold & Import Mode Configuration
- [ ] `src/import/config/ImportConfig.ts` — the 0.85 default confidence threshold from Architectural Law 3 above, user-adjustable per import session, with a warning shown if lowered below 0.6 ("more will be auto-accepted with less certainty")
- [ ] Three import modes exposed to the user: **Conservative** (threshold 0.95, expect more `LegacyBlock`s, safest), **Balanced** (0.85, default), **Aggressive** (0.6, most native nodes, most manual review needed afterward)
- [ ] Verify: Running the same test project through all three modes produces measurably different `LegacyBlock` counts (Conservative ≥ Balanced ≥ Aggressive), proving the threshold is actually load-bearing and not cosmetic.

---

# PHASE EX-1: Project Ingestion & Static Analysis Pipeline

**Goal:** Build the foundational, framework-agnostic understanding of the codebase — file tree, symbol table, dependency graph, and styling approach — that every later phase reads from. Nothing in this phase writes to the LazyLayout project model yet; it only builds an internal analysis snapshot.

### Sub-Phase EX-1.1: Repository Ingestion & Manifest Parsing
- [ ] `src/import/ingest/RepoIngestor.ts` — accepts a local folder path or a Git URL (read-only clone into a temp working directory per the Non-Destructive Origin Law), never operates on the user's live working copy
- [ ] `src/import/ingest/ManifestParser.ts` — parses `package.json`, lockfile (`package-lock.json`/`pnpm-lock.yaml`/`yarn.lock`), and relevant config files to build a `ProjectManifest` object (framework, bundler, TS vs JS, declared dependencies with versions)
- [ ] Verify: Ingesting a 200+ file real-world Next.js repo produces a correct `ProjectManifest` in under 5 seconds, and the original repo directory has zero modified files afterward (checksum comparison before/after).

### Sub-Phase EX-1.2: Universal AST Parser & Project-Wide Symbol Table
- [ ] Use `@babel/parser` (with `jsx` and `typescript` plugins) as the primary parser; for files needing resolved type information (not just syntax), layer `ts-morph` on top rather than reimplementing a type checker
- [ ] `src/import/analysis/AstIndexer.ts` — parses every source file into an AST and builds a project-wide symbol table (every exported function/component/type, and every place it's imported)
- [ ] `src/import/analysis/DependencyGraphBuilder.ts` — builds a directed file-import graph (a `madge`-style dependency graph, either via the `madge` package or an equivalent custom pass over the AST import statements)
- [ ] Verify: The symbol table correctly resolves a component imported under an alias (`import { Card as ProductCard } from...`) to its true declaration across at least 3 levels of re-export indirection.

### Sub-Phase EX-1.3: Component Boundary Detector
- [ ] `src/import/analysis/ComponentDetector.ts` — walks the AST to identify what counts as a "component" (a function or `const` arrow function returning JSX, or a class extending `React.Component`/`React.PureComponent`), tagging class components separately since they need different handling in Phase EX-4
- [ ] Build a component composition tree (which components render which other components) reusing the Outliner's existing hierarchy data model from `ROADMAP.md` Phase 1.6, so the import target structure is identical in shape to a hand-built project's structure
- [ ] Verify: A test fixture with 30 components, including 3 that are conditionally rendered and 2 that are rendered via `.map()`, produces a composition tree with all 30 present and the conditional/repeated ones correctly flagged as such (needed by Phase EX-4.3's control-flow matcher).

### Sub-Phase EX-1.4: Styling System Detector & Design Token Extraction
- [ ] `src/import/analysis/StyleDetector.ts` — classifies each file's styling approach: Tailwind utility classes, CSS Modules, styled-components/emotion, inline `style={{}}` objects, or global CSS/SCSS
- [ ] For Tailwind: resolve the project's actual `tailwind.config.*` via `resolveConfig` from the `tailwindcss` package (not a hardcoded default palette) so extracted tokens match the real project theme
- [ ] For CSS Modules/global CSS: parse with `postcss` + `postcss-selector-parser` to extract color, spacing, and typography values into candidate design tokens for `tokens.css` (`ROADMAP.md` Phase 1.2)
- [ ] Produce a **Style Coverage Report**: percentage of style declarations cleanly tokenized vs. left as raw passthrough CSS attached to the relevant `LegacyBlock`
- [ ] Verify: Running against a project mixing Tailwind and one hand-written CSS file produces a coverage report correctly attributing each style declaration to its source method, with zero declarations unaccounted for.

### Sub-Phase EX-1.5: Ingestion Snapshot & Caching
- [ ] `src/import/analysis/IngestionSnapshot.ts` — serializes the complete EX-1.1–1.4 output (manifest, symbol table, dependency graph, component tree, style report) to a single cached artifact so later phases (and re-runs during development) don't re-parse the whole project every time
- [ ] Verify: Re-running Phase EX-2 against a cached snapshot from an unchanged project completes without re-invoking the parser, confirmed via a parse-call counter in tests.

---

# PHASE EX-2: Archetype Classification, Confidence Scoring & Legacy Passthrough

**Goal:** Map each detected component (from EX-1.3) onto the existing archetype system from `ROADMAP.md` Phase 2.1 — or, where that mapping isn't confident, wrap it safely instead of forcing it.

**Worked example — what this phase actually decides:**
```
// Existing code found during import:
function PriceTag({ amount, currency = "USD", onSale }) {
  return (
    <span className={onSale ? "text-red-500 line-through" : "text-gray-900"}>
      {currency} {amount.toFixed(2)}
    </span>
  );
}
```
High confidence (0.93) → classified as a **Text archetype** with a conditional style binding, because it's a single JSX element returning formatted text with no unrecognized hooks, refs, or side effects. It becomes a native element with a `DataBindingEditor`-compatible conditional style rule (Phase 2.5), not a passthrough.

```
// Existing code found during import:
function ChartWidget({ data }) {
  const ref = useRef(null);
  useEffect(() => {
    const chart = new SomeChartingLib(ref.current, { data, plugins: [customPlugin] });
    return () => chart.destroy();
  }, [data]);
  return <div ref={ref} />;
}
```
Low confidence (0.12) → wrapped as a **`LegacyBlock`**, because it depends on an unrecognized third-party library, direct DOM ref manipulation, and imperative lifecycle logic that has no native archetype equivalent. It keeps rendering and functioning exactly as before; it just isn't editable via the visual canvas yet.

### Sub-Phase EX-2.1: Archetype Classifier & Confidence Model
- [ ] `src/import/classify/ArchetypeClassifier.ts` — rule-based classifier checking, per component, against a decision tree: single-element text return → Text; single `<img>`/`<Image>` return → Image; single interactive element with an `onClick` and no unrecognized hooks → Button; return containing only recognized primitives and a `.map()` over a prop → Container/List Repeater; anything using an unrecognized hook, external ref, direct DOM API, or unregistered third-party render library → automatic fallback
- [ ] Confidence scoring formula documented in `DOCS/IMPORT_CONFIDENCE_MODEL.md`: starts at 1.0, deducted for each risk factor (unrecognized import: −0.3, direct DOM/ref usage: −0.4, class component: −0.2, dynamic prop spreading `{...props}`: −0.15, more than one return statement/branch: −0.1 per additional branch)
- [ ] Verify: The two worked examples above produce scores matching the stated values (±0.05) when run through the actual scoring formula, not just asserted in documentation.

### Sub-Phase EX-2.2: `LegacyBlock` Archetype & Safe Wrapping
- [ ] Extend `src/core/types/details.ts` (from `ROADMAP.md` Phase 1.7) with a new archetype: `LegacyBlock` — carries the original, unmodified source code, its resolved prop types (via `ts-morph`), and a `confidenceReason` string for display
- [ ] `LegacyBlock` renders in Play Mode (Phase 13) exactly as the original component would — no re-implementation, no simplification, the original code executes as-is inside the sandbox
- [ ] `LegacyBlock` appears in the Outliner and Details panel like any other element, but its Details panel shows source code (read-only) instead of the usual property sections, with a visible "Not yet promoted to native — see Import Review" badge
- [ ] Verify: A `LegacyBlock`-wrapped component with internal state (a counter using `useState`) behaves identically in Play Mode before and after import — click-to-increment still works, because the original code, not a reconstruction, is what's running.

### Sub-Phase EX-2.3: Property Extraction & Access Matrix Fit-Test
- [ ] For components classified above the confidence threshold, `src/import/classify/PropertyExtractor.ts` extracts observed prop usage and tests each against the existing `ArchetypePropertyBindingMatrix` (Phase 2.1)
- [ ] Violations (a prop assigned a type the matrix doesn't allow for that archetype) don't crash the importer — they route to the `DiagnosticBus` as `[IMPORT_BIND_WARN]` and downgrade that specific component's confidence score below threshold, converting it to a `LegacyBlock` rather than importing an invalid binding
- [ ] Verify: A component whose classification would otherwise pass, but which assigns a relational array to a Text archetype's `textContent` prop, is correctly caught here and demoted to `LegacyBlock` rather than producing an invalid native element.

### Sub-Phase EX-2.4: Import Review Panel — Manual Reclassification
- [ ] New panel: `src/editor/panels/import/ImportReviewPanel.tsx` — lists every component below the confidence threshold, its confidence reason, and a live preview
- [ ] Per-item actions: **Accept as LegacyBlock** (default, safe), **Suggest reclassification** (AI proposes a specific archetype + property mapping, shown as an explicit diff the user must approve — reuses the `GraphDiffModal` pattern from `ROADMAP.md` Phase 6.5, not a new mechanism), or **Manually map** (human directly assigns archetype and property bindings)
- [ ] Verify: Reclassifying a `LegacyBlock` to a native archetype through this panel produces a component that then passes the same TypeChecker/property-matrix validation as a component that was always native — no separate "imported" code path downstream.

---

# PHASE EX-3: Database & API Schema Reverse-Engineering

**Goal:** Reconstruct a Database Studio (Phase 2.5) schema from whatever data-access pattern the existing project actually uses — in descending order of fidelity: an explicit ORM schema, a raw SQL schema, or, absent either, inference from API call shapes.

### Sub-Phase EX-3.1: Prisma Schema Direct Import (Highest Fidelity)
- [ ] `src/import/database/PrismaSchemaImporter.ts` — if `schema.prisma` exists, parse it using `@prisma/internals`' `getDMMF` (the same machinery Prisma itself uses, not a hand-rolled regex parser) to get a fully-typed, relation-aware model with zero guessing
- [ ] Map the resulting DMMF directly onto the Phase 2.1 database core types — this path requires no confidence scoring, since the schema is already explicit and typed
- [ ] Verify: Importing a Prisma schema with a 1:N and an N:M relation produces Database Studio entities with identical cardinality, confirmed against the original schema's relation attributes.

### Sub-Phase EX-3.2: Raw SQL / Live Database Introspection (Medium Fidelity)
- [ ] For projects with only SQL migration files or a reachable connection string and no Prisma schema, use `@prisma/internals`' introspection engine (`prisma db pull` programmatically) against a **read-only** connection — never a write-capable one, and only after the Phase 20.2 Secret Scanner has confirmed the connection string isn't being logged or exposed anywhere in the process
- [ ] Fields introspected this way (column types, nullability, foreign keys) get confidence 0.95 (explicit DB metadata); anything requiring inference (e.g., a `varchar` column that's actually always JSON-encoded) gets flagged separately at lower confidence
- [ ] Verify: Introspecting a live Postgres test database with 3 tables and a foreign key produces a schema matching `information_schema` output for those same tables, cross-checked directly.

### Sub-Phase EX-3.3: Schemaless API Shape Inference (Lowest Fidelity, Always Flagged)
- [ ] For projects with no ORM/DB access at all — only `fetch`/`axios` calls to external APIs — first attempt static inference from TypeScript response types already present in the code (`ts-morph` type resolution on the call site)
- [ ] If the code is untyped, fall back to dynamic inference: run the relevant network call **inside the Phase 13 SandboxHost only**, capture the actual JSON response shape once, and infer a schema from it — this result is *always* presented to the user as "inferred from one observed response, please confirm" regardless of how confident the shape inference itself is, since a single sample can't prove a field is always present or always that type
- [ ] Verify: Given an untyped `fetch("/api/products")` call, the importer produces a candidate schema matching the shape of a sample response, and that schema is never auto-committed to Database Studio without passing through the Import Review Panel (EX-2.4's mechanism, reused here).

### Sub-Phase EX-3.4: Relation & Foreign Key Reconciliation
- [ ] `src/import/database/RelationReconciler.ts` — cross-references fields named consistently with foreign-key conventions (`userId`, `user_id`) against actual query patterns found in EX-4's logic analysis, upgrading a plain scalar field to a formal `Relation` type when the evidence supports it
- [ ] Verify: A field called `authorId` that is consistently used to look up a `users` table entity across 5 different query sites is correctly upgraded to a Relation, while a similarly-named field used only for display (never queried against) is correctly left as a plain scalar.

---

# PHASE EX-4: Logic & Event Handler Reverse-Engineering into Node Graphs

**Goal:** Convert recognizable imperative logic (event handlers, data fetching, simple control flow) into native Logic Blueprint graphs (`ROADMAP.md` Phase 3), while safely containing anything that doesn't decompose cleanly.

### Sub-Phase EX-4.1: Event Handler Extractor
- [ ] `src/import/logic/EventHandlerExtractor.ts` — statically locates `onClick`, `onSubmit`, `onChange`, and `useEffect` bodies attached to already-classified native archetypes (from Phase EX-2), skipping anything already inside a `LegacyBlock` (its logic stays with it, untouched, by definition)
- [ ] Verify: A `<button onClick={handleSave}>` on a native Button archetype correctly locates and extracts the `handleSave` function body as the next stage's input.

### Sub-Phase EX-4.2: Control Flow Pattern Matcher
- [ ] `src/import/logic/PatternMatcher.ts` — a fixed, extensible catalog of recognizable patterns, each mapping to existing Phase 3.1 node types: a `fetch`/`axios` call → `api/request` node; a `useState` setter call → `variables/set` node; an `if/else` → `flow/branch` node; a `.map()` render → `Container/List Repeater` binding (cross-checked with EX-1.3's flagged repeated components); a `router.push`/`navigate()` call → `navigation/push` node
- [ ] Each matched pattern is wired into a graph using the existing `ASTManager` (Phase 3.3) directly — not a separate graph builder — so the result is indistinguishable from a hand-built graph once complete
- [ ] Verify: A `handleSave` function containing a fetch call wrapped in try/catch, followed by a navigation call on success, produces a 4-node graph (`api/request` → success/error branch → `navigation/push` on success) that passes the existing TypeChecker with zero errors.

### Sub-Phase EX-4.3: `LegacyFunctionNode` — Unmatched Logic Passthrough
- [ ] New node type registered alongside the built-ins from Phase 3.1: `LegacyFunctionNode` — input/output pins inferred from the original function's parameter and return types (via `ts-morph`), body is the original, unmodified source function, executed as-is at runtime
- [ ] Any function body the Pattern Matcher can't fully decompose becomes one `LegacyFunctionNode` rather than a partial, potentially-incorrect graph — partial decomposition is explicitly disallowed here, since a graph that's "70% translated" is more dangerous than one that's honestly a single opaque box
- [ ] Verify: A function containing a recognizable fetch call followed by a complex, non-standard reducer-style state update is wrapped as a single `LegacyFunctionNode` in its entirety — not split into "the part we understood" and "the part we didn't."

### Sub-Phase EX-4.4: NodeScript Emission & Round-Trip Verification for Imported Graphs
- [ ] Every graph produced by EX-4.2 and every `LegacyFunctionNode` from EX-4.3 must serialize through the existing Phase 5.2 `Serializer` and pass the same round-trip property test (`serialize(parse(x)) === x`) used for native graphs — imported logic gets zero exceptions to the AI-Native Parity Law
- [ ] Verify: Running the full Phase 5.2 round-trip test suite against a corpus of 50 imported (not hand-built) graphs passes 50/50, identical to the native-graph acceptance bar.

---

# PHASE EX-5: Animation & Motion Reverse-Engineering

**Goal:** Recover animation intent from whatever library the existing project actually used, in descending fidelity order, feeding into the existing Animation Sample model and Unified Motion Compiler (`ROADMAP.md` Phases 2.3 and 9).

### Sub-Phase EX-5.1: GSAP Call Detector (Highest Fidelity)
- [ ] `src/import/motion/GsapImporter.ts` — directly parses `gsap.to/from/fromTo/timeline` and `ScrollTrigger.create` calls via AST pattern matching (not regex on source text, to correctly handle multi-line calls and variable-referenced configs)
- [ ] Maps recovered tween properties and easing directly onto native Animation Samples — this is close to 1:1 with the existing model, so confidence here defaults high (0.9+) unless the call references a runtime-computed value the static analyzer can't resolve
- [ ] Verify: A `gsap.to(".card", { y: -20, opacity: 1, duration: 0.6, ease: "power2.out" })` call produces an Animation Sample with matching track values, confirmed by direct field comparison.

### Sub-Phase EX-5.2: CSS Animation & Transition Extractor
- [ ] `src/import/motion/CssAnimationImporter.ts` — parses `@keyframes` blocks and `transition` shorthand properties (via the same `postcss` pipeline from EX-1.4) into equivalent Animation Samples
- [ ] Verify: A `@keyframes fadeIn` block with 3 keyframe stops produces an Animation Sample with 3 correctly-timed keyframes matching the original percentage offsets.

### Sub-Phase EX-5.3: Framer Motion / React Spring Adapter
- [ ] `src/import/motion/FramerMotionImporter.ts` — pattern-matches `motion.*` JSX tags and their `initial`/`animate`/`exit`/`transition` props into the closest native Animation Sample equivalent
- [ ] Explicitly flags (does not attempt to convert) Framer-specific features with no native equivalent yet: `AnimatePresence` layout animations, `layoutId` shared-element transitions, drag gestures — these remain inside a `LegacyBlock`/`LegacyAnimationBlock` with a specific compatibility note naming the unsupported feature, not a generic "unsupported" message
- [ ] Verify: A `motion.div` with a simple `animate={{ opacity: 1, x: 0 }}` converts to a native Animation Sample; a sibling using `AnimatePresence` is correctly left untouched with a note naming that specific API.

### Sub-Phase EX-5.4: `LegacyAnimationBlock` — Unmappable Animation Passthrough
- [ ] Arbitrary `requestAnimationFrame` loops, Lottie file usage, or canvas-based animation are wrapped as a `LegacyAnimationBlock` — same non-destructive principle as `LegacyBlock`: it keeps running exactly as authored, just isn't editable in the Timeline Sequencer (Phase 10) until manually reauthored
- [ ] Verify: A component using a raw `requestAnimationFrame` loop for a canvas particle effect renders and animates identically in Play Mode before and after import.

---

# PHASE EX-6: Import Orchestration, Fidelity Verification & Review UI

**Goal:** Tie EX-1 through EX-5 together into an actual user-facing workflow, with proof — not just a claim — that the import didn't break anything.

### Sub-Phase EX-6.1: Import Wizard & Scope Selection
- [ ] `src/editor/panels/import/ImportWizard.tsx` — lets the user import a whole repository, a single route/page, or a single component, rather than forcing all-or-nothing (large real projects should be imported incrementally, page by page)
- [ ] Verify: Selecting "import this page only" against a 50-page project analyzes and imports only the selected page's component tree, confirmed by checking that unrelated pages produce zero entries anywhere in the resulting project.

### Sub-Phase EX-6.2: Import Confidence Dashboard
- [ ] Single summary panel, per imported scope: percentage cleanly mapped to native elements/nodes/animations vs. percentage left as `LegacyBlock`/`LegacyFunctionNode`/`LegacyAnimationBlock`, with drill-down to each flagged item (feeds into the EX-2.4 Import Review Panel)
- [ ] Verify: The dashboard's reported percentages match an independent count of native vs. legacy nodes in the resulting project AST — the dashboard must reflect ground truth, not an estimate.

### Sub-Phase EX-6.3: Security Gate Pass on Import
- [ ] Every imported project runs through the existing Phase 20.2 (Secret Scanner) and Phase 20.4 (Dependency Audit) immediately on ingestion, before any imported code is rendered or executed anywhere in the editor — imported code is untrusted third-party-origin code by definition, gate applies with no exceptions
- [ ] Verify: A test fixture with a deliberately planted fake API key in a `.env.local` file is caught by the scanner before the import wizard proceeds past the ingestion step, not after.

### Sub-Phase EX-6.4: Side-by-Side Fidelity Verification (Screenshot Diff)
- [ ] Render the imported result inside the Phase 13 Play Mode sandbox and diff it pixel-for-pixel against the original project running standalone (via Playwright headless render + `pixelmatch`), reusing the Phase 13.4/24.2 visual diff engine rather than building a second one
- [ ] Verify: An import with zero `LegacyBlock`s (fully native) produces a visual diff under 1%, matching the same parity bar already established for production-vs-Play-Mode in Phase 13.4; an import with `LegacyBlock`s still produces the same low diff, since those blocks render their original code unchanged.

### Sub-Phase EX-6.5: Post-Import Promotion Workflow
- [ ] A clear, explicit user action ("Promote to Native") is required before any `LegacyBlock`/`LegacyFunctionNode`/`LegacyAnimationBlock` converts to an editable native representation — AI may suggest a mapping (reusing the EX-2.4 diff-review mechanism), but never applies it automatically
- [ ] Verify: No code path exists where a Legacy-wrapped element becomes natively editable without this explicit promotion step having fired — audited the same way `ROADMAP.md` Phase 6.5 audits its own approval gate.

---

# PHASE EX-7: Incremental Two-Way Re-Sync With a Live Original Repo (Stretch)

**Goal:** Real migrations are rarely a single cutover. This phase is explicitly lower priority than EX-0 through EX-6 and should only be attempted once those are proven on real projects — flagged the same way `ROADMAP.md` treats its Flutter emitter (Phase 34.3) relative to React Native (34.2): a stretch goal contingent on the core approach working first.

### Sub-Phase EX-7.1: Change Detection Against the Original Repo
- [ ] Detect when the original external repo has changed (new commits) after a partial import, and diff those changes against what was already imported
- [ ] Verify: A change to a file that was already fully promoted to native nodes correctly surfaces as a conflict requiring manual resolution, not a silent overwrite in either direction.

### Sub-Phase EX-7.2: Selective Re-Import of Changed Scope Only
- [ ] Re-run EX-1 through EX-6 scoped only to changed files, reusing the EX-1.5 cached snapshot for everything unchanged
- [ ] Verify: Re-importing after a change to 2 out of 50 files re-analyzes only those 2 files, confirmed via a parse-call counter, matching the caching guarantee established in EX-1.5.

---

## Definition of Done (per Sub-Phase) — Import-Specific Additions

A sub-phase in this document is complete when it meets `ROADMAP.md` §9's existing criteria (all checklist items done, verification passes, no regressions, tokens not hardcoded), **plus**:

9. Every classification, mapping, or inference this sub-phase produces carries a confidence score and reason string per the Confidence Scoring Law — no unscored automatic decisions.
10. Nothing this sub-phase produces modifies the original source project on disk, per the Non-Destructive Origin Law.
11. Anything this sub-phase cannot confidently map is verified to render/behave identically to the original via a passthrough mechanism — not verified merely by the absence of a crash.