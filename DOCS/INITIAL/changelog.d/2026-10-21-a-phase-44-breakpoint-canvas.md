### Phase 44 (Breakpoint canvas)

See Desktop, Tablet and Mobile of one page at once.

#### Added
- "All" in the breakpoint bar draws every breakpoint of a responsive page side by side: the one you are editing is the real frame, the others are live previews beneath it at their own widths.
- Selecting a layer outlines it in every view; clicking a layer in a preview selects it and switches to that breakpoint.
- Drag the right edge of any view to change that breakpoint's width; the page reflows live (one undo step).
- `StageHost` `breakpointId` and `ghost`; `useLayerAt`, `useDocumentAt`; `src/editor/canvas/BreakpointViews.tsx`.
