"use client";

/**
 * ============================================================================
 * DEPLOYMENT HISTORY & 1-CLICK ROLLBACK PANEL
 * ============================================================================
 * UI Element: Chronological deployment list, commit hashes, and 1-click revert.
 * Screen / Scope: Panel 19: Deployment Dashboard -> History Tab
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.1 & PANELS.md §Panel 19
 * ============================================================================
 */

import React, { useState } from "react";
import { DeploymentRecord } from "@/core/types/deployment";
import { DeploymentEngine } from "@/runtime/DeploymentEngine";
import {
  History,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  GitBranch,
  Terminal,
  User,
  Zap,
} from "lucide-react";

export interface DeploymentHistoryProps {
  history: DeploymentRecord[];
  onSelectRecord?: (record: DeploymentRecord) => void;
  onRollbackComplete?: (record: DeploymentRecord) => void;
}

export const DeploymentHistory: React.FC<DeploymentHistoryProps> = ({
  history,
  onSelectRecord,
  onRollbackComplete,
}) => {
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  const handleRollback = (record: DeploymentRecord) => {
    const confirmRevert = window.confirm(
      `Instant Rollback: Are you sure you want to revert production traffic to build ${record.commitHash} (${record.id})?`
    );
    if (!confirmRevert) return;

    setRollingBackId(record.id);
    try {
      const rollbackRecord = DeploymentEngine.rollback(record.id);
      if (onRollbackComplete) {
        onRollbackComplete(rollbackRecord);
      }
    } catch (err: any) {
      alert(`Rollback failed: ${err.message || String(err)}`);
    } finally {
      setRollingBackId(null);
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header Info */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          background: "#16171F",
          border: "1px solid #232430",
          borderRadius: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <History size={18} style={{ color: "#A5B4FC" }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>
              Deployment History & Atomic Rollbacks
            </div>
            <div style={{ fontSize: 11.5, color: "#9CA3AF" }}>
              Every successful deployment is preserved as an immutable snapshot. Revert instant traffic in &lt;200ms.
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#A5B4FC", fontWeight: 600 }}>
          {history.length} {history.length === 1 ? "Deployment" : "Deployments"} Recorded
        </div>
      </div>

      {/* History Items List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {history.map((record, index) => {
          const isLatest = index === 0;
          const isReady = record.status === "ready";
          const isFailed = record.status === "failed";
          const isRollingBack = rollingBackId === record.id;

          return (
            <div
              key={record.id}
              style={{
                background: "#16171F",
                border: isLatest ? "1px solid #6366F1" : "1px solid #232430",
                borderRadius: 8,
                padding: "16px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                transition: "all 0.15s ease",
              }}
            >
              {/* Left Details */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
                {/* Status Indicator Icon */}
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: isReady
                      ? "rgba(52, 211, 153, 0.15)"
                      : isFailed
                      ? "rgba(239, 68, 68, 0.15)"
                      : "rgba(99, 102, 241, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isReady ? "#34D399" : isFailed ? "#EF4444" : "#818CF8",
                    flexShrink: 0,
                  }}
                >
                  {isReady ? (
                    <CheckCircle2 size={18} />
                  ) : isFailed ? (
                    <AlertCircle size={18} />
                  ) : (
                    <Clock size={18} />
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>
                      {record.domain || record.url}
                    </span>
                    {isLatest && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "rgba(99, 102, 241, 0.2)",
                          color: "#818CF8",
                          border: "1px solid rgba(99, 102, 241, 0.4)",
                        }}
                      >
                        CURRENT ACTIVE
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "#232430",
                        color: "#9CA3AF",
                        textTransform: "uppercase",
                      }}
                    >
                      {record.environment}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "#1E202B",
                        color: "#38BDF8",
                        textTransform: "uppercase",
                      }}
                    >
                      {record.target}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      fontSize: 11.5,
                      color: "#9CA3AF",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "monospace" }}>
                      <GitBranch size={12} />
                      {record.branch} @ {record.commitHash}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <User size={12} />
                      {record.author}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={12} />
                      {formatTime(record.createdAt)} ({formatDuration(record.durationMs)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {onSelectRecord && (
                  <button
                    onClick={() => onSelectRecord(record)}
                    style={{
                      padding: "6px 12px",
                      background: "#232430",
                      color: "#D1D5DB",
                      border: "1px solid #2F3142",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Terminal size={13} />
                    View Logs
                  </button>
                )}

                <a
                  href={record.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: "6px 12px",
                    background: "#232430",
                    color: "#38BDF8",
                    border: "1px solid #2F3142",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <ExternalLink size={13} />
                  Visit
                </a>

                {!isLatest && isReady && (
                  <button
                    onClick={() => handleRollback(record)}
                    disabled={isRollingBack}
                    style={{
                      padding: "6px 14px",
                      background: "rgba(245, 158, 11, 0.12)",
                      color: "#F59E0B",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <RotateCcw size={13} className={isRollingBack ? "spin" : ""} />
                    {isRollingBack ? "Reverting..." : "Instant Rollback"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
