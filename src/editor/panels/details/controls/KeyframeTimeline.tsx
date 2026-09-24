"use client";

/**
 * ============================================================================
 * KEYFRAME TIMELINE SCRUBBER CONTROL
 * ============================================================================
 * Interactive keyframe track scrubber showing offset points (0%, 25%, 50%, 75%, 100%)
 * with play/pause motion preview for the Details Inspector.
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.5 & SCHEMA_REFERENCE.md §13
 * ============================================================================
 */

import React, { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Clock } from "lucide-react";
import { AnimationSample, KeyframePoint } from "@/core/types/animations";
import "@/editor/styles/forms.css";

interface KeyframeTimelineProps {
  sample: AnimationSample;
  onScrub?: (progress: number) => void;
  disabled?: boolean;
}

export const KeyframeTimeline: React.FC<KeyframeTimelineProps> = ({
  sample,
  onScrub,
  disabled = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0.0 to 1.0

  // Playback simulation loop
  useEffect(() => {
    let animId: number;
    let startTime: number | null = null;
    const durationMs = (sample.duration || 0.6) * 1000;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const curProg = (elapsed % durationMs) / durationMs;

      setProgress(curProg);
      onScrub?.(curProg);

      if (isPlaying) {
        animId = requestAnimationFrame(step);
      }
    };

    if (isPlaying) {
      animId = requestAnimationFrame(step);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, sample.duration, onScrub]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value) / 100;
    setProgress(val);
    onScrub?.(val);
    if (isPlaying) setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setProgress(0);
    onScrub?.(0);
  };

  return (
    <div
      style={{
        padding: "8px 10px",
        backgroundColor: "var(--surface-1)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {/* Top Header: Progress & Play/Pause Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Clock size={11} style={{ color: "var(--accent-primary)" }} />
          <span
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            {Math.round(progress * 100)}% ({((progress * (sample.duration || 0.6))).toFixed(2)}s)
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={disabled}
            className="panel-icon-btn"
            title={isPlaying ? "Pause" : "Play Preview"}
            style={{
              width: 22,
              height: 22,
              backgroundColor: isPlaying ? "rgba(34, 197, 94, 0.2)" : "transparent",
              color: isPlaying ? "#22c55e" : "var(--text-secondary)",
            }}
          >
            {isPlaying ? <Pause size={11} /> : <Play size={11} />}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={disabled}
            className="panel-icon-btn"
            title="Reset Timeline"
            style={{ width: 22, height: 22 }}
          >
            <RotateCcw size={11} />
          </button>
        </div>
      </div>

      {/* Scrub Slider with Keyframe Marks */}
      <div style={{ position: "relative", width: "100%" }}>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(progress * 100)}
          onChange={handleSliderChange}
          disabled={disabled}
          style={{
            width: "100%",
            height: 4,
            appearance: "none",
            backgroundColor: "var(--surface-3)",
            borderRadius: 2,
            outline: "none",
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        />

        {/* Visual Keyframe Diamond Indicators */}
        {sample.tracks.flatMap((t) => t.keyframes).map((kf, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: "50%",
              left: `${kf.offset * 100}%`,
              transform: "translate(-50%, -50%) rotate(45deg)",
              width: 6,
              height: 6,
              backgroundColor: "var(--accent-primary)",
              border: "1px solid #ffffff",
              pointerEvents: "none",
            }}
            title={`Keyframe at ${Math.round(kf.offset * 100)}%`}
          />
        ))}
      </div>

      {/* Track List Preview */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
        {sample.tracks.map((t) => (
          <span
            key={t.trackId}
            style={{
              fontSize: 8.5,
              fontWeight: 700,
              padding: "1px 4px",
              borderRadius: 3,
              backgroundColor: "var(--surface-2)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {t.trackId}
          </span>
        ))}
      </div>
    </div>
  );
};
