### Phase 14 (Workspace model & panel registry)

The editor shell now renders from a saved workspace layout instead of 22 local `useState` calls, and panels outside the layout are fetched only when shown. `EditorShell.tsx` went from 2,139 lines to 389.

#### Added
- `src/core/workspace/`: a zod-validated `WorkspaceLayout` (zone sizes, collapsed state, active tabs, the AI dock, the preset), the six workspace presets as a pure `applyPreset`, and `useWorkspaceStore`, saved to `localStorage` and restored on load.
- A panel registry (`registerPanel`) with every panel registered in one place, and `PanelHost`, which renders a registered panel, fetching its code the first time it is shown.
- `DockTree`, `CanvasChrome`, `AiDockColumn`, `AiDockOverlays`, `OutputLogDrawer` and the hooks `useWorkspace`, `useDockLayers`, `useAiDock`, `useFullPageDock`, `useProjectFiles`, `useShellCommands`, all moved out of `EditorShell.tsx` without changing behaviour.
- Unit tests for the layout, the store, the registry and the shell's size and imports; `tests/e2e/workspace.spec.ts`.

#### Changed
- The Sequencer, Curve Editor, Export Preview, Output Log, Project Settings, AI panel, Live Code, History, Reference Viewer, asset editors, Global Search and the command palette are no longer in the first-load bundle.
- Panel layout (preset, tab, dock sizes, AI dock) survives a reload.
- `useProjectMetaStore` replaces reads of `projectName`/`projectId` on `useProjectStore` (Phase 13).

#### Fixed
- The command palette now takes its snapshot of available commands when it mounts already open (it is loaded on first use).

#### Not done
- Splitters still write live px to the dock's DOM node during a drag instead of using CSS variables; the stage node is verified not to remount.
- Phase 15 (presets as saved layouts in the UI, inspector tabs) builds on this.
