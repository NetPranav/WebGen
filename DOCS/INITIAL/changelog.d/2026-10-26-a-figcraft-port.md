### FigCraft port (Figma depth in our engine)

FigCraft's engine logic (MIT) is being translated into ours, batch by batch, under `DOCS/INITIAL/FIGCRAFT_PORT_PLAN.md`. Only data and behaviour are taken; our canvas and exports still draw everything as DOM, SVG and CSS. The licence is recorded in `LICENSES.md` and `THIRD_PARTY_NOTICES.md`.

#### Added
- **F1 shape geometry:** rectangles honour each corner's own radius and a new corner smoothing (the continuous-curvature corner, `shape.cornerSmoothing`); polygons and stars draw their rounded vertices (`shape.vertexRadius`, stored since Phase 7 but never drawn) with smoothing; ellipses become arcs, pies and rings (`shape.arcStart`, `shape.arcSweep`, `shape.arcInnerRatio`). `src/core/geometry/bezpath.ts` (the curve core), `shapes.ts`, `affine.ts`.
- **F2 colour and paint:** `src/core/paint/color.ts` (hex shorthands, every CSS colour name, HSB/HSL, WCAG contrast, Display P3 conversion and `color(display-p3 …)` text, gradient sampling, pattern cells, image crop maths). Fills gain a blend mode each, a diamond gradient (drawn exactly as four quadrant gradients) and the seven image adjustments with presets (drawn by an SVG colour filter).
- Paint editor: a blend menu per fill, Diamond in the type list, adjustment presets and sliders for image fills.
- Render gallery cases for every new shape and paint.

#### Not done
- The rest of the plan (strokes, vector networks, booleans and the Shape Builder, layout behaviour, components, variables, effects, text, editing behaviours, Dev Mode, import): see the plan's status column.
- Pattern fills: the cell maths is ported, but drawing a layer as a repeating tile needs a renderer change (CSS has no portable `element()`).
