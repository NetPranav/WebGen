"use client";

/**
 * ============================================================================
 * GRAPH DIFF MODAL (AI APPROVAL & REVIEW GATE)
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 6.5
 *
 * Enforces the "No Silent AI Writes Law":
 * - Renders side-by-side or itemized diffs of AI-generated or modified Blueprint graphs.
 * - Supports granular per-node accept/reject before merging into the active AST.
 * - Reusable across AI Copilot, Scaffolding, and Version Control.
 * ============================================================================
 */

import React, { useState, useMemo } from "react";
import { BlueprintGraph } from "@/core/ast/ASTManager";
import {
  computeGraphDiff,
  applySelectiveDiff,
  GraphDiffReport,
  NodeDiffItem,
} from "./graph-diff";

function defaultAcceptedNodeIds(diff: GraphDiffReport): Set<string> {
  const accepted = new Set<string>();
  for (const [nodeId, item] of Object.entries(diff.nodeDiffs)) {
    if (item.status !== "unchanged") accepted.add(nodeId);
  }
  return accepted;
}

function firstChangedNodeId(diff: GraphDiffReport): string | null {
  return Object.values(diff.nodeDiffs).find((n) => n.status !== "unchanged")?.nodeId ?? null;
}

export interface GraphDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  baselineGraph: BlueprintGraph;
  proposedGraph: BlueprintGraph;
  onApply: (mergedGraph: BlueprintGraph) => void;
  title?: string;
}

