"use client";

/**
 * ============================================================================
 * SEQUENCER PLAYHEAD & TRANSPORT CONTROLS
 * ============================================================================
 * UI Element: PlayheadControls (Unreal Equivalent: Sequencer Transport Bar)
 * Screen / Scope: Screen 05: Motion Sequencer & Bezier Curve Editor (`/editor`)
 * Role: Provides playback controls (Play, Pause, Loop, Reverse, Stop), speed scaling,
 *       current timecode readout, and keyframe addition triggers.
 * Styling Source: `@/editor/styles/sequencer.css`
 * Matches: ROADMAP.md Sub-Phase 4.1 & PANELS.md (Panel 05)
 * ============================================================================
 */

import React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Repeat,
  FastForward,
  Plus,
  Clock,
  Zap,
  Activity,
  ListTree,
} from "lucide-react";

export interface PlayheadControlsProps {
  isPlaying: boolean;
  isLooping: boolean;
  playbackRate: number;
  currentTime: number;
  totalDuration: number;
  viewMode?: "tracks" | "curves";
  onTogglePlay: () => void;
  onStopReset: () => void;
  onToggleLoop: () => void;
  onReverse: () => void;
  onRateChange: (rate: number) => void;
  onAddKeyframe: () => void;
  onOpenStagger?: () => void;
  onToggleViewMode?: (mode: "tracks" | "curves") => void;
}

export function formatTimecode(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  const mmm = String(ms).padStart(3, "0");
  return `${mm}:${ss}.${mmm}`;
}

export const PlayheadControls: React.FC<PlayheadControlsProps> = ({
  isPlaying,
  isLooping,
  playbackRate,
  currentTime,
  totalDuration,
  viewMode = "tracks",
  onTogglePlay,
  onStopReset,
  onToggleLoop,
  onReverse,
  onRateChange,
  onAddKeyframe,
  onOpenStagger,
  onToggleViewMode,
}) => {
  const rates = [0.25, 0.5, 1, 2];

  return (
    <div className="sequencer-toolbar" role="toolbar" aria-label="Sequencer Transport Controls">
      {/* Transport Buttons */}
      <div className="sequencer-transport">
        <button
          type="button"
          className="sequencer-btn"
          onClick={onStopReset}
          title="Stop & Reset to Start (Home)"
          aria-label="Stop and Reset"
        >
          <RotateCcw size={13} />
        </button>

        <button
          type="button"
          className="sequencer-btn"
          onClick={onReverse}
          title="Step Backward (Left Arrow)"
          aria-label="Step Backward"
        >
          <FastForward size={13} style={{ transform: "scaleX(-1)" }} />
        </button>

        <button
          type="button"
          className={`sequencer-btn ${isPlaying ? "sequencer-btn--active" : ""}`}
          onClick={onTogglePlay}
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>

        <button
          type="button"
          className={`sequencer-btn ${isLooping ? "sequencer-btn--active" : ""}`}
          onClick={onToggleLoop}
          title={isLooping ? "Loop Enabled" : "Loop Disabled"}
          aria-label="Toggle Loop"
        >
          <Repeat size={13} />
        </button>
      </div>

      {/* Timecode Readout */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
        <Clock size={12} style={{ color: "var(--text-tertiary)" }} />
        <span className="sequencer-timecode" title="Current Time / Total Duration">
          {formatTimecode(currentTime)} / {formatTimecode(totalDuration)}
        </span>
        <span className="sequencer-fps-badge" title="High-precision 120 FPS Spline Engine">
          120 FPS
        </span>
      </div>

      {/* Speed Rate Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
        <span style={{ fontSize: 10, color: "var(--text-tertiary)", marginRight: 2 }}>Speed:</span>
        {rates.map((r) => (
          <button
            key={r}
            type="button"
            className={`sequencer-rate-pill ${playbackRate === r ? "sequencer-rate-pill--active" : ""}`}
            onClick={() => onRateChange(r)}
            title={`Set playback speed to ${r}x`}
          >
            {r}x
          </button>
        ))}
      </div>

      {/* View Switcher: Tracks vs Graph/Curve View (After Effects / Rive folded style) */}
      {onToggleViewMode && (
        <div style={{ display: "flex", alignItems: "center", background: "var(--surface-panel-hover)", borderRadius: "var(--radius-xs)", padding: 2, gap: 2, marginRight: 8 }}>
          <button
            type="button"
            className={`sequencer-btn ${viewMode !== "curves" ? "sequencer-btn--active" : ""}`}
            style={{ width: "auto", padding: "0 8px", fontSize: 10, height: 22, gap: 4 }}
            onClick={() => onToggleViewMode("tracks")}
            title="Timeline Track View"
          >
            <ListTree size={11} />
            <span>Tracks</span>
          </button>
          <button
            type="button"
            className={`sequencer-btn ${viewMode === "curves" ? "sequencer-btn--active" : ""}`}
            style={{ width: "auto", padding: "0 8px", fontSize: 10, height: 22, gap: 4 }}
            onClick={() => onToggleViewMode("curves")}
            title="WASM Bezier Graph View"
          >
            <Activity size={11} />
            <span>Graph View</span>
          </button>
        </div>
      )}

      {/* Actions: Stagger & Add Keyframe */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
        {onOpenStagger && (
          <button
            type="button"
            className="sequencer-btn"
            onClick={onOpenStagger}
            title="Stagger & Ambient Loop Settings"
            style={{ width: "auto", padding: "0 8px", fontSize: 11, gap: 4 }}
          >
            <Zap size={11} style={{ color: "var(--accent-primary)" }} />
            <span>Stagger / Ambient</span>
          </button>
        )}

        <button
          type="button"
          className="sequencer-btn sequencer-btn--active"
          style={{ width: "auto", padding: "0 10px", fontSize: 11, gap: 4, height: 26 }}
          onClick={onAddKeyframe}
          title="Add keyframe at current playhead position"
        >
          <Plus size={12} />
          <span>+ Keyframe</span>
        </button>
      </div>
    </div>
  );
};
