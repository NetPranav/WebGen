---
name: run-editor
description: Launch the LazyLayout editor on localhost and drive it in headless Chromium (Playwright) to smoke-test the editor, palettes, co-pilot, sequencer, live code and Blueprint canvas; optionally run an older commit side by side on :3001 to diff behaviour.
---

# Run & drive the LazyLayout editor

Verified on macOS (Node 26, Next 16.3.4) on 2026-09-24.

## 1. Playwright (once per machine, outside the repo)

Playwright is **not** a project dependency (Phase 4 adds the real harness). Install it in a scratch dir:

```bash
export PW_DIR="${TMPDIR:-/tmp}/lazylayout-pw"
mkdir -p "$PW_DIR" && (cd "$PW_DIR" && npm init -y >/dev/null && npm i playwright >/dev/null && npx playwright install chromium)
```

## 2. Dev server

```bash
lsof -ti:3000 -sTCP:LISTEN | xargs kill 2>/dev/null   # free the port first
(npm run dev > "${TMPDIR:-/tmp}/lazylayout-dev.log" 2>&1 &)
for i in $(seq 1 60); do curl -sf -o /dev/null http://localhost:3000/editor && break; sleep 1; done
```

macOS has no `timeout`; use the loop above. Stop with the same `lsof … | xargs kill`.

## 3. Smoke test

```bash
PW_DIR="$PW_DIR" node .claude/skills/run-editor/smoke.mjs http://localhost:3000 "${TMPDIR:-/tmp}/lazylayout-smoke" new
```

It prints one line per step with any console errors, exits non-zero on failure, and saves screenshots per step. **Look at the screenshots**; a step can "pass" while showing the wrong thing.

## 4. Compare against an older commit (regression hunting)

Run the old build on :3001 from a git worktree. **Use `--webpack`**: Turbopack refuses a symlinked `node_modules` ("Symlink [project]/node_modules is invalid, it points out of the filesystem root").

```bash
OLD="${TMPDIR:-/tmp}/lazylayout-old"
git worktree add "$OLD" <commit>
ln -sf "$PWD/node_modules" "$OLD/node_modules"
(cd "$OLD" && npx next dev --webpack -p 3001 > "${TMPDIR:-/tmp}/lazylayout-old.log" 2>&1 &)
for i in $(seq 1 90); do curl -sf -o /dev/null http://localhost:3001/editor && break; sleep 1; done
PW_DIR="$PW_DIR" node .claude/skills/run-editor/smoke.mjs http://localhost:3001 "${TMPDIR:-/tmp}/lazylayout-smoke" old
# cleanup
lsof -ti:3001 -sTCP:LISTEN | xargs kill; rm -rf "$OLD/.next"; git worktree remove --force "$OLD"
```

To bisect a regression to one file, temporarily `git show <old>:<path> > <path>` in the main tree (the dev server hot-reloads), re-run, then restore the file.

## App-specific gotchas (all hit in practice)

- **Keyboard shortcuts** (EditorShell): Ctrl+K command palette · Ctrl+Shift+F global search · Ctrl+Shift+I LazyLayout AI panel (docks directly; Window → LazyLayout AI starts the drag-to-dock gesture instead) · Ctrl+Shift+M sequencer · Ctrl+Shift+G live code. The handlers accept `ctrlKey`, so `Control+…` works in headless Chromium on macOS.
- **Search input:** `fill()` the `input[placeholder^="Find across"]` rather than typing into it.
- **Focus lands in the sandbox iframe** after navigating to an element; click the "LazyLayout" logo before sending the next shortcut.
- **Blueprint canvas** isn't a visible editor tab; open `/editor/detach/blueprint`. Wires are painted on `<canvas>`; the `svg path` elements are transparent hit areas, so check canvas pixels (`getImageData`), not SVG `d` attributes.
- `Mount Showcase Demo` populates the project (BuyButton, pages, graph) and is needed for search/AI steps. Its header button is icon-only below 1200px wide; select it by `aria-label` / `#header-toggle-demo-btn`.
- The console warning about `allow-scripts` + `allow-same-origin` on the sandbox iframe is expected.
