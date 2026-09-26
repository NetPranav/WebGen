"use client";

/**
 * ============================================================================
 * DETAILS INSPECTOR: MOTION & ANIMATION SECTION
 * ============================================================================
 * Context-aware animation sample manager for the Details Inspector.
 * Attaches GSAP-compatible keyframe motion curves to elements, validates
 * track compatibility per archetype, and provides interactive scrubbing.
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.5 & SCHEMA_REFERENCE.md §13
 * ============================================================================
 */

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Plus,
  Play,
  Pause,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  Trash2,
} from "lucide-react";
import { useProjectStore } from "@/core/store/useProjectStore";
import {
  AnimationSample,
  AnimationTrigger,
  CubicBezierHandle,
} from "@/core/types/animations";
import type { ArchetypeId } from "@/core/document/registry";
// Phase 8, Sub-Phase 8.4: track compatibility goes through the rules engine, not the validator directly.
import { validateTrackCompatibility } from "@/core/rules";
import { KeyframeTimeline } from "../controls/KeyframeTimeline";
import { BezierCurveModal } from "../controls/BezierCurveModal";
import "@/editor/styles/panels.css";
import "@/editor/styles/forms.css";
import { documentCommands, useLayer } from "@/core/store/useDocumentStore";

interface AnimationEditorProps {
  elementId: string;
  elementName?: string;
  archetype?: ArchetypeId;
}

