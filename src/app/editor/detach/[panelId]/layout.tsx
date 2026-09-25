/**
 * ============================================================================
 * DETACHED PANEL ROUTE LAYOUT
 * ============================================================================
 * UI Element: Minimal Layout for Detached Panel Browser Tabs
 * Screen / Scope: `/editor/detach/[panelId]`
 * Role: Provides route-level metadata and minimal layout wrapper (no full
 *       editor shell chrome). Shares fonts and design tokens with main editor.
 * ============================================================================
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Detached Panel | LazyLayout",
  description: "Detached panel view from the LazyLayout editor.",
};

export default function DetachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      {children}
    </div>
  );
}
