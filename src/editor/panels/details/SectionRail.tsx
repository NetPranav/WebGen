"use client";

/**
 * ============================================================================
 * DETAILS PANEL SECTION RAIL
 * ============================================================================
 * UI Element: Vertical Icon Rail (Blender Properties Editor equivalent)
 * Screen / Scope: Screen 03: Details Inspector & World Environment panels
 * Role: Quick-jump strip along the left edge of the scrollable inspector body —
 * clicking an icon expands and scrolls to the matching accordion section,
 * instead of requiring users to scroll through every section by hand.
 * Styling Source: `@/editor/styles/panels.css` (`.panel-rail`)
 * ============================================================================
 */

import React from "react";

export interface SectionRailItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

interface SectionRailProps {
  items: SectionRailItem[];
  onSelect: (id: string) => void;
}

export const SectionRail: React.FC<SectionRailProps> = ({ items, onSelect }) => (
  <div className="panel-rail" role="tablist" aria-label="Jump to inspector section">
    {items.map((item) => (
      <button
        key={item.id}
        type="button"
        className="panel-rail__btn"
        title={item.label}
        aria-label={item.label}
        onClick={() => onSelect(item.id)}
      >
        {item.icon}
      </button>
    ))}
  </div>
);
