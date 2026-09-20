/**
 * ============================================================================
 * OUTLINER TREE NODE COMPONENT
 * ============================================================================
 * UI Element: Element & Animation Outliner Tree Row
 * Screen / Scope: Screen 02: Element & Animation Outliner (`/editor`)
 * Role: Renders an element node, an animation stack group, or an individual
 *       animation track with controls (eye, lock, delete).
 * Styling Source: "@/editor/styles/panels.css"
 * Matches: PANELS.md (Panel 02: TreeNode)
 * ============================================================================
 */

import React from "react";
import {
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Zap,
  Film,
  Sparkles,
} from "lucide-react";
import { AttachedAnimation } from "@/core/elements/types";

export interface AnimationNodeRowProps {
  animation: AttachedAnimation;
  onToggleMute: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDelete: (id: string) => void;
}

export const AnimationTrackRow: React.FC<AnimationNodeRowProps> = ({
  animation,
  onToggleMute,
  onToggleLock,
  onDelete,
}) => {
  return (
    <div
      className={`outliner-anim-track ${!animation.enabled ? "outliner-anim-track--muted" : ""}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "5px 8px 5px 28px",
        fontSize: "12px",
        borderRadius: "var(--radius-sm, 4px)",
        background: animation.enabled ? "transparent" : "rgba(15, 23, 42, 0.04)",
        color: animation.enabled ? "var(--text-primary, #0f172a)" : "var(--text-muted, #94a3b8)",
        transition: "background 0.1s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, overflow: "hidden" }}>
        <Zap size={12} style={{ color: animation.enabled ? "var(--accent-warning, #eab308)" : "var(--text-disabled, #cbd5e1)", flexShrink: 0 }} />
        <span style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {animation.name}
        </span>
        <span
          style={{
            fontSize: "10px",
            fontFamily: "var(--font-mono, monospace)",
            padding: "1px 4px",
            borderRadius: "3px",
            background: "rgba(32, 104, 89, 0.08)",
            color: "var(--accent-primary, #206859)",
            flexShrink: 0,
          }}
        >
          {animation.trigger}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
        <span style={{ fontSize: "10px", color: "var(--text-muted, #64748b)", fontFamily: "monospace", marginRight: "4px" }}>
          {animation.repeat === -1 ? "∞" : `${animation.duration}s`}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute(animation.id);
          }}
          title={animation.enabled ? "Mute Track" : "Unmute Track"}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted, #64748b)", padding: "2px" }}
        >
          {animation.enabled ? <Eye size={12} /> : <EyeOff size={12} style={{ color: "var(--text-disabled)" }} />}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock(animation.id);
          }}
          title={animation.locked ? "Unlock Track" : "Lock Track"}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted, #64748b)", padding: "2px" }}
        >
          {animation.locked ? <Lock size={12} style={{ color: "var(--accent-primary)" }} /> : <Unlock size={12} />}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(animation.id);
          }}
          title="Delete Track"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted, #64748b)", padding: "2px" }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};
