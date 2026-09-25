/**
 * ============================================================================
 * QUICK-ADD ANIMATION MODAL / POPOVER
 * ============================================================================
 * UI Element: Outliner Quick-Add Popover
 * Screen / Scope: Screen 02: Element & Animation Outliner (`/editor`)
 * Role: Context-aware animation picker that filters options to what is valid
 *       for the selected archetype's family per CONVENTIONS.md §4.
 * Styling Source: "@/editor/styles/panels.css" & "@/editor/styles/forms.css"
 * Matches: PANELS.md (Panel 02: Quick Add (+))
 * ============================================================================
 */

import React, { useState } from "react";
import { Sparkles, X, Plus, Zap, Play, Eye } from "lucide-react";
import type { ArchetypeId, FamilyId } from "@/core/document/registry";
import type { ClipTemplate } from "@/core/document/schema";
import { createId } from "@/core/ids";

export interface QuickAddModalProps {
  isOpen: boolean;
  archetype: ArchetypeId;
  family: FamilyId;
  onClose: () => void;
  onAddAnimation: (anim: ClipTemplate) => void;
}

interface PresetOption {
  id: string;
  name: string;
  type: ClipTemplate["type"];
  trigger: ClipTemplate["trigger"];
  duration: number;
  easing: string;
  repeat?: number;
  description: string;
  badge: string;
}

export const FAMILY_ANIMATION_PRESETS: Record<FamilyId, PresetOption[]> = {
  interactive: [
    {
      id: "preset_hover_pull",
      name: "Magnetic Hover & Spring Pull",
      type: "hover",
      trigger: "hover",
      duration: 0.25,
      easing: "spring(stiffness: 400, damping: 25)",
      description: "Elastic physics spring pull toward cursor",
      badge: "Spring",
    },
    {
      id: "preset_tap_bounce",
      name: "Tactile Tap Compression",
      type: "tap",
      trigger: "press",
      duration: 0.15,
      easing: "back.out(3)",
      description: "Subtle 0.96 scale compression on press",
      badge: "Gesture",
    },
    {
      id: "preset_pop_entrance",
      name: "Mount Pop-In Reveal",
      type: "entrance",
      trigger: "mount",
      duration: 0.4,
      easing: "back.out(1.7)",
      description: "Elastic scale from 0 to 1 on initial load",
      badge: "Mount",
    },
  ],
  media: [
    {
      id: "preset_scroll_parallax",
      name: "ScrollTrigger Parallax Scrub",
      type: "scroll",
      trigger: "scrollProgress",
      duration: 1.0,
      easing: "none",
      description: "Ties image translateY to viewport scroll progress",
      badge: "ScrollTrigger",
    },
    {
      id: "preset_hover_zoom",
      name: "Hover Zoom & Overlay Darken",
      type: "hover",
      trigger: "hover",
      duration: 0.4,
      easing: "power2.out",
      description: "Smooth 1.06x scale zoom with subtle dark tint",
      badge: "Hover",
    },
    {
      id: "preset_clip_reveal",
      name: "Clip-Path Diamond Reveal",
      type: "entrance",
      trigger: "mount",
      duration: 0.8,
      easing: "power4.inOut",
      description: "Wipes open from center diamond into full rectangle",
      badge: "ClipPath",
    },
    {
      id: "preset_svg_stroke",
      name: "SVG Vector Path Draw-In",
      type: "entrance",
      trigger: "mount",
      duration: 1.2,
      easing: "power2.inOut",
      description: "Animates strokeDashoffset to draw vector lines",
      badge: "Vector",
    },
  ],
  structural: [
    {
      id: "preset_divider_draw",
      name: "Divider Length Draw-In",
      type: "entrance",
      trigger: "mount",
      duration: 0.7,
      easing: "power3.out",
      description: "Animates divider length from 0% to 100%",
      badge: "Divider",
    },
    {
      id: "preset_ambient_drift",
      name: "Ambient Gradient Drift",
      type: "loop",
      trigger: "time",
      duration: 12.0,
      repeat: -1,
      easing: "none",
      description: "Continuous 360° gradient rotation with zero jump",
      badge: "Infinite",
    },
    {
      id: "preset_bg_parallax",
      name: "Background Depth Parallax",
      type: "scroll",
      trigger: "scrollProgress",
      duration: 1.0,
      easing: "none",
      description: "Slow multi-layer scroll drift for backdrop depth",
      badge: "Scroll",
    },
  ],
  text: [
    {
      id: "preset_split_chars",
      name: "SplitText Character Cascade",
      type: "entrance",
      trigger: "mount",
      duration: 0.6,
      easing: "back.out(2)",
      description: "Splits characters and staggers entrance by 0.03s",
      badge: "SplitText",
    },
    {
      id: "preset_word_slide",
      name: "Word Rise & Blur In",
      type: "entrance",
      trigger: "mount",
      duration: 0.7,
      easing: "power3.out",
      description: "Animates each word translateY from 20px with blur filter",
      badge: "Words",
    },
  ],
};

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  archetype,
  family,
  onClose,
  onAddAnimation,
}) => {
  if (!isOpen) return null;

  const validPresets = FAMILY_ANIMATION_PRESETS[family] || FAMILY_ANIMATION_PRESETS.interactive;

  const handleSelect = (preset: PresetOption) => {
    const newAnim: ClipTemplate = {
      id: createId("clip"),
      name: preset.name,
      type: preset.type,
      trigger: preset.trigger,
      duration: preset.duration,
      easing: preset.easing,
      repeat: preset.repeat,
      enabled: true,
      tracks: [],
    };
    onAddAnimation(newAnim);
    onClose();
  };

  return (
    <div className="quick-add-overlay anim-fade-in" style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(15, 23, 42, 0.4)",
      backdropFilter: "blur(4px)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div
        className="quick-add-dialog anim-scale-in"
        style={{
          width: "440px",
          maxWidth: "90vw",
          background: "var(--surface-panel-solid, #ffffff)",
          borderRadius: "var(--radius-lg, 12px)",
          boxShadow: "var(--shadow-xl, 0 20px 25px -5px rgba(0,0,0,0.2))",
          border: "1px solid var(--border-default, #e2e8f0)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid var(--border-subtle, #f1f5f9)",
            background: "var(--surface-panel, #f8fafc)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={16} style={{ color: "var(--accent-primary, #206859)" }} />
            <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0, color: "var(--text-primary, #0f172a)" }}>
              Attach Animation Preset
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted, #64748b)",
              padding: "4px",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "12px 16px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted, #64748b)", marginBottom: "12px" }}>
            Showing motion presets filtered for <strong>{archetype}</strong> ({family} family):
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {validPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelect(preset)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md, 8px)",
                  border: "1px solid var(--border-default, #e2e8f0)",
                  background: "var(--surface-panel-solid, #ffffff)",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-primary, #206859)";
                  e.currentTarget.style.background = "var(--accent-primary-light, #e6f4f1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default, #e2e8f0)";
                  e.currentTarget.style.background = "var(--surface-panel-solid, #ffffff)";
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary, #0f172a)" }}>
                      {preset.name}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        background: "var(--surface-panel-hover, #f1f5f9)",
                        color: "var(--accent-primary, #206859)",
                        fontWeight: 600,
                      }}
                    >
                      {preset.badge}
                    </span>
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-muted, #64748b)", margin: "4px 0 0 0" }}>
                    {preset.description}
                  </p>
                </div>
                <Plus size={14} style={{ color: "var(--accent-primary, #206859)", marginTop: "2px" }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
