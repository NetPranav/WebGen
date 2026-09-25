"use client";

/**
 * ============================================================================
 * PANEL 11: MOTIONAI CO-PILOT ASSISTANT
 * ============================================================================
 * UI Element: MotionAI Co-Pilot Assistant Studio / Docked Inspector
 * Screen / Scope: Screen 09: MotionAI Co-Pilot Assistant / Panel 11 (PANELS.md)
 * Role: Provides conversational AI prompt interface for animation generation,
 *       curated per-family preset browsing (51 presets), visual ghost diffing,
 *       and real-time GPU performance diagnostics.
 * Architecture Ref: ROADMAP.md §Phase 7 & PANELS.md §Panel 11
 * ============================================================================
 */

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers,
  Wand2,
  Flame,
  Search,
  Check,
  X,
  Play,
  Activity,
  Cpu,
} from "lucide-react";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { motionAiEngine, MotionAiResponse } from "@/core/ai/MotionAiEngine";
import { ALL_PRESETS, getPresetsForArchetype, instantiatePreset, MotionPreset } from "@/core/motion/presets";
import { motionDiagnostics, MotionDiagnosticIssue } from "@/core/ai/MotionDiagnostics";
import { DiffPreview } from "./DiffPreview";
import { documentCommands, useLayer, useLayerClips } from "@/core/store/useDocumentStore";
import { getArchetype } from "@/core/document/registry";
import { toClipTemplate } from "@/core/document/factories";
import type { ClipTemplate } from "@/core/document/schema";

export interface MotionAICoPilotProps {
  onClose?: () => void;
  style?: React.CSSProperties;
}

