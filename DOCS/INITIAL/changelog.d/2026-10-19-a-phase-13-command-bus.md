### Phase 13 (Command bus: finish and type every command)

The File, Edit, View and Help menus are now one data model, and every item runs a command through the command bus or is shown disabled with the phase that builds it. Commands can declare typed arguments.

#### Added
- Optional zod `args` and `result` schemas on a `Command`; `tryRunCommand(id, args)` validates them and returns why nothing ran. `runCommand` and `invokeCommand` take the same `args`.
- `src/editor/menus/menuModel.tsx` and one `MenuDropdown`, replacing four hand-written menus. New commands: `file.exportProjectFile`, `file.importProjectFile`, `view.zoomIn/zoomOut/zoomReset`, `app.preferences`, `inspector.addPalette`.
- `useProjectMetaStore` for the project's id, name, scope and root archetype.
- A coverage unit test and `tests/e2e/command-bus.spec.ts`.

#### Changed
- Edit-menu items with no behaviour yet (Cut, Copy, Paste, Duplicate, Delete), "Save As Template", "Export Next.js + Prisma", "Fit to Stage" and others are disabled and say which phase builds them. The two fake recent-project entries in the File menu are gone.
- `Ctrl+A` for the +Add palette goes through the command bus instead of a raw `keydown` listener.

#### Not done
- `check:roadmap-order` in CI: the push was refused without the `workflow` token scope.
- The MCP server generated from the schemas is Phase 50. Existing commands don't declare `args` yet; each later phase adds them to the commands it creates.
