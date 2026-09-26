# LICENSES.md — Licensing Gate Law Register

> **⚠️ Pending v2 update:** This document still describes Initial Phase v1.1. Where it conflicts with `PRD.md` v2.0.0 or `ROADMAP.md` v2.0.0, those documents win. It will be rewritten in ROADMAP v2 Phase 6.3 (schema content in Phase 2). See `AUDIT.md` for known gaps between this spec and the code.

## What this document is

A **licensing gate** is a dependency whose license terms are ambiguous enough, for how this
product uses it, that shipping a feature on top of it requires a written answer from the
licensor first — not a legal guess baked into the roadmap. This register tracks every gate:
what's blocked, what mitigates it until it's cleared, and who owns closing it.

This is the "answer" referenced by `PRD.md` §12 (Licensing & Risk Register) and
`ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md` §11 — those documents define *why* a gate
exists; this one records the *current status* of each gate, kept current as the log of record.

## Gates

### GATE-01: GSAP "Competitive Products" clause

- **Dependency:** `gsap` (GreenSock Animation Platform), currently `gsap@3.15.0` in
  `package.json`.
- **The question:** The GSAP Standard License has a "Competitive Products" clause. It is not
  settled whether that clause covers a visual animation *authoring* tool like LazyLayout (as
  opposed to an app that merely uses GSAP to animate its own UI). See
  `ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md` §11 for the clause text and draft inquiry.
- **Status:** **Open — not yet sent.** Roadmap Phase 14, Sub-Phase 14.1 ("Send the licensing
  inquiry ... record the answer in `LICENSES.md`") has not started as of Phase 6. No written
  answer exists from GreenSock/Webflow yet. Any claim elsewhere that this is "resolved" is
  false — check this file, not the other docs, for the live status.
- **Mitigation while open:** GSAP does **not** run inside the editor's live preview. The
  preview uses the WAAPI/Motion/kernel adapters instead (AUD-09), and GSAP is available only
  as a code-generation **export target** — the emitted output contains `gsap` import
  statements as text, produced by `src/compiler/emitters/GSAPAnimationEmitter.ts`, but nothing
  under `src/` imports or executes the real `gsap` package at editor runtime today.
- **Licence text (checked 2026-09-26, gsap.com/community/standard-license):** the Standard
  ("no charge") License defines "Prohibited Uses" as "any implementation and/or use of GSAP
  Products in tools that allow users to build visual animations without code that encourages,
  induces, or materially assists in creating a solution that competes with Webflow's visual
  animation building capabilities". The same page's FAQ says AI-generated code is not a
  Prohibited Use. LazyLayout is a tool that lets users build visual animations without code, so
  in-editor GSAP use is inside the prohibited definition unless Webflow consents in writing.
  Whether *generating GSAP code as an export option* is also covered is the open question to put
  to Webflow.
- **Consequence for the roadmap (v3.0):** no default engine route and no library effect may
  require GSAP (ROADMAP Phase 8.3, Phase 14 v3.0 amendment). GSAP is an **opt-in** export
  target while this gate is open. A bundle check proves `gsap` is absent from the editor runtime
  (ROADMAP Phase 85.3).
- **Owner phase:** 14 (`DOCS/Initial/ROADMAP.md` Phase 14, "GSAP Integration
  (License-Gated)"). Closes `AUD-09` (GSAP half), `AUD-28` and `AUD-47` (licence half).
- **Unblocks:** In-editor GSAP preview/authoring (`GsapAdapter`, ScrollTrigger, SplitText,
  MorphSVG/DrawSVG-equivalent, Flip, MotionPath mapping — Sub-Phase 14.2) and the
  `useGSAP()` export hook (Sub-Phase 14.3).

### GATE-02: React Bits and similar reference libraries

- **Dependency:** None installed — these are **inspiration references only**, not runtime
  dependencies. `@react-bits` (or equivalent effect-showcase libraries) are not in
  `package.json`.
- **The question:** These libraries carry their own licenses that may restrict copying their
  source directly into a shipped product.
- **Status:** **Closed by policy, not by installation.** LazyLayout does not depend on or
  vendor code from these libraries. Every effect in the Effects Library (`DOCS/Initial/
  ROADMAP.md` Phase 25, "LazyLayout Bits") is re-implemented from LazyLayout's own primitives;
  the library records the source of an effect's *idea* where one exists, never copies
  third-party code. No license text applies because no third-party code is present.
- **Owner phase:** 25.

### GATE-03: User-imported code components (added 2026-09-26, ROADMAP v3.0)

- **Dependency:** Whatever a user imports as a code component (ROADMAP Phase 68): code they
  wrote, npm packages, or components copied from libraries such as React Bits. React Bits is
  licensed "MIT + Commons Clause": it can be used in applications, including commercially, but
  the components themselves may not be sold or redistributed.
- **The questions:**
  1. Can LazyLayout store, bundle and render such code for the user who imported it?
  2. Can such code ever be shared onward (templates, a marketplace, public share links)?
  3. Does running a user's own GSAP-based component inside the editor's sandbox touch GATE-01?
- **Status:** **Open — policy drafted, not reviewed by counsel.** The draft policy has four
  parts:
  - imported code stays private to the importing user's project;
  - the importer records the declared licence (SPDX or copied licence text);
  - code under terms that forbid redistribution (e.g. Commons Clause) can never be published to
    templates, a marketplace or the hosted registry;
  - LazyLayout never ships third-party effect code in its own library (GATE-02).
- **Mitigation while open:** Phase 68 ships with the draft policy enforced in code (68.5), and
  the licence scanner (Phase 85.1) blocks restrictive licences in LazyLayout's own shipped code.
- **Owner phases:** 68, 85.
- **Unblocks:** publishing imported components beyond the user's own project, if counsel allows
  it for specific licences.

## What is not a gate

- **Motion (`motion/react`, formerly Framer Motion), Three.js, `@react-three/fiber`,
  `@react-three/drei`:** MIT-licensed, no competitive-use restriction, installed and used
  directly with no open question (Phase 5, `DOCS/Initial/decisions/`).
- **The archived C++/Wasm kernel:** Not a licensing gate — its removal (`DOCS/Initial/
  decisions/0001-wasm.md`) was a performance decision (No-Go, mean 0.67x–1.93x vs. the 2x bar),
  unrelated to licensing.
- **Candidates for the effects engine (ROADMAP v3.0), not yet installed:** OGL (Unlicense) as
  a possible 2D WebGL helper (Phase 61.1), and a permissively licensed rigid-body library
  (MIT/Apache-2.0) if one wins the Phase 64.2 benchmark. Each is recorded here with its licence
  before it is used, and the exporter includes its notice (Phase 85.2).

## How to add a gate

When a new dependency or reference library raises a licensing question that blocks a feature:
1. Add a `GATE-NN` entry here with the dependency, the exact question, current status
   (`Open`/`Closed`), the mitigation in effect while open, the owner phase from
   `DOCS/Initial/ROADMAP.md`, and what it unblocks once closed.
2. Reference it from `PRD.md` §12 and from the owning phase's roadmap entry (`Closes:` line).
3. Do not mark a gate `Closed` without a written answer from the licensor on file (or, for a
   policy-based closure like GATE-02, a description of the policy that avoids the question
   entirely). A roadmap phase being "done" does not by itself close a licensing gate.
