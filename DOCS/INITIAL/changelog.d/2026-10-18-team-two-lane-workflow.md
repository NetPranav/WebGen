### Team: two-lane workflow for parallel work

Two people now work on the roadmap at the same time, each with their own Claude: **Lane A** takes Phases 13–52 (Stage 1, viewport) and **Lane B** takes Phases 53–102 (Stage 2, animation engine). This adds the rules and tooling that keep them from conflicting.

#### Added
- `DOCS/TEAM/COLLABORATION.md`: lanes, the ten places where Lane B waits on Lane A (with interfaces merged first so it isn't blocked), no folder limits, the shared hot spots, daily merges, and rules for Claude. `CLAUDE.md` imports it, so both assistants load it.
- `DOCS/TEAM/CLAIMS.md` for schema versions, decision-record numbers, and new AUDIT IDs; `DOCS/TEAM/ONBOARDING-LANE-B.md` for the second developer.
- Changelog fragments in `DOCS/INITIAL/changelog.d/`, folded by `npm run changelog:fold -- <version>`, so parallel PRs no longer conflict at the top of `CHANGELOG.md`.
- A pull request template; `CLAUDE.local.md` (per-person lane) is git-ignored.

#### Changed
- `main` changes only through pull requests with green CI, for both people (this replaces direct merges to `main`). Each person merges every day and fixes problems forward.
- ROADMAP §0 rule 7 now points to the two-lane rules.
