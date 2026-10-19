### Phase 28 (Snapping, smart guides & rulers)

Layers snap while you drag, with guide lines and spacing labels, and the canvas has rulers with draggable guides.

#### Added
- Snapping on move and resize to the edges and centres of sibling layers and of the frame, to ruler guides and (optionally) to the pixel grid; equal-spacing detection; red guide lines and spacing marks while it happens. Hold Cmd/Ctrl while dragging to skip snapping.
- The distance HUD: hold Alt to see the gaps from the selection to its nearest neighbours.
- Rulers (top and left, in px from the active frame) with guides: drag out of a ruler to make one, drag a guide to move it, drag it back onto a ruler to delete it. Guides are saved per frame (`frame.guides`).
- Snap toggles and a rulers toggle in the frame bar (commands `view.snapObjects`, `view.snapGuides`, `view.snapGrid`, `view.toggleRulers`, Shift+R).
- `snap.ts` and `rulerTicks.ts` (pure, with golden tests) and `tests/e2e/snapping.spec.ts`.
