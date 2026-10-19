"use client";

/**
 * ============================================================================
 * FLOATING DOCK TOOLBAR
 * ============================================================================
 * UI Element: Atlassian Confluence-style Floating Bottom Dock Pill
 * Screen / Scope: Screen 01: Application Viewport & Screen 12: Whiteboard Canvas
 * Role: Provides quick access to creative and editing tools (Select, Hand,
 *       Frame, Rectangle, Ellipse, Line, Text).
 * Styling Source: `@/editor/styles/whiteboard.css` (`.floating-dock`)
 * ============================================================================
 */

import React from "react";
import { dockTools, type ToolId } from "@/core/tools/toolDefs";
import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  Minus,
  ArrowUpRight,
  Hexagon,
  Star,
  Frame as FrameIcon,
  Type,
  Plus,
} from "lucide-react";

// Sub-Phase 43.2 (2026-09-27): replaces the old select/pan/pencil/text/wire/
// shapes/components/assets set. `wire` retires (a Blueprint-graph concept,
// never a canvas one); `shapes` retires in favor of explicit per-shape tools;
// `components`/`assets` become Quick-Insert-only (the `Plus`/Tab button
// below) rather than persistent modal tools. See the Phase 43.2 ROADMAP
// section for the full reasoning behind every addition/retirement/key choice,
// and for what's specified there but deliberately not in this union yet:
// Direct-select, Pen, Pencil, and the Polygon/Star/Arrow flyout all need
// either a shape-handle-editing UI or a bezier/freehand path-drawing UI that
// doesn't exist yet — every tool actually listed here is fully functional,
// not a placeholder button that looks clickable and does nothing.
interface FloatingDockProps {
  activeTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
  onOpenQuickInsert?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/** One icon per tool that has a button. The list of tools comes from `dockTools()`: a tool whose feature isn't built yet has no button. */
const ICONS: Partial<Record<ToolId, React.ComponentType<{ size?: number; className?: string }>>> = {
  select: MousePointer2,
  pan: Hand,
  frame: FrameIcon,
  rectangle: Square,
  ellipse: Circle,
  line: Minus,
  arrow: ArrowUpRight,
  polygon: Hexagon,
  star: Star,
  text: Type,
};

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
        {dockTools().map((tool) => {
          const Icon = ICONS[tool.id];
          if (!Icon) return null;
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              type="button"
              className={`floating-dock__btn ${isActive ? "floating-dock__btn--active" : ""}`}
              onClick={() => onSelectTool(tool.id)}
              aria-label={tool.label}
              aria-pressed={isActive}
            >
              <Icon size={16} />
              <span className="floating-dock__tooltip" role="tooltip">
                {tool.label}
                <kbd className="floating-dock__kbd">{tool.shortcut}</kbd>
              </span>
            </button>
          );
        })}

        {/* Quick Insert has no behaviour yet: its button appears with the feature. */}
        {onOpenQuickInsert && (
          <>
            <div className="floating-dock__divider" />
            <button type="button" className="floating-dock__btn" onClick={onOpenQuickInsert} aria-label="Add Node / Asset">
              <Plus size={16} />
              <span className="floating-dock__tooltip" role="tooltip">
                Quick Insert
                <kbd className="floating-dock__kbd">Tab</kbd>
              </span>
            </button>
          </>
        )}
      </nav>
    </div>
  );
};
