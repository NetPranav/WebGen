<!-- Rules: DOCS/TEAM/COLLABORATION.md. Title: conventional commit, e.g. "feat(canvas): Phase 25 creation tools". -->

**Lane:** A / B / team
**Phase:** NN · <title> (part N of M, if split)
**Needs (all ✅ on main):** …

## What changed
- …

## You'll see
<!-- The phase's "You'll see" line, and how you checked it in the running editor. -->

## Checklist
- [ ] Branch is `a/` or `b/phase-NN-…` and rebased on the latest `main`
- [ ] Every phase in "Needs" is ✅ on `main`
- [ ] Shared hot spots touched (COLLABORATION §3): none, **or** listed here: …
- [ ] Schema version / decision record / new AUD ID claimed in `DOCS/TEAM/CLAIMS.md` (if any)
- [ ] `npm test`, `npm run lint`, `npm run build` and `npm run test:e2e` pass locally
- [ ] Changelog fragment added in `DOCS/INITIAL/changelog.d/` (`CHANGELOG.md` not edited)
- [ ] ROADMAP rows and entries for this phase updated; AUDIT rows updated if this closes any
- [ ] Phase marked ✅ only if its gate passes in CI
