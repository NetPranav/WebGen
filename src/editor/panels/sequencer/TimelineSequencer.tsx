"use client";

/**
 * ============================================================================
 * MOTION BLUEPRINT & TIMELINE SEQUENCER PANEL
 * ============================================================================
 * UI Element: Motion Blueprint & GSAP Sequencer (Unreal Equivalent: Sequencer)
 * Screen / Scope: Screen 06: Motion Blueprint & Sequencer (`/editor`)
 * Role: Multi-track keyframe animation timeline for manual property animating.
 * Styling Source: `@/editor/styles/panels.css` & `@/editor/styles/forms.css`
 * Matches: PANELS.md (Panel 06) & UI.md §4.7
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Repeat,
  Plus,
  Eye,
  Lock,
  Film,
  Sparkles,
  ChevronRight,
  Layers,
} from "lucide-react";
import "@/editor/styles/panels.css";
import "@/editor/styles/forms.css";

interface Keyframe {
  id: string;
  timeSec: number;
  value: string;
}

interface Track {
  id: string;
  name: string;
  property: string;
  keyframes: Keyframe[];
}

const INITIAL_TRACKS: Track[] = [
  {
    id: "tr_opacity",
    name: "Hero Section",
    property: "Opacity",
    keyframes: [
      { id: "kf_1", timeSec: 0.0, value: "0%" },
      { id: "kf_2", timeSec: 0.6, value: "100%" },
    ],
  },
  {
    id: "tr_trans_y",
    name: "Hero Section",
    property: "Transform Y",
    keyframes: [
      { id: "kf_3", timeSec: 0.0, value: "40px" },
      { id: "kf_4", timeSec: 0.8, value: "0px" },
    ],
  },
  {
    id: "tr_scale",
    name: "Hero Section",
    property: "Scale",
    keyframes: [
      { id: "kf_5", timeSec: 0.0, value: "0.95" },
      { id: "kf_6", timeSec: 0.8, value: "1.00" },
    ],
  },
  {
    id: "tr_btn_hover",
    name: "CTA Button",
    property: "Hover Scale",
    keyframes: [
      { id: "kf_7", timeSec: 0.8, value: "1.00" },
      { id: "kf_8", timeSec: 1.2, value: "1.05" },
      { id: "kf_9", timeSec: 1.6, value: "1.00" },
    ],
  },
  {
    id: "tr_badge_float",
    name: "Release Badge",
    property: "Entrance Float",
    keyframes: [
      { id: "kf_10", timeSec: 0.2, value: "-10px" },
      { id: "kf_11", timeSec: 0.9, value: "0px" },
    ],
  },
];

export const TimelineSequencer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0.8);
  const [isLooping, setIsLooping] = useState(true);
  const [activeTrack, setActiveTrack] = useState("tr_opacity");
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [selectedKeyframe, setSelectedKeyframe] = useState<string | null>("kf_4");

  const totalDuration = 2.0; // 2.0 seconds
  const pixelsPerSecond = 320; // 320px per second on timeline

  // Playhead animation loop
  useEffect(() => {
    let animFrame: number;
    let lastTimestamp = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= totalDuration) {
            return isLooping ? 0 : totalDuration;
          }
          return next;
        });
      }
      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, isLooping, totalDuration]);

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min(clickX / pixelsPerSecond, totalDuration));
    setCurrentTime(newTime);
  };

  const playheadPixel = currentTime * pixelsPerSecond;

  return (
    <div className="sequencer-shell" role="region" aria-label="Motion Sequencer Timeline">
      {/* Sequencer Toolbar */}
      <div className="sequencer-toolbar">
        {/* Playback Controls */}
        <div className="sequencer-playback">
          <button
            type="button"
            className="panel-icon-btn"
            onClick={handleStop}
            title="Stop & Reset to Start"
          >
            <RotateCcw size={13} />
          </button>

          <button
            type="button"
            className={`panel-icon-btn ${isPlaying ? "panel-icon-btn--active" : ""}`}
            onClick={handleTogglePlay}
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>

          <button
            type="button"
            className={`panel-icon-btn ${isLooping ? "panel-icon-btn--active" : ""}`}
            onClick={() => setIsLooping(!isLooping)}
            title="Loop Playback"
          >
            <Repeat size={13} />
          </button>
        </div>

        {/* Time Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
          <span className="sequencer-time-badge">
            {currentTime.toFixed(2)}s / {totalDuration.toFixed(2)}s
          </span>
          <span className="panel-header__badge">120 FPS GSAP</span>
        </div>

        {/* Easing & Keyframe Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
            <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Easing:</span>
            <select className="form-select" style={{ height: 24, width: 140, fontSize: 11 }} defaultValue="power2">
              <option value="power2">Power2.easeOut</option>
              <option value="elastic">Elastic.easeOut</option>
              <option value="bounce">Bounce.easeOut</option>
              <option value="linear">Linear</option>
            </select>
          </div>

          <button
            type="button"
            className="cb-pill cb-pill--active"
            style={{ height: 24, fontSize: 11, padding: "0 10px" }}
            title="Add keyframe at current playhead"
          >
            <Plus size={11} />
            <span>Keyframe</span>
          </button>
        </div>
      </div>

      {/* Sequencer Main Layout */}
      <div className="sequencer-layout">
        {/* Left Tracks Column */}
        <div className="sequencer-tracks-col">
          <div className="sequencer-tracks-header">
            <span>Animated Tracks</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{tracks.length}</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {tracks.map((track) => (
              <div
                key={track.id}
                className={`sequencer-track-item ${
                  activeTrack === track.id ? "sequencer-track-item--active" : ""
                }`}
                onClick={() => setActiveTrack(track.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                  <Film size={11} style={{ color: "var(--accent-primary)", flexShrink: 0 }} />
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {track.property}
                  </span>
                </div>
                <span style={{ fontSize: 9, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                  {track.keyframes.length} kf
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Timeline Grid & Keyframe Stage */}
        <div className="sequencer-timeline-col" onClick={handleTimelineClick}>
          {/* Ruler */}
          <div className="sequencer-ruler" style={{ width: `${pixelsPerSecond * totalDuration + 100}px` }}>
            {[0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((sec) => (
              <div
                key={sec}
                className="sequencer-ruler-mark"
                style={{ left: `${sec * pixelsPerSecond}px` }}
              >
                <span>{sec.toFixed(2)}s</span>
              </div>
            ))}
          </div>

          {/* Keyframe Lanes */}
          <div className="sequencer-lanes" style={{ width: `${pixelsPerSecond * totalDuration + 100}px` }}>
            {tracks.map((track) => (
              <div key={track.id} className="sequencer-lane">
                {/* Horizontal grid lines */}
                {track.keyframes.map((kf) => (
                  <div
                    key={kf.id}
                    className="sequencer-keyframe-diamond"
                    style={{
                      left: `${kf.timeSec * pixelsPerSecond}px`,
                      backgroundColor:
                        selectedKeyframe === kf.id ? "var(--accent-warning)" : "var(--accent-primary)",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedKeyframe(kf.id);
                      setCurrentTime(kf.timeSec);
                    }}
                    title={`${track.property}: ${kf.value} @ ${kf.timeSec}s`}
                  />
                ))}
              </div>
            ))}

            {/* Playhead Line with Handle */}
            <div
              className="sequencer-playhead"
              style={{ transform: `translateX(${playheadPixel}px)` }}
            >
              <div className="sequencer-playhead-head" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
