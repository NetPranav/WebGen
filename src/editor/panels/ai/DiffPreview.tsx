"use client";

/**
 * ============================================================================
 * GHOST KEYFRAME VISUAL DIFF PREVIEW (SUB-PHASE 7.2)
 * ============================================================================
 * Human Approval Gate component that displays candidate AI keyframes before
 * committing to the element's active animation stack.
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.2 & PANELS.md §Panel 11
 * ============================================================================
 */

import React from "react";
import { AttachedAnimation } from "@/core/elements/types";
import { MotionAiDiffSummary } from "@/core/ai/MotionAiEngine";
import { Check, X, Sparkles, Layers, Clock, Zap } from "lucide-react";

export interface DiffPreviewProps {
  ghostAnimation: AttachedAnimation;
  diffSummary: MotionAiDiffSummary;
  onAccept: () => void;
  onDiscard: () => void;
}

export const DiffPreview: React.FC<DiffPreviewProps> = ({
  ghostAnimation,
  diffSummary,
  onAccept,
  onDiscard,
}) => {
  return (
    <div
      style={{
        background: "rgba(16, 185, 129, 0.08)",
        border: "1px solid rgba(16, 185, 129, 0.35)",
        borderRadius: "8px",
        padding: "14px",
        marginTop: "12px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 8px #10b981",
            }}
          />
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Proposed Ghost Motion
          </span>
        </div>
        <span
          style={{
            fontSize: "11px",
            background: "rgba(16, 185, 129, 0.2)",
            color: "#6ee7b7",
            padding: "2px 8px",
            borderRadius: "4px",
            fontWeight: 600,
          }}
        >
          {ghostAnimation.trigger}
        </span>
      </div>

      <div style={{ fontSize: "14px", fontWeight: 600, color: "#f3f4f6", marginBottom: "4px" }}>
        {ghostAnimation.name}
      </div>

      <div style={{ fontSize: "12px", color: "#9ca3af", display: "flex", gap: "12px", marginBottom: "10px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Clock size={12} /> {ghostAnimation.duration}s
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Zap size={12} /> {ghostAnimation.easing}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Layers size={12} /> {ghostAnimation.tracks?.length || 0} track(s)
        </span>
      </div>

      {/* Tracks Breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "12px" }}>
        {diffSummary.addedTracks.map((track) => (
          <div
            key={track}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              color: "#34d399",
              background: "rgba(16, 185, 129, 0.12)",
              padding: "3px 8px",
              borderRadius: "4px",
            }}
          >
            <span style={{ fontWeight: 800 }}>+</span>
            <span>{track}</span>
            <span style={{ marginLeft: "auto", fontSize: "10px", opacity: 0.75 }}>new track</span>
          </div>
        ))}
        {diffSummary.modifiedTracks.map((track) => (
          <div
            key={track}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              color: "#fbbf24",
              background: "rgba(245, 158, 11, 0.12)",
              padding: "3px 8px",
              borderRadius: "4px",
            }}
          >
            <span style={{ fontWeight: 800 }}>~</span>
            <span>{track}</span>
            <span style={{ marginLeft: "auto", fontSize: "10px", opacity: 0.75 }}>replaces existing</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic", marginBottom: "12px" }}>
        Ghost keyframes are active on the timeline and canvas stage for scrub preview.
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={onAccept}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            background: "#206859",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "8px 12px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#288370")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#206859")}
        >
          <Check size={14} /> Accept & Merge
        </button>
        <button
          onClick={onDiscard}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            background: "rgba(255, 255, 255, 0.05)",
            color: "#d1d5db",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "6px",
            padding: "8px 12px",
            fontSize: "12px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.1)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.05)")}
        >
          <X size={14} /> Discard
        </button>
      </div>
    </div>
  );
};
