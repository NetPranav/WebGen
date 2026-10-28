### Phase 81 (Scroll: model & runtime): parallax and scroll-reveal play in Preview

Scroll can now drive animation. In **Preview**, scrolling the page plays scroll-driven clips; in Design the page isn't scrolled and nothing changes. This is the scheduler-driven path that works in every browser.

#### Added
- **Scrubbed (parallax):** a clip triggered by scroll progress follows how far the page is through the layer's range, exactly, with optional smoothing (`scrub: 1` chases the scroll over about a second). Before the range it shows its first frame, after it its last.
- **Triggered (reveal):** a clip triggered by "in view" waits at its first frame, plays once when the range is entered, stays, and rewinds when you scroll back above it so it plays again. A page that loads with the layer already in view plays it straight away.
- **Pin:** a pinned layer is held where it met the start of its range for the range's length, then scrolls away.
- **Ranges** are written like GSAP and CSS: `"top 80%"` is the layer's top reaching 80% down the viewport (edges `top`, `center`, `bottom`, a percentage or pixels). Default: from the layer's top meeting the viewport's bottom to its bottom leaving the top.
- Commands: `motion.setScrollTrigger` (start, end, scrub, pin, clear) and `motion.addScrollClip` (a parallax or a reveal on one property in one call). Both are one undo step.
- `src/core/scroll/` (`model.ts`, `ScrollDriver.ts`, `frameHost.ts`, `scrollCommands.ts`); a new kernel input `scrollClipTime`; `scrollStore` holds each layer's view progress for the scroll scrubber in Phase 82.
- Tests: 22 unit tests (the model, the driver with a fake page, the kernel at 5 scroll positions, the stage engine feeding the driver in Preview only, the commands) and `tests/e2e/scroll.spec.ts` (parallax at 5 positions in Preview, Design left as drawn, a reveal that plays once and again after scrolling back, a pin).

#### Not done
- Native CSS scroll-driven animations (a `ViewTimeline`); pinned spacing (a pin holds the layer but doesn't lengthen the page); setting a scroll trigger from the UI (commands only for now); the Firefox and WebKit runs (CI).
