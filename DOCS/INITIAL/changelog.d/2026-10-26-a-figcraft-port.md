### FigCraft port (Figma depth in our engine)

FigCraft's engine logic (MIT) is being translated into ours, batch by batch, under `DOCS/INITIAL/FIGCRAFT_PORT_PLAN.md`. Only data and behaviour are taken; our canvas and exports still draw everything as DOM, SVG and CSS. The licence is recorded in `LICENSES.md` and `THIRD_PARTY_NOTICES.md`.

#### Added
- **F1 shape geometry:** rectangles honour each corner's own radius and a new corner smoothing (the continuous-curvature corner, `shape.cornerSmoothing`); polygons and stars draw their rounded vertices (`shape.vertexRadius`, stored since Phase 7 but never drawn) with smoothing; ellipses become arcs, pies and rings (`shape.arcStart`, `shape.arcSweep`, `shape.arcInnerRatio`). `src/core/geometry/bezpath.ts` (the curve core), `shapes.ts`, `affine.ts`.
- **F2 colour and paint:** `src/core/paint/color.ts` (hex shorthands, every CSS colour name, HSB/HSL, WCAG contrast, Display P3 conversion and `color(display-p3 …)` text, gradient sampling, pattern cells, image crop maths). Fills gain a blend mode each, a diamond gradient (drawn exactly as four quadrant gradients) and the seven image adjustments with presets (drawn by an SVG colour filter).
- **F3 strokes:** several strokes per shape (`paint.strokes`, any paint), stroke position inside / centre / outside (`stroke.align`; frames use a border or an outline), per-side weights (`stroke.sides`), variable width profiles with presets (`stroke.widthProfile`), arrowheads and round, square, circle and diamond ends on lines and pen paths (`shape.startCap`/`endCap`), and the miter limit. `src/core/geometry/measure.ts`, `src/core/paths/pathOps.ts` (booleans with fill rules, arrangement faces), `src/core/paths/strokes.ts`, `src/core/render/strokePaint.tsx`. Commands `paint.setStrokes` and `stroke.set`; a Stroke settings block in the Pro inspector.
- **F4 vector networks:** points joined by any number of curves, filled by regions (`src/core/paths/vectorNetwork.ts`, stored on path layers as `svg.network`), points with their own corner radius, handle mirroring, cap and join, and the Paint Bucket tool (B) that fills or unfills any closed area. Commands `vector.makeNetwork`, `vector.paintBucket`, `vector.setPoint`; a "Make vector network" button.
- **F5 booleans and the Shape Builder:** live boolean groups whose operands stay editable layers (`boolean.operation` on a frame, `boolean.operandOp` per operand; commands `boolean.makeGroup`, `boolean.setOperation`, `boolean.flattenGroup`), and the Shape Builder tool (Shift+M) that merges, or with Alt removes, the regions where selected shapes overlap (`shapeBuilder.regions`, `shapeBuilder.merge`, `shapeBuilder.remove`).
- **F6 auto layout:** auto gaps Space around and Space evenly, Baseline alignment, wrapped lines packed where the cross alignment says or spread (`layout.alignContent`), inside strokes in or out of the layout (`layout.strokesIncluded`), first child on top (`layout.reverseZ`), a grid child's place in its cell (`layout.justifySelf`), Fill on a child fixing a hugging parent, arrow keys moving a child through its stack, and layout grids (columns, rows, square grid) drawn over frames (`frame.layoutGrids`, a Layout grids panel, `layout.setLayoutGrids`).
- Paint editor: a blend menu per fill, Diamond in the type list, adjustment presets and sliders for image fills.
- Render gallery cases for every new shape and paint.

#### Fixed
- The image adjustment fields reused the names of the brightness/contrast/saturation fields (found by the Phase 37 browser tests).
- `paint.setFills` rejected the diamond gradient and dropped blend modes and image adjustments, so those F2 controls couldn't save.

#### Not done
- The rest of the plan (components, variables, effects, text, editing behaviours, Dev Mode, import): see the plan's status column.
- Pattern fills: the cell maths is ported, but drawing a layer as a repeating tile needs a renderer change (CSS has no portable `element()`).
