### Phase 58 (CSS / Web Animations adapter): simple tweens keep running when the main thread is busy

Layers whose animation the rules route to CSS now run as Web Animations. The browser keeps their clock (and, for transforms and opacity, their compositing) going while the main thread is busy. The curve is still the kernel's.

#### Added
- `WaapiAdapter`: bakes `evaluate()` once per frame (at most 600 intervals) into linear keyframes, one animation per layer, so every easing and clip priority comes out as the kernel says. `seek(t)` sets `currentTime`; `play` starts it at the transport's time and rate; it steps in only when a running animation is more than two frames from the transport (a ruler click, a loop wrap, a rate change). It bakes again, keeping time and play state, when the document or a layer's element changes.
- `canRunOnWaapi`: the `css` route (Phase 8) plus "every property is a number, length, angle or colour with a CSS property, or part of the transform".
- `StageAdapters`: each animated layer belongs to exactly one of the Web Animations and kernel adapters. Without `Element.animate`, everything runs on the kernel.
- `EngineAdapter.currentTime()` (an engine's own clock, or `null`), `AdapterHost.fps()` / `duration()`, and a layer filter on `KernelAdapter`.
- Tests: 10 unit tests and `tests/e2e/stage-waapi.spec.ts` (the ten reference animations run as Web Animations; play and pause; the clock survives a blocked main thread; Web Animations and the kernel-only stage differ in ≤ 0.5% of pixels at five times). `window.__LL_KERNEL_ONLY__` is a test seam.

#### Changed
- The Phase 57 and 58 specs click "Load 10 animations" until the layers appear (a click before hydration did nothing under load).

#### Not done
- Handing a layer between the kernel (scrubbing) and Web Animations (playing) is Phase 59; the parity overlay is Phase 60. For now a routed layer is drawn by Web Animations both when scrubbing and when playing.
