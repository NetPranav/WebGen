### Phase 17 (Render definitions per archetype)

One React component per archetype now draws a layer from its geometry and props. The stage doesn't use them yet (Phase 18 switches it); they are shown in a dev gallery and tested in three browsers.

#### Added
- `src/core/render/`: `RENDER_DEFINITIONS` (a complete record over the archetype registry), `RenderLayer` / `RenderTree`, `layerBoxStyle` (position and size from `frame`, `sizing`, `positioning`, rotation and opacity), `resolveProps`, and the limits and value checks of decision record 0008 (unsafe image sources and path data dropped, sizes clamped, at most 5,000 layers and 64 levels, cycles cut).
- Definitions for every archetype, including the ones the old stage drew as an invisible box (toggle, badge, fab, icon, divider, background, SVG group, use and text); the six parametric shapes, `svgPath` and `icon` draw as SVG; effect surfaces and 3D layers draw a labelled placeholder.
- `/editor/render-gallery`: 53 cases covering every archetype, default and edge.
- 20 unit tests and `tests/e2e/render-gallery.spec.ts` (sizes, hostile content and layout, in three browsers).

#### Not done
- The stage still draws through `SandboxHost` HTML strings until Phase 18 swaps these in and deletes them. Hover and press looks wait for states (Phase 78). Screenshot baselines are not committed (they differ by OS and font rasteriser); the browser test compares geometry instead.
