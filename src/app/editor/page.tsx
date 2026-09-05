/**
 * ============================================================================
 * EDITOR STUDIO MAIN PAGE
 * ============================================================================
 * UI Element: Main IDE Studio Workspace Entry Point
 * Screen / Scope: Screen 01–08: Full Editor Studio (`/editor`)
 * Role: Renders the Master EditorShell with dockable panels, splitters, and canvas stage.
 * Styling Source: `@/editor/styles/dock.css`
 * ============================================================================
 */

import { EditorShell } from "@/editor/shell/EditorShell";

export default function EditorPage() {
  return <EditorShell />;
}
