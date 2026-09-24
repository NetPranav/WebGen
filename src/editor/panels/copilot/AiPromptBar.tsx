"use client";

/**
 * ============================================================================
 * PANEL 18: AI CO-PILOT ASSISTANT & AST DIAGNOSTIC STUDIO
 * ============================================================================
 * UI Element: AI Co-Pilot Assistant Studio / Floating & Docked Inspector
 * Screen / Scope: Screen 16: AI Co-Pilot Assistant Studio / Panel 18 (PANELS.md)
 * Role: Provides conversational AI prompt interface, live diagnostic root-cause
 *       analysis, visual AST diff inspection, and dual-mode right dock layout
 *       ("Replace Details" or "Split Beside Details").
 * Styling Source: "@/editor/styles/ai-copilot.css"
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import "@/editor/styles/ai-copilot.css";
import {
  Sparkles,
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Cpu,
  RefreshCw,
  FileCode,
  ShieldCheck,
  Layers,
  ArrowRight,
  X,
  Sliders,
  Check,
  Columns,
  Maximize2,
  Minimize2,
  GripVertical,
} from "lucide-react";
import {
  diagnosticSuggester,
  AiMessage,
  AiAstPatch,
} from "@/ai/copilot/DiagnosticSuggester";
import { DiagnosticBus } from "@/core/engine/DiagnosticBus";
import { DiagnosticEvent } from "@/core/types/diagnostics";
import { useProjectStore } from "@/core/store/useProjectStore";
import { executionTracer } from "@/runtime/ExecutionTracer";
import { createId } from "@/core/ids";

export interface AiPromptBarProps {
  onClose?: () => void;
  dockMode?: "replace" | "split-left" | "floating";
  onToggleDockMode?: (mode: "replace" | "split-left") => void;
  onStartDrag?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

function createUserMessage(content: string): AiMessage {
  return { id: createId("user"), role: "user", content, timestamp: Date.now() };
}

export const AiPromptBar: React.FC<AiPromptBarProps> = ({
  onClose,
  dockMode = "replace",
  onToggleDockMode,
  onStartDrag,
  className = "",
  style = {},
}) => {
  const { blueprintGraphs, activeBlueprintGraphId } = useProjectStore();
  const activeGraph = activeBlueprintGraphId ? blueprintGraphs[activeBlueprintGraphId] : null;

  // Local state
  const [messages, setMessages] = useState<AiMessage[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      content: `### ⚡ LayoutAI Co-Pilot Ready\n\nI am grounded in your **LazyLayout** project's active **AST**, **DiagnosticBus**, and **Execution Trace**.\n\nAsk me to diagnose errors, repair data bindings, or generate layout & blueprint nodes. All modifications require your **explicit approval** before applying!`,
      timestamp: Date.now(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [activeDiagnostics, setActiveDiagnostics] = useState<DiagnosticEvent[]>([]);
  const [activeDiffPatch, setActiveDiffPatch] = useState<AiAstPatch | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to live DiagnosticBus events
  useEffect(() => {
    const handleDiag = (event: DiagnosticEvent) => {
      setActiveDiagnostics((prev) => {
        const next = [event, ...prev.filter((e) => e.id !== event.id)];
        return next.slice(0, 20);
      });
    };

    const unsubscribe = DiagnosticBus.subscribe(handleDiag);
    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-scroll message feed
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Context summary
  const errorCount = useMemo(
    () => activeDiagnostics.filter((d) => d.severity === "error").length,
    [activeDiagnostics]
  );

  // Send message
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputValue;
    if (!promptToSend.trim() || isThinking) return;

    const userMessage = createUserMessage(promptToSend.trim());

    setMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setInputValue("");
    setIsThinking(true);

    try {
      const response = await diagnosticSuggester.generateNaturalLanguageResponse(promptToSend, {
        activeGraph,
        diagnostics: activeDiagnostics,
        latestTrace: executionTracer.getLatestRun(),
      });

      setMessages((prev) => [...prev, response]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: `⚠️ Failed to process query: ${errorMsg}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // Open Graph Diff Modal
  const handleReviewPatch = (patch: AiAstPatch, messageId: string) => {
    setActiveDiffPatch(patch);
    setActiveMessageId(messageId);
  };

  // Accept Patch (Explicit Approval)
  const handleAcceptPatch = () => {
    if (!activeDiffPatch) return;

    const success = diagnosticSuggester.applyPatch(activeDiffPatch);
    if (success && activeMessageId) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === activeMessageId ? { ...msg, status: "applied" } : msg
        )
      );
    }
    setActiveDiffPatch(null);
    setActiveMessageId(null);
  };

  // Reject Patch
  const handleRejectPatch = () => {
    if (!activeDiffPatch) return;

    diagnosticSuggester.rejectPatch(activeDiffPatch);
    if (activeMessageId) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === activeMessageId ? { ...msg, status: "rejected" } : msg
        )
      );
    }
    setActiveDiffPatch(null);
    setActiveMessageId(null);
  };

  return (
    <div
      className={`ai-copilot-container ${dockMode === "floating" ? "ai-copilot-container--floating" : ""} ${className}`}
      style={style}
    >
      {/* 1. Header Bar with Mode Toggles */}
      <div className="ai-copilot-header">
        <div className="ai-copilot-title-group">
          {onStartDrag && (
            <button
              type="button"
              className="ai-copilot-drag-handle"
              onPointerDown={(e) => {
                e.preventDefault();
                onStartDrag();
              }}
              title="Drag to relocate LayoutAI to another dock side"
            >
              <GripVertical size={14} />
            </button>
          )}
          <div className="ai-copilot-logo">
            <Sparkles size={14} color="#FFFFFF" />
          </div>
          <div>
            <div className="ai-copilot-title">LayoutAI Assistant</div>
            <div className="ai-copilot-subtitle">Intelligent Layout & AST Reasoning</div>
          </div>
        </div>

        {/* Mode switcher & controls */}
        <div className="ai-copilot-header-controls">
          {onToggleDockMode && (
            <>
              <button
                type="button"
                className={`ai-copilot-mode-btn ${dockMode === "replace" ? "ai-copilot-mode-btn--active" : ""}`}
                onClick={() => onToggleDockMode("replace")}
                title="Replace Details Panel (Full Right Zone)"
              >
                <Maximize2 size={11} />
                <span>Replace</span>
              </button>

              <button
                type="button"
                className={`ai-copilot-mode-btn ${dockMode === "split-left" ? "ai-copilot-mode-btn--active" : ""}`}
                onClick={() => onToggleDockMode("split-left")}
                title="Dock Beside Details (Dual Resizable Columns)"
              >
                <Columns size={11} />
                <span>Split Beside</span>
              </button>
            </>
          )}

          {errorCount > 0 ? (
            <div className="ai-copilot-health-badge ai-copilot-health-badge--error">
              <AlertTriangle size={10} />
              <span>{errorCount} Err</span>
            </div>
          ) : (
            <div className="ai-copilot-health-badge ai-copilot-health-badge--healthy">
              <CheckCircle2 size={10} />
              <span>Healthy</span>
            </div>
          )}

          {onClose && (
            <button
              type="button"
              className="ai-copilot-mode-btn"
              onClick={onClose}
              title="Close LayoutAI"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Context Strip */}
      <div className="ai-copilot-context-bar">
        <div className="ai-copilot-context-item">
          <Layers size={11} color="#206859" />
          <span>
            Graph: <strong style={{ color: "#0F172A" }}>{activeGraph?.name || "Main Event"}</strong>
          </span>
        </div>
        <div className="ai-copilot-context-item">
          <ShieldCheck size={11} color="#206859" />
          <span>No Silent Writes</span>
        </div>
      </div>

      {/* 3. Messages Feed */}
      <div className="ai-copilot-feed">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`ai-copilot-msg-wrapper ${
                isUser ? "ai-copilot-msg-wrapper--user" : "ai-copilot-msg-wrapper--assistant"
              }`}
            >
              <div
                className={`ai-copilot-bubble ${
                  isUser ? "ai-copilot-bubble--user" : "ai-copilot-bubble--assistant"
                }`}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/^### (.*$)/gim, '<div style="font-weight:700;font-size:13px;color:#206859;margin-bottom:6px;">$1</div>')
                      .replace(/^#### (.*$)/gim, '<div style="font-weight:700;font-size:12px;color:#28806E;margin-top:6px;margin-bottom:4px;">$1</div>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#0F172A;">$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em style="color:#475569;">$1</em>')
                      .replace(/`(.*?)`/g, '<code style="background:#EBF5F3;padding:1px 5px;border-radius:4px;color:#206859;font-family:monospace;font-size:11px;font-weight:600;">$1</code>'),
                  }}
                />

                {/* Proposed AST Patch Action Box */}
                {msg.patch && (
                  <div className="ai-copilot-patch-box">
                    <div className="ai-copilot-patch-header">
                      <div className="ai-copilot-patch-title">
                        <FileCode size={13} />
                        <span>{msg.patch.title}</span>
                      </div>
                      <span
                        className={`ai-copilot-risk-badge ${
                          msg.patch.riskLevel === "low"
                            ? "ai-copilot-risk-badge--low"
                            : msg.patch.riskLevel === "medium"
                            ? "ai-copilot-risk-badge--medium"
                            : "ai-copilot-risk-badge--high"
                        }`}
                      >
                        {msg.patch.riskLevel}
                      </span>
                    </div>

                    <div className="ai-copilot-patch-desc">
                      {msg.patch.description}
                    </div>

                    {msg.status === "applied" ? (
                      <div className="ai-copilot-status-applied">
                        <CheckCircle2 size={13} />
                        <span>Patch Applied Successfully</span>
                      </div>
                    ) : msg.status === "rejected" ? (
                      <div className="ai-copilot-status-rejected">
                        <XCircle size={13} />
                        <span>Patch Rejected by User</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="ai-copilot-review-btn"
                        onClick={() => handleReviewPatch(msg.patch!, msg.id)}
                      >
                        <Sliders size={12} />
                        <span>Review AST Diff & Apply</span>
                        <ArrowRight size={11} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <span className="ai-copilot-timestamp">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}

        {isThinking && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", color: "#64748B", fontSize: "11px" }}>
            <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />
            <span>Evaluating project AST & diagnostics...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Quick Prompt Suggestion Chips */}
      <div className="ai-copilot-chips-row">
        {[
          { label: "🔍 Diagnose Errors", prompt: "Diagnose active errors on DiagnosticBus" },
          { label: "⚡ Add Counter Logic", prompt: "Create counter logic and state variable" },
          { label: "📊 Trace Status", prompt: "Analyze latest execution trace" },
          { label: "💡 Explain Graph", prompt: "Explain the active blueprint graph structure" },
        ].map((chip, idx) => (
          <button
            key={idx}
            type="button"
            className="ai-copilot-chip"
            onClick={() => handleSendMessage(chip.prompt)}
            disabled={isThinking}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* 5. Input Bar */}
      <div className="ai-copilot-input-bar">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Ask LayoutAI to diagnose, fix, or generate logic..."
          disabled={isThinking}
          className="ai-copilot-input"
        />

        <button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={!inputValue.trim() || isThinking}
          className="ai-copilot-send-btn"
          title="Send Query"
        >
          <Send size={14} />
        </button>
      </div>

      {/* 6. Graph Diff Modal ("No Silent AI Writes Law") */}
      {activeDiffPatch && (
        <div className="ai-copilot-diff-overlay">
          <div className="ai-copilot-diff-card">
            <div className="ai-copilot-diff-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck size={16} color="#206859" />
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A" }}>
                  Review Proposed LayoutAI AST Diff
                </span>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  padding: "2px 6px",
                  borderRadius: 4,
                  backgroundColor: "rgba(32, 104, 89, 0.1)",
                  color: "#206859",
                  fontWeight: 600,
                }}
              >
                No Silent AI Writes
              </span>
            </div>

            <div className="ai-copilot-diff-card-body">
              <div>
                <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#206859" }}>
                  {activeDiffPatch.title}
                </h4>
                <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#475569" }}>
                  {activeDiffPatch.description}
                </p>
              </div>

              <div className="ai-copilot-diff-summary-box">
                <div style={{ fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>
                  Proposed Mutations ({activeDiffPatch.actions.length} actions):
                </div>

                {/* Additions */}
                {activeDiffPatch.diffSummary.additions.map((add, i) => (
                  <div key={`add_${i}`} style={{ color: "#166534", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>+</span>
                    <span>{add}</span>
                  </div>
                ))}

                {/* Modifications */}
                {activeDiffPatch.diffSummary.modifications.map((mod, i) => (
                  <div key={`mod_${i}`} style={{ color: "#B45309", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>~</span>
                    <span>{mod}</span>
                  </div>
                ))}

                {/* Deletions */}
                {activeDiffPatch.diffSummary.deletions.map((del, i) => (
                  <div key={`del_${i}`} style={{ color: "#DC2626", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>-</span>
                    <span>{del}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  backgroundColor: "#EBF5F3",
                  border: "1px solid rgba(32, 104, 89, 0.2)",
                  fontSize: "10px",
                  color: "#206859",
                }}
              >
                <strong>Verification Guarantee:</strong> This patch will be verified against the Engine Compatibility Evaluator before committing to the project AST.
              </div>
            </div>

            <div className="ai-copilot-diff-card-footer">
              <button
                type="button"
                className="ai-copilot-btn-reject"
                onClick={handleRejectPatch}
              >
                Reject Changes
              </button>

              <button
                type="button"
                className="ai-copilot-btn-accept"
                onClick={handleAcceptPatch}
              >
                <Check size={13} />
                <span>Accept & Apply Patch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
