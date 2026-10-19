### Phase 29 (Editing operations)

The Figma keyboard workflow: copy, cut, paste, duplicate, delete, nudge, arrange, group, frame selection, lock, hide, rename, and a context menu.

#### Added
- Copy, cut and paste through the system clipboard, so a copy in one tab pastes into another (and into another project); paste in place and paste into a selected container. Pasted layers get new ids and are re-validated; a `localStorage` mirror covers engines that give the page no clipboard text.
- Duplicate (Ctrl/Cmd+D) puts the copy right after the original and repeats the offset you moved the last copy by. Delete, arrow-key nudge (Shift for 10 px), Bring Forward / Backward / to Front / to Back (Ctrl+] and Ctrl+[ with Shift), Group (Ctrl+G), Ungroup (Ctrl+Shift+G), Frame Selection (Ctrl+Alt+G), Lock (Ctrl+Shift+L), Hide (Ctrl+Shift+H), Rename (F2), Unlock All and Show All. Each is one undo step.
- A right-click menu on the canvas (`layerMenu()`, shared with the Layers panel later); the Edit menu's Cut, Copy, Paste, Duplicate and Delete are live, with Paste in Place, Select All and the group commands.
- Typed twins for agents: `layer.setName`, `layer.reorder`, `edit.nudgeBy`, `edit.groupSelection`.
- `src/core/editing` (pure operations with 24 tests) and `tests/e2e/editing.spec.ts` (a 25-step journey and the cross-tab paste).

#### Fixed
- The canvas could scroll its own clipped content, moving every layer from under the pointer without the camera knowing (`overflow: clip` now).
- Adding a layer to a frame made a camera you hadn't touched re-fit itself.
- The context menu stays on screen near the edges.

#### Changed
- On the canvas Ctrl+Shift+G is Ungroup and Ctrl+Shift+H is Hide; the Live Code Inspector and Undo History shortcuts apply when the canvas doesn't have focus. J/K/L shuttle keys are unaffected.
- The View menu lists Fit to Stage, Zoom to Selection, rulers, snapping and the Design / Preview modes as live items.
