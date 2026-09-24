"use client";

/**
 * ============================================================================
 * SCROLLTRIGGER THRESHOLD VISUALIZER & SIMULATOR
 * ============================================================================
 * UI Element: ScrollTriggerBar (Unreal Equivalent: Trigger Volumes & Scrub Rail)
 * Screen / Scope: Screen 05: Motion Sequencer & Bezier Curve Editor (`/editor`)
 * Role: Visualizes ScrollTrigger threshold lines (`start`, `end`), scrub toggle,
 *       pin container options, and provides a viewport scroll simulator slider.
 * Styling Source: `@/editor/styles/sequencer.css`
 * Matches: ROADMAP.md Sub-Phase 4.3 & PANELS.md (Panel 05)
 * ============================================================================
 */

import React, { useState } from "react";
import { ScrollTriggerConfig } from "@/core/elements/types";
import { Sliders, Anchor, Eye, Compass } from "lucide-react";

export interface ScrollTriggerBarProps {
  config?: ScrollTriggerConfig;
  onUpdateConfig: (updated: ScrollTriggerConfig) => void;
  onSimulateScroll?: (progress: number) => void;
}

export const ScrollTriggerBar: React.FC<ScrollTriggerBarProps> = ({
  config = {
    start: "top 80%",
    end: "bottom 20%",
    scrub: true,
    pin: false,
    markers: true,
  },
  onUpdateConfig,
  onSimulateScroll,
}) => {
  const [simProgress, setSimProgress] = useState(0);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSimProgress(val);
    if (onSimulateScroll) {
      onSimulateScroll(val / 100);
    }
  };

  const isScrubActive = Boolean(config.scrub);
  const isPinActive = Boolean(config.pin);

  return (
    <div className="scrolltrigger-bar" role="region" aria-label="ScrollTrigger Visualizer & Scrub Simulator">
      {/* ScrollTrigger Settings */}
      <div className="scrolltrigger-markers">
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Compass size={13} style={{ color: "var(--accent-info)" }} />
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>ScrollTrigger:</span>
        </div>

        {/* Start threshold */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Start:</span>
          <input
            type="text"
            className="form-input"
            style={{ width: 72, height: 22, fontSize: 10, padding: "0 4px", fontFamily: "var(--font-mono)" }}
            value={config.start || "top 80%"}
            onChange={(e) => onUpdateConfig({ ...config, start: e.target.value })}
            title="Trigger start line (e.g. 'top 80%')"
          />
        </div>

        {/* End threshold */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>End:</span>
          <input
            type="text"
            className="form-input"
            style={{ width: 72, height: 22, fontSize: 10, padding: "0 4px", fontFamily: "var(--font-mono)" }}
            value={config.end || "bottom 20%"}
            onChange={(e) => onUpdateConfig({ ...config, end: e.target.value })}
            title="Trigger end line (e.g. 'bottom 20%')"
          />
        </div>

        {/* Scrub Toggle */}
        <button
          type="button"
          className={`cb-pill ${isScrubActive ? "cb-pill--active" : ""}`}
          style={{ height: 22, fontSize: 10, padding: "0 6px" }}
          onClick={() => onUpdateConfig({ ...config, scrub: !isScrubActive })}
          title="Link animation playback directly to scroll position"
        >
          <Sliders size={10} />
          <span>Scrub {isScrubActive ? "ON" : "OFF"}</span>
        </button>

        {/* Pin Container Toggle */}
        <button
          type="button"
          className={`cb-pill ${isPinActive ? "cb-pill--active" : ""}`}
          style={{ height: 22, fontSize: 10, padding: "0 6px" }}
          onClick={() => onUpdateConfig({ ...config, pin: !isPinActive })}
          title="Pin element container while scrolling between start & end"
        >
          <Anchor size={10} />
          <span>Pin {isPinActive ? "ON" : "OFF"}</span>
        </button>
      </div>

      {/* Viewport Scroll Simulator */}
      <div className="scrolltrigger-sim-track">
        <span style={{ fontSize: 10, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
          Scroll Sim:
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={simProgress}
          onChange={handleSliderChange}
          className="scrolltrigger-slider"
          title={`Simulate scroll progress: ${simProgress}%`}
        />
        <span className="scrolltrigger-badge">{simProgress}%</span>
      </div>
    </div>
  );
};
