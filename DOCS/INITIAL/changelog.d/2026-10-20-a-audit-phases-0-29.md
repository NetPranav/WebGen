### Audit of Phases 0–29

A fifty-item audit of everything built so far, found by probing (unit probes, a document fuzzer, browser journeys, a keybinding sweep) and fixed.

#### Fixed
- Selection: ids of layers that no longer exist (after undo, redo, delete) are dropped; `selection.count` is kept up to date.
- Editing: Delete, Cut, Duplicate, Nudge and Group skip locked layers; editing shortcuts do nothing in Preview mode; Cut deletes only after the copy was stored; paste refuses locked or hidden containers; a copy too big to paste is refused rather than silently stored.
- Documents: undo or redo during an open drag transaction no longer corrupts history; `jumpTo` cannot loop; `insertLayers` refuses an id that already exists; ids are unique (`createUniqueId`).
- Camera and geometry: zoom is clamped on load and NaN or Infinity can no longer enter the camera, drag boxes, unions or frame positions; guides are capped; a pure move no longer fixes the size of hug-sized layers.
- Frames and hit-testing: overlapping frames pick the one drawn on top; `moveFrame` respects `frame.y`; deleting a frame repairs a page's root; an empty lone frame is drawn so a new project can be drawn on.
- Time: NaN, Infinity, `fps: 0`, inverted work areas and absurd playback rates are rejected; the timecode is exact for fractional frame rates; a task that throws every frame logs once.
- Persistence and import: a failed autosave is retried; `.lazy.json` import has size and layer caps; file names are sanitised; saved cameras are removed with their project; recent searches are validated.
- The lab and gallery pages ship only when enabled; rulers and the hit index do less work during drags; a render-time `performance.mark` leak is gone.

#### Changed
- Zoom limits live in one place. About 400 unused variables and imports were removed, and the lint rule now ignores names that start with `_`.

#### Added
- Regression tests for the fixes (`src/core/__tests__/auditRegressions.test.ts`), a document fuzzer, and a keybinding-conflict e2e guard (`tests/e2e/keybinding-conflicts.spec.ts`).