export const MotionAICoPilot: React.FC<MotionAICoPilotProps> = ({ onClose, style }) => {
  const activeElementId = useSelectionStore((s) => s.selectedId);
  const activeElement = useLayer(activeElementId) ?? null;
  const activeClips = useLayerClips(activeElementId);
  const activeFamily = activeElement ? getArchetype(activeElement.archetype).family : null;

  /** Replaces the active layer's stack, swapping out any clip with the same trigger. */
  const replaceClipForTrigger = (clip: ClipTemplate, label: string) => {
    if (!activeElement) return;
    const others = activeClips.filter((c) => c.trigger !== clip.trigger).map(toClipTemplate);
    documentCommands.setLayerClips(activeElement.id, [...others, clip], label);
  };

  const [activeTab, setActiveTab] = useState<"choreography" | "presets" | "diagnostics">("choreography");
  const [promptInput, setPromptInput] = useState("");
  const [activeDiff, setActiveDiff] = useState<MotionAiResponse | null>(null);
  const [presetSearch, setPresetSearch] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  // Quick prompt suggestions based on active element family
  const quickPrompts = useMemo(() => {
    if (!activeElement) return ["Add an entrance fade and lift", "Add a subtle float idle"];
    switch (activeFamily) {
      case "interactive":
        return [
          "Add an elastic bounce on tap",
          "Magnetic hover spring pull",
          "Tactile button compression",
          "Breathing glow idle loop",
        ];
      case "media":
        return [
          "Add a slow Ken Burns zoom to this image",
          "Cinematic blur-up reveal on mount",
          "Grayscale to color on hover",
          "Circle clip-path reveal",
        ];
      case "structural":
        return [
          "Give this background a slow sunrise gradient drift",
          "Make this divider draw in from the center on scroll",
          "Film grain noise pulse loop",
          "Aurora borealis shifting color mesh",
        ];
      case "text":
        return [
          "Reveal text with word-by-word stagger cascade",
          "Character pop entrance",
          "Kinetic type tracking expand",
          "NYT editorial fade up reveal",
        ];
      default:
        return ["Add entrance reveal", "Add hover scale"];
    }
  }, [activeElement, activeFamily]);

  // Handle Prompt Submission
  const handleSubmitPrompt = (textToSubmit?: string) => {
    const prompt = textToSubmit || promptInput;
    if (!prompt.trim() || !activeElement) return;

    const res = motionAiEngine.generateMotion({
      prompt,
      targetElement: activeElement,
      existingAnimations: activeClips,
    });

    setActiveDiff(res);
    setPromptInput("");
  };

  // Accept Ghost Motion
  const handleAcceptGhost = () => {
    if (!activeDiff?.ghostAnimation || !activeElement) return;

    // Replace if same trigger exists or append
    replaceClipForTrigger(activeDiff.ghostAnimation, "AI: accept ghost motion");

    setNotification(`Accepted motion: "${activeDiff.ghostAnimation.name}" merged cleanly.`);
    setActiveDiff(null);
    setTimeout(() => setNotification(null), 3000);
  };

  // Discard Ghost Motion
  const handleDiscardGhost = () => {
    setActiveDiff(null);
  };

  // Presets Partitioned for Active Archetype
  const presetPartition = useMemo(() => {
    if (!activeElement) return { available: ALL_PRESETS, blocked: [] };
    return getPresetsForArchetype(activeElement.archetype);
  }, [activeElement]);

  const filteredPresets = useMemo(() => {
    let list = presetPartition.available;
    if (presetSearch.trim()) {
      const q = presetSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [presetPartition, presetSearch]);

  // Apply Preset
  const handleApplyPreset = (preset: MotionPreset) => {
    if (!activeElement) return;
    const instantiated = instantiatePreset(preset.id);
    if (!instantiated) return;

    replaceClipForTrigger(instantiated, `Apply preset: ${preset.name}`);

    setNotification(`Applied preset "${preset.name}" to ${activeElement.name}`);
    setTimeout(() => setNotification(null), 3000);
  };

  // Stage Preset as Ghost
  const handleStagePresetGhost = (preset: MotionPreset) => {
    if (!activeElement) return;
    const instantiated = instantiatePreset(preset.id);
    if (!instantiated) return;

    setActiveDiff({
      success: true,
      intent: preset.name,
      targetFamily: activeFamily,
      targetArchetype: activeElement.archetype,
      ghostAnimation: instantiated,
      diffSummary: {
        addedTracks: instantiated.tracks?.map((t) => t.property) || [],
        modifiedTracks: [],
        description: `Staging preset "${preset.name}" (${preset.badge})`,
      },
      explanation: preset.description,
    });
  };

  // Diagnostics
  const diagnosticIssues = useMemo(() => {
    if (!activeElement) return [];
    return motionDiagnostics.analyze(activeElement, activeClips);
  }, [activeElement, activeClips]);

  const handleAutoFix = (issue: MotionDiagnosticIssue) => {
    if (!issue.fixAction) return;
    if (!activeElement) return;
    const { propsPatch, updatedAnimations } = issue.fixAction();
    // One undo step for both changes.
    const tx = documentCommands.begin(`Auto-fix: ${issue.title}`);
    documentCommands.updateProps(activeElement.id, propsPatch);
    documentCommands.setLayerClips(activeElement.id, updatedAnimations);
    tx.commit();
    setNotification(`Resolved: ${issue.title}`);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "#0c1012",
        color: "#e5e7eb",
        fontFamily: "Inter, sans-serif",
        borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "#11181c",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
              borderRadius: "6px",
              background: "#206859",
              color: "#ffffff",
            }}
          >
            <Sparkles size={14} />
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#f3f4f6" }}>MotionAI Co-Pilot</div>
            <div style={{ fontSize: "10px", color: "#9ca3af" }}>
              {activeElement ? `${activeElement.name} (${activeElement.archetype})` : "Select an element to choreograph"}
            </div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "#0e1417",
          padding: "0 8px",
        }}
      >
        <button
          onClick={() => setActiveTab("choreography")}
          style={{
            flex: 1,
            padding: "8px 4px",
            fontSize: "12px",
            fontWeight: activeTab === "choreography" ? 600 : 400,
            color: activeTab === "choreography" ? "#34d399" : "#9ca3af",
            borderBottom: activeTab === "choreography" ? "2px solid #206859" : "2px solid transparent",
            background: "transparent",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
          }}
        >
          Prompt AI
        </button>
        <button
          onClick={() => setActiveTab("presets")}
          style={{
            flex: 1,
            padding: "8px 4px",
            fontSize: "12px",
            fontWeight: activeTab === "presets" ? 600 : 400,
            color: activeTab === "presets" ? "#34d399" : "#9ca3af",
            borderBottom: activeTab === "presets" ? "2px solid #206859" : "2px solid transparent",
            background: "transparent",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
          }}
        >
          Presets (51)
        </button>
        <button
          onClick={() => setActiveTab("diagnostics")}
          style={{
            flex: 1,
            padding: "8px 4px",
            fontSize: "12px",
            fontWeight: activeTab === "diagnostics" ? 600 : 400,
            color: activeTab === "diagnostics" ? "#34d399" : "#9ca3af",
            borderBottom: activeTab === "diagnostics" ? "2px solid #206859" : "2px solid transparent",
            background: "transparent",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
          }}
        >
          Diagnostics {diagnosticIssues.length > 0 && `(${diagnosticIssues.length})`}
        </button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.15)",
            borderBottom: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#6ee7b7",
            padding: "6px 12px",
            fontSize: "11px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <CheckCircle2 size={12} /> {notification}
        </div>
      )}

      {/* Body Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        {/* TAB 1: Choreography */}
        {activeTab === "choreography" && (
          <div>
            <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "8px" }}>
              Choreograph animations in natural language. Proposed tracks stage as translucent green ghost keyframes for approval.
            </div>

            {/* Quick Prompt Pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
              {quickPrompts.map((qp) => (
                <button
                  key={qp}
                  onClick={() => handleSubmitPrompt(qp)}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "14px",
                    padding: "4px 10px",
                    fontSize: "11px",
                    color: "#d1d5db",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(32, 104, 89, 0.25)";
                    (e.currentTarget as HTMLElement).style.borderColor = "#206859";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.05)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255, 255, 255, 0.1)";
                  }}
                >
                  ⚡ {qp}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmitPrompt()}
                placeholder="e.g. Add a slow Ken Burns zoom to this image..."
                style={{
                  flex: 1,
                  background: "#161e22",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  fontSize: "12px",
                  color: "#f3f4f6",
                  outline: "none",
                }}
              />
              <button
                onClick={() => handleSubmitPrompt()}
                style={{
                  background: "#206859",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 14px",
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Send size={14} />
              </button>
            </div>

            {/* Diff Preview / Rule 6.1 Alert */}
            {activeDiff && (
              <div>
                {activeDiff.success && activeDiff.ghostAnimation ? (
                  <DiffPreview
                    ghostAnimation={activeDiff.ghostAnimation}
                    diffSummary={activeDiff.diffSummary}
                    onAccept={handleAcceptGhost}
                    onDiscard={handleDiscardGhost}
                  />
                ) : (
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: "8px",
                      padding: "12px",
                      marginTop: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#f87171", fontWeight: 700, fontSize: "12px" }}>
                      <AlertTriangle size={14} /> {activeDiff.ruleViolation?.rule || "Motion Blocked"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#d1d5db", marginTop: "6px", lineHeight: "1.4" }}>
                      {activeDiff.explanation}
                    </div>
                    {activeDiff.suggestedPromptAlternatives && (
                      <div style={{ marginTop: "10px" }}>
                        <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "4px" }}>Recommended Alternatives:</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {activeDiff.suggestedPromptAlternatives.map((alt) => (
                            <button
                              key={alt}
                              onClick={() => handleSubmitPrompt(alt)}
                              style={{
                                textAlign: "left",
                                background: "rgba(255, 255, 255, 0.04)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                color: "#6ee7b7",
                                cursor: "pointer",
                              }}
                            >
                              ➔ {alt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Curated Presets */}
        {activeTab === "presets" && (
          <div>
            <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#161e22",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  flex: 1,
                }}
              >
                <Search size={14} color="#9ca3af" />
                <input
                  type="text"
                  value={presetSearch}
                  onChange={(e) => setPresetSearch(e.target.value)}
                  placeholder="Search 51 presets..."
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: "11px",
                    color: "#f3f4f6",
                    width: "100%",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredPresets.map((preset) => (
                <div
                  key={preset.id}
                  style={{
                    background: "#161e22",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "6px",
                    padding: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#f3f4f6" }}>{preset.name}</span>
                    <span
                      style={{
                        fontSize: "10px",
                        background: "rgba(32, 104, 89, 0.25)",
                        color: "#34d399",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        fontWeight: 600,
                      }}
                    >
                      {preset.badge}
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "8px", lineHeight: "1.3" }}>
                    {preset.description}
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => handleStagePresetGhost(preset)}
                      style={{
                        flex: 1,
                        background: "rgba(16, 185, 129, 0.12)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        color: "#34d399",
                        borderRadius: "4px",
                        padding: "5px 8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Preview Ghost
                    </button>
                    <button
                      onClick={() => handleApplyPreset(preset)}
                      style={{
                        background: "#206859",
                        border: "none",
                        color: "#ffffff",
                        borderRadius: "4px",
                        padding: "5px 10px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              ))}

              {/* Blocked Presets Explanatory Notice (Rule 6.1) */}
              {presetPartition.blocked.length > 0 && (
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px dashed rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    padding: "10px",
                    marginTop: "8px",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", marginBottom: "4px" }}>
                    Disabled by Rule 6.1 Category Contract ({presetPartition.blocked.length})
                  </div>
                  <div style={{ fontSize: "10px", color: "#6b7280" }}>
                    {presetPartition.blocked[0]?.reason}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Diagnostics */}
        {activeTab === "diagnostics" && (
          <div>
            <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "10px" }}>
              Active performance checks for GPU frame timing, heavy SVG vertex counts, and layout reflows.
            </div>

            {diagnosticIssues.length === 0 ? (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderRadius: "8px",
                  padding: "16px",
                  textAlign: "center",
                }}
              >
                <CheckCircle2 size={24} color="#10b981" style={{ margin: "0 auto 8px" }} />
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#34d399" }}>
                  All Performance Checks Passed
                </div>
                <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
                  Zero layout reflows, optimal SVG point counts, and efficient GPU compositing confirmed.
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {diagnosticIssues.map((issue) => (
                  <div
                    key={issue.id}
                    style={{
                      background: "#161e22",
                      border: `1px solid ${issue.severity === "error" ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                      borderRadius: "6px",
                      padding: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#f3f4f6" }}>{issue.title}</span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: issue.severity === "error" ? "#f87171" : "#fbbf24",
                          textTransform: "uppercase",
                        }}
                      >
                        {issue.severity}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "6px" }}>{issue.message}</div>
                    <div style={{ fontSize: "10px", color: "#6ee7b7", marginBottom: "8px" }}>
                      Fix: {issue.suggestedFix}
                    </div>
                    {issue.autoFixable && (
                      <button
                        onClick={() => handleAutoFix(issue)}
                        style={{
                          background: "#206859",
                          border: "none",
                          borderRadius: "4px",
                          color: "#ffffff",
                          padding: "5px 10px",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Wand2 size={12} /> 1-Click Auto-Fix
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
