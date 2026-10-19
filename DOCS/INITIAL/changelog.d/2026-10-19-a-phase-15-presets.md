### Phase 15 (Design / Animate / Code presets & inspector tabs)

One click switches between a Figma-like and an After Effects-like layout, the inspector has Design, Motion and Code tabs, and a layout you arrange can be saved by name.

#### Added
- Workspace presets Design (the new default: stage │ inspector, timeline folded to the transport bar), Animate (timeline at 40% of the window, Motion inspector) and Code (a wide Code inspector). Logic, Data and Debug exist only in the full edition.
- Inspector tabs Design · Motion · Code (Debug in the full edition). `MotionInspector` shows the selected layer's clips and tracks and opens the timeline; the Code tab is the Live Code Inspector in the right dock.
- Saved layouts: a `Layouts` menu to save the current arrangement by name, apply it and delete it (up to 20, kept in `localStorage`).
- Commands: `workspace.preset.<id>`, `workspace.setPreset`, `workspace.saveLayout`, `workspace.applyLayout`, `workspace.deleteLayout`, `workspace.resetLayout` (the typed ones declare zod schemas), and `defineTypedCommand` for typed `run` arguments.
- `tests/e2e/presets.spec.ts` and unit tests for presets, edition gating and saved layouts.

#### Changed
- The editor opens in the Design workspace with the bottom drawer folded away (it used to open with the Content Browser). The Window menu's workspace list and the header tabs use the same presets. "Full Studio" and the right dock's "Tokens" and "Errors" tabs are gone.
- E2E helpers open the timeline from the Motion shelf (`openSequencer`); two specs that assumed an open drawer open it explicitly.

#### Not done
- The Layers panel in the Design workspace's left dock arrives in Phase 32; the Motion inspector is read-only until the timeline work in Stage 2.
