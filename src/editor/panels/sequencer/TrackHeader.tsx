"use client";

/**
 * ============================================================================
 * SEQUENCER TRACK HEADER
 * ============================================================================
 * UI Element: TrackHeader (Unreal Equivalent: Sequencer Track Node)
 * Screen / Scope: Screen 05: Motion Sequencer & Bezier Curve Editor (`/editor`)
 * Role: Renders the left-column track metadata row, including property path,
 *       family category badge, mute/lock toggles, keyframe count, and delete action.
 * Styling Source: `@/editor/styles/sequencer.css`
 * Follows: CONVENTIONS.md §4 & PANELS.md (Panel 05)
 * ============================================================================
 */

import React from "react";
import { Eye, EyeOff, Lock, Unlock, Trash2, Layers } from "lucide-react";
import { getPropertyRenderingTier } from "@/core/engine/grammarHelpers";

export interface TrackHeaderProps {
  id: string;
  property: string;
  isActive: boolean;
  isMuted?: boolean;
  isLocked?: boolean;
  keyframeCount: number;
  onSelect: () => void;
  onToggleMute: (e: React.MouseEvent) => void;
  onToggleLock: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

export function getPropertyFamilyBadge(property: string): { label: string; color: string } {
  if (
    property.startsWith("transform.") ||
    property.startsWith("appearance.opacity") ||
    property.startsWith("appearance.border") ||
    property.startsWith("appearance.radius") ||
    property.startsWith("filter.blur")
  ) {
    return { label: "Universal", color: "var(--accent-primary)" };
  }
  if (property.startsWith("media.") || property.startsWith("svg.")) {
    return { label: "Media", color: "var(--accent-info)" };
  }
  if (property.startsWith("divider.") || property.startsWith("background.")) {
    return { label: "Structural", color: "var(--accent-warning)" };
  }
  if (property.startsWith("typography.") || property.startsWith("appearance.background")) {
    return { label: "Interactive/Text", color: "var(--wire-motion)" };
  }
  return { label: "Custom", color: "var(--text-tertiary)" };
}

export const TrackHeader: React.FC<TrackHeaderProps> = ({
  id,
  property,
  isActive,
  isMuted = false,
  isLocked = false,
  keyframeCount,
  onSelect,
  onToggleMute,
  onToggleLock,
  onDelete,
}) => {
  const badge = getPropertyFamilyBadge(property);
  const tier = getPropertyRenderingTier(property);

  return (
    <div
      className={`sequencer-track-row ${isActive ? "sequencer-track-row--active" : ""}`}
      onClick={onSelect}
      role="row"
      aria-selected={isActive}
      title={`Track: ${property} (${keyframeCount} keyframes) — ${tier.name} (${tier.badge})`}
    >
      <div className="sequencer-track-info">
        <Layers size={12} style={{ color: badge.color, flexShrink: 0 }} />
        <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>
          {property}
        </span>
        <span
          className="sequencer-prop-badge"
          style={{ borderColor: badge.color, color: badge.color }}
        >
          {badge.label}
        </span>
        <span
          className="sequencer-prop-badge"
          style={{ borderColor: tier.border, color: tier.color, background: tier.bg, fontSize: 8 }}
          title={`${tier.name}: ${tier.label}`}
        >
          {tier.badge}
        </span>
      </div>

      <div className="sequencer-track-actions" onClick={(e) => e.stopPropagation()}>
        <span style={{ fontSize: 9, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", marginRight: 4 }}>
          {keyframeCount} kf
        </span>

        {/* Mute Toggle */}
        <button
          type="button"
          className={`sequencer-track-action-btn ${isMuted ? "sequencer-track-action-btn--active" : ""}`}
          onClick={onToggleMute}
          title={isMuted ? "Unmute track" : "Mute track"}
          aria-label={isMuted ? "Unmute track" : "Mute track"}
        >
          {isMuted ? <EyeOff size={11} style={{ color: "var(--accent-danger)" }} /> : <Eye size={11} />}
        </button>

        {/* Lock Toggle */}
        <button
          type="button"
          className={`sequencer-track-action-btn ${isLocked ? "sequencer-track-action-btn--active" : ""}`}
          onClick={onToggleLock}
          title={isLocked ? "Unlock track" : "Lock track"}
          aria-label={isLocked ? "Unlock track" : "Lock track"}
        >
          {isLocked ? <Lock size={11} style={{ color: "var(--accent-warning)" }} /> : <Unlock size={11} />}
        </button>

        {/* Delete Track */}
        <button
          type="button"
          className="sequencer-track-action-btn"
          onClick={onDelete}
          title="Delete track"
          aria-label="Delete track"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
};
