### Phase 64 (Timeline at scale): keyframes on one canvas, rows only for what is in view

Big compositions stay smooth: the timeline no longer makes a DOM node per keyframe or a row per layer you can't see.

#### Added
- **One canvas for all keyframes.** It is the size of the lanes' view and sticks in place while you scroll, so a long composition never makes a huge canvas. Property rows paint a diamond per keyframe, a closed layer paints one dot per distinct keyframe time, selected keyframes are drawn in the selection colour, and anything off screen is skipped. Diamonds are batched by colour (one path and fill per colour). `drawLanes`, `laneRows`, `hitKey`, `keysInBox` in `src/core/timeline/lanes.ts`.
- **Virtualised rows.** Only the rows in view plus eight either side are built (`visibleWindow`); spacers stand in for the rest. The list reports `data-rows-built` and `data-rows-total`. The Layers panel's "show in timeline" scrolls the list to the row first.
- `animatedIndex`: every layer's keyframes in one pass over the composition's clips (it was one pass per layer). The rows' motion badges use the one-pass `motionIndex` too.
- Each property lane carries `data-key-count`, `data-key-times` and `data-key-ids`, for tests and screen readers.
- Tests: 6 unit tests, including 200 layers × 20 tracks (3,001 rows, 12,000 keyframes: the list builds in about 35–55 ms, a repaint takes 0.1 ms) and e2e checks that the canvas paints and no DOM node is made per keyframe, and that only part of a long list is in the page.

#### Changed
- The old per-keyframe buttons are gone. A click on a diamond is now handled by the lane (Phase 66 adds selection and dragging).

#### Not done
- 60 fps was measured as work per scrub (a scrub only moves the time indicator, with no React render) and the 0.1 ms repaint, not with a browser frame-rate probe.
