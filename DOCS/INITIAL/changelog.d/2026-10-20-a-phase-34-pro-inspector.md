### Phase 34 (Design inspector: Pro face)

A Pro switch that shows every property.

#### Added
- The Pro face: every property the registry gives the selected layers (241 in all), in groups, each with the control its type needs. Numbers type, step with the arrow keys (Shift ten times, Alt a tenth) and scrub by dragging their label (one undo step; Escape cancels); colours have a swatch; choices are menus; toggles, vectors and JSON (gradient stops, objects) have their own controls; a unit select rides next to a number; a filter box narrows the list; a set property has a reset button; differing values read "Mixed".
- A coverage test that every legal property of every archetype has a control, and a Law 17 test that scans the rendered Simple face for technical terms.
- `src/core/inspector/proModel.ts` (generated from the registry), `proRead.ts`, and the controls `ScrubNumber` and `ColorField`.

#### Removed
- The old Transform, Layout, Appearance and Typography sections of the inspector, which held placeholder values that never reached the document.