export const GraphDiffModal: React.FC<GraphDiffModalProps> = ({
  isOpen,
  onClose,
  baselineGraph,
  proposedGraph,
  onApply,
  title = "AI Graph Review & Approval Gate",
}) => {
  const diffReport: GraphDiffReport = useMemo(() => {
    if (!baselineGraph || !proposedGraph) {
      return {
        baselineGraphId: "",
        proposedGraphId: "",
        nodeDiffs: {},
        wireDiffs: {},
        addedCount: 0,
        modifiedCount: 0,
        removedCount: 0,
        hasChanges: false,
      };
    }
    return computeGraphDiff(baselineGraph, proposedGraph);
  }, [baselineGraph, proposedGraph]);

  // Set of accepted node IDs (default to all added, modified, removed accepted)
  const [acceptedNodeIds, setAcceptedNodeIds] = useState<Set<string>>(() => defaultAcceptedNodeIds(diffReport));
  const [filter, setFilter] = useState<"all" | "added" | "modified" | "removed">("all");
  const [inspectedNodeId, setInspectedNodeId] = useState<string | null>(() => firstChangedNodeId(diffReport));

  // Re-initialize selection whenever the diff changes (adjusting state during render, not in an effect)
  const [prevDiffReport, setPrevDiffReport] = useState(diffReport);
  if (diffReport !== prevDiffReport) {
    setPrevDiffReport(diffReport);
    setAcceptedNodeIds(defaultAcceptedNodeIds(diffReport));
    setInspectedNodeId(firstChangedNodeId(diffReport));
  }

  if (!isOpen) return null;

  const toggleNode = (nodeId: string) => {
    setAcceptedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const all = new Set<string>();
    for (const [id, item] of Object.entries(diffReport.nodeDiffs)) {
      if (item.status !== "unchanged") all.add(id);
    }
    setAcceptedNodeIds(all);
  };

  const handleDeselectAll = () => {
    setAcceptedNodeIds(new Set());
  };

  const handleApply = () => {
    const merged = applySelectiveDiff(
      baselineGraph,
      proposedGraph,
      diffReport,
      acceptedNodeIds
    );
    onApply(merged);
    onClose();
  };

  const filteredNodes = Object.values(diffReport.nodeDiffs).filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  const inspectedItem: NodeDiffItem | undefined = inspectedNodeId
    ? diffReport.nodeDiffs[inspectedNodeId]
    : undefined;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "960px",
          height: "85vh",
          backgroundColor: "#0B0F19",
          border: "1px solid #1E293B",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75)",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #1E293B",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#0D1322",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "18px" }}>🛡️</span>
              <h2
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#F8FAFC",
                  letterSpacing: "-0.01em",
                }}
              >
                {title}
              </h2>
            </div>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "12px",
                color: "#94A3B8",
              }}
            >
              Graph: <strong style={{ color: "#38BDF8" }}>{baselineGraph.name}</strong> •{" "}
              <em>No Silent AI Writes Law enforced</em>
            </p>
          </div>

          {/* Diff Counters */}
          <div style={{ display: "flex", gap: "8px" }}>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                color: "#34D399",
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              +{diffReport.addedCount} Added
            </span>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                backgroundColor: "rgba(245, 158, 11, 0.15)",
                color: "#FBBF24",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              ~{diffReport.modifiedCount} Modified
            </span>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                color: "#F87171",
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              -{diffReport.removedCount} Removed
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div
          style={{
            padding: "12px 24px",
            borderBottom: "1px solid #1E293B",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#0B0F19",
          }}
        >
          <div style={{ display: "flex", gap: "6px" }}>
            {(["all", "added", "modified", "removed"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  border: filter === tab ? "1px solid #38BDF8" : "1px solid #1E293B",
                  backgroundColor: filter === tab ? "rgba(56, 189, 248, 0.1)" : "#131C31",
                  color: filter === tab ? "#38BDF8" : "#94A3B8",
                  textTransform: "capitalize",
                  transition: "all 0.15s ease",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleSelectAll}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "11px",
                backgroundColor: "transparent",
                color: "#94A3B8",
                border: "1px solid #334155",
                cursor: "pointer",
              }}
            >
              Accept All
            </button>
            <button
              onClick={handleDeselectAll}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "11px",
                backgroundColor: "transparent",
                color: "#94A3B8",
                border: "1px solid #334155",
                cursor: "pointer",
              }}
            >
              Reject All
            </button>
          </div>
        </div>

        {/* Body Split View */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left Column: Node List */}
          <div
            style={{
              flex: 1,
              borderRight: "1px solid #1E293B",
              overflowY: "auto",
              padding: "12px",
            }}
          >
            {filteredNodes.length === 0 ? (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  color: "#64748B",
                  fontSize: "13px",
                }}
              >
                No nodes match the selected filter.
              </div>
            ) : (
              filteredNodes.map((item) => {
                const isAccepted = acceptedNodeIds.has(item.nodeId);
                const isInspected = inspectedNodeId === item.nodeId;
                const isUnchanged = item.status === "unchanged";

                let statusBadgeColor = "#94A3B8";
                let statusBadgeBg = "rgba(148, 163, 184, 0.1)";
                if (item.status === "added") {
                  statusBadgeColor = "#34D399";
                  statusBadgeBg = "rgba(16, 185, 129, 0.15)";
                } else if (item.status === "modified") {
                  statusBadgeColor = "#FBBF24";
                  statusBadgeBg = "rgba(245, 158, 11, 0.15)";
                } else if (item.status === "removed") {
                  statusBadgeColor = "#F87171";
                  statusBadgeBg = "rgba(239, 68, 68, 0.15)";
                }

                return (
                  <div
                    key={item.nodeId}
                    onClick={() => setInspectedNodeId(item.nodeId)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      marginBottom: "6px",
                      backgroundColor: isInspected
                        ? "rgba(56, 189, 248, 0.08)"
                        : isAccepted
                        ? "#111827"
                        : "#0B0F19",
                      border: isInspected
                        ? "1px solid #38BDF8"
                        : "1px solid #1E293B",
                      cursor: "pointer",
                      opacity: !isAccepted && !isUnchanged ? 0.6 : 1,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {!isUnchanged && (
                      <input
                        type="checkbox"
                        checked={isAccepted}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleNode(item.nodeId);
                        }}
                        style={{
                          width: "16px",
                          height: "16px",
                          accentColor: "#38BDF8",
                          cursor: "pointer",
                        }}
                      />
                    )}

                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: statusBadgeBg,
                            color: statusBadgeColor,
                            textTransform: "uppercase",
                          }}
                        >
                          {item.status}
                        </span>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#F1F5F9",
                          }}
                        >
                          {item.proposedNode?.title ||
                            item.baselineNode?.title ||
                            item.nodeId}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748B" }}>
                        {item.changeSummary}
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        backgroundColor: "#1E293B",
                        color: "#94A3B8",
                      }}
                    >
                      {item.proposedNode?.type || item.baselineNode?.type}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Detailed Field Inspector */}
          <div
            style={{
              width: "380px",
              backgroundColor: "#0D1322",
              padding: "20px",
              overflowY: "auto",
            }}
          >
            <h4
              style={{
                margin: "0 0 16px 0",
                fontSize: "13px",
                fontWeight: 600,
                color: "#94A3B8",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Inspection Details
            </h4>

            {inspectedItem ? (
              <div>
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", color: "#64748B" }}>Node ID</div>
                  <div style={{ fontSize: "13px", color: "#E2E8F0", fontFamily: "monospace" }}>
                    {inspectedItem.nodeId}
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", color: "#64748B" }}>Status</div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color:
                        inspectedItem.status === "added"
                          ? "#34D399"
                          : inspectedItem.status === "modified"
                          ? "#FBBF24"
                          : inspectedItem.status === "removed"
                          ? "#F87171"
                          : "#94A3B8",
                    }}
                  >
                    {inspectedItem.status.toUpperCase()}
                  </div>
                </div>

                {inspectedItem.fieldChanges && inspectedItem.fieldChanges.length > 0 ? (
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "8px" }}>
                      Field Diffs
                    </div>
                    {inspectedItem.fieldChanges.map((change, i) => (
                      <div
                        key={i}
                        style={{
                          backgroundColor: "#080C16",
                          border: "1px solid #1E293B",
                          borderRadius: "8px",
                          padding: "10px",
                          marginBottom: "8px",
                          fontSize: "12px",
                        }}
                      >
                        <strong style={{ color: "#38BDF8" }}>{change.field}</strong>
                        <div style={{ marginTop: "6px", color: "#F87171" }}>
                          - Old: {JSON.stringify(change.oldValue)}
                        </div>
                        <div style={{ marginTop: "2px", color: "#34D399" }}>
                          + New: {JSON.stringify(change.newValue)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748B",
                      padding: "16px",
                      backgroundColor: "#080C16",
                      borderRadius: "8px",
                    }}
                  >
                    {inspectedItem.status === "added"
                      ? "Entire node created by AI with proposed default pins and position."
                      : inspectedItem.status === "removed"
                      ? "Node marked for deletion."
                      : "No modified fields detected."}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: "#64748B", fontSize: "12px" }}>
                Select a node to inspect detailed diff changes.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #1E293B",
            backgroundColor: "#0D1322",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: "12px", color: "#94A3B8" }}>
            Accepted: <strong style={{ color: "#38BDF8" }}>{acceptedNodeIds.size}</strong>{" "}
            changes
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #334155",
                backgroundColor: "transparent",
                color: "#94A3B8",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Cancel / Reject All
            </button>

            <button
              onClick={handleApply}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #0284C7 0%, #2563EB 100%)",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
              }}
            >
              Merge Selected ({acceptedNodeIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
