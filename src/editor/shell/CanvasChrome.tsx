"use client";

/**
 * The floating controls over the stage (moved out of `EditorShell.tsx`,
 * Phase 14): save / undo / redo, settings and recenter, and the World
 * Environment quick-controls popover.
 */
import React, { useState, useEffect } from "react";
import { Save, Undo2, Redo2, X, Settings, Focus, Globe, SlidersHorizontal, ArrowUpRight, Eye } from "lucide-react";
import { useEnvironmentStore } from "@/core/store/useEnvironmentStore";

interface CanvasChromeProps {
  centerActiveTab: string;
  isDirty: boolean;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  onRecenter: () => void;
  /** Opens the full World Environment inspector in the right dock. */
  onOpenWorldInspector: () => void;
}

export const CanvasChrome: React.FC<CanvasChromeProps> = ({
  centerActiveTab,
  isDirty,
  onSave,
  onUndo,
  onRedo,
  onOpenSettings,
  onCloseSettings,
  onRecenter,
  onOpenWorldInspector,
}) => {
  const handleSaveProject = onSave;
  const handleUndo = onUndo;
  const handleRedo = onRedo;
  const handleOpenSettings = onOpenSettings;
  const handleCloseSettings = onCloseSettings;
  const handleRecenterCanvas = onRecenter;

  // World Environment & Viewport State
  const environment = useEnvironmentStore((s) => s.environment);
  const updateEnvironment = useEnvironmentStore((s) => s.updateEnvironment);
  const toggleInspectMode = useEnvironmentStore((s) => s.toggleInspectMode);
  const [isWorldEnvPopoverOpen, setIsWorldEnvPopoverOpen] = useState(false);

  // Dismiss the World Quick Controls popover on outside click or Escape
  useEffect(() => {
    if (!isWorldEnvPopoverOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target?.closest("#world-env-quick-popover, #canvas-world-env-quick-btn")) return;
      setIsWorldEnvPopoverOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsWorldEnvPopoverOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isWorldEnvPopoverOpen]);

  return (
    <>
                {/* Viewport Floating Action Pill (Save, Undo, Redo) in Top-Left Corner (only in Viewport mode) */}
                {centerActiveTab === "viewport" && (
                  <div className="viewport-floating-actions" role="toolbar" aria-label="Viewport History Actions">
                    <button
                      type="button"
                      className="viewport-action-btn"
                      onClick={handleSaveProject}
                      title="Save Project (Ctrl+S / Cmd+S)"
                    >
                      <Save size={14} style={{ color: isDirty ? "var(--accent-warning)" : "var(--text-secondary)" }} />
                      {isDirty && <span className="viewport-action-btn__dirty-dot" />}
                    </button>

                    <div className="viewport-action-divider" />

                    <button
                      type="button"
                      className="viewport-action-btn"
                      onClick={handleUndo}
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo2 size={14} />
                    </button>

                    <button
                      type="button"
                      className="viewport-action-btn"
                      onClick={handleRedo}
                      title="Redo (Ctrl+Shift+Z)"
                    >
                      <Redo2 size={14} />
                    </button>
                  </div>
                )}

                {/* Viewport Floating Actions in Top-Right Corner: Settings + Recenter (just below settings) */}
                <div
                  className="viewport-floating-actions viewport-floating-actions--top-right"
                  style={{ left: "auto", right: 12 }}
                  role="toolbar"
                  aria-label="Viewport Floating Actions"
                >
                  {centerActiveTab === "settings" ? (
                    <button
                      type="button"
                      className="viewport-action-btn"
                      onClick={handleCloseSettings}
                      title="Close Settings & Return to Viewport (Esc)"
                      id="viewport-close-settings-btn"
                      style={{ color: "var(--accent-warning)" }}
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="viewport-action-btn"
                      onClick={handleOpenSettings}
                      title="Project Settings (Ctrl+,)"
                      id="viewport-open-settings-btn"
                    >
                      <Settings size={14} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="viewport-action-btn"
                    onClick={handleRecenterCanvas}
                    title="Bring back to center (0, 0) [Ctrl+0]"
                    id="canvas-bring-back-to-center"
                    aria-label="Bring back to center"
                  >
                    <Focus size={14} />
                  </button>

                  <button
                    type="button"
                    className={`viewport-action-btn ${isWorldEnvPopoverOpen || environment.diagnostics.inspectMode ? "viewport-action-btn--active" : ""}`}
                    onClick={() => setIsWorldEnvPopoverOpen((prev) => !prev)}
                    title="World Environment & Viewport Settings"
                    id="canvas-world-env-quick-btn"
                    aria-label="World Environment Quick Settings"
                  >
                    <Globe size={14} />
                  </button>
                </div>

                {/* World Environment Quick Controls Popover */}
                {isWorldEnvPopoverOpen && (
                  <div
                    className="viewport-env-quick-popover"
                    id="world-env-quick-popover"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="viewport-env-popover-header">
                      <span className="viewport-env-popover-title">
                        <Globe size={13} style={{ color: "var(--accent-primary)" }} />
                        World Quick Controls
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsWorldEnvPopoverOpen(false)}
                        className="viewport-action-btn"
                        style={{ width: 20, height: 20 }}
                        title="Close popover"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    {/* DevTools Inspect Mode */}
                    <div className="viewport-env-popover-row">
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Eye size={12} style={{ color: environment.diagnostics.inspectMode ? "var(--accent-primary)" : "var(--text-tertiary)" }} />
                        Inspect Mode
                      </span>
                      <button
                        type="button"
                        className={`viewport-env-popover-seg-btn ${environment.diagnostics.inspectMode ? "viewport-env-popover-seg-btn--active" : ""}`}
                        onClick={toggleInspectMode}
                        id="quick-toggle-inspect-mode"
                      >
                        {environment.diagnostics.inspectMode ? "ON" : "OFF"}
                      </button>
                    </div>

                    {/* Element Dragging */}
                    <div className="viewport-env-popover-row">
                      <span>Element Drag</span>
                      <button
                        type="button"
                        className={`viewport-env-popover-seg-btn ${environment.elements?.dragEnabled ? "viewport-env-popover-seg-btn--active" : ""}`}
                        onClick={() =>
                          updateEnvironment({
                            elements: {
                              ...environment.elements,
                              dragEnabled: !environment.elements?.dragEnabled,
                            },
                          })
                        }
                        id="quick-toggle-element-dragging"
                      >
                        {environment.elements?.dragEnabled ? "Enabled" : "Locked"}
                      </button>
                    </div>

                    {/* Grid Style */}
                    <div className="viewport-env-popover-row">
                      <span>Grid Style</span>
                      <div className="viewport-env-popover-segmented">
                        {(["dots", "lines", "none"] as const).map((style) => (
                          <button
                            key={style}
                            type="button"
                            className={`viewport-env-popover-seg-btn ${environment.viewport.grid.style === style ? "viewport-env-popover-seg-btn--active" : ""}`}
                            onClick={() =>
                              updateEnvironment({
                                viewport: {
                                  ...environment.viewport,
                                  grid: { ...environment.viewport.grid, style },
                                },
                              })
                            }
                            id={`quick-grid-${style}`}
                          >
                            {style.charAt(0).toUpperCase() + style.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* World Axes */}
                    <div className="viewport-env-popover-row">
                      <span>World Axes</span>
                      <button
                        type="button"
                        className={`viewport-env-popover-seg-btn ${environment.viewport.axes.enabled ? "viewport-env-popover-seg-btn--active" : ""}`}
                        onClick={() =>
                          updateEnvironment({
                            viewport: {
                              ...environment.viewport,
                              axes: { ...environment.viewport.axes, enabled: !environment.viewport.axes.enabled },
                            },
                          })
                        }
                        id="quick-toggle-world-axes"
                      >
                        {environment.viewport.axes.enabled ? "Visible" : "Hidden"}
                      </button>
                    </div>

                    {/* Motion Speed */}
                    <div className="viewport-env-popover-row">
                      <span>Motion Speed</span>
                      <div className="viewport-env-popover-segmented">
                        {([0.5, 1, 1.5] as const).map((speed) => (
                          <button
                            key={speed}
                            type="button"
                            className={`viewport-env-popover-seg-btn ${environment.motion?.timeScale === speed ? "viewport-env-popover-seg-btn--active" : ""}`}
                            onClick={() =>
                              updateEnvironment({
                                motion: { ...environment.motion, timeScale: speed },
                              })
                            }
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Button to open Full World Settings in Right Inspector */}
                    <button
                      type="button"
                      className="viewport-env-popover-btn"
                      id="open-full-world-inspector-btn"
                      onClick={() => {
                        onOpenWorldInspector();
                        window.dispatchEvent(new CustomEvent("antigravity:open_world_env"));
                        setIsWorldEnvPopoverOpen(false);
                      }}
                    >
                      <SlidersHorizontal size={12} />
                      Full World Inspector
                      <ArrowUpRight size={12} />
                    </button>
                  </div>
                )}
    </>
  );
};
