### Phase 41 (Auto-layout: stacks)

Frames whose children flow like CSS flex, with Figma's controls.

#### Added
- Shift+A: a frame becomes auto layout (direction, gap, padding and alignment read from where its children are), or the selected layers are wrapped in a new auto-layout frame that hugs them. Shift+Alt+A pins every child where it is.
- An Auto layout section in the inspector: direction, wrap, gap, padding (all four sides), justify and align; and Hug / Fill / Fixed for the width and height of a layer inside a stack.
- Dragging a layer inside a stack shows an insertion line and drops it in the new place (one undo step).
- Commands `layout.addAuto`, `layout.removeAuto`, `layout.setStack`, `layout.setSizing`, `layout.reorder`; properties `layout.auto` and `layout.padding{Top,Right,Bottom,Left}`; `src/core/layout/stack.ts`.
- Test seam `window.__LL_DOC__` (the document commands and the current document) when `__LL_TEST__` is set.

#### Changed
- Containers draw `justify-content`, `align-items`, `flex-wrap` and per-side padding; a fixed size inside a stack no longer shrinks.
