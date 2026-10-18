# Changelog fragments

Two people work in parallel (see `DOCS/TEAM/COLLABORATION.md`), and both used to add their entry to the top of `CHANGELOG.md`, so every pair of PRs conflicted. Now **each change writes its own file here**, and nobody edits `CHANGELOG.md` in a phase PR.

## Adding an entry

Create one new file in this folder per PR, named like this:

| Part | Example |
|---|---|
| date (YYYY-MM-DD) | 2026-10-20 |
| lane (a, b or team) | b |
| what | phase-54-transport |
| full name | 2026-10-20-b-phase-54-transport.md |

Write it in the same style as `CHANGELOG.md`'s entries, starting at the `###` level, without the `## [version]` line:

```markdown
### Phase 54 (Transport & one clock): …

One or two sentences on what changed and why.

#### Added
- …

#### Fixed
- …

#### Not done
- …
```

## Folding into CHANGELOG.md

When you want a versioned entry, open a separate PR that runs:

```bash
npm run changelog:fold -- 4.1.0
```

This puts every fragment (oldest first, by file name) under a new `## [4.1.0] — <today>` heading at the top of `CHANGELOG.md`, then deletes the fragments. Fold from an up-to-date `main` so no one's fragment is missing.
