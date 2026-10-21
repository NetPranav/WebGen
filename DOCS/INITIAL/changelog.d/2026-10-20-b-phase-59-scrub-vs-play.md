### Phase 59 (Scrub vs play): the kernel scrubs, the routed engine plays, and the hand-over changes nothing

There is now one rule for who draws what. Paused or scrubbing, the kernel draws every animated layer (exact at any time, in any order). Playing, each layer hands over to its routed engine at the transport's time and speed: Web Animations for the ones the rules route to CSS, the kernel for the rest. Pausing hands the layer back.

#### Changed
- `StageAdapters` hands layers between engines on play and pause. While not playing, the Web Animations are cancelled and the kernel writes every layer; on play, the kernel returns its inline styles and the Web Animation (baked from the kernel) starts at the transport's time with its rate. A speed change while playing keeps the same animation.
- `StageEngine` shows the time again whenever play or pause changes, so the new engine draws that exact frame.
- The Phase 58 specs now play before they look for Web Animations, because scrubbing no longer uses them.

#### Added
- Tests: five unit tests for the hand-over, and an e2e test that plays the ten reference animations for real, pauses at five different moments, and compares the stage with the kernel-only stage (≤ 0.5% of pixels). `window.__LL_ENGINE__.time()` is a test seam.
- The Lane A and Lane B manual test guides (in DOCS/) rewritten: every test is Do / Expect / Fails if, with the real button names, a recipe to make something animate, and a user and developer test for every phase.

#### Not done
- The parity overlay that compares the running engine with the kernel every N frames is Phase 60.
