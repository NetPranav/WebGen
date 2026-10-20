### Phase 33 (Design inspector: Simple face)

Editing position, size or fill updates the canvas live (before, those fields were placeholders that never reached the document).

#### Added
- The Simple face, the default view of the Design inspector: Position, Size, Fill, Stroke, Corner radius, Opacity and Text, in plain words, and nothing else. A control shows for the layers that have it (a text has words and a colour but no stroke).
- Several layers selected: values they share are shown, values they differ on read "Mixed", and one change sets them all in one undo step.
- A Simple | Pro switch at the top of the inspector (remembered); Pro holds the old sections and the text properties until Phase 34.
- Typed commands for agents and controls: `layer.setFill`, `layer.setStroke`, `layer.setRadius`, `layer.setOpacity`, `layer.setText`, `layer.setFrame`. `src/core/inspector` with 19 tests, and `tests/e2e/inspector-simple.spec.ts`.
- Moving a layer that its parent's layout places makes it absolute at the place it had, so only the coordinate you typed changes.

#### Fixed
- Frames and forms didn't draw `appearance.border.*`; they do now.
