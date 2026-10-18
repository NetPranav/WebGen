# Onboarding: Lane B (the animation engine)

Welcome. Your lane is **Phases 53–102** of `DOCS/INITIAL/ROADMAP.md`: Stage 2, which turns LazyLayout into an After Effects-style animation tool. NetPranav works Lane A (Phases 13–52, the Figma/Wix-style viewport) at the same time. There are no folder limits: you can change any file your phase needs. The few rules that keep two people from colliding are in `DOCS/TEAM/COLLABORATION.md`.

## 1. One-time setup

```bash
git clone https://github.com/NetPranav/WebGen.git
cd WebGen
npm ci
npm test            # typecheck + unit tests (both editions)
npm run dev         # editor at http://localhost:3000/editor
```

Then tell your Claude which lane it's in. Create **`CLAUDE.local.md`** in the repo root. It's git-ignored, so it stays on your machine only, and Claude Code loads it automatically:

```markdown
# Local: who I am
I am **Lane B** (Phases 53–102, Stage 2 animation engine).
Branch prefix: `b/`. Follow DOCS/TEAM/COLLABORATION.md.
```

(NetPranav's says Lane A.)

## 2. What exists already

Stage 0 (Phases 1–12) is done and tested. The parts you'll build on most:
- **The document model (MDM v5)**: `src/core/document/`. 216 property paths, geometry, compositions, keyframe/track types. A shared hot spot (COLLABORATION §3): fine to change, just mention it.
- **The evaluation kernel**: `src/core/kernel/evaluate.ts`. Pure `evaluate()`; easing is checked against real GSAP and springs against real Motion. It's not yet used by any editor file. Phase 57 is where it reaches the stage.
- **The rules engine**: `src/core/rules/` (shared hot spot).
- **The legacy timeline**: `src/editor/panels/sequencer/` (the old Sequencer with its own clock). Phase 56 moves playback onto the new clock, and Phase 68 deletes the old panels.

Read in this order: ROADMAP §0–§4 (rules and laws), then Stage 2's intro and Phases 53–60, then `ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md` and decision records 0002, 0004 and 0007 in `DOCS/INITIAL/decisions/`.

## 3. Where to start

1. **Phase 53**: close the animation grammar's schema gaps (AUD-59). It **changes the schema**, so claim the next schema version in `CLAIMS.md` first and tell NetPranav when it merges.
2. **Phases 54–56**: the transport (one clock), the frame scheduler, then moving playback onto it. These need nothing from Lane A.
3. **Phase 57** waits for Lane A's **Phase 19** (`LayerNodeRegistry`). Lane A will merge its interface early so you can build against it. Check COLLABORATION §2 for every waiting point.

## 4. Every session

The step-by-step "where do I push" is in `DOCS/TEAM/COLLABORATION.md` §0. In short: push to your own `b/phase-NN-…` branch, never to `main`, and merge through a PR.

```bash
git fetch origin && git rebase origin/main   # on your phase branch
```

- Branch: `b/phase-NN-short-name`. Open a PR to `main`; CI must be green before it merges. Nobody pushes to `main` directly.
- **Merge every day**: at the end of each day, merge whatever is done and green. If something breaks after a merge, fix it forward.
- Write your changelog entry in `DOCS/INITIAL/changelog.d/`, not in `CHANGELOG.md`.
- Update the ROADMAP index rows and entries for the phase you're working on.
- Changed a shared hot spot (schema, commands, stores, `EditorShell.tsx`, `package.json`)? Say so in the PR and message NetPranav.

## 5. First thing to say to your Claude

> Read `DOCS/TEAM/COLLABORATION.md` and `DOCS/TEAM/ONBOARDING-LANE-B.md`. I'm Lane B. Check what's ✅ on origin/main, then plan Phase 53 for me before writing any code.
