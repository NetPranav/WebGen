### Phase 20 (Viewport camera)

Pan and zoom now run through one camera: 2% to 6,400%, around the cursor, with zoom to fit, to selection and to 100%, and the view is remembered per document.

#### Added
- `src/core/viewport/camera.ts`: the document ↔ screen transform as pure functions (`screenToDoc`, `docToScreen`, `zoomAt`, `fitRect`, `stepZoom`, `wheelZoomFactor`), with unit tests.
- `useCameraStore`: the camera and the canvas size. The canvas writes it to its CSS variables from a store subscription, so panning and zooming never re-render React. Saved per project id in `localStorage`, restored when a project opens (`ProjectSession.onOpen`).
- Zoom to Fit (Shift+1), Zoom to Selection (Shift+2) and Zoom to 100% (Shift+0).
- Wheel and pinch over the stage frame reach the camera (the frame re-dispatches them on its `<iframe>`).
- `tests/e2e/viewport-camera.spec.ts`.

#### Changed
- Zoom range is 2%–6,400% (it was 10%–400% on the canvas and 25%–250% in the View menu). Zoom steps multiply by 1.25 and snap to 100%.
- A shortcut with Shift and a digit is matched by the digit's physical key, so it works on every keyboard layout.
- `EditorShell` no longer holds the zoom; the status bar reads it from the camera store.
