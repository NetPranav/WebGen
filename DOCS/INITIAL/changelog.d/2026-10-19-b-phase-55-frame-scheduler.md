### Phase 55 (Frame scheduler): one frame loop

Per-frame work now runs from one `requestAnimationFrame` loop in six ordered phases, and the transport advances inside it.

#### Added
- `src/core/time/scheduler.ts`: `FrameScheduler` / `frameScheduler`. Phases `input → evaluate → apply → render → overlay → stats`; tasks run in registration order; a throwing task is counted and skipped; the loop runs only while a task is registered. `dt` is seconds since the last frame, never negative, capped at 0.25 s.
- Deterministic mode: `setDeterministic(true)` stops the loop and `step(dt)` runs exactly one frame on a virtual clock (for the test clock and the render queue in Phase 100). `wake()` recovers a frame request lost when a test clock replaces `requestAnimationFrame` mid-session.
- ESLint ban on `requestAnimationFrame` / `cancelAnimationFrame` outside `src/core/time/**`, with a six-file allowlist.
- `transportDriver.ts`: the transport ticks in `evaluate`. Replaces the interim `transportClock.ts`.

#### Changed
- `deterministic-clock.spec.ts` case 3, the AUD-41 falsifier, now asserts that transport playback follows the test clock (within 2 frames) instead of showing the Sequencer wandering.
- `useTransportTime` publishes at once when the clock went backwards instead of waiting out a phantom gap.

#### Not done
- The Sequencer's own loop is still there (Phase 56 removes it), so AUD-41 stays partial.
- The overlay (Phase 23, Lane A) joins the scheduler when it is built.
