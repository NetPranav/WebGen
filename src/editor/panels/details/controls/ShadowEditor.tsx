"use client";

/**
 * ============================================================================
 * MULTI-SHADOW STACK EDITOR (UNREAL ENGINE 5 STYLE)
 * ============================================================================
 * UI Element: Multi-Layer Box Shadow Stack Control
 * Screen / Scope: Details Panel -> Appearance -> Shadows & Effects
 * Role: Allows adding, editing, reordering, and toggling multiple box-shadow
 *       layers with X/Y offsets, blur, spread, color, and inset mode.
 * Architecture Ref: `DOCS/ROADMAP_2.md` §Phase 2.3
 * ============================================================================
 */

import React from "react";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { BoxShadowLayer } from "@/core/types/details";

export interface ShadowEditorProps {
  shadows: BoxShadowLayer[];
  onChange: (shadows: BoxShadowLayer[]) => void;
}

export const ShadowEditor: React.FC<ShadowEditorProps> = ({
  shadows,
  onChange,
}) => {
  const handleAddShadow = () => {
    const newLayer: BoxShadowLayer = {
      id: `sh_${Date.now()}`,
      x: 0,
      y: 4,
      blur: 16,
      spread: 0,
      color: "rgba(0, 0, 0, 0.15)",
      inset: false,
      enabled: true,
    };
    onChange([...shadows, newLayer]);
  };

  const handleUpdateLayer = (id: string, updates: Partial<BoxShadowLayer>) => {
    onChange(shadows.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleDeleteLayer = (id: string) => {
    if (shadows.length <= 1) {
      // If only 1 remains, disable it instead of removing
      onChange(shadows.map((s) => (s.id === id ? { ...s, enabled: false } : s)));
      return;
    }
    onChange(shadows.filter((s) => s.id !== id));
  };

  return (
    <div className="shadow-editor">
      {/* Header bar with Add button */}
      <div className="shadow-editor__header">
        <span className="shadow-editor__title">Shadow Stack ({shadows.length})</span>
        <button
          type="button"
          className="btn-text-action"
          onClick={handleAddShadow}
          title="Add shadow layer"
        >
          <Plus size={11} />
          <span>Add Layer</span>
        </button>
      </div>

      {/* Shadow Layers List */}
      <div className="shadow-editor__list">
        {shadows.map((layer, idx) => (
          <div
            key={layer.id}
            className={`shadow-layer-card ${
              !layer.enabled ? "shadow-layer-card--disabled" : ""
            }`}
          >
            {/* Layer Top Bar */}
            <div className="shadow-layer-card__top">
              <button
                type="button"
                className="btn-icon-subtle"
                onClick={() =>
                  handleUpdateLayer(layer.id, { enabled: !layer.enabled })
                }
                title={layer.enabled ? "Disable layer" : "Enable layer"}
              >
                {layer.enabled ? (
                  <Eye size={12} style={{ color: "var(--accent-primary)" }} />
                ) : (
                  <EyeOff size={12} style={{ color: "var(--text-tertiary)" }} />
                )}
              </button>

              <span className="shadow-layer-card__name">Layer #{idx + 1}</span>

              {/* Inset Toggle Pill */}
              <button
                type="button"
                className={`shadow-inset-pill ${
                  layer.inset ? "shadow-inset-pill--active" : ""
                }`}
                onClick={() =>
                  handleUpdateLayer(layer.id, { inset: !layer.inset })
                }
                title="Toggle Inset / Drop Shadow"
              >
                {layer.inset ? "Inset" : "Outer"}
              </button>

              {/* Color Picker Swatch */}
              <label className="form-color-picker" style={{ marginLeft: "auto" }}>
                <div
                  className="form-color-picker__swatch"
                  style={{
                    backgroundColor: layer.color.startsWith("rgba")
                      ? "#334155"
                      : layer.color,
                  }}
                />
                <input
                  type="color"
                  style={{
                    width: 0,
                    height: 0,
                    padding: 0,
                    border: "none",
                    position: "absolute",
                    opacity: 0,
                  }}
                  value={
                    layer.color.startsWith("#") ? layer.color : "#334155"
                  }
                  onChange={(e) =>
                    handleUpdateLayer(layer.id, { color: e.target.value })
                  }
                />
              </label>

              {/* Delete Layer */}
              <button
                type="button"
                className="btn-icon-subtle"
                onClick={() => handleDeleteLayer(layer.id)}
                title="Delete shadow layer"
              >
                <Trash2 size={11} />
              </button>
            </div>

            {/* Sliders Grid: X, Y, Blur, Spread */}
            {layer.enabled && (
              <div className="shadow-layer-card__controls">
                <div className="form-grid-2">
                  <div className="form-mini-row">
                    <span className="form-mini-label">X</span>
                    <input
                      type="number"
                      className="form-input form-mini-input"
                      value={layer.x}
                      onChange={(e) =>
                        handleUpdateLayer(layer.id, { x: Number(e.target.value) })
                      }
                    />
                    <span className="form-unit">px</span>
                  </div>

                  <div className="form-mini-row">
                    <span className="form-mini-label">Y</span>
                    <input
                      type="number"
                      className="form-input form-mini-input"
                      value={layer.y}
                      onChange={(e) =>
                        handleUpdateLayer(layer.id, { y: Number(e.target.value) })
                      }
                    />
                    <span className="form-unit">px</span>
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginTop: 4 }}>
                  <div className="form-mini-row">
                    <span className="form-mini-label">Blur</span>
                    <input
                      type="number"
                      className="form-input form-mini-input"
                      min="0"
                      value={layer.blur}
                      onChange={(e) =>
                        handleUpdateLayer(layer.id, {
                          blur: Math.max(0, Number(e.target.value)),
                        })
                      }
                    />
                    <span className="form-unit">px</span>
                  </div>

                  <div className="form-mini-row">
                    <span className="form-mini-label">Sprd</span>
                    <input
                      type="number"
                      className="form-input form-mini-input"
                      value={layer.spread}
                      onChange={(e) =>
                        handleUpdateLayer(layer.id, {
                          spread: Number(e.target.value),
                        })
                      }
                    />
                    <span className="form-unit">px</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
