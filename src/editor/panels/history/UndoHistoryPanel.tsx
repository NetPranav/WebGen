"use client";

/**
 * ============================================================================
 * PANEL 23: UNDO HISTORY & TRANSACTION GRAPH
 * ============================================================================
 * Visual chronological action log with category filtering, entity jump links,
 * action grouping, arbitrary timeline state jumping, and stack status.
 * Architecture Ref: ROADMAP.md §Sub-Phase 8.1 & PANELS.md §Panel 23
 * ============================================================================
 */

import React, { useState, useMemo } from "react";
import { useHistoryStore } from "@/core/store/useHistoryStore";
import { useProjectStore } from "@/core/store/useProjectStore";
import { HistoryActionCategory, HistoryTransaction } from "@/core/types/history";
import {
  History,
  Undo2,
  Redo2,
  Trash2,
  Search,
  CheckCircle2,
  RotateCcw,
  Layers,
  Sliders,
  Cpu,
  Film,
  Compass,
  Palette,
  Variable,
  Activity,
} from "lucide-react";

interface CategoryMeta {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

const CATEGORY_MAP: Record<HistoryActionCategory, CategoryMeta> = {
  canvas: {
    label: "Canvas",
    color: "#38BDF8",
    bgColor: "rgba(56, 189, 248, 0.12)",
    borderColor: "rgba(56, 189, 248, 0.25)",
    icon: <Layers size={11} />,
  },
  property: {
    label: "Property",
    color: "#34D399",
    bgColor: "rgba(52, 211, 153, 0.12)",
    borderColor: "rgba(52, 211, 153, 0.25)",
    icon: <Sliders size={11} />,
  },
  blueprint: {
    label: "Blueprint",
    color: "#818CF8",
    bgColor: "rgba(129, 140, 248, 0.12)",
    borderColor: "rgba(129, 140, 248, 0.25)",
    icon: <Cpu size={11} />,
  },
  database: {
    label: "Sequencer",
    color: "#C084FC",
    bgColor: "rgba(192, 132, 252, 0.12)",
    borderColor: "rgba(192, 132, 252, 0.25)",
    icon: <Film size={11} />,
  },
  page: {
    label: "Page",
    color: "#F472B6",
    bgColor: "rgba(244, 114, 182, 0.12)",
    borderColor: "rgba(244, 114, 182, 0.25)",
    icon: <Compass size={11} />,
  },
  style: {
    label: "Style",
    color: "#A78BFA",
    bgColor: "rgba(167, 139, 250, 0.12)",
    borderColor: "rgba(167, 139, 250, 0.25)",
    icon: <Palette size={11} />,
  },
  variable: {
    label: "Variable",
    color: "#FB7185",
    bgColor: "rgba(251, 113, 133, 0.12)",
    borderColor: "rgba(251, 113, 133, 0.25)",
    icon: <Variable size={11} />,
  },
  general: {
    label: "General",
    color: "#94A3B8",
    bgColor: "rgba(148, 163, 184, 0.12)",
    borderColor: "rgba(148, 163, 184, 0.25)",
    icon: <Activity size={11} />,
  },
};

export const UndoHistoryPanel: React.FC = () => {
  const past = useHistoryStore((s) => s.past);
  const future = useHistoryStore((s) => s.future);
  const canUndo = useHistoryStore((s) => s.canUndo());
  const canRedo = useHistoryStore((s) => s.canRedo());
  const maxStackSize = useHistoryStore((s) => s.maxStackSize);
  const clearHistory = useHistoryStore((s) => s.clearHistory);

  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const jumpToHistoryState = useProjectStore((s) => s.jumpToHistoryState);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<HistoryActionCategory | "all">("all");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Filter transactions
  const filterList = (list: HistoryTransaction[]) => {
    return list.filter((t) => {
      if (selectedCategory !== "all" && t.actionCategory !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchLabel = t.actionLabel.toLowerCase().includes(q);
        const matchEntity = t.entityName?.toLowerCase().includes(q) || t.entityId?.toLowerCase().includes(q);
        const matchDiff = t.diffSummary?.toLowerCase().includes(q);
        return matchLabel || matchEntity || matchDiff;
      }
      return true;
    });
  };

  const filteredPast = useMemo(() => filterList(past), [past, selectedCategory, searchQuery]);
  const filteredFuture = useMemo(() => filterList(future), [future, selectedCategory, searchQuery]);

  const handleJump = (transactionId: string) => {
    jumpToHistoryState(transactionId);
  };

  const formatTimestamp = (ts: number): string => {
    const elapsed = Date.now() - ts;
    if (elapsed < 3000) return "Just now";
    if (elapsed < 60000) return `${Math.floor(elapsed / 1000)}s ago`;
    if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)}m ago`;
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: "var(--bg-panel-body, #0d1117)",
        color: "var(--text-primary, #f1f5f9)",
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        overflow: "hidden",
      }}
    >
      {/* 1. Header Toolbar */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-subtle, #1e293b)",
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(12px)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {/* Title and Fast Undo/Redo Buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                backgroundColor: "rgba(129, 140, 248, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#818CF8",
              }}
            >
              <History size={16} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "600", letterSpacing: "-0.01em" }}>
                Undo History
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-tertiary, #64748b)" }}>
                Panel 23 • Transaction Graph
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                fontSize: "11px",
                fontWeight: "500",
                backgroundColor: canUndo ? "var(--bg-item-hover, #1e293b)" : "transparent",
                color: canUndo ? "#f8fafc" : "var(--text-muted, #475569)",
                border: "1px solid var(--border-subtle, #334155)",
                borderRadius: "5px",
                cursor: canUndo ? "pointer" : "not-allowed",
                opacity: canUndo ? 1 : 0.4,
              }}
            >
              <Undo2 size={13} />
              <span>Undo</span>
            </button>

            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                fontSize: "11px",
                fontWeight: "500",
                backgroundColor: canRedo ? "var(--bg-item-hover, #1e293b)" : "transparent",
                color: canRedo ? "#f8fafc" : "var(--text-muted, #475569)",
                border: "1px solid var(--border-subtle, #334155)",
                borderRadius: "5px",
                cursor: canRedo ? "pointer" : "not-allowed",
                opacity: canRedo ? 1 : 0.4,
              }}
            >
              <Redo2 size={13} />
              <span>Redo</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "var(--bg-input, #090d13)",
            border: "1px solid var(--border-subtle, #1e293b)",
            borderRadius: "6px",
            padding: "5px 10px",
          }}
        >
          <Search size={13} style={{ color: "var(--text-tertiary, #64748b)" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter action timeline or entities..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "#f8fafc",
              fontSize: "12px",
              outline: "none",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            overflowX: "auto",
            scrollbarWidth: "none",
            paddingBottom: "2px",
          }}
        >
          {(
            [
              "all",
              "canvas",
              "property",
              "blueprint",
              "database",
              "page",
              "style",
              "variable",
            ] as const
          ).map((cat) => {
            const isSelected = selectedCategory === cat;
            const meta = cat !== "all" ? CATEGORY_MAP[cat] : null;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "3px 8px",
                  fontSize: "11px",
                  fontWeight: isSelected ? "600" : "400",
                  borderRadius: "12px",
                  border: isSelected
                    ? `1px solid ${meta ? meta.color : "#6366F1"}`
                    : "1px solid var(--border-subtle, #1e293b)",
                  backgroundColor: isSelected
                    ? meta
                      ? meta.bgColor
                      : "rgba(99, 102, 241, 0.15)"
                    : "transparent",
                  color: isSelected ? (meta ? meta.color : "#818CF8") : "#94A3B8",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                {meta?.icon}
                <span>{cat === "all" ? "All" : meta?.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Timeline List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {past.length === 0 && future.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "48px 24px",
              color: "var(--text-tertiary, #64748b)",
              textAlign: "center",
              gap: "8px",
            }}
          >
            <History size={36} style={{ strokeWidth: 1.2, color: "#475569" }} />
            <div style={{ fontSize: "13px", fontWeight: "500", color: "#94a3b8" }}>
              No history recorded yet
            </div>
            <div style={{ fontSize: "11px", maxWidth: "260px" }}>
              Any actions you perform on the visual canvas, element properties, or logic blueprints
              will be tracked here.
            </div>
          </div>
        ) : (
          <>
            {/* Future Actions (Undone Steps available to Redo) */}
            {filteredFuture.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--text-tertiary, #64748b)",
                    padding: "2px 4px",
                  }}
                >
                  Redo Queue ({filteredFuture.length})
                </div>

                {filteredFuture.map((tx, idx) => {
                  const meta = CATEGORY_MAP[tx.actionCategory] || CATEGORY_MAP.general;
                  return (
                    <div
                      key={tx.id}
                      onClick={() => handleJump(tx.id)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "6px",
                        backgroundColor: "rgba(30, 41, 59, 0.4)",
                        border: "1px dashed var(--border-subtle, #334155)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        opacity: 0.65,
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.8)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "0.65";
                        e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.4)";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "monospace" }}>
                          +{idx + 1}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            color: meta.color,
                            backgroundColor: meta.bgColor,
                            border: `1px solid ${meta.borderColor}`,
                            display: "flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          {meta.icon}
                          {meta.label}
                        </span>
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>{tx.actionLabel}</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "10px", color: "#64748b" }}>
                          {formatTimestamp(tx.timestamp)}
                        </span>
                        <RotateCcw size={12} style={{ color: "#818cf8" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Current Active HEAD Marker */}
            <div
              style={{
                padding: "8px 12px",
                margin: "4px 0",
                borderRadius: "6px",
                backgroundColor: "rgba(99, 102, 241, 0.12)",
                border: "1px solid rgba(99, 102, 241, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={13} style={{ color: "#818CF8" }} />
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#C7D2FE" }}>
                  Current State (Active Canvas HEAD)
                </span>
              </div>
              <span style={{ fontSize: "11px", color: "#818CF8", fontWeight: "500" }}>
                Live
              </span>
            </div>

            {/* Past Actions (Reversible History) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-tertiary, #64748b)",
                  padding: "2px 4px",
                }}
              >
                Undo History ({filteredPast.length})
              </div>

              {[...filteredPast].reverse().map((tx, idx) => {
                const meta = CATEGORY_MAP[tx.actionCategory] || CATEGORY_MAP.general;
                const stepNumber = filteredPast.length - idx;

                return (
                  <div
                    key={tx.id}
                    onClick={() => handleJump(tx.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      backgroundColor: "var(--bg-item, #0f172a)",
                      border: "1px solid var(--border-subtle, #1e293b)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.9)";
                      e.currentTarget.style.borderColor = "#475569";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--bg-item, #0f172a)";
                      e.currentTarget.style.borderColor = "var(--border-subtle, #1e293b)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          color: "var(--text-tertiary, #64748b)",
                          fontFamily: "monospace",
                          minWidth: "22px",
                        }}
                      >
                        #{stepNumber}
                      </span>

                      <span
                        style={{
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          color: meta.color,
                          backgroundColor: meta.bgColor,
                          border: `1px solid ${meta.borderColor}`,
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        {meta.icon}
                        {meta.label}
                      </span>

                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "12px", fontWeight: "500", color: "#f8fafc" }}>
                            {tx.actionLabel}
                          </span>

                          {tx.groupCount && tx.groupCount > 1 && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: "600",
                                color: "#38BDF8",
                                backgroundColor: "rgba(56, 189, 248, 0.12)",
                                padding: "1px 5px",
                                borderRadius: "4px",
                              }}
                            >
                              ×{tx.groupCount}
                            </span>
                          )}
                        </div>

                        {(tx.entityName || tx.diffSummary) && (
                          <div style={{ fontSize: "11px", color: "#64748b", display: "flex", gap: "6px" }}>
                            {tx.entityName && <span>{tx.entityName}</span>}
                            {tx.diffSummary && <span>• {tx.diffSummary}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-tertiary, #64748b)" }}>
                        {formatTimestamp(tx.timestamp)}
                      </span>

                      <div
                        title="Jump to this state"
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#94a3b8",
                        }}
                      >
                        <RotateCcw size={12} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 3. Footer Bar */}
      <div
        style={{
          padding: "8px 16px",
          borderTop: "1px solid var(--border-subtle, #1e293b)",
          backgroundColor: "rgba(15, 23, 42, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "11px",
          color: "var(--text-secondary, #94a3b8)",
        }}
      >
        <div>
          Stack: <strong style={{ color: "#f8fafc" }}>{past.length}</strong> / {maxStackSize} actions
        </div>

        {showClearConfirm ? (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#F87171" }}>Clear all history?</span>
            <button
              type="button"
              onClick={() => {
                clearHistory();
                setShowClearConfirm(false);
              }}
              style={{
                backgroundColor: "#EF4444",
                color: "#ffffff",
                border: "none",
                borderRadius: "4px",
                padding: "2px 6px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              style={{
                backgroundColor: "var(--bg-item, #1e293b)",
                color: "#94a3b8",
                border: "1px solid var(--border-subtle, #334155)",
                borderRadius: "4px",
                padding: "2px 6px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            disabled={past.length === 0 && future.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              backgroundColor: "transparent",
              border: "none",
              color: past.length > 0 || future.length > 0 ? "var(--text-tertiary, #64748b)" : "var(--text-muted, #334155)",
              cursor: past.length > 0 || future.length > 0 ? "pointer" : "not-allowed",
              fontSize: "11px",
            }}
          >
            <Trash2 size={12} />
            <span>Clear History</span>
          </button>
        )}
      </div>
    </div>
  );
};