export const AnimationEditor: React.FC<AnimationEditorProps> = ({
  elementId,
  elementName = "Element",
  archetype = "button",
}) => {
  const { animationSamples, registerAnimationSample } = useProjectStore();
  const element = useLayer(elementId);

  const [isBezierModalOpen, setIsBezierModalOpen] = useState(false);

  const attachedSampleId = element?.properties?.["motion.attachedSampleId"] as string | undefined;
  const attachedTrigger = (element?.properties?.["motion.trigger"] as AnimationTrigger) || "onMount";

  const allSamples = Object.values(animationSamples);
  const activeSample = attachedSampleId ? animationSamples[attachedSampleId] : allSamples[0];

  // Evaluate track compatibility in real time via the Phase 8 rules engine
  const compatibilityResult = useMemo(() => {
    if (!activeSample) return null;
    return validateTrackCompatibility(activeSample, {
      elementId,
      elementName,
      archetype,
    });
  }, [activeSample, archetype, elementId, elementName]);

  const handleAttachSample = (sampleId: string) => {
    documentCommands.updateProps(elementId, { "motion.attachedSampleId": sampleId }, `Attach animation '${sampleId}'`);
  };

  const handleDetachSample = () => {
    documentCommands.updateProps(elementId, { "motion.attachedSampleId": undefined }, "Detach animation");
  };

  const handleTriggerChange = (trigger: AnimationTrigger) => {
    documentCommands.updateProps(elementId, { "motion.trigger": trigger }, `Set animation trigger to '${trigger}'`);
  };

  const handleCurveChange = (curve: CubicBezierHandle) => {
    if (!activeSample) return;
    const cssStr = `cubic-bezier(${curve[0]}, ${curve[1]}, ${curve[2]}, ${curve[3]})`;
    const updatedSample: AnimationSample = {
      ...activeSample,
      easing: cssStr,
    };
    registerAnimationSample(updatedSample, `Update easing curve for ${activeSample.id}`);
  };

  const parsedHandle: CubicBezierHandle = useMemo(() => {
    if (activeSample?.easing?.startsWith("cubic-bezier")) {
      const match = activeSample.easing.match(/cubic-bezier\(([^)]+)\)/);
      if (match && match[1]) {
        const parts = match[1].split(",").map((s) => Number(s.trim()));
        if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
          return [parts[0], parts[1], parts[2], parts[3]];
        }
      }
    }
    return [0.4, 0.0, 0.2, 1.0];
  }, [activeSample]);

  const rejectedTrackNames = compatibilityResult?.rejectedTracks.map((r) => r.track.trackId) || [];

  return (
    <div className="animation-editor-section" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={12} style={{ color: "var(--accent-primary)" }} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Motion & Animation
          </span>
        </div>

        {attachedSampleId && (
          <button
            type="button"
            onClick={handleDetachSample}
            className="panel-icon-btn"
            title="Detach animation from element"
            style={{ color: "var(--text-muted)", width: 20, height: 20 }}
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>

      {/* Sample Selector Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
        <select
          className="form-select"
          value={attachedSampleId || "none"}
          onChange={(e) => {
            if (e.target.value === "none") handleDetachSample();
            else handleAttachSample(e.target.value);
          }}
          style={{ height: 26, fontSize: 11 }}
        >
          <option value="none">No Animation Attached</option>
          {allSamples.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.duration}ms)
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setIsBezierModalOpen(true)}
          className="panel-icon-btn"
          title="Customize Bezier Easing Curve"
          disabled={!attachedSampleId}
          style={{ width: 26, height: 26, border: "1px solid var(--border-default)" }}
        >
          <Activity size={12} />
        </button>
      </div>

      {/* If an animation is attached, show trigger, timeline scrubber, and compatibility feedback */}
      {attachedSampleId && activeSample && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Row: Trigger Selector */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  marginBottom: 3,
                  textTransform: "uppercase",
                }}
              >
                Trigger
              </label>
              <select
                className="form-select"
                value={attachedTrigger}
                onChange={(e) => handleTriggerChange(e.target.value as AnimationTrigger)}
                style={{ height: 24, fontSize: 10.5, width: "100%" }}
              >
                <option value="onMount">On Page Load (Mount)</option>
                <option value="onHover">On Hover</option>
                <option value="onClick">On Click</option>
                <option value="onScroll">On Scroll into View</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  marginBottom: 3,
                  textTransform: "uppercase",
                }}
              >
                Duration / Easing
              </label>
              <div
                style={{
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 8px",
                  backgroundColor: "var(--surface-1)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={activeSample.easing}
              >
                {activeSample.duration}ms ({activeSample.easing})
              </div>
            </div>
          </div>

          {/* Keyframe Timeline Scrubber */}
          <KeyframeTimeline sample={activeSample} />

          {/* Archetype Compatibility Real-time Verification Badge */}
          {compatibilityResult && (
            <div
              style={{
                padding: "6px 8px",
                borderRadius: "var(--radius-sm)",
                backgroundColor:
                  rejectedTrackNames.length === 0
                    ? "rgba(34, 197, 94, 0.1)"
                    : "rgba(245, 158, 11, 0.12)",
                border: `1px solid ${
                  rejectedTrackNames.length === 0
                    ? "rgba(34, 197, 94, 0.3)"
                    : "rgba(245, 158, 11, 0.35)"
                }`,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                fontSize: 10.5,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {rejectedTrackNames.length === 0 ? (
                  <>
                    <CheckCircle2 size={13} style={{ color: "#22c55e", flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: "#22c55e" }}>
                      All tracks compatible with &lsquo;{archetype}&rsquo;
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={13} style={{ color: "#f59e0b", flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: "#f59e0b" }}>
                      {rejectedTrackNames.length} track(s) incompatible with &lsquo;{archetype}&rsquo;
                    </span>
                  </>
                )}
              </div>

              {rejectedTrackNames.length > 0 && (
                <div style={{ color: "var(--text-secondary)", fontSize: 9.5, lineHeight: 1.3 }}>
                  Incompatible: <strong>{rejectedTrackNames.join(", ")}</strong>. Trapped and safely skipped via [ANIM_COMPAT] diagnostic.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bezier Curve Modal */}
      <BezierCurveModal
        isOpen={isBezierModalOpen}
        onClose={() => setIsBezierModalOpen(false)}
        initialHandle={parsedHandle}
        onApply={handleCurveChange}
      />
    </div>
  );
};
