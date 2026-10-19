# Decision 0009: Phase 18 — The stage host: live DOM frames, no HTML strings

**Status: written 2026-10-19; reviewed in its pull request.** **Owner:** ROADMAP Phase 18. **Closes:** AUD-29 (the stage is an HTML string in `srcDoc`) and AUD-33 (stage messages posted to every iframe with target `"*"`). **Builds on:** decision record 0008 (threat model; rules R1–R10) and Phase 17 (render definitions).

Until now the stage was an `<iframe srcDoc>` whose whole document was regenerated as a string on every edit, and which ran script (`sandbox="allow-scripts allow-same-origin"`). That was one design doing three jobs: draw the document, run the logic sandbox, and take clicks. This record separates them.

## 1. The decision

**The design stage is a same-origin frame that loads a static file and is drawn into by a React portal.**

- `public/stage-frame.html` is a static document: doctype, a reset, one empty `#stage-root`, no script. It is not document content, so rule R1 (no HTML strings) holds. It gives the frame standards mode (a bare `about:blank` frame is in quirks mode) and a real viewport, so media queries inside a layer's content work.
- `StageFrame` (`src/editor/stage/StageFrame.tsx`) renders the `<iframe src="/stage-frame.html">` and, once the frame's document is `complete` and is the stage file (Firefox reports `load` for the initial `about:blank` first), mounts its children into `#stage-root` with `createPortal`. The layers are real DOM nodes in the frame's own document, rendered by the Phase 17 render definitions, from the same React tree as the editor: stores, context and event handlers are shared.
- **No script can run in the frame**, enforced by a Content-Security-Policy on its document: `script-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`, sent as a response header for `/stage-frame.html` (`next.config.ts`) and repeated in the file's meta tag. The editor's handlers are attached from the editor's realm and keep working. This closes finding F3 of record 0008. The browser test tries three ways to run code in the frame (an inline `onerror` handler, a `<script>` element, a `javascript:` URL) in Chromium, Firefox and WebKit, and none runs.
- **No `sandbox` attribute, on purpose.** The first design was `sandbox="allow-same-origin"` (no `allow-scripts`). WebKit then drops *all* event delivery to the script-disabled frame, even to listeners added from the parent's realm (measured: no `click` and no `keydown` reached the frame, while both arrived with the sandbox removed or with `allow-scripts`), so the stage could not be clicked or typed into. A CSP gives the same guarantee without that side effect. `allow-scripts` is never added.
- An edit re-renders the affected elements in place. The frame's document is never reloaded and no string is built, so the frame's `document` is the same object across edits. That is the gate: `tests/e2e/stage-host.spec.ts` marks the frame's document and checks the mark survives, and times each edit from the key reaching the editor to the frame's DOM showing it.

## 2. What the design stage does not do

- **No messages.** Nothing crosses a window boundary on the design path, so there is no bridge to attack: clicks are handled by an `onClick` on a wrapper inside the portal, which reads `data-element-id` from the target and calls `onElementClick(layerId)`.
- **No script, no HTML builder, no mock server.** A test fails if `src/editor/stage` or `src/editor/canvas` mentions `srcDoc`, `innerHTML`, `dangerouslySetInnerHTML`, `document.write`, `new Function`, `eval`, `buildSandboxDocument`, `generateElementMarkup`, the mock API server or the hot-reload engine, or imports `SandboxHost`.

## 3. The logic sandbox stays, in the full edition only

`SandboxHost` is the one frame that has to run code: it injects the mock database and API, traps runtime errors, and forwards clicks for the execution tracer. It belongs to the full edition (Release 2 and 3 logic work). Phase 18:

- loads it only through `afterTrackPanels.tsx`, gated by `edition === "full"` like the other After-track panels, and adds it to `npm run check:bundle-scope`, so "the design stage no longer imports it" is enforced against the built bundle, not just claimed;
- makes its messaging follow rule R3. Every message names the editor's origin (`window.origin` inside the frame, `window.location.origin` outside), never `"*"`; the editor accepts a message only from that frame's `contentWindow`, only from its own origin, and only if it parses against a zod schema (`src/editor/runtime/frameBridge.ts`, tested with stand-in windows). A unit test scans all of `src/`, including the scripts inside template literals, and fails on any `postMessage` whose last argument is `"*"` or any `targetOrigin: "*"`;
- keeps its HTML-string builders (`buildSandboxDocument`, `generateElementMarkup`). They are **no longer on the design path**. They remain in the full edition, with every interpolated value escaped (record 0008, F1), until the logic sandbox is rebuilt on the same render definitions in Phase 140; that debt is recorded, not hidden.

Play mode on the canvas uses `SandboxHost` in the full edition and the same `StageHost` in the initial edition (Play mode has no reachable entry point today; Phase 23 builds Design and Preview modes).

## 4. Consequences and the sharp edges

- **A frame is a separate browsing context**, so pointer events over it never reach the editor's handlers. The canvas already turns the frame's `pointer-events` off while a shape or text tool is active so a drag can start over the frame; that is unchanged. Wheel and pinch over the frame likewise don't reach the canvas' zoom handler; fixing that belongs to Phase 20 (viewport camera), which must forward them.
- **Keyboard focus moves into the frame when it is clicked**, so the command dispatcher (`installCommandDispatcher`) is installed on the frame's window too. Scoped shortcuts (`R` is a canvas shortcut) also need the canvas focus scope, which is held while the pointer is over the region; WebKit reports the pointer leaving the parent's element as soon as it enters the frame, so the frame's own document claims the scope (`bindFocusScope`). `tests/e2e/stage-host.spec.ts` clicks into the stage, presses `R`, draws, and undoes with Ctrl+Z.
- **Fonts**: the editor's `@font-face` rules (Inter, JetBrains Mono) are copied into the frame, with every `url()` made absolute against its source stylesheet. A first version copied them unchanged; their relative URLs resolved against `/stage-frame.html` to a path that does not exist, and the page's `load` event stalled. The font copy is done once per frame document.
- **The showcase demo looks different.** The old stage added a 24 px body padding and hard-coded container defaults; the new one draws exactly what the layers' geometry and props say (Law 10). The demo is now the reference for what a project looks like.
- **Rendering is not yet incremental.** An edit re-renders the stage's React tree; React diffs it, so only changed nodes are touched in the DOM. Per-layer subscriptions, the node registry and `renderer.measure()` are Phase 19, and this phase does not pull them forward.

## 5. Measured

On an Apple-silicon laptop under heavy unrelated load, in Chromium: an undo or redo of a drawn shape reaches the frame's DOM within one frame (the browser test attaches each timing to its run). Firefox and WebKit are held to a 50 ms ceiling until their numbers on the CI runner are known; Phase 18's roadmap entry records the numbers CI reports.

## 6. Alternatives considered

- **`srcDoc` with an HTML string (the old way).** Rejected: R1, and every edit reloads the frame.
- **A script-running frame with a message bridge for the design stage.** Rejected: it keeps script in a frame that holds user content for no benefit, and the bridge is attack surface the design stage doesn't need.
- **Rendering into a Shadow DOM in the editor's document.** Rejected: it has no viewport of its own (media queries would see the editor's window), so responsive design would be a fiction; and it would share the editor origin's `document` with user content.
- **An empty `about:blank` frame.** Rejected: quirks mode, and Firefox replaces the initial document when `load` fires.
- **`sandbox="allow-same-origin"`.** Tried first and rejected: it makes the stage unusable in WebKit (see §1). The CSP does the same job.
