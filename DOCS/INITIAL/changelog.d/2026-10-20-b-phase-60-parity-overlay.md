### Phase 60 (Parity overlay): an engine that disagrees with the kernel shows up

While playing, the editor now checks that every layer running on an engine of its own (Web Animations) shows what `evaluate()` says it should, and raises `[PARITY_DRIFT]` when it doesn't. A badge in the status bar shows the result.

#### Added
- `ParityMonitor` and `parityStore` (`src/core/engine/stage/parity.ts`): every 30 frames, in the scheduler's `stats` phase, it reads each running layer's computed style and compares it with `evaluate()` at the engine's own clock (lengths 0.5 px, opacity 0.01, transform matrix 0.005, translation 0.5), and checks that the engine's clock is within 6 frames of the transport's (two samples in a row, so one late frame is a transient). A drift is warned once per layer and property as `[PARITY_DRIFT] layer …, <property>: the engine shows …, evaluate() says …`, and clears when the engine matches again.
- `ParityBadge` in the status bar: grey "Parity idle" (nothing on an engine of its own), green "Parity OK", red "Parity drift" with the differences in its tooltip. It and the monitor run in dev builds, in tests (`window.__LL_TEST__`) and with `?parity=1`; production shows nothing.
- `WaapiAdapter.running()`, `StageAdapters.running()` (which layers an engine runs, with each one's clock); `window.__LL_ENGINE__.parity()` as a test seam.
- Tests: 8 unit tests (comparison, drift, recovery, idle, clock drift, sampling cadence) and `tests/e2e/parity.spec.ts`: correct playback stays green; an easing injected under the running engine raises `[PARITY_DRIFT]` and turns the state to drift; the badge turns green in the editor.

#### Not done
- Colours and percentage lengths aren't compared (the browser reports them in another form). Layers drawn by the kernel are the oracle itself and aren't checked.
