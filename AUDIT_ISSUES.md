# Audit: issues found in Phases 0–29 (temporary file: delete when every row is Solved)

Found by probing (unit probes, a fuzzer over document and editing commands, browser journeys, a keybinding sweep, code reading).
Kind: **L** = logic (wrong behaviour, bad state, data loss), **P** = performance, **T** = test or tooling, **U** = UI-facing.
Severity: **H** = data loss, a stuck editor or a security gap; **M** = wrong result a person can hit; **L** = rare or cosmetic.
Status: Open / Solved.

| # | Area (phase) | Issue | Kind | Sev | Status |
|---|---|---|---|---|---|
| 1 | Selection (26) | The selection keeps ids of layers that no longer exist (after undo, redo, delete, a frame removed) | L | M | Open |
| 2 | Commands (13) | The `selection.count` context key is declared but nothing ever updates it | L | L | Open |
| 3 | Editing (29) | Delete, Cut, Duplicate, Nudge, Group act on locked layers if they are selected by command | L | M | Open |
| 4 | Editing (29) | Editing shortcuts (Delete, nudge, duplicate, group, arrange) still run in Preview mode | L | H | Open |
| 5 | Tools (24) | A window blur or lost pointer mid-drag leaves `gesturing` on: Escape and the edit shortcuts stay dead | L | M | Open |
| 6 | Tools (25) | Escape does not cancel a creation-tool drag (the shape is created on release) | L | L | Open |
| 7 | Document (3) | Undo or redo while a drag transaction is open corrupts history and the document | L | H | Open |
| 8 | Document (3) | `jumpTo` loops forever if an undo makes no progress | L | M | Open |
| 9 | Camera (20) | A saved camera's zoom is not clamped to 2%–6,400% on load | L | M | Open |
| 10 | Camera (20) | NaN or Infinity can enter the camera (zoom anchor, setCamera) and blank the whole canvas | L | H | Open |
| 11 | Hit-testing (22) | With overlapping frames a click picks a child of the frame underneath, ignoring frame paint order | L | M | Open |
| 12 | Frames (21) | `moveFrame` re-spaces every frame into one row and ignores `frame.y` | L | M | Open |
| 13 | Frames (21) | Deleting a top-level frame can leave a page's `rootElementId` pointing at nothing | L | M | Open |
| 14 | Frames (21) | A lone empty frame is not drawn, so in a new project no shape tool can draw until a frame is made | U | M | Open |
| 15 | Guides (28) | The number of guides on a frame is unbounded (a hostile file can store 100,000) | L | L | Open |
| 16 | Geometry (25–28) | NaN or Infinity flows through `dragBox`, `unionBox`, `nextFramePosition` into layer properties | L | M | Open |
| 17 | Persistence | Per-project camera keys in localStorage are never removed when a project is deleted | L | L | Open |
| 18 | Transform (27) | A pure move also writes `frame.width` and `frame.height`, turning hug-sized layers into fixed ones | L | M | Open |
| 19 | Clipboard (29) | Copying more than 5,000 layers produces a clipboard that silently pastes nothing | L | M | Open |
| 20 | Document (2) | `createId` is 32 bits: duplicate and paste of large documents can collide | L | M | Open |
| 21 | Document (3) | `insertLayers` overwrites an existing layer that has the same id, without a check | L | H | Open |
| 22 | Clipboard (29) | Paste is allowed into a locked or hidden container | L | L | Open |
| 23 | Clipboard (29) | Cut deletes even when no copy was stored (clipboard denied and localStorage full) | L | H | Open |
| 24 | Time (54) | `seek`, `seekFrame` and `setWorkArea` with NaN set the playhead or work area to NaN | L | H | Open |
| 25 | Time (54) | A composition with `fps: 0` is accepted (every frame calculation divides by zero) | L | M | Open |
| 26 | Time (54) | `setComposition` keeps an inverted work area (start after end) | L | M | Open |
| 27 | Time (54) | The timecode for a fractional frame rate prints `00:01:0.030000000000001137` | U | M | Open |
| 28 | Time (54) | `tick(Infinity)` and `advance` with a NaN step set the time to NaN | L | M | Open |
| 29 | Time (54) | `setRate` accepts any finite speed (1e12) | L | L | Open |
| 30 | Time (55) | A frame task that throws every frame logs 60 errors a second | P | L | Open |
| 31 | Time (55) | `FrameScheduler.step` accepts a negative or NaN step | L | L | Open |
| 32 | Persistence (3) | A failed autosave is never retried until the next edit | L | M | Open |
| 33 | Import (3) | `.lazy.json` import has no size or layer cap (decision 0008 R7 promised limits) | L | H | Open |
| 34 | Import (3) | `lazyFileName` allows reserved names (`CON`), control characters and unlimited length | L | L | Open |
| 35 | Search (8) | Recent searches read from localStorage are not validated; a non-array crashes the search panel | L | M | Open |
| 36 | Stage (18) | `performance.mark` runs on every render and never clears: a slow memory leak while editing | P | M | Open |
| 37 | Camera (20) | WebKit zoom with 5 frames × 200 layers is ~40 ms a frame (the Phase 20 gate) | P | M | Open |
| 38 | Tests (3) | The Phase 3 pixel-identical import test fails by 1 px under load | T | L | Open |
| 39 | Tests (4) | The 120 FPS wire renderer unit test fails when the machine is busy | T | L | Open |
| 40 | Menus (13) | Menu items still say "Coming in Phase 14" / "Phase 20" / "Phase 28" for built features | U | L | Open |
| 41 | Events (14) | Two hooks omit `optionsRef` from their dependency lists | L | L | Open |
| 42 | Code health | 418 unused variables and imports, including whole unused components | T | L | Open |
| 43 | Commands (13) | Nothing detects two commands bound to the same key (the `L` clash went unnoticed for two phases) | T | M | Open |
| 44 | Canvas (20) | The zoom limits 2 and 6,400 are written in three places, plus dead environment settings | L | L | Open |
| 45 | Dev routes | The lab and gallery pages (`/editor/canvas-lab`, `stage-lab`, `render-gallery`) ship in production builds | L | M | Open |
| 46 | Rulers (28) | The rulers repaint on every document change, not only when the frame they measure from moves | P | L | Open |
| 47 | Hit-testing (22) | The hit index is rebuilt on every edit frame of a drag (cost grows with the layer count) | P | L | Open |
| 48 | Editing (29) | Group silently leaves out selected layers that don't share the first layer's parent | L | L | Open |
| 49 | Frames (21) | `nextFramePosition` takes its row from the first frame by x, not the topmost | L | L | Open |
| 50 | Overlay (23) | Hovering with a modifier changes the hover only on the next mouse move | U | L | Open |
