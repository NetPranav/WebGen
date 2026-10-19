### Phase 24 (Tool state machine)

The canvas' tools are now a small state machine with spring-loaded tools, and the dock only shows tools that exist.

#### Added
- `ToolMachine` (`src/core/tools`): the active tool plus a stack of springs. Holding Space gives the Hand and holding Cmd/Ctrl gives deep select; releasing returns to the previous tool; choosing a tool during a hold changes what the release returns to; losing the window's focus ends every hold.
- `useToolStore`, and `toolRuntime.ts`: a tool is `{ id, cursor, onPointerDown / Move / Up, onKey, drawOverlay }`; the canvas hands the pointer to the current tool and captures it for a gesture the tool began. Select, deep select, Hand, Frame, Rectangle, Ellipse, Line and Text are tools in it.
- `tool.set` command (typed) that the dock and an agent use. `TOOL_DEFS` lists tools not built yet (Pen, Pencil, Comment) with the phase that builds them; they have no button and no shortcut.
- `tests/e2e/tools.spec.ts`.

#### Fixed
- `L` now switches to the Line tool on the canvas. The J/K/L shuttle was also bound with canvas focus and, registered first, took the key. J/K/L are timeline-focus commands (ROADMAP Phase 63).
- The Space release no longer clicks a focused button.

#### Changed
- The Quick Insert button, which did nothing, is hidden until the feature exists.
- Selection happens when the Select tool's pointer is released (a click), not on the browser's click event.
