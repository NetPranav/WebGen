/**
 * ============================================================================
 * INTERACTIVE PROJECT HUB & DESIGN LAUNCHER (PHASE 2)
 * ============================================================================
 * UI Element: Project Hub Root (Screen 00)
 * Screen / Scope: Screen 00: Project Hub & Design Launcher (`/`)
 * Role: Master project setup workspace where users name their element,
 *       select their design scope (Element-only in Initial Phase),
 *       pick starting archetypes, and configure target technologies.
 * Styling Source: "@/editor/styles/launcher.css"
 * ============================================================================
 */

import { ProjectHub } from "@/editor/panels/launcher/ProjectHub";

export default function Home() {
  return <ProjectHub />;
}
