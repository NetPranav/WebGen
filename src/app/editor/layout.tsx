/**
 * ============================================================================
 * EDITOR STUDIO ROUTE LAYOUT
 * ============================================================================
 * UI Element: Main Studio Workspace Layout Wrapper
 * Screen / Scope: Editor Route (`/editor`)
 * Role: Provides route-level metadata and layout isolation for the full engine studio.
 * Styling Source: `@/editor/styles/dock.css`
 * ============================================================================
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IDE Studio | Visual Web Application Engine",
  description:
    "Full-scale visual development environment with dockable panels, logic blueprints, database modeler, and live preview.",
};

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>{children}</div>;
}
