"use client";

/**
 * ============================================================================
 * STAGGER & INFINITE-LOOP MANAGER
 * ============================================================================
 * UI Element: StaggerManager (Unreal Equivalent: Cascade Delay & Looping Policy)
 * Screen / Scope: Screen 05: Motion Sequencer & Bezier Curve Editor (`/editor`)
 * Role: Provides configuration for multi-child entrance delay stagger (`start`,
 *       `center`, `end`, `random`) and infinite-loop toggle (`repeat: -1`).
 * Styling Source: `@/editor/styles/sequencer.css`
 * Matches: ROADMAP.md Sub-Phase 4.4 & PANELS.md (Panel 05)
 * ============================================================================
 */

import React from "react";
import { StaggerConfig } from "@/core/elements/types";
import { Repeat, Zap, X } from "lucide-react";

export interface StaggerManagerProps {
  isOpen: boolean;
  onClose: () => void;
  repeat?: number; // -1 for infinite loop, 0 for play once, >0 for N iterations
  stagger?: StaggerConfig;
  onUpdateRepeat: (newRepeat: number) => void;
  onUpdateStagger: (newStagger?: StaggerConfig) => void;
}

export const StaggerManager: React.FC<StaggerManagerProps> = ({
  isOpen,
  onClose,
  repeat = 0,
  stagger,
  onUpdateRepeat,
  onUpdateStagger,
}) => {
  if (!isOpen) return null;

  const isInfiniteLoop = repeat === -1;
  const staggerFrom = stagger?.from || "start";
  const staggerAmount = stagger?.amount ?? 0.05;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 45,
        right: 20,
        width: 280,
        background: "var(--surface-panel-solid)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-lg)",
        zIndex: 50,
        padding: "var(--space-md)",
        fontFamily: "var(--font-sans)",
      }}
      role="dialog"
      aria-label="Stagger and Loop Configuration"
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-sm)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Zap size={13} style={{ color: "var(--accent-primary)" }} />
          <span style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>Stagger & Loop Settings</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)" }}
          aria-label="Close"
        >
          <X size={13} />
        </button>
      </div>

      {/* Infinite Loop Policy */}
      <div style={{ marginBottom: "var(--space-md)", paddingBottom: "var(--space-sm)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-primary)" }}>Ambient Infinite Loop</span>
          <button
            type="button"
            className={`cb-pill ${isInfiniteLoop ? "cb-pill--active" : ""}`}
            style={{ height: 20, fontSize: 10, padding: "0 6px" }}
            onClick={() => onUpdateRepeat(isInfiniteLoop ? 0 : -1)}
            title="Set repeat: -1 for continuous ambient animations"
          >
            <Repeat size={10} />
            <span>{isInfiniteLoop ? "Infinite (-1)" : "Once (0)"}</span>
          </button>
        </div>
        <p style={{ fontSize: 10, color: "var(--text-tertiary)", margin: 0 }}>
          For ambient tracks without user triggers (e.g. Background gradient drift).
        </p>
      </div>

      {/* Child Stagger Settings */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-primary)" }}>Child Stagger</span>
          <button
            type="button"
            className={`cb-pill ${stagger ? "cb-pill--active" : ""}`}
            style={{ height: 20, fontSize: 10, padding: "0 6px" }}
            onClick={() => {
              if (stagger) {
                onUpdateStagger(undefined);
              } else {
                onUpdateStagger({ amount: 0.05, from: "start" });
              }
            }}
          >
            <span>{stagger ? "Enabled" : "Disabled"}</span>
          </button>
        </div>

        {stagger && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>Stagger Delay:</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1.0"
                  value={staggerAmount}
                  onChange={(e) =>
                    onUpdateStagger({
                      ...stagger,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="form-input"
                  style={{ width: 60, height: 22, fontSize: 10, padding: "0 4px" }}
                />
                <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>sec</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>Stagger Origin:</span>
              <select
                value={staggerFrom}
                onChange={(e) =>
                  onUpdateStagger({
                    ...stagger,
                    from: e.target.value as "start" | "center" | "end" | "random",
                  })
                }
                className="form-select"
                style={{ width: 90, height: 22, fontSize: 10 }}
              >
                <option value="start">start</option>
                <option value="center">center</option>
                <option value="end">end</option>
                <option value="random">random</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
