"use client";

/**
 * ============================================================================
 * SEQUENCER KEYFRAME TRACK LANE
 * ============================================================================
 * UI Element: KeyframeTrack (Unreal Equivalent: Sequencer Curve Channel)
 * Screen / Scope: Screen 05: Motion Sequencer & Bezier Curve Editor (`/editor`)
 * Role: Renders horizontal track lane with diamond keyframe markers. Supports
 *       keyframe selection, dragging/retiming with frame snapping, and value tooltips.
 * Styling Source: `@/editor/styles/sequencer.css`
 * Matches: ROADMAP.md Sub-Phase 4.1 & PANELS.md (Panel 05)
 * ============================================================================
 */

import React, { useRef, useCallback } from "react";
import type { Keyframe } from "@/core/document/schema";

export interface KeyframeTrackProps {
  trackId: string;
  property: string;
  keyframes: Keyframe[];
  pixelsPerSecond: number;
  totalDuration: number;
  isActive: boolean;
  isLocked?: boolean;
  selectedKeyframeId: string | null;
  onSelectKeyframe: (keyframeId: string, trackId: string) => void;
  onUpdateKeyframeTime: (trackId: string, keyframeId: string, newTime: number) => void;
  onLaneClick: (timeSec: number) => void;
}

export const KeyframeTrack: React.FC<KeyframeTrackProps> = ({
  trackId,
  property,
  keyframes,
  pixelsPerSecond,
  totalDuration,
  isActive,
  isLocked = false,
  selectedKeyframeId,
  onSelectKeyframe,
  onUpdateKeyframeTime,
  onLaneClick,
}) => {
  const laneRef = useRef<HTMLDivElement | null>(null);

  const handleMouseDownKeyframe = (
    e: React.MouseEvent,
    kf: Keyframe,
    kfId: string
  ) => {
    e.stopPropagation();
    if (isLocked) return;

    onSelectKeyframe(kfId, trackId);

    const startClientX = e.clientX;
    const initialTime = kf.time;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startClientX;
      const deltaTime = deltaX / pixelsPerSecond;
      // Snap to 120 FPS (approx 0.00833s) or 0.02s
      const rawNewTime = Math.max(0, Math.min(initialTime + deltaTime, totalDuration));
      const snappedTime = Math.round(rawNewTime * 120) / 120;
      onUpdateKeyframeTime(trackId, kfId, snappedTime);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleLaneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!laneRef.current) return;
    const rect = laneRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const time = Math.max(0, Math.min(clickX / pixelsPerSecond, totalDuration));
    onLaneClick(time);
  };

  return (
    <div
      ref={laneRef}
      className={`sequencer-lane-row ${isActive ? "sequencer-lane-row--active" : ""}`}
      onClick={handleLaneClick}
      style={{ width: `${pixelsPerSecond * totalDuration + 120}px`, minWidth: "100%" }}
      role="row"
    >
      {keyframes.map((kf, index) => {
        const kfId = kf.id || `kf_${index}`;
        const isSelected = selectedKeyframeId === kfId;
        const leftPixel = kf.time * pixelsPerSecond;

        return (
          <div
            key={kfId}
            className={`sequencer-kf-diamond ${isSelected ? "sequencer-kf-diamond--selected" : ""}`}
            style={{
              left: `${leftPixel}px`,
              cursor: isLocked ? "not-allowed" : "grab",
            }}
            onMouseDown={(e) => handleMouseDownKeyframe(e, kf, kfId)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectKeyframe(kfId, trackId);
            }}
            title={`${property}: ${String(kf.value)} @ ${kf.time.toFixed(3)}s (ease: ${kf.ease || "default"})`}
            role="button"
            tabIndex={0}
            aria-label={`Keyframe at ${kf.time.toFixed(2)}s`}
          />
        );
      })}
    </div>
  );
};
