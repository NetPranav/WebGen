"use client";

import React, { useState, useMemo } from "react";
import {
  GitBranch,
  GitCommit,
  GitMerge,
  Clock,
  Tag,
  Trash2,
  RotateCcw,
  FileDiff,
  Plus,
  Search,
  Check,
  AlertTriangle,
  X,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
  FileText,
  Boxes,
  HardDrive,
} from "lucide-react";
import { useVersionControlStore } from "../../../core/store/useVersionControlStore";
import {
  ProjectSnapshotRecord,
  SnapshotDiffReport,
  ElementDiff,
  PageDiff,
  SchemaDiff,
} from "../../../core/types/versioning";

export const VersionControlPanel: React.FC = () => {
  const {
    branches,
    activeBranchId,
    snapshots,
    comparingSnapshotIds,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    createBranch,
    switchBranch,
    setComparingSnapshots,
    getDiffReport,
    mergeBranch,
    getActiveBranch,
  } = useVersionControlStore();

  const [activeTab, setActiveTab] = useState<"snapshots" | "diff" | "merge">("snapshots");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | "all">("all");

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSnapName, setNewSnapName] = useState("");
  const [newSnapDesc, setNewSnapDesc] = useState("");
  const [newSnapTags, setNewSnapTags] = useState("");

  const [showBranchModal, setShowBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");

  const [restoreConfirmSnap, setRestoreConfirmSnap] = useState<ProjectSnapshotRecord | null>(null);
  const [mergeStatusMessage, setMergeStatusMessage] = useState<string | null>(null);

  // Expanded elements in diff view
  const [expandedElements, setExpandedElements] = useState<Record<string, boolean>>({});

  const activeBranch = getActiveBranch();
  const allSnapshots = useMemo(() => {
    return Object.values(snapshots).sort((a, b) => b.timestamp - a.timestamp);
  }, [snapshots]);

  // Extract unique tags
  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>();
    allSnapshots.forEach((s) => s.tags.forEach((t) => tagsSet.add(t)));
    return Array.from(tagsSet);
  }, [allSnapshots]);

  // Filter snapshots
  const filteredSnapshots = useMemo(() => {
    return allSnapshots.filter((snap) => {
      const matchesSearch =
        snap.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        snap.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        snap.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = selectedTag === "all" || snap.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [allSnapshots, searchQuery, selectedTag]);

  // Real-time diff report
  const diffReport: SnapshotDiffReport | null = useMemo(() => {
    if (activeTab !== "diff") return null;
    return getDiffReport();
  }, [activeTab, comparingSnapshotIds, getDiffReport]);

  const handleCreateSnapshotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnapName.trim()) return;

    const tagsArray = newSnapTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    createSnapshot(newSnapName.trim(), newSnapDesc.trim(), tagsArray);
    setNewSnapName("");
    setNewSnapDesc("");
    setNewSnapTags("");
    setShowCreateModal(false);
  };

  const handleCreateBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    const newBranch = createBranch(newBranchName.trim(), activeBranchId);
    switchBranch(newBranch.id, false);
    setNewBranchName("");
    setShowBranchModal(false);
  };

  const handleRestoreConfirm = () => {
    if (!restoreConfirmSnap) return;
    restoreSnapshot(restoreConfirmSnap.id);
    setRestoreConfirmSnap(null);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatRelativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return "Just now";
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const toggleExpandElement = (elId: string) => {
    setExpandedElements((prev) => ({
      ...prev,
      [elId]: !prev[elId],
    }));
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: "var(--color-bg-primary, #0f1117)",
        color: "var(--color-text-primary, #f1f5f9)",
        fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {/* PANEL HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid var(--color-border, #1e2433)",
          backgroundColor: "rgba(15, 17, 23, 0.95)",
          backdropFilter: "blur(8px)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              borderRadius: 6,
              backgroundColor: "rgba(99, 102, 241, 0.15)",
              color: "#818cf8",
              border: "1px solid rgba(99, 102, 241, 0.3)",
            }}
          >
            <GitBranch size={16} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, margin: 0, letterSpacing: "0.02em" }}>
                Version Control & Snapshots
              </h2>
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 4,
                  backgroundColor: "rgba(99, 102, 241, 0.12)",
                  color: "#a5b4fc",
                  fontWeight: 600,
                  border: "1px solid rgba(99, 102, 241, 0.25)",
                }}
              >
                Panel 24
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted, #64748b)" }}>
              {allSnapshots.length} checkpoints • Branch: {activeBranch.name}
            </div>
          </div>
        </div>

        {/* BRANCH SELECTOR & SNAPSHOT ACTIONS */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Branch Dropdown */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              backgroundColor: "var(--color-bg-secondary, #181d29)",
              border: "1px solid var(--color-border, #242c3d)",
              borderRadius: 6,
              padding: "4px 8px",
            }}
          >
            <GitBranch size={13} color="#818cf8" />
            <select
              value={activeBranchId}
              onChange={(e) => switchBranch(e.target.value)}
              style={{
                backgroundColor: "transparent",
                color: "var(--color-text-primary, #f1f5f9)",
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
              }}
            >
              {Object.values(branches).map((b) => (
                <option key={b.id} value={b.id} style={{ backgroundColor: "#1e2433", color: "#fff" }}>
                  {b.name} {b.isDefault ? "(default)" : ""}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowBranchModal(true)}
              title="Create New Branch"
              style={{
                background: "none",
                border: "none",
                color: "var(--color-text-muted, #94a3b8)",
                cursor: "pointer",
                padding: "2px 4px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Plus size={13} />
            </button>
          </div>

          {/* New Snapshot Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              backgroundColor: "#4f46e5",
              color: "#ffffff",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(79, 70, 229, 0.25)",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#4338ca")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#4f46e5")}
          >
            <Plus size={14} />
            Take Snapshot
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--color-border, #1e2433)",
          backgroundColor: "var(--color-bg-secondary, #141824)",
          padding: "0 16px",
          gap: 4,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setActiveTab("snapshots")}
          style={{
            padding: "9px 14px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "snapshots" ? "2px solid #818cf8" : "2px solid transparent",
            color: activeTab === "snapshots" ? "#ffffff" : "var(--color-text-muted, #94a3b8)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <GitCommit size={14} />
          Snapshots ({allSnapshots.length})
        </button>

        <button
          onClick={() => {
            setActiveTab("diff");
            if (!comparingSnapshotIds && allSnapshots.length >= 2) {
              setComparingSnapshots(allSnapshots[1].id, allSnapshots[0].id);
            }
          }}
          style={{
            padding: "9px 14px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "diff" ? "2px solid #818cf8" : "2px solid transparent",
            color: activeTab === "diff" ? "#ffffff" : "var(--color-text-muted, #94a3b8)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <FileDiff size={14} />
          Visual AST Diff
        </button>

        <button
          onClick={() => setActiveTab("merge")}
          style={{
            padding: "9px 14px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "merge" ? "2px solid #818cf8" : "2px solid transparent",
            color: activeTab === "merge" ? "#ffffff" : "var(--color-text-muted, #94a3b8)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <GitMerge size={14} />
          Branches & Merge
        </button>
      </div>

      {/* TAB BODY */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {/* TAB 1: SNAPSHOTS LIST */}
        {activeTab === "snapshots" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Search and Tags Bar */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "var(--color-bg-secondary, #181d29)",
                  border: "1px solid var(--color-border, #242c3d)",
                  borderRadius: 6,
                  padding: "6px 10px",
                }}
              >
                <Search size={14} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search checkpoints by title, description or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    background: "none",
                    border: "none",
                    color: "#f1f5f9",
                    fontSize: 12,
                    outline: "none",
                  }}
                />
                {searchQuery && (
                  <X
                    size={13}
                    style={{ cursor: "pointer", color: "#64748b" }}
                    onClick={() => setSearchQuery("")}
                  />
                )}
              </div>

              {/* Tag filter pills */}
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => setSelectedTag("all")}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 11,
                    border: "1px solid",
                    borderColor: selectedTag === "all" ? "#818cf8" : "var(--color-border, #242c3d)",
                    backgroundColor: selectedTag === "all" ? "rgba(99, 102, 241, 0.2)" : "transparent",
                    color: selectedTag === "all" ? "#c7d2fe" : "#94a3b8",
                    cursor: "pointer",
                  }}
                >
                  All
                </button>
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      border: "1px solid",
                      borderColor: selectedTag === tag ? "#818cf8" : "var(--color-border, #242c3d)",
                      backgroundColor: selectedTag === tag ? "rgba(99, 102, 241, 0.2)" : "transparent",
                      color: selectedTag === tag ? "#c7d2fe" : "#94a3b8",
                      cursor: "pointer",
                    }}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Snapshots Grid / List */}
            {filteredSnapshots.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 48,
                  backgroundColor: "rgba(24, 29, 41, 0.4)",
                  borderRadius: 8,
                  border: "1px dashed var(--color-border, #242c3d)",
                  textAlign: "center",
                }}
              >
                <GitCommit size={32} color="#475569" style={{ marginBottom: 12 }} />
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px 0", color: "#cbd5e1" }}>
                  No snapshots recorded
                </h3>
                <p style={{ fontSize: 12, color: "#64748b", margin: 0, maxWidth: 320 }}>
                  Click &ldquo;Take Snapshot&rdquo; above to create your first checkpoint with deep AST sizing
                  and recovery tags.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredSnapshots.map((snap) => {
                  const isHead = snap.id === activeBranch.headSnapshotId;
                  const isComparing =
                    comparingSnapshotIds &&
                    (comparingSnapshotIds[0] === snap.id || comparingSnapshotIds[1] === snap.id);

                  return (
                    <div
                      key={snap.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        backgroundColor: isHead
                          ? "rgba(99, 102, 241, 0.08)"
                          : "var(--color-bg-secondary, #181d29)",
                        border: isHead
                          ? "1px solid rgba(99, 102, 241, 0.35)"
                          : "1px solid var(--color-border, #242c3d)",
                        borderRadius: 8,
                        transition: "border-color 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            backgroundColor: isHead ? "rgba(99, 102, 241, 0.2)" : "rgba(30, 41, 59, 0.8)",
                            color: isHead ? "#818cf8" : "#94a3b8",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        >
                          <GitCommit size={15} />
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>
                              {snap.name}
                            </span>
                            {isHead && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                  backgroundColor: "#4338ca",
                                  color: "#ffffff",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.04em",
                                }}
                              >
                                HEAD
                              </span>
                            )}
                            {snap.isAutoSnapshot && (
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: "1px 5px",
                                  borderRadius: 4,
                                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                                  color: "#34d399",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 3,
                                }}
                              >
                                <Sparkles size={9} /> Auto
                              </span>
                            )}
                          </div>

                          {snap.description && (
                            <p style={{ fontSize: 12, color: "#94a3b8", margin: "3px 0 6px 0" }}>
                              {snap.description}
                            </p>
                          )}

                          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "#64748b" }}>
                            <span>Branch: <b style={{ color: "#94a3b8" }}>{snap.branchName}</b></span>
                            <span>•</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                              <Clock size={11} /> {formatRelativeTime(snap.timestamp)}
                            </span>
                            <span>•</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                              <HardDrive size={11} /> {formatBytes(snap.sizeBytes)}
                            </span>
                          </div>

                          {/* Tags */}
                          {snap.tags.length > 0 && (
                            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                              {snap.tags.map((t) => (
                                <span
                                  key={t}
                                  style={{
                                    fontSize: 10,
                                    padding: "1px 5px",
                                    borderRadius: 3,
                                    backgroundColor: "rgba(51, 65, 85, 0.6)",
                                    color: "#cbd5e1",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 3,
                                  }}
                                >
                                  <Tag size={9} /> {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          onClick={() => {
                            if (!comparingSnapshotIds) {
                              // Set as target, find previous as base
                              const idx = allSnapshots.findIndex((s) => s.id === snap.id);
                              const baseId = idx < allSnapshots.length - 1 ? allSnapshots[idx + 1].id : allSnapshots[0].id;
                              setComparingSnapshots(baseId, snap.id);
                            } else {
                              setComparingSnapshots(comparingSnapshotIds[0], snap.id);
                            }
                            setActiveTab("diff");
                          }}
                          title="Compare in Visual AST Diff"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "4px 8px",
                            backgroundColor: isComparing ? "rgba(99, 102, 241, 0.2)" : "transparent",
                            border: "1px solid",
                            borderColor: isComparing ? "#818cf8" : "var(--color-border, #334155)",
                            color: isComparing ? "#c7d2fe" : "#94a3b8",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <FileDiff size={12} />
                          Diff
                        </button>

                        <button
                          onClick={() => setRestoreConfirmSnap(snap)}
                          title="Restore AST State"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "4px 8px",
                            backgroundColor: "transparent",
                            border: "1px solid var(--color-border, #334155)",
                            color: "#38bdf8",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <RotateCcw size={12} />
                          Restore
                        </button>

                        <button
                          onClick={() => deleteSnapshot(snap.id)}
                          title="Delete Snapshot"
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            padding: 4,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VISUAL AST DIFF */}
        {activeTab === "diff" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Diff Selector Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                backgroundColor: "var(--color-bg-secondary, #181d29)",
                border: "1px solid var(--color-border, #242c3d)",
                borderRadius: 8,
              }}
            >
              {/* Base Selector */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Base:</span>
                <select
                  value={comparingSnapshotIds?.[0] || ""}
                  onChange={(e) =>
                    setComparingSnapshots(e.target.value, comparingSnapshotIds?.[1] || allSnapshots[0]?.id || "")
                  }
                  style={{
                    backgroundColor: "#1e2433",
                    color: "#f8fafc",
                    border: "1px solid #334155",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {allSnapshots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatRelativeTime(s.timestamp)})
                    </option>
                  ))}
                </select>
              </div>

              <ArrowRight size={14} color="#64748b" style={{ margin: "0 12px" }} />

              {/* Target Selector */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Target:</span>
                <select
                  value={comparingSnapshotIds?.[1] || ""}
                  onChange={(e) =>
                    setComparingSnapshots(comparingSnapshotIds?.[0] || allSnapshots[1]?.id || "", e.target.value)
                  }
                  style={{
                    backgroundColor: "#1e2433",
                    color: "#f8fafc",
                    border: "1px solid #334155",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {allSnapshots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatRelativeTime(s.timestamp)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Metrics Bar */}
            {diffReport && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  backgroundColor: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid var(--color-border, #1e2433)",
                  borderRadius: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#10b981",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    +{diffReport.totalAdded} Added
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#f59e0b",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    Δ {diffReport.totalModified} Modified
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#ef4444",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    -{diffReport.totalRemoved} Removed
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                  {diffReport.summary}
                </div>
              </div>
            )}

            {/* Diff Content Sections */}
            {diffReport ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* 1. Pages Diff */}
                {diffReport.pages.length > 0 && (
                  <div
                    style={{
                      backgroundColor: "var(--color-bg-secondary, #181d29)",
                      border: "1px solid var(--color-border, #242c3d)",
                      borderRadius: 8,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "rgba(30, 41, 59, 0.5)",
                        borderBottom: "1px solid var(--color-border, #242c3d)",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <FileText size={14} color="#818cf8" />
                      Pages ({diffReport.pages.length})
                    </div>
                    <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {diffReport.pages.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            backgroundColor:
                              p.status === "added"
                                ? "rgba(16, 185, 129, 0.08)"
                                : p.status === "removed"
                                ? "rgba(239, 68, 68, 0.08)"
                                : "rgba(245, 158, 11, 0.08)",
                            borderRadius: 4,
                            fontSize: 12,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "1px 5px",
                                borderRadius: 3,
                                backgroundColor:
                                  p.status === "added"
                                    ? "#059669"
                                    : p.status === "removed"
                                    ? "#dc2626"
                                    : "#d97706",
                                color: "#fff",
                                textTransform: "uppercase",
                              }}
                            >
                              {p.status}
                            </span>
                            <span style={{ fontWeight: 600, color: "#f8fafc" }}>{p.name}</span>
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>
                            {p.slugChanged ? (
                              <span>
                                <s style={{ color: "#ef4444" }}>{p.oldSlug}</s> ➔{" "}
                                <b style={{ color: "#10b981" }}>{p.newSlug}</b>
                              </span>
                            ) : (
                              p.slug
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Visual Canvas Elements Diff */}
                {diffReport.elements.length > 0 && (
                  <div
                    style={{
                      backgroundColor: "var(--color-bg-secondary, #181d29)",
                      border: "1px solid var(--color-border, #242c3d)",
                      borderRadius: 8,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "rgba(30, 41, 59, 0.5)",
                        borderBottom: "1px solid var(--color-border, #242c3d)",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Layers size={14} color="#818cf8" />
                      Visual Elements & Properties ({diffReport.elements.length})
                    </div>
                    <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {diffReport.elements.map((el) => {
                        const isExpanded = expandedElements[el.id];
                        return (
                          <div
                            key={el.id}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              backgroundColor: "rgba(30, 41, 59, 0.3)",
                              borderRadius: 4,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              onClick={() => toggleExpandElement(el.id)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "6px 10px",
                                cursor: "pointer",
                                userSelect: "none",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {el.propertyDiffs.length > 0 ? (
                                  isExpanded ? (
                                    <ChevronDown size={14} color="#94a3b8" />
                                  ) : (
                                    <ChevronRight size={14} color="#94a3b8" />
                                  )
                                ) : (
                                  <div style={{ width: 14 }} />
                                )}
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: "1px 5px",
                                    borderRadius: 3,
                                    backgroundColor:
                                      el.status === "added"
                                        ? "#059669"
                                        : el.status === "removed"
                                        ? "#dc2626"
                                        : "#d97706",
                                    color: "#fff",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {el.status}
                                </span>
                                <span style={{ fontWeight: 600, color: "#f8fafc", fontSize: 12 }}>
                                  {el.name}
                                </span>
                                <span style={{ fontSize: 10, color: "#64748b" }}>({el.archetype})</span>
                              </div>

                              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                                {el.propertyDiffs.length > 0
                                  ? `${el.propertyDiffs.length} property change(s)`
                                  : ""}
                              </div>
                            </div>

                            {/* Expanded Property Diff Table */}
                            {isExpanded && el.propertyDiffs.length > 0 && (
                              <div
                                style={{
                                  padding: "6px 12px 10px 32px",
                                  backgroundColor: "rgba(15, 23, 42, 0.5)",
                                  borderTop: "1px solid rgba(51, 65, 85, 0.4)",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 4,
                                }}
                              >
                                {el.propertyDiffs.map((p) => (
                                  <div
                                    key={p.key}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      fontSize: 11,
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    <span style={{ color: "#93c5fd" }}>{p.key}:</span>
                                    <div>
                                      {p.status === "added" ? (
                                        <span style={{ color: "#10b981" }}>
                                          + {JSON.stringify(p.newValue)}
                                        </span>
                                      ) : p.status === "removed" ? (
                                        <span style={{ color: "#ef4444" }}>
                                          - {JSON.stringify(p.oldValue)}
                                        </span>
                                      ) : (
                                        <span>
                                          <s style={{ color: "#ef4444" }}>{JSON.stringify(p.oldValue)}</s> ➔{" "}
                                          <b style={{ color: "#10b981" }}>{JSON.stringify(p.newValue)}</b>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Database Schemas Diff */}
                {diffReport.schemas.length > 0 && (
                  <div
                    style={{
                      backgroundColor: "var(--color-bg-secondary, #181d29)",
                      border: "1px solid var(--color-border, #242c3d)",
                      borderRadius: 8,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "rgba(30, 41, 59, 0.5)",
                        borderBottom: "1px solid var(--color-border, #242c3d)",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Database size={14} color="#818cf8" />
                      Database Schemas ({diffReport.schemas.length})
                    </div>
                    <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {diffReport.schemas.map((s) => (
                        <div
                          key={s.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            backgroundColor: "rgba(30, 41, 59, 0.3)",
                            borderRadius: 4,
                            fontSize: 12,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "1px 5px",
                                borderRadius: 3,
                                backgroundColor:
                                  s.status === "added"
                                    ? "#059669"
                                    : s.status === "removed"
                                    ? "#dc2626"
                                    : "#d97706",
                                color: "#fff",
                                textTransform: "uppercase",
                              }}
                            >
                              {s.status}
                            </span>
                            <span style={{ fontWeight: 600, color: "#f8fafc" }}>{s.name}</span>
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>
                            {s.fieldDiffs.length} field change(s)
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 48,
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                Select two snapshots above to compute side-by-side AST differences.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BRANCHES & MERGE */}
        {activeTab === "merge" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                backgroundColor: "var(--color-bg-secondary, #181d29)",
                border: "1px solid var(--color-border, #242c3d)",
                borderRadius: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
                  Active Branch
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#818cf8", marginTop: 2 }}>
                  {activeBranch.name} {activeBranch.isDefault ? "(default)" : ""}
                </div>
              </div>
              <button
                onClick={() => setShowBranchModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  backgroundColor: "rgba(99, 102, 241, 0.15)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  color: "#c7d2fe",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Plus size={13} />
                New Branch
              </button>
            </div>

            {/* Merge Status Banner */}
            {mergeStatusMessage && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 6,
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#34d399",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{mergeStatusMessage}</span>
                <X size={13} style={{ cursor: "pointer" }} onClick={() => setMergeStatusMessage(null)} />
              </div>
            )}

            {/* Branch List with Merge Action */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1" }}>
                All Branches ({Object.keys(branches).length})
              </div>

              {Object.values(branches).map((b) => {
                const isCurrent = b.id === activeBranchId;
                return (
                  <div
                    key={b.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      backgroundColor: "var(--color-bg-secondary, #181d29)",
                      border: isCurrent
                        ? "1px solid rgba(99, 102, 241, 0.3)"
                        : "1px solid var(--color-border, #242c3d)",
                      borderRadius: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <GitBranch size={15} color={isCurrent ? "#818cf8" : "#94a3b8"} />
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>
                            {b.name}
                          </span>
                          {b.isDefault && (
                            <span
                              style={{
                                fontSize: 9,
                                padding: "1px 4px",
                                borderRadius: 3,
                                backgroundColor: "rgba(51, 65, 85, 0.6)",
                                color: "#94a3b8",
                              }}
                            >
                              Default
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          Updated {formatRelativeTime(b.updatedAt)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {!isCurrent && (
                        <>
                          <button
                            onClick={() => switchBranch(b.id)}
                            style={{
                              padding: "4px 8px",
                              backgroundColor: "transparent",
                              border: "1px solid var(--color-border, #334155)",
                              color: "#cbd5e1",
                              borderRadius: 4,
                              fontSize: 11,
                              cursor: "pointer",
                            }}
                          >
                            Checkout
                          </button>
                          <button
                            onClick={() => {
                              const res = mergeBranch(b.id);
                              setMergeStatusMessage(res.summary);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "4px 8px",
                              backgroundColor: "#4f46e5",
                              border: "none",
                              color: "#ffffff",
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            <GitMerge size={12} />
                            Merge into {activeBranch.name}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: CREATE SNAPSHOT */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: 440,
              backgroundColor: "var(--color-bg-secondary, #181d29)",
              border: "1px solid var(--color-border, #242c3d)",
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: "1px solid var(--color-border, #242c3d)",
                backgroundColor: "rgba(30, 41, 59, 0.4)",
              }}
            >
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Create Project Snapshot</h3>
              <X size={15} style={{ cursor: "pointer" }} onClick={() => setShowCreateModal(false)} />
            </div>

            <form onSubmit={handleCreateSnapshotSubmit} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                  Snapshot Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Before checkout redesign"
                  value={newSnapName}
                  onChange={(e) => setNewSnapName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    backgroundColor: "#0f1117",
                    border: "1px solid #334155",
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 12,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe what was accomplished in this checkpoint..."
                  value={newSnapDesc}
                  onChange={(e) => setNewSnapDesc(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    backgroundColor: "#0f1117",
                    border: "1px solid #334155",
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 12,
                    boxSizing: "border-box",
                    resize: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="release, milestone, auth"
                  value={newSnapTags}
                  onChange={(e) => setNewSnapTags(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    backgroundColor: "#0f1117",
                    border: "1px solid #334155",
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 12,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "transparent",
                    border: "1px solid #334155",
                    color: "#94a3b8",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "6px 14px",
                    backgroundColor: "#4f46e5",
                    border: "none",
                    color: "#fff",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Save Snapshot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE BRANCH */}
      {showBranchModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: 380,
              backgroundColor: "var(--color-bg-secondary, #181d29)",
              border: "1px solid var(--color-border, #242c3d)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: "1px solid var(--color-border, #242c3d)",
                backgroundColor: "rgba(30, 41, 59, 0.4)",
              }}
            >
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Create New Branch</h3>
              <X size={15} style={{ cursor: "pointer" }} onClick={() => setShowBranchModal(false)} />
            </div>

            <form onSubmit={handleCreateBranchSubmit} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="feature/payment-redesign"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    backgroundColor: "#0f1117",
                    border: "1px solid #334155",
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 12,
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  Branching from active branch: <b>{activeBranch.name}</b>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "transparent",
                    border: "1px solid #334155",
                    color: "#94a3b8",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "6px 14px",
                    backgroundColor: "#4f46e5",
                    border: "none",
                    color: "#fff",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESTORE CONFIRMATION */}
      {restoreConfirmSnap && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: 400,
              backgroundColor: "var(--color-bg-secondary, #181d29)",
              border: "1px solid #ef4444",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 16px",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                borderBottom: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
              }}
            >
              <AlertTriangle size={18} />
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Restore Snapshot?</h3>
            </div>

            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 12, color: "#cbd5e1", margin: "0 0 10px 0" }}>
                You are about to restore the project state to snapshot:
              </p>
              <div
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#0f1117",
                  borderRadius: 6,
                  border: "1px solid #334155",
                  marginBottom: 12,
                }}
              >
                <div style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>
                  {restoreConfirmSnap.name}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {formatRelativeTime(restoreConfirmSnap.timestamp)} •{" "}
                  {formatBytes(restoreConfirmSnap.sizeBytes)}
                </div>
              </div>
              <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>
                This will overwrite the live canvas elements, pages, and database schemas with this snapshot&apos;s
                state.
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setRestoreConfirmSnap(null)}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "transparent",
                    border: "1px solid #334155",
                    color: "#94a3b8",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRestoreConfirm}
                  style={{
                    padding: "6px 14px",
                    backgroundColor: "#ef4444",
                    border: "none",
                    color: "#fff",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Restore State
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
