### Phase 67 (Graph editor & easing): curves you can see and bend, with named feels

#### Added
- A **Graph Editor** (the bottom tab, **Ctrl+Shift+K**) draws the curves of the selected keyframes, or of the selected layers' number tracks, as a **Value graph** or a **Speed graph**, with the playhead.
- **Easing per keyframe**: a keyframe's easing is the feel of the segment that ends at it. A strip of presets: **Snappy, Smooth, Bouncy, Lazy** (springs), Linear, Ease in, Ease out, Ease in and out, Overshoot, and **Hold** (keep the value until the next keyframe).
- **Bezier handles** you can drag on a selected curve segment; **Bounce** and **Time** sliders on a spring. The Simple face never shows stiffness or damping (Law 17); the Pro face adds Stiffness, Damping and Mass as read-only numbers.
- **F9** in the timeline is Easy Ease for the selected keyframes.
- `src/core/timeline/graph.ts`; commands `timeline.setKeyframeEase`, `setKeyframeSpring`, `setGraphMode`, `easyEase`.
- Tests: 10 unit tests, including "the graph's curve matches the kernel's values at every sample" for six easings and a golden value (CSS ease at the half-way mark is 0.8024), and an e2e journey through the real panel.

#### Fixed
- **Springs, `back` curves and bezier handles pulled past 1 never overshot.** The kernel clamped the eased progress to 0–1 for numbers, so "Bouncy" looked like "Smooth". Numbers and 3D vectors now overshoot; colours, paths and clip paths still clamp.

#### Changed
- The bottom tab "Easing" (the old Curve Editor) is now "Graph". The old `CurveEditor` is still used inside the Motion Sequencer until Phase 68 finishes retiring it.

#### Not done
- The graph shows each curve on its own scale (so a position in pixels and an opacity can share the plot); a shared value axis, box-selecting keyframes in the graph, dragging keyframes in the graph and spatial (motion path) handles are not built (spatial handles are Phase 69).
