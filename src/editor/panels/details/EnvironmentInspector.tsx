"use client";

/**
 * ============================================================================
 * WORLD ENVIRONMENT INSPECTOR (THE TOP 20 PROPERTIES)
 * ============================================================================
 * UI Panel for configuring the canvas viewport, element interaction physics,
 * design system inheritance, motion spring presets, and DevTools inspection.
 * Follows DOCS/After/UI.md §2.1 (Luminous White Panel + #206859 Pine Green Accent)
 * Architecture Ref: DOCS/action working.md & implementation_plan.md
 * ============================================================================
 */

import React, { useState } from "react";
import {
  Globe,
  Move,
  Grid,
  Crosshair,
  Magnet,
  Palette,
  Gauge,
  ChevronRight,
  RotateCcw,
  Eye,
} from "lucide-react";
import { useProjectStore } from "@/core/store/useProjectStore";
import { SectionRail, type SectionRailItem } from "./SectionRail";
import {
  THEME_PALETTES,
  PaletteThemeId,
  GridStylePreset,
  PanTriggerGesture,
  ZoomSpeedPreset,
  CollisionBehavior,
  MarqueeSelectMode,
  ElevationPreset,
  InteractiveFeedbackStyle,
} from "@/core/types/environment";

interface ToggleSwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  title?: string;
  size?: "sm" | "md";
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  checked,
  onChange,
  title,
  size = "md",
}) => {
  const isSm = size === "sm";
  const width = isSm ? 30 : 36;
  const height = isSm ? 18 : 20;
  const thumbSize = isSm ? 14 : 16;
  const travel = isSm ? 12 : 16;

  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`env-toggle-switch ${checked ? "env-toggle-switch--active" : ""}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: `${height / 2}px`,
      }}
    >
      <span
        className="env-toggle-switch__thumb"
        style={{
          width: `${thumbSize}px`,
          height: `${thumbSize}px`,
          transform: checked ? `translateX(${travel}px)` : "translateX(0px)",
        }}
      />
    </button>
  );
};

export const EnvironmentInspector: React.FC = () => {
  const environment = useProjectStore((state) => state.environment);
  const updateEnvironment = useProjectStore((state) => state.updateEnvironment);
  const resetEnvironment = useProjectStore((state) => state.resetEnvironment);
  const setSpringPreset = useProjectStore((state) => state.setSpringPreset);
  const toggleInspectMode = useProjectStore((state) => state.toggleInspectMode);

  // Accordion open/close state
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({
    inspect: true,
    viewport: true,
    elements: true,
    snapping: false,
    theme: true,
    motion: true,
  });

  const [snappingDetailsOpen, setSnappingDetailsOpen] = useState(false);
  const [advancedSpringOpen, setAdvancedSpringOpen] = useState(false);

  const toggleSection = (key: string) => {
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /** Rail click: expand the section (if collapsed) and scroll it into view. */
  const jumpToSection = (key: string) => {
    setSectionsOpen((prev) => ({ ...prev, [key]: true }));
    document.getElementById(`env-section-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const railItems: SectionRailItem[] = [
    { id: "viewport", icon: <Grid size={14} />, label: "Viewport & Grid" },
    { id: "elements", icon: <Move size={14} />, label: "Element Interaction" },
    { id: "snapping", icon: <Magnet size={14} />, label: "Snapping" },
    { id: "theme", icon: <Palette size={14} />, label: "Theme & Tokens" },
    { id: "motion", icon: <Gauge size={14} />, label: "Motion" },
  ];

  const { viewport, elements, snapping, theme, motion, diagnostics } = environment;

  return (
    <div
      className="panel-shell environment-inspector"
      role="region"
      aria-label="World Environment Inspector"
      style={{ background: "#FFFFFF", color: "#0F172A" }}
    >
      {/* Top Header Bar */}
      <div
        className="panel-header"
        style={{
          background: "#FFFFFF",
          borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
          height: "38px",
          padding: "0 12px",
        }}
      >
        <div className="panel-header__title" style={{ color: "#206859", fontWeight: 700 }}>
          <Globe size={14} style={{ color: "#206859" }} />
          <span>World Environment</span>
        </div>

        <div className="panel-header__actions">
          <span
            className="panel-header__badge"
            title="Active Theme Palette"
            style={{
              backgroundColor: "#EBF5F3",
              color: "#206859",
              border: "1px solid rgba(32, 104, 89, 0.22)",
              fontWeight: 600,
            }}
          >
            {THEME_PALETTES[theme.palette]?.name || theme.palette}
          </span>
          <button
            type="button"
            className="panel-icon-btn"
            title="Reset Environment to Default (Top 20)"
            onClick={resetEnvironment}
            style={{ color: "#64748B" }}
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* Section Rail + Scrollable Content */}
      <div className="panel-body">
        <SectionRail items={railItems} onSelect={jumpToSection} />
        <div className="panel-content" style={{ padding: "12px", background: "#FFFFFF" }}>
        {/* ====================================================================
         * SECTION 7 / HERO: INSPECT MODE (PROP 20 - CHROME DEVTOOLS STYLE)
         * ==================================================================== */}
        <div className="form-group" style={{ marginBottom: "14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              background: diagnostics.inspectMode ? "#EBF5F3" : "#F8FAFC",
              border: diagnostics.inspectMode
                ? "1px solid rgba(32, 104, 89, 0.35)"
                : "1px solid rgba(15, 23, 42, 0.08)",
              borderRadius: "10px",
              boxShadow: diagnostics.inspectMode
                ? "0 2px 8px rgba(32, 104, 89, 0.08)"
                : "0 1px 3px rgba(15, 23, 42, 0.04)",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  flexShrink: 0,
                  borderRadius: "8px",
                  background: diagnostics.inspectMode ? "#206859" : "#EBF5F3",
                  color: diagnostics.inspectMode ? "#FFFFFF" : "#206859",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
              >
                <Eye size={16} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#206859", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  Inspect Mode (DevTools)
                </div>
                <div style={{ fontSize: "11px", color: "#475569" }}>
                  Box models, padding, dimensions & touch targets
                </div>
              </div>
            </div>

            <ToggleSwitch
              id="env-inspect-mode-toggle"
              checked={diagnostics.inspectMode}
              onChange={toggleInspectMode}
              title={diagnostics.inspectMode ? "Turn Off Inspect Mode" : "Turn On Inspect Mode"}
              size="md"
            />
          </div>
        </div>

        {/* ====================================================================
         * SECTION 1: VIEWPORT & GRID (PROPS 1-4)
         * ==================================================================== */}
        <div id="env-section-viewport" className={`panel-section ${sectionsOpen.viewport ? "panel-section--open" : ""}`} style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>
          <button type="button" className="panel-section__header" onClick={() => toggleSection("viewport")}>
            <div className="panel-section__title-group">
              <ChevronRight size={13} className="panel-section__chevron" style={{ color: sectionsOpen.viewport ? "#206859" : "#94A3B8" }} />
              <Grid size={13} style={{ color: "#206859" }} />
              <span style={{ color: "#206859", fontWeight: 600 }}>Viewport & Grid</span>
            </div>
            <span
              className="panel-header__badge"
              style={{
                backgroundColor: "#EBF5F3",
                color: "#206859",
                border: "1px solid rgba(32, 104, 89, 0.22)",
              }}
            >
              {viewport.grid.style}
            </span>
          </button>

          {sectionsOpen.viewport && (
            <div className="panel-section__content">
              {/* Prop 1: Pan */}
              <div className="form-group">
                <div className="form-label">
                  <span>Canvas Pan (Draggable)</span>
                  <ToggleSwitch
                    id="env-viewport-pan-toggle"
                    checked={viewport.pan.enabled}
                    onChange={(checked) =>
                      updateEnvironment({
                        viewport: { ...viewport, pan: { ...viewport.pan, enabled: checked } },
                      })
                    }
                    size="sm"
                  />
                </div>
                {viewport.pan.enabled && (
                  <div className="form-row--3col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px" }}>
                    {(["space_drag", "middle_mouse", "any_blank"] as PanTriggerGesture[]).map((t) => {
                      const isActive = viewport.pan.trigger === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          style={{
                            padding: "5px 6px",
                            fontSize: "10px",
                            borderRadius: "6px",
                            border: isActive ? "1px solid #206859" : "1px solid rgba(15, 23, 42, 0.12)",
                            background: isActive ? "#EBF5F3" : "#FFFFFF",
                            color: isActive ? "#206859" : "#475569",
                            fontWeight: isActive ? 600 : 500,
                            cursor: "pointer",
                            transition: "all 120ms ease",
                          }}
                          onClick={() =>
                            updateEnvironment({
                              viewport: { ...viewport, pan: { ...viewport.pan, trigger: t } },
                            })
                          }
                        >
                          {t === "space_drag" ? "Space+Drag" : t === "middle_mouse" ? "Middle Mouse" : "Any Blank"}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Prop 2: Zoom */}
              <div className="form-group">
                <div className="form-label">
                  <span>Canvas Zoom (Pinch / Wheel)</span>
                  <ToggleSwitch
                    id="env-viewport-zoom-toggle"
                    checked={viewport.zoom.enabled}
                    onChange={(checked) =>
                      updateEnvironment({
                        viewport: { ...viewport, zoom: { ...viewport.zoom, enabled: checked } },
                      })
                    }
                    size="sm"
                  />
                </div>
                {viewport.zoom.enabled && (
                  <div style={{ display: "flex", gap: "6px" }}>
                    {(["normal", "fast"] as ZoomSpeedPreset[]).map((spd) => {
                      const isActive = viewport.zoom.speed === spd;
                      return (
                        <button
                          key={spd}
                          type="button"
                          style={{
                            flex: 1,
                            padding: "5px 8px",
                            fontSize: "10.5px",
                            borderRadius: "6px",
                            border: isActive ? "1px solid #206859" : "1px solid rgba(15, 23, 42, 0.12)",
                            background: isActive ? "#EBF5F3" : "#FFFFFF",
                            color: isActive ? "#206859" : "#475569",
                            fontWeight: isActive ? 600 : 500,
                            cursor: "pointer",
                            transition: "all 120ms ease",
                          }}
                          onClick={() =>
                            updateEnvironment({
                              viewport: { ...viewport, zoom: { ...viewport.zoom, speed: spd } },
                            })
                          }
                        >
                          {spd === "normal" ? "Normal Zoom" : "Fast Zoom (2x)"}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Prop 3: Grid Style & Base Size */}
              <div className="form-group">
                <div className="form-label">
                  <span>Grid Matrix Style</span>
                  <span className="form-label__hint" style={{ color: "#206859", fontWeight: 600 }}>{viewport.grid.size}px</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", marginBottom: "6px" }}>
                  {(["dots", "lines", "none"] as GridStylePreset[]).map((style) => {
                    const isActive = viewport.grid.style === style;
                    return (
                      <button
                        key={style}
                        type="button"
                        id={`env-grid-style-${style}`}
                        style={{
                          padding: "5px 8px",
                          fontSize: "10.5px",
                          fontWeight: isActive ? 600 : 500,
                          borderRadius: "6px",
                          border: isActive ? "1px solid #206859" : "1px solid rgba(15, 23, 42, 0.12)",
                          background: isActive ? "#EBF5F3" : "#FFFFFF",
                          color: isActive ? "#206859" : "#475569",
                          cursor: "pointer",
                          textTransform: "capitalize",
                          transition: "all 120ms ease",
                        }}
                        onClick={() =>
                          updateEnvironment({
                            viewport: { ...viewport, grid: { ...viewport.grid, style } },
                          })
                        }
                      >
                        {style}
                      </button>
                    );
                  })}
                </div>

                {viewport.grid.style !== "none" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                    <span style={{ fontSize: "10.5px", color: "#64748B", width: "40px" }}>Size</span>
                    <input
                      type="range"
                      min={8}
                      max={32}
                      step={8}
                      value={viewport.grid.size}
                      style={{ flex: 1, accentColor: "#206859" }}
                      onChange={(e) =>
                        updateEnvironment({
                          viewport: { ...viewport, grid: { ...viewport.grid, size: Number(e.target.value) } },
                        })
                      }
                    />
                    <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "#206859", fontWeight: 600 }}>
                      {viewport.grid.size}px
                    </span>
                  </div>
                )}
              </div>

              {/* Prop 4: World Axes */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div className="form-label">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Crosshair size={12} style={{ color: "#206859" }} />
                    <span>World Axes & (0, 0) Origin</span>
                  </div>
                  <ToggleSwitch
                    id="env-world-axes-toggle"
                    checked={viewport.axes.enabled}
                    onChange={(checked) =>
                      updateEnvironment({
                        viewport: { ...viewport, axes: { enabled: checked } },
                      })
                    }
                    size="sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ====================================================================
         * SECTION 2: ELEMENT TRANSFORM & CANVAS FLOW (PROPS 5-8)
         * ==================================================================== */}
        <div id="env-section-elements" className={`panel-section ${sectionsOpen.elements ? "panel-section--open" : ""}`} style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>
          <button type="button" className="panel-section__header" onClick={() => toggleSection("elements")}>
            <div className="panel-section__title-group">
              <ChevronRight size={13} className="panel-section__chevron" style={{ color: sectionsOpen.elements ? "#206859" : "#94A3B8" }} />
              <Move size={13} style={{ color: "#206859" }} />
              <span style={{ color: "#206859", fontWeight: 600 }}>Element Interaction</span>
            </div>
            <span
              className="panel-header__badge"
              style={{
                backgroundColor: "#EBF5F3",
                color: "#206859",
                border: "1px solid rgba(32, 104, 89, 0.22)",
              }}
            >
              {elements.dragEnabled ? "Free Drag" : "Locked"}
            </span>
          </button>

          {sectionsOpen.elements && (
            <div className="panel-section__content">
              {/* Prop 5: Element Dragging */}
              <div className="form-group">
                <div className="form-label">
                  <span>Direct Element Dragging</span>
                  <ToggleSwitch
                    id="env-element-drag-toggle"
                    checked={elements.dragEnabled}
                    onChange={(checked) =>
                      updateEnvironment({
                        elements: { ...elements, dragEnabled: checked },
                      })
                    }
                    size="sm"
                  />
                </div>
                <span className="form-label__hint" style={{ color: "#64748B" }}>
                  {elements.dragEnabled ? "Elements can be freely moved on canvas" : "Elements are locked against displacement"}
                </span>
              </div>

              {/* Prop 6: Auto-Reparenting */}
              <div className="form-group">
                <div className="form-label">
                  <span>Smart Auto-Reparenting</span>
                  <ToggleSwitch
                    id="env-auto-reparent-toggle"
                    checked={elements.autoReparent}
                    onChange={(checked) =>
                      updateEnvironment({
                        elements: { ...elements, autoReparent: checked },
                      })
                    }
                    size="sm"
                  />
                </div>
                <span className="form-label__hint" style={{ color: "#64748B" }}>
                  Dragging into container re-assigns parent
                </span>
              </div>

              {/* Prop 7: Collision Behavior */}
              <div className="form-group">
                <div className="form-label">
                  <span>Collision Behavior</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                  {(["pass_through", "smart_push"] as CollisionBehavior[]).map((col) => {
                    const isActive = elements.collision === col;
                    return (
                      <button
                        key={col}
                        type="button"
                        style={{
                          padding: "5px 8px",
                          fontSize: "10.5px",
                          borderRadius: "6px",
                          border: isActive ? "1px solid #206859" : "1px solid rgba(15, 23, 42, 0.12)",
                          background: isActive ? "#EBF5F3" : "#FFFFFF",
                          color: isActive ? "#206859" : "#475569",
                          fontWeight: isActive ? 600 : 500,
                          cursor: "pointer",
                          transition: "all 120ms ease",
                        }}
                        onClick={() =>
                          updateEnvironment({
                            elements: { ...elements, collision: col },
                          })
                        }
                      >
                        {col === "pass_through" ? "Pass Through (Float)" : "Smart Push (Flow)"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prop 8: Multi-Select Marquee */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div className="form-label">
                  <span>Marquee Selection Mode</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                  {(["intersects", "encloses"] as MarqueeSelectMode[]).map((mode) => {
                    const isActive = elements.marqueeMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        style={{
                          padding: "5px 8px",
                          fontSize: "10.5px",
                          borderRadius: "6px",
                          border: isActive ? "1px solid #206859" : "1px solid rgba(15, 23, 42, 0.12)",
                          background: isActive ? "#EBF5F3" : "#FFFFFF",
                          color: isActive ? "#206859" : "#475569",
                          fontWeight: isActive ? 600 : 500,
                          cursor: "pointer",
                          transition: "all 120ms ease",
                        }}
                        onClick={() =>
                          updateEnvironment({
                            elements: { ...elements, marqueeMode: mode },
                          })
                        }
                      >
                        {mode === "intersects" ? "Intersects (Touching)" : "Encloses (Inside)"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ====================================================================
         * SECTION 3: SNAPPING & ALIGNMENT (PROPS 9-11)
         * ==================================================================== */}
        <div id="env-section-snapping" className={`panel-section ${sectionsOpen.snapping ? "panel-section--open" : ""}`} style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>
          <button type="button" className="panel-section__header" onClick={() => toggleSection("snapping")}>
            <div className="panel-section__title-group">
              <ChevronRight size={13} className="panel-section__chevron" style={{ color: sectionsOpen.snapping ? "#206859" : "#94A3B8" }} />
              <Magnet size={13} style={{ color: "#206859" }} />
              <span style={{ color: "#206859", fontWeight: 600 }}>Snapping & Alignment</span>
            </div>
            <span
              className="panel-header__badge"
              style={{
                backgroundColor: "#EBF5F3",
                color: "#206859",
                border: "1px solid rgba(32, 104, 89, 0.22)",
              }}
            >
              {snapping.snapToGrid && snapping.snapToElements ? "Grid + Smart" : snapping.snapToGrid ? "Grid" : "Off"}
            </span>
          </button>

          {sectionsOpen.snapping && (
            <div className="panel-section__content">
              {/* Prop 9: Snap to Grid */}
              <div className="form-group">
                <div className="form-label">
                  <span>Snap to Grid Matrix</span>
                  <ToggleSwitch
                    id="env-snap-grid-toggle"
                    checked={snapping.snapToGrid}
                    onChange={(checked) =>
                      updateEnvironment({
                        snapping: { ...snapping, snapToGrid: checked },
                      })
                    }
                    size="sm"
                  />
                </div>
              </div>

              {/* Prop 10: Snap to Elements (Smart Guides) */}
              <div className="form-group">
                <div className="form-label">
                  <span>Snap to Sibling Elements</span>
                  <ToggleSwitch
                    id="env-snap-elements-toggle"
                    checked={snapping.snapToElements}
                    onChange={(checked) =>
                      updateEnvironment({
                        snapping: { ...snapping, snapToElements: checked },
                      })
                    }
                    size="sm"
                  />
                </div>
              </div>

              {/* Prop 11: Expandable Snapping Details Group */}
              <div style={{ marginTop: "8px", borderTop: "1px dashed rgba(15, 23, 42, 0.1)", paddingTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setSnappingDetailsOpen(!snappingDetailsOpen)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    background: "none",
                    border: "none",
                    color: "#206859",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "2px 0",
                  }}
                >
                  <span>Snapping Details & HUD</span>
                  <ChevronRight
                    size={12}
                    style={{
                      transform: snappingDetailsOpen ? "rotate(90deg)" : "none",
                      transition: "transform 0.2s ease",
                      color: "#206859",
                    }}
                  />
                </button>

                {snappingDetailsOpen && (
                  <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div className="form-label">
                      <span style={{ fontSize: "11px" }}>Distance & Gap HUD</span>
                      <ToggleSwitch
                        id="env-distance-hud-toggle"
                        checked={snapping.details.distanceHUD}
                        onChange={(checked) =>
                          updateEnvironment({
                            snapping: {
                              ...snapping,
                              details: { ...snapping.details, distanceHUD: checked },
                            },
                          })
                        }
                        size="sm"
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: "12px" }}>
                      <div className="form-label" style={{ marginBottom: "4px" }}>
                        <span style={{ fontSize: "11px" }}>Magnetic Snap Radius</span>
                      </div>
                      <select
                        id="env-magnetic-radius-select"
                        className="form-select"
                        value={snapping.details.magneticDistance}
                        onChange={(e) =>
                          updateEnvironment({
                            snapping: {
                              ...snapping,
                              details: { ...snapping.details, magneticDistance: Number(e.target.value) },
                            },
                          })
                        }
                      >
                        <option value={4}>4px — Tight Snapping</option>
                        <option value={8}>8px — Balanced (Default)</option>
                        <option value={12}>12px — Strong Magnetic Snap</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: "12px" }}>
                      <div className="form-label" style={{ marginBottom: "4px" }}>
                        <span style={{ fontSize: "11px" }}>Rotation Snap Step</span>
                      </div>
                      <select
                        id="env-rotation-step-select"
                        className="form-select"
                        value={snapping.details.rotationStep}
                        onChange={(e) =>
                          updateEnvironment({
                            snapping: {
                              ...snapping,
                              details: { ...snapping.details, rotationStep: Number(e.target.value) },
                            },
                          })
                        }
                      >
                        <option value={0}>Free Rotation (No Snapping)</option>
                        <option value={15}>15° Increments (Standard)</option>
                        <option value={45}>45° Increments (Orthogonal)</option>
                      </select>
                    </div>

                    <div className="form-label" style={{ marginBottom: 0 }}>
                      <span style={{ fontSize: "11px" }}>Equal Distance Detection</span>
                      <ToggleSwitch
                        id="env-equal-dist-toggle"
                        checked={snapping.details.equalDistribution}
                        onChange={(checked) =>
                          updateEnvironment({
                            snapping: {
                              ...snapping,
                              details: { ...snapping.details, equalDistribution: checked },
                            },
                          })
                        }
                        size="sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ====================================================================
         * SECTION 4: THEME & DESIGN SYSTEM DNA (PROPS 12-16)
         * ==================================================================== */}
        <div id="env-section-theme" className={`panel-section ${sectionsOpen.theme ? "panel-section--open" : ""}`} style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>
          <button type="button" className="panel-section__header" onClick={() => toggleSection("theme")}>
            <div className="panel-section__title-group">
              <ChevronRight size={13} className="panel-section__chevron" style={{ color: sectionsOpen.theme ? "#206859" : "#94A3B8" }} />
              <Palette size={13} style={{ color: "#206859" }} />
              <span style={{ color: "#206859", fontWeight: 600 }}>Theme & Design Tokens</span>
            </div>
            <span
              className="panel-header__badge"
              style={{
                backgroundColor: "#EBF5F3",
                color: "#206859",
                border: "1px solid rgba(32, 104, 89, 0.22)",
              }}
            >
              {theme.defaultRadius === 9999 ? "Pill" : `${theme.defaultRadius}px`}
            </span>
          </button>

          {sectionsOpen.theme && (
            <div className="panel-section__content">
              {/* Prop 12: Palette Preset */}
              <div className="form-group">
                <div className="form-label">
                  <span>Color Palette (Inherited by Elements)</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  {(Object.keys(THEME_PALETTES) as PaletteThemeId[]).map((palKey) => {
                    const pal = THEME_PALETTES[palKey];
                    const isActive = theme.palette === palKey;
                    return (
                      <button
                        key={palKey}
                        type="button"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "7px 10px",
                          borderRadius: "8px",
                          background: isActive ? "#EBF5F3" : "#FFFFFF",
                          border: isActive ? "2px solid #206859" : "1px solid rgba(15, 23, 42, 0.12)",
                          boxShadow: isActive ? "0 2px 6px rgba(32, 104, 89, 0.12)" : "none",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 140ms ease",
                        }}
                        onClick={() =>
                          updateEnvironment({
                            theme: { ...theme, palette: palKey },
                          })
                        }
                      >
                        <div
                          style={{
                            width: "14px",
                            height: "14px",
                            borderRadius: "50%",
                            background: pal.accent,
                            flexShrink: 0,
                            border: "1px solid rgba(0,0,0,0.1)",
                          }}
                        />
                        <span style={{ fontSize: "11px", color: isActive ? "#206859" : "#0F172A", fontWeight: isActive ? 700 : 500 }}>
                          {pal.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prop 13: Default Corner Radius */}
              <div className="form-group">
                <div className="form-label">
                  <span>Corner Radius Default</span>
                  <span className="form-label__hint" style={{ color: "#206859", fontWeight: 600 }}>
                    {theme.defaultRadius === 9999 ? "Pill" : `${theme.defaultRadius}px`}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "4px" }}>
                  {[0, 6, 12, 16, 9999].map((rad) => {
                    const isActive = theme.defaultRadius === rad;
                    return (
                      <button
                        key={rad}
                        type="button"
                        style={{
                          padding: "5px 0",
                          fontSize: "10.5px",
                          fontWeight: isActive ? 600 : 500,
                          borderRadius: "6px",
                          border: isActive ? "1px solid #206859" : "1px solid rgba(15, 23, 42, 0.12)",
                          background: isActive ? "#EBF5F3" : "#FFFFFF",
                          color: isActive ? "#206859" : "#475569",
                          cursor: "pointer",
                          textAlign: "center",
                          transition: "all 120ms ease",
                        }}
                        onClick={() =>
                          updateEnvironment({
                            theme: { ...theme, defaultRadius: rad },
                          })
                        }
                      >
                        {rad === 0 ? "0" : rad === 9999 ? "Pill" : `${rad}px`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prop 14: Typography */}
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <div className="form-label" style={{ marginBottom: "4px" }}>
                  <span>Primary Font Family</span>
                </div>
                <select
                  id="env-typography-family-select"
                  className="form-select"
                  value={theme.typography.family}
                  onChange={(e) =>
                    updateEnvironment({
                      theme: {
                        ...theme,
                        typography: { ...theme.typography, family: e.target.value },
                      },
                    })
                  }
                >
                  <option value="Inter">Inter (Clean Sans-Serif)</option>
                  <option value="Space Grotesk">Space Grotesk (Tech Editorial)</option>
                  <option value="Outfit">Outfit (Geometric Modern)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "12px" }}>
                <div className="form-label" style={{ marginBottom: "4px" }}>
                  <span>Typography Scale Ratio</span>
                </div>
                <select
                  id="env-typography-scale-select"
                  className="form-select"
                  value={theme.typography.scaleRatio}
                  onChange={(e) =>
                    updateEnvironment({
                      theme: {
                        ...theme,
                        typography: { ...theme.typography, scaleRatio: Number(e.target.value) },
                      },
                    })
                  }
                >
                  <option value={1.2}>1.200 — Minor 3rd (Compact UI)</option>
                  <option value={1.25}>1.250 — Major 3rd (Balanced Web)</option>
                  <option value={1.333}>1.333 — Perfect 4th (Editorial Drama)</option>
                </select>
              </div>

              {/* Prop 15: Elevation Shadow */}
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <div className="form-label" style={{ marginBottom: "4px" }}>
                  <span>Elevation / Ambient Shadow</span>
                </div>
                <select
                  id="env-elevation-select"
                  className="form-select"
                  value={theme.elevation}
                  onChange={(e) =>
                    updateEnvironment({
                      theme: { ...theme, elevation: e.target.value as ElevationPreset },
                    })
                  }
                >
                  <option value="none">Flat (No Shadow)</option>
                  <option value="subtle_float">Subtle Float (Ambient 2px)</option>
                  <option value="medium_elevation">Medium Elevation (6px Lift)</option>
                  <option value="dramatic_pop">Dramatic Pop (16px High Elevation)</option>
                </select>
              </div>

              {/* Prop 16: Interactive Feedback Style */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div className="form-label" style={{ marginBottom: "4px" }}>
                  <span>Interactive Feedback (Hover / Active)</span>
                </div>
                <select
                  id="env-feedback-select"
                  className="form-select"
                  value={theme.feedback}
                  onChange={(e) =>
                    updateEnvironment({
                      theme: { ...theme, feedback: e.target.value as InteractiveFeedbackStyle },
                    })
                  }
                >
                  <option value="subtle_lift">Subtle Lift (Elevate on Hover)</option>
                  <option value="glow_accent">Glow Accent (Deep Pine Glow)</option>
                  <option value="scale_pop">Scale Pop (Spring Pop 1.04x)</option>
                  <option value="glass_frost">Glass Frost (Blur Micro-Glaze)</option>
                  <option value="none">None (Static Clean)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ====================================================================
         * SECTION 5: MOTION & SPRING PHYSICS (PROPS 17-19)
         * ==================================================================== */}
        <div id="env-section-motion" className={`panel-section ${sectionsOpen.motion ? "panel-section--open" : ""}`}>
          <button type="button" className="panel-section__header" onClick={() => toggleSection("motion")}>
            <div className="panel-section__title-group">
              <ChevronRight size={13} className="panel-section__chevron" style={{ color: sectionsOpen.motion ? "#206859" : "#94A3B8" }} />
              <Gauge size={13} style={{ color: "#206859" }} />
              <span style={{ color: "#206859", fontWeight: 600 }}>Motion & Spring Physics</span>
            </div>
            <span
              className="panel-header__badge"
              style={{
                backgroundColor: "#EBF5F3",
                color: "#206859",
                border: "1px solid rgba(32, 104, 89, 0.22)",
              }}
            >
              {motion.timeScale}x
            </span>
          </button>

          {sectionsOpen.motion && (
            <div className="panel-section__content">
              {/* Prop 17: Global Motion Speed Dial */}
              <div className="form-group">
                <div className="form-label">
                  <span>Global Motion Speed (Slow-Mo Dial)</span>
                  <span className="form-label__hint" style={{ color: "#206859", fontWeight: 600 }}>
                    {motion.timeScale === 0.25 ? "Slow Motion" : `${motion.timeScale}x`}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "4px" }}>
                  {[0.1, 0.25, 0.5, 1.0, 2.0].map((spd) => {
                    const isActive = motion.timeScale === spd;
                    return (
                      <button
                        key={spd}
                        type="button"
                        style={{
                          padding: "5px 0",
                          fontSize: "10.5px",
                          fontWeight: isActive ? 600 : 500,
                          borderRadius: "6px",
                          border: isActive ? "1px solid #206859" : "1px solid rgba(15, 23, 42, 0.12)",
                          background: isActive ? "#EBF5F3" : "#FFFFFF",
                          color: isActive ? "#206859" : "#475569",
                          cursor: "pointer",
                          textAlign: "center",
                          transition: "all 120ms ease",
                        }}
                        onClick={() =>
                          updateEnvironment({
                            motion: { ...motion, timeScale: spd },
                          })
                        }
                      >
                        {spd}x
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prop 18: Spring Physics Preset */}
              <div className="form-group">
                <div className="form-label">
                  <span>Spring Physics Preset</span>
                  <span className="form-label__hint" style={{ color: "#206859", fontWeight: 600 }}>
                    k:{motion.spring.stiffness} c:{motion.spring.damping}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", marginBottom: "6px" }}>
                  {(["snappy", "bouncy", "smooth"] as const).map((preset) => {
                    const isActive = motion.springPreset === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        style={{
                          padding: "6px 8px",
                          fontSize: "11px",
                          fontWeight: isActive ? 600 : 500,
                          borderRadius: "6px",
                          border: isActive ? "1px solid #206859" : "1px solid rgba(15, 23, 42, 0.12)",
                          background: isActive ? "#EBF5F3" : "#FFFFFF",
                          color: isActive ? "#206859" : "#475569",
                          cursor: "pointer",
                          textTransform: "capitalize",
                          transition: "all 120ms ease",
                        }}
                        onClick={() => setSpringPreset(preset)}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>

                {/* Advanced Disclosure for k, c, m */}
                <div style={{ borderTop: "1px dashed rgba(15, 23, 42, 0.1)", paddingTop: "6px", marginTop: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setAdvancedSpringOpen(!advancedSpringOpen)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      background: "none",
                      border: "none",
                      color: "#206859",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "2px 0",
                    }}
                  >
                    <span>Advanced Spring Sliders</span>
                    <ChevronRight
                      size={12}
                      style={{
                        transform: advancedSpringOpen ? "rotate(90deg)" : "none",
                        transition: "transform 0.2s ease",
                        color: "#206859",
                      }}
                    />
                  </button>

                  {advancedSpringOpen && (
                    <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px", background: "#F8FAFC", padding: "8px", borderRadius: "6px" }}>
                      <div className="form-label">
                        <span style={{ fontSize: "10.5px" }}>Stiffness (k): <strong style={{ color: "#206859" }}>{motion.spring.stiffness}</strong></span>
                        <input
                          type="range"
                          min={50}
                          max={400}
                          value={motion.spring.stiffness}
                          style={{ width: "120px", accentColor: "#206859" }}
                          onChange={(e) =>
                            updateEnvironment({
                              motion: {
                                ...motion,
                                springPreset: "custom",
                                spring: { ...motion.spring, stiffness: Number(e.target.value) },
                              },
                            })
                          }
                        />
                      </div>

                      <div className="form-label">
                        <span style={{ fontSize: "10.5px" }}>Damping (c): <strong style={{ color: "#206859" }}>{motion.spring.damping}</strong></span>
                        <input
                          type="range"
                          min={5}
                          max={60}
                          value={motion.spring.damping}
                          style={{ width: "120px", accentColor: "#206859" }}
                          onChange={(e) =>
                            updateEnvironment({
                              motion: {
                                ...motion,
                                springPreset: "custom",
                                spring: { ...motion.spring, damping: Number(e.target.value) },
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Prop 19: Reduced Motion Preview */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div className="form-label">
                  <span>Reduced Motion Preview</span>
                  <ToggleSwitch
                    id="env-reduced-motion-toggle"
                    checked={motion.reducedMotion}
                    onChange={(checked) =>
                      updateEnvironment({
                        motion: { ...motion, reducedMotion: checked },
                      })
                    }
                    size="sm"
                  />
                </div>
                <span className="form-label__hint" style={{ color: "#64748B" }}>Simulates prefers-reduced-motion for accessibility</span>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};
