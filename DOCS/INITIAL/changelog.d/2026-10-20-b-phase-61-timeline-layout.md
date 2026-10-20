### Phase 61 (Timeline workspace: layout): an After Effects-style Layer Timeline under the canvas

The Animate workspace now opens a **Layer Timeline**: one row per layer with switches, a ruler, the work area, markers, and a time bar per layer that you can trim and move. Layers with animation carry a motion badge in the Layers panel that opens them in the timeline.

#### Added
- `TimelinePanel` (`src/editor/panels/timeline/`), registered as the bottom tab **Layer Timeline** and the Animate preset's active tab. Left: the Layers panel's rows (same order and open groups), each with visible, solo, lock, shy and motion-blur switches, a blend-mode menu and a parent menu. Right: a ruler (timecode or frames), the work area with draggable ends, composition markers, each layer's time bar (drag an end to trim, the middle to move; a drag shows a preview and commits as one undo step) and the current-time indicator (painted in the scheduler's `render` phase). Pressing the ruler or an empty lane seeks; dragging scrubs.
- Layers `solo`, `shy` and `motionBlur` (optional fields next to `visible` and `locked`; no schema version bump, older files simply don't have them). With any layer soloed, the stage draws only soloed layers and the layers around them; a shy filter hides shy layers from the timeline's list; motion blur is recorded for a later renderer.
- `src/core/timeline/`: `model.ts` (rows, bar arithmetic snapped to frames, ruler labels, `motionIndex` for the badges), `timelineOps.ts` and `timelineCommands.ts`. Commands (typed, Law 20): `layer.setSwitch`, `timeline.trimLayer`, `timeline.slideLayer`, `timeline.setLayerBar`, `timeline.setWorkArea`, `timeline.setWorkAreaStart`, `timeline.setWorkAreaEnd`, `timeline.addMarker`, `timeline.removeMarker`; `view.timeline` opens the tab. Keyboard shortcuts for them arrive with Phase 63.
- Document commands `setLayerBar` (a bar equal to the default is removed, so bars stay sparse), `setWorkArea`, `addMarker`, `updateMarker`, `removeMarker`, and `setLayerFlags` accepts the three new switches.
- Motion badges on Layers panel rows (clip count, states; the tooltip says which engine plays it). Clicking one selects the layer, opens the Layer Timeline and flashes the row.
- `useTimelineUiStore` (hide shy layers, ruler mode, the layer to focus).
- Tests: 22 unit tests (bar arithmetic, rows, badges, operations and undo, solo) and `tests/e2e/timeline.spec.ts`: a ten-step journey that trims, slides, sets the work area, adds a marker, solos and locks, asserting the document after every step; switches, blend mode and the shy filter; the ruler's frame mode and scrubbing; the badge.

#### Changed
- The Animate preset's bottom drawer opens on **Layer Timeline** (it was the Motion Sequencer). `presets.spec.ts` and the layout test follow.

#### Not done
- Layer markers, a precomp-aware row for nested compositions, zooming the ruler and keyboard navigation (Phases 63 and 65); the stopwatches and twirl-downs (62); canvas-drawn lanes for big compositions (64). The parent menu is the pick-whip for now.

#### Shared hot spots touched
- `src/core/document/schema.ts` (three optional layer fields, no version bump; documented in `SCHEMA_REFERENCE.md`), `src/core/store/useDocumentStore.ts` (new commands), `src/core/render/` (solo in the plan), `src/core/workspace/layout.ts` (Animate's active tab), `src/editor/shell/` (panel registry, tabs, drawer ids, `view.timeline`), `src/editor/panels/layers/LayersPanel.tsx` (motion badge).
