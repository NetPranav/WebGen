# Working Together: Two Lanes, One Repo

**Applies to:** every person and every AI assistant (Claude or otherwise) working in this repo.
**Since:** 2026-10-18. Two people now work at the same time, each with their own Claude.
**Source of truth for the work itself:** `DOCS/INITIAL/ROADMAP.md` (v4). This file only says *who* does *which* phase and *how* to avoid stepping on each other.

> **For Claude:** read this whole file before doing anything. Then find out which lane you are in (§1). If `CLAUDE.local.md` doesn't say, **ask the person before writing code.** Never guess the lane.

---

## 1. The two lanes

| | **Lane A** | **Lane B** |
|---|---|---|
| Who | NetPranav (`@NetPranav`) | `@OVERxPOWERED` |
| Phases | **13–52**: Stage 1, the Figma / Wix-style viewport | **53–102**: Stage 2, the After Effects-style animation engine |
| Branch names | `a/phase-NN-short-name` | `b/phase-NN-short-name` |
| Starts at | Phase 13 (in progress) | Phase 53 |

- **Inside a lane, the phase number is still the order** (Law 18). Take the lowest phase in your lane that isn't ✅.
- A phase may start only when **every phase in its "Needs" line is ✅ on `main`**. This is ROADMAP §0 rule 7, and it's the only thing that links the two lanes. §2 lists every place where it matters.
- Stage 3 onward (103+) isn't assigned yet. Agree on it before either of you starts it.
- Laws 1–20 and the Definition of Done (ROADMAP §3, §4) apply to both lanes. Nothing in this file relaxes them.

## 2. Where Lane B waits on Lane A

Taken from the "Needs" lines in ROADMAP §5. Lane B can do 53–56 straight away.

| Lane B phase | Needs from Lane A | What Lane B actually uses |
|---|---|---|
| 57 Engine adapters & the kernel on the stage | **19** | `LayerNodeRegistry` + the measurement API |
| 61 Timeline workspace: layout | **15** | Workspace presets, the Animate layout |
| 69 Motion paths on the canvas | 40 | Vector paths and their editing |
| 78 States | 33 | Design inspector, Simple face |
| 80 Animated variants | 47 | Variants & component properties |
| 82 Scroll simulator & sections | 48 | Sections & pages |
| 83 Accessible text splitting | 31, 38 | Text on the canvas, fonts |
| 88 Motion per breakpoint | 43 | Breakpoints & overrides |
| 94 Motion export architecture | 49 | Static export v1 |
| 99 Video & audio layers | 36 | Asset store |

**Contract-first, so Lane B isn't stuck:** when Lane A starts a phase in this table (19 and 15 first), Lane A opens a small **contract PR** with only the types and interfaces, plus a stub that throws "not implemented", and merges it fast. Lane B may then write code and tests against that interface. Lane B's phase is still not ✅ until the real Lane A phase is ✅ (Definition of Done).

If Lane B is blocked anyway, pull work forward **inside Lane B** whose Needs are already met. Don't work on Lane A's phases.

## 3. Who owns which files

`.github/CODEOWNERS` enforces this on pull requests. Owning a file means the other person's review is requested when you touch it. It doesn't stop you, but it does warn you.

**Lane A owns:** `src/editor/canvas/`, `src/editor/viewport/`, `src/editor/runtime/` (the stage host), `src/editor/shell/` (except the contract file below), `src/editor/panels/details/`, `src/editor/panels/outliner/`, `src/editor/panels/content-browser/`, `src/compiler/export/` (static export).

**Lane B owns:** `src/core/kernel/`, `src/core/motion/`, `src/core/transport/` (new, Phase 54), `src/core/engine/`, `src/editor/panels/sequencer/`, `src/editor/panels/curves/`, `src/editor/timeline/` (new), and the motion parts of `src/compiler/` (`motion-to-gsap/`, emitters).

**Contract files belong to both of you.** Change them only in their own small PR (§4):
- `src/core/document/`: the MDM schema, `migrations/`, property paths
- `src/core/commands/`: the command registry and its types
- `src/core/store/`: every store
- `src/core/rules/`: the rule table
- `src/editor/shell/EditorShell.tsx`
- `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`
- `.github/`, `scripts/`
- ROADMAP §0–§4 (rules, laws, Definition of Done), and this file

