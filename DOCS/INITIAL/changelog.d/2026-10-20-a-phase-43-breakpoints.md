### Phase 43 (Breakpoints & overrides)

Design a page for Desktop, Tablet and Mobile and change only the one you are on.

#### Added
- A breakpoint bar on the canvas: Desktop 1440, Tablet 768, Mobile 375 and breakpoints of your own width. Choosing a smaller one shows the page at that width (for a responsive frame) and from then on every edit you make is an override for that breakpoint and below; the larger ones are untouched.
- Overrides cascade: Mobile starts from Tablet's changes and adds its own. Layers pinned to a side or the middle (Phase 42 constraints) follow the narrower page unless you override them.
- An Overrides panel in the inspector: what the selection changes at this breakpoint, Reset for one property or all, and "Hide at Mobile". The Pro face marks overridden values with a dot.
- Commands `breakpoint.set`, `.add`, `.update`, `.remove`, `.setResponsive`, `.reset`; `Layer.overrides` and `MotionDocument.breakpoints` (optional, no migration); `src/core/breakpoints/`.

#### Changed
- The canvas, layers panel and inspector show the document as seen at the breakpoint being edited.
- Hiding a layer while a smaller breakpoint is active hides it there only.
- Buttons that carry words in the inspector are as wide as their text (`.panel-text-btn`).
