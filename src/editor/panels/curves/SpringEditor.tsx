"use client";

/**
 * ============================================================================
 * FRAMER MOTION SPRING DYNAMICS VISUALIZER
 * ============================================================================
 * UI Element: SpringEditor (Unreal Equivalent: Physical Damped Spring Simulator)
 * Screen / Scope: Screen 05: Motion Sequencer & Bezier Curve Editor (`/editor`)
 * Role: Visualizes Framer Motion spring physics (stiffness, damping, mass) with
 *       a real-time oscillation curve graph and interactive bounce preview.
 * Styling Source: `@/editor/styles/sequencer.css`
 * Matches: ROADMAP.md Sub-Phase 4.2 & PANELS.md (Panel 06)
 * ============================================================================
 */

import React, { useState, useMemo } from "react";
import { Play, RotateCcw, Activity, Sparkles } from "lucide-react";

export interface SpringConfig {
  stiffness: number; // default: 100
  damping: number;   // default: 10
  mass: number;      // default: 1
}

export interface SpringEditorProps {
  initialConfig?: SpringConfig;
  onChange?: (config: SpringConfig) => void;
}

/**
 * Simulates a damped harmonic spring oscillator displacement over time:
 * m * x'' + c * x' + k * (x - 1) = 0
 * where initial x(0) = 0, target x = 1.
 */
export function simulateSpringPoints(
  stiffness: number,
  damping: number,
  mass: number,
  duration = 2.0,
  stepCount = 120
): Array<{ t: number; x: number }> {
  const m = Math.max(0.1, mass);
  const k = Math.max(1, stiffness);
  const c = Math.max(0, damping);

  // Natural angular frequency
  const omega0 = Math.sqrt(k / m);
  // Damping ratio
  const zeta = c / (2 * Math.sqrt(m * k));

  const points: Array<{ t: number; x: number }> = [];

  for (let i = 0; i <= stepCount; i++) {
    const t = (i / stepCount) * duration;
    let displacement = 0;

    if (zeta < 1) {
      // Underdamped (oscillates and settles)
      const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
      const envelope = Math.exp(-zeta * omega0 * t);
      const cosTerm = Math.cos(omegaD * t);
      const sinTerm = (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(omegaD * t);
      displacement = 1 - envelope * (cosTerm + sinTerm);
    } else if (Math.abs(zeta - 1) < 1e-4) {
      // Critically damped
      const envelope = Math.exp(-omega0 * t);
      displacement = 1 - envelope * (1 + omega0 * t);
    } else {
      // Overdamped
      const s1 = -omega0 * (zeta - Math.sqrt(zeta * zeta - 1));
      const s2 = -omega0 * (zeta + Math.sqrt(zeta * zeta - 1));
      const c1 = s2 / (s2 - s1);
      const c2 = -s1 / (s2 - s1);
      displacement = 1 + c1 * Math.exp(s1 * t) + c2 * Math.exp(s2 * t);
    }

    points.push({ t, x: displacement });
  }

  return points;
}

export const SpringEditor: React.FC<SpringEditorProps> = ({
  initialConfig = { stiffness: 120, damping: 12, mass: 1 },
  onChange,
}) => {
  const [config, setConfig] = useState<SpringConfig>(initialConfig);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const points = useMemo(() => {
    return simulateSpringPoints(config.stiffness, config.damping, config.mass, 2.0, 120);
  }, [config.stiffness, config.damping, config.mass]);

  const handleUpdate = (updated: Partial<SpringConfig>) => {
    const next = { ...config, ...updated };
    setConfig(next);
    if (onChange) onChange(next);
  };

  const handleTestBounce = () => {
    setIsPreviewing(false);
    setTimeout(() => setIsPreviewing(true), 20);
  };

  // Convert simulation points to SVG path within a 340x120 viewBox
  const svgWidth = 340;
  const svgHeight = 120;
  const padding = 16;
  const graphW = svgWidth - padding * 2;
  const graphH = svgHeight - padding * 2;

  const pathD = useMemo(() => {
    return points
      .map((pt, idx) => {
        const svgX = padding + (pt.t / 2.0) * graphW;
        // Target 1.0 is at y = 0.5 * graphH
        // 0.0 is at y = graphH
        const svgY = padding + graphH - pt.x * (graphH * 0.7);
        return `${idx === 0 ? "M" : "L"} ${svgX.toFixed(1)} ${svgY.toFixed(1)}`;
      })
      .join(" ");
  }, [points, graphW, graphH]);

  return (
    <div className="spring-editor-shell" role="region" aria-label="Spring Physics Simulator">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Activity size={14} style={{ color: "var(--accent-primary)" }} />
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Spring Dynamics (Framer Motion)</span>
        </div>
        <button
          type="button"
          className="cb-pill cb-pill--active"
          onClick={handleTestBounce}
          style={{ height: 24, fontSize: 11, padding: "0 8px" }}
        >
          <Play size={11} />
          <span>Test Spring</span>
        </button>
      </div>

      {/* SVG Oscillation Waveform Graph */}
      <svg className="spring-graph-svg" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        {/* Baseline at 0 and target at 1 */}
        <line
          x1={padding}
          y1={padding + graphH}
          x2={padding + graphW}
          y2={padding + graphH}
          stroke="var(--border-strong)"
          strokeWidth="1"
        />
        <line
          x1={padding}
          y1={padding + graphH - 1.0 * (graphH * 0.7)}
          x2={padding + graphW}
          y2={padding + graphH - 1.0 * (graphH * 0.7)}
          stroke="var(--accent-info)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <text
          x={padding + 4}
          y={padding + graphH - 1.0 * (graphH * 0.7) - 4}
          fill="var(--accent-info)"
          fontSize="9"
          fontFamily="var(--font-mono)"
        >
          Target: 1.0
        </text>

        {/* Spring curve */}
        <path d={pathD} fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" />
      </svg>

      {/* Interactive Ball Preview */}
      <div
        style={{
          height: 48,
          background: "var(--canvas-bg)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          key={isPreviewing ? "run" : "idle"}
          style={{
            width: 28,
            height: 28,
            borderRadius: "var(--radius-full)",
            background: "linear-gradient(135deg, var(--accent-primary), var(--accent-info))",
            boxShadow: "var(--shadow-sm)",
            transform: isPreviewing ? "translateX(240px)" : "translateX(0px)",
            transition: isPreviewing
              ? `transform 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)`
              : "none",
          }}
        />
        <span style={{ position: "absolute", right: 16, fontSize: 10, color: "var(--text-tertiary)" }}>
          Target Rest Position
        </span>
      </div>

      {/* Sliders for Stiffness, Damping, Mass */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-md)" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
            <span>Stiffness (k):</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{config.stiffness}</span>
          </div>
          <input
            type="range"
            min={10}
            max={500}
            value={config.stiffness}
            onChange={(e) => handleUpdate({ stiffness: parseFloat(e.target.value) })}
            className="form-range"
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
            <span>Damping (c):</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{config.damping}</span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            value={config.damping}
            onChange={(e) => handleUpdate({ damping: parseFloat(e.target.value) })}
            className="form-range"
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
            <span>Mass (m):</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{config.mass}</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={5}
            step={0.1}
            value={config.mass}
            onChange={(e) => handleUpdate({ mass: parseFloat(e.target.value) })}
            className="form-range"
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
};