New folders: put them under your lane's area. If something is truly shared, propose it as a contract.

## 4. Changing a contract file

1. **Claim it** in `DOCS/TEAM/CLAIMS.md` (in the same PR is fine).
2. Open a PR with **only** the contract change, labelled `contract`. Keep it small, additive if possible, and with tests.
3. Message the other person. Merge as soon as CI is green and they've seen it. A contract PR shouldn't sit open overnight.
4. Rebase your phase branch on the new `main`, then carry on.

**Schema rule:** never bump the MDM schema version or add a migration without claiming the next number in `CLAIMS.md` first. Two people creating "v6" at the same time is the worst conflict this repo can have.

**Never** rename or delete something in a contract file that the other lane uses without agreeing first. Add the new thing, move your own callers, and delete the old thing in a later PR.

## 5. Day-to-day git

- **`main` only changes through pull requests with green CI.** That applies to both people, admins included, and to direct pushes made on someone's behalf. No force-pushes to `main`.
- One branch per phase, named as in §1. Small PRs: a phase may land as several PRs (e.g. `a/phase-18-stage-host-1`, `-2`).
- **Rebase on `main` at the start of every session** and right before opening a PR:
  `git fetch origin && git rebase origin/main`
- Merging into `main`: use **squash merge** for phase PRs (one clean commit per PR), and keep the PR title in conventional-commit form: `feat(canvas): Phase 25 creation tools`.
- Never rewrite a branch the other person has pulled.
- If a rebase conflicts in the other lane's files, **stop and ask**. Don't resolve their code by guessing.

## 6. Docs without conflicts

The three most-edited files (ROADMAP, CHANGELOG, AUDIT) used to conflict on every parallel phase. Here's how each one is handled now:

| File | Rule |
|---|---|
| `CHANGELOG.md` | **Don't edit it in a phase PR.** Add a new file to `DOCS/INITIAL/changelog.d/` instead (see its README). Fragments are folded into `CHANGELOG.md` by `npm run changelog:fold` in a separate PR. |
| `ROADMAP.md` | Edit **only your own lane's** index rows and phase entries. Status changes go in the same PR as the phase. §0–§4 are contract (§3). |
| `AUDIT.md` | Edit only the AUD rows your phase closes. To add a **new** AUD ID, claim the number in `CLAIMS.md`. |
| `decisions/` | Claim the next record number in `CLAIMS.md` first (the next free number is 0008). |

## 7. Pull request checklist

The PR template (`.github/pull_request_template.md`) asks for this. In short:
- Lane, phase and branch name are right, and every "Needs" phase is ✅ on `main`.
- Contract files touched? Then this is a contract PR (§4), or it links one.
- `npm test`, `npm run lint`, `npm run build` and the Playwright suite pass. CI checks this again.
- There's a changelog fragment, the roadmap rows for your phase are updated, and AUDIT rows are updated if the phase closes any.
- The phase's "You'll see" line is true in the running editor.

## 8. Rules for Claude specifically

1. Know your lane (§1). Work only on phases in your lane, in order.
2. Before starting a phase: `git fetch origin`, check that every phase in its "Needs" line is ✅ on `origin/main`, and check `CLAIMS.md`.
3. Before editing a file outside your lane or a contract file (§3): **stop and tell the person.** Propose a contract PR instead.
4. Never push to `main` or merge a PR unless the person asks. Never use `--force` on a shared branch. Never pass `--admin` to bypass branch protection.
5. Never edit `CHANGELOG.md` directly; write a fragment. Never mark a phase ✅ before its gate passes in CI.
6. Don't add `Co-Authored-By: Claude` trailers to commits or PRs in this repo.
7. When you finish a session, say what's left: the branch, what's done, what's next, and any contract change the other lane should know about.

## 9. Talking to each other

Git can't catch everything, so message the other person when:
- you open a contract PR (§4);
- you finish a phase that's in the §2 table;
- you're about to start something that changes how the editor is laid out or how commands work.

A short message saves an afternoon of merge conflicts.
