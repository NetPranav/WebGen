"use client";

/**
 * ============================================================================
 * FLOATING DOCK TOOLBAR
 * ============================================================================
 * UI Element: Atlassian Confluence-style Floating Bottom Dock Pill
 * Screen / Scope: Screen 01: Application Viewport & Screen 12: Whiteboard Canvas
 * Role: Provides quick access to creative and editing tools (Select, Pan, Pencil,
 *       Text, Wire, Shapes, Components, Assets).
 * Styling Source: `@/editor/styles/whiteboard.css` (`.floating-dock`)
 * ============================================================================
 */

import React from "react";
import {
  MousePointer2,
  Hand,
  Pencil,
  Type,
  Spline,
  Square,
  LayoutGrid,
  FolderClosed,
  Plus,
} from "lucide-react";

export type CanvasTool =
  | "select"
  | "pan"
  | "pencil"
  | "text"
  | "wire"
  | "shapes"
  | "components"
  | "assets";

interface FloatingDockProps {
  activeTool: CanvasTool;
  onSelectTool: (tool: CanvasTool) => void;
  onOpenQuickInsert?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

interface ToolDefinition {
  id: CanvasTool;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  shortcut: string;
}

const TOOLS: ToolDefinition[] = [
  { id: "select", name: "Select Tool", icon: MousePointer2, shortcut: "V" },
  { id: "pan", name: "Pan Canvas", icon: Hand, shortcut: "H" },
  { id: "pencil", name: "Freehand Pencil", icon: Pencil, shortcut: "P" },
  { id: "text", name: "Text Box", icon: Type, shortcut: "T" },
  { id: "wire", name: "Wire Connector", icon: Spline, shortcut: "W" },
  { id: "shapes", name: "Shapes", icon: Square, shortcut: "S" },
  { id: "components", name: "Components", icon: LayoutGrid, shortcut: "C" },
  { id: "assets", name: "Asset Library", icon: FolderClosed, shortcut: "A" },
];

export const FloatingDock: React.FC<FloatingDockProps> = ({
  activeTool,
  onSelectTool,
  onOpenQuickInsert,
  className,
  style,
}) => {
  return (
    <div className={`floating-dock-wrapper ${className || ""}`} style={style}>
      <nav
        className="floating-dock"
        role="toolbar"
        aria-label="Confluence Whiteboard Tools"
      >
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              type="button"
              className={`floating-dock__btn ${isActive ? "floating-dock__btn--active" : ""}`}
              onClick={() => onSelectTool(tool.id)}
              aria-label={tool.name}
              aria-pressed={isActive}
            >
              <Icon size={16} />
              <span className="floating-dock__tooltip" role="tooltip">
                {tool.name}
                <kbd className="floating-dock__kbd">{tool.shortcut}</kbd>
              </span>
            </button>
          );
        })}

        <div className="floating-dock__divider" />

        <button
          type="button"
          className="floating-dock__btn"
          onClick={onOpenQuickInsert}
          aria-label="Add Node / Asset"
        >
          <Plus size={16} />
          <span className="floating-dock__tooltip" role="tooltip">
            Quick Insert
            <kbd className="floating-dock__kbd">Tab</kbd>
          </span>
        </button>
      </nav>
    </div>
  );
};
