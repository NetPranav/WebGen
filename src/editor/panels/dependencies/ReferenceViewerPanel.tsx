"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Network,
  RefreshCw,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertTriangle,
  FileText,
  Layers,
  Database,
  Cpu,
  Boxes,
  ArrowRight,
  X,
  PieChart,
  HardDrive,
  GitBranch,
  Repeat,
} from "lucide-react";
import { useDependencyStore } from "../../../core/store/useDependencyStore";
import { DependencyNode, DependencyNodeType } from "../../../core/types/dependencies";

const NODE_COLORS: Record<DependencyNodeType, { bg: string; border: string; text: string; icon: typeof FileText }> = {
  page: { bg: "rgba(59, 130, 246, 0.15)", border: "#3b82f6", text: "#93c5fd", icon: FileText },
  element: { bg: "rgba(16, 185, 129, 0.15)", border: "#10b981", text: "#6ee7b7", icon: Layers },
  schema: { bg: "rgba(245, 158, 11, 0.15)", border: "#f59e0b", text: "#fcd34d", icon: Database },
  variable: { bg: "rgba(139, 92, 246, 0.15)", border: "#8b5cf6", text: "#c4b5fd", icon: Cpu },
  blueprint: { bg: "rgba(236, 72, 153, 0.15)", border: "#ec4899", text: "#f472b6", icon: Boxes },
  redirect: { bg: "rgba(14, 165, 233, 0.15)", border: "#0ea5e9", text: "#7dd3fc", icon: ArrowRight },
};

export const ReferenceViewerPanel: React.FC = () => {
  const {
    graphData,
    selectedNodeId,
    activeFilterType,
    searchQuery,
    viewMode,
    zoomLevel,
    refreshGraph,
    selectNode,
    setActiveFilterType,
    setSearchQuery,
    setViewMode,
    setZoomLevel,
    getSelectedNode,
    getForwardReferences,
    getBackwardReferences,
    getHighlightedChain,
  } = useDependencyStore();

  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initial graph build on mount
  useEffect(() => {
    refreshGraph();
  }, [refreshGraph]);

  const selectedNode = getSelectedNode();
  const forwardRefs = getForwardReferences();
  const backwardRefs = getBackwardReferences();
  const highlightedChain = getHighlightedChain();

  const highlightedNodeIds = useMemo(() => {
    if (!highlightedChain) return null;
    return new Set(highlightedChain.nodes.map((n) => n.id));
  }, [highlightedChain]);

  const highlightedEdgeIds = useMemo(() => {
    if (!highlightedChain) return null;
    return new Set(highlightedChain.edges.map((e) => e.id));
  }, [highlightedChain]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    if (!graphData) return [];
    return Object.values(graphData.nodes).filter((node) => {
      const matchesType = activeFilterType === "all" || node.type === activeFilterType;
      const matchesSearch =
        searchQuery === "" ||
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [graphData, activeFilterType, searchQuery]);

  // Compute layout positions for nodes in columns
  const nodePositions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    if (!graphData) return pos;

    const columnOrder: DependencyNodeType[] = ["page", "element", "variable", "schema", "blueprint", "redirect"];
    const colSpacing = 280;
    const rowSpacing = 85;
    const paddingX = 60;
    const paddingTop = 60;

    // Group nodes by type
    const grouped: Record<DependencyNodeType, DependencyNode[]> = {
      page: [],
      element: [],
      variable: [],
      schema: [],
      blueprint: [],
      redirect: [],
    };

    Object.values(graphData.nodes).forEach((n) => {
      if (grouped[n.type]) {
        grouped[n.type].push(n);
      }
    });

    columnOrder.forEach((type, colIdx) => {
      const list = grouped[type];
      list.forEach((node, rowIdx) => {
        pos[node.id] = {
          x: paddingX + colIdx * colSpacing,
          y: paddingTop + rowIdx * rowSpacing,
        };
      });
    });

    return pos;
  }, [graphData]);

  // Pan controls
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 0) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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
      {/* HEADER BAR */}
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
              backgroundColor: "rgba(14, 165, 233, 0.15)",
              color: "#38bdf8",
              border: "1px solid rgba(14, 165, 233, 0.3)",
            }}
          >
            <Network size={16} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, margin: 0, letterSpacing: "0.02em" }}>
                Reference Viewer & Dependency Graph
              </h2>
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 4,
                  backgroundColor: "rgba(14, 165, 233, 0.12)",
                  color: "#7dd3fc",
                  fontWeight: 600,
                  border: "1px solid rgba(14, 165, 233, 0.25)",
                }}
              >
                Panel 26
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted, #64748b)" }}>
              {graphData?.metrics.totalNodes || 0} nodes • {graphData?.metrics.totalEdges || 0} edges •{" "}
              {graphData?.metrics.orphanCount || 0} orphans • {formatBytes(graphData?.metrics.totalSizeBytes || 0)} total
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Refresh Graph */}
          <button
            onClick={() => refreshGraph()}
            title="Re-analyze Project Dependencies"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              backgroundColor: "var(--color-bg-secondary, #181d29)",
              border: "1px solid var(--color-border, #242c3d)",
              color: "#cbd5e1",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={12} />
            Refresh
          </button>

          {/* View Mode Buttons */}
          <div
            style={{
              display: "flex",
              backgroundColor: "var(--color-bg-secondary, #181d29)",
              border: "1px solid var(--color-border, #242c3d)",
              borderRadius: 6,
              padding: 2,
            }}
          >
            <button
              onClick={() => setViewMode("canvas")}
              style={{
                padding: "4px 8px",
                border: "none",
                borderRadius: 4,
                backgroundColor: viewMode === "canvas" ? "#3b82f6" : "transparent",
                color: viewMode === "canvas" ? "#ffffff" : "#94a3b8",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Canvas
            </button>
            <button
              onClick={() => setViewMode("orphans")}
              style={{
                padding: "4px 8px",
                border: "none",
                borderRadius: 4,
                backgroundColor: viewMode === "orphans" ? "#f59e0b" : "transparent",
                color: viewMode === "orphans" ? "#ffffff" : "#94a3b8",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Orphans ({graphData?.metrics.orphanCount || 0})
            </button>
            <button
              onClick={() => setViewMode("sizemap")}
              style={{
                padding: "4px 8px",
                border: "none",
                borderRadius: 4,
                backgroundColor: viewMode === "sizemap" ? "#8b5cf6" : "transparent",
                color: viewMode === "sizemap" ? "#ffffff" : "#94a3b8",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Size Map
            </button>
          </div>
        </div>
      </div>

      {/* FILTER AND SEARCH BAR */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          borderBottom: "1px solid var(--color-border, #1e2433)",
          backgroundColor: "var(--color-bg-secondary, #141824)",
          gap: 12,
          flexShrink: 0,
        }}
      >
        {/* Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            backgroundColor: "#0f1117",
            border: "1px solid #334155",
            borderRadius: 5,
            padding: "4px 8px",
            width: 240,
          }}
        >
          <Search size={13} color="#64748b" />
          <input
            type="text"
            placeholder="Filter entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: 11,
              outline: "none",
              width: "100%",
            }}
          />
          {searchQuery && (
            <X size={12} style={{ cursor: "pointer", color: "#64748b" }} onClick={() => setSearchQuery("")} />
          )}
        </div>

        {/* Category Pills */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {(["all", "page", "element", "schema", "variable", "blueprint", "redirect"] as const).map((type) => {
            const isSelected = activeFilterType === type;
            return (
              <button
                key={type}
                onClick={() => setActiveFilterType(type)}
                style={{
                  padding: "3px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "capitalize",
                  border: "1px solid",
                  borderColor: isSelected ? "#38bdf8" : "var(--color-border, #242c3d)",
                  backgroundColor: isSelected ? "rgba(14, 165, 233, 0.15)" : "transparent",
                  color: isSelected ? "#7dd3fc" : "#94a3b8",
                  cursor: "pointer",
                }}
              >
                {type}
              </button>
            );
          })}
        </div>

        {/* Canvas Zoom Controls (only shown on canvas view) */}
        {viewMode === "canvas" && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => setZoomLevel(zoomLevel - 0.15)}
              title="Zoom Out"
              style={{
                background: "none",
                border: "1px solid #334155",
                borderRadius: 4,
                color: "#94a3b8",
                padding: 4,
                cursor: "pointer",
              }}
            >
              <ZoomOut size={13} />
            </button>
            <span style={{ fontSize: 11, color: "#cbd5e1", minWidth: 36, textAlign: "center" }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(zoomLevel + 0.15)}
              title="Zoom In"
              style={{
                background: "none",
                border: "1px solid #334155",
                borderRadius: 4,
                color: "#94a3b8",
                padding: 4,
                cursor: "pointer",
              }}
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={() => {
                setZoomLevel(1);
                setPanOffset({ x: 0, y: 0 });
              }}
              title="Reset View"
              style={{
                background: "none",
                border: "1px solid #334155",
                borderRadius: 4,
                color: "#94a3b8",
                padding: 4,
                cursor: "pointer",
              }}
            >
              <Maximize2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* BODY AREA */}
      <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden" }}>
        {/* VIEW 1: INTERACTIVE CANVAS */}
        {viewMode === "canvas" && (
          <div style={{ flex: 1, position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
            <svg
              style={{
                width: "100%",
                height: "100%",
                cursor: isPanning ? "grabbing" : "grab",
                backgroundColor: "#0b0d13",
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <defs>
                <pattern id="depGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(30, 41, 59, 0.4)" strokeWidth="1" />
                </pattern>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
                </marker>
                <marker
                  id="arrowhead-active"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#38bdf8" />
                </marker>
              </defs>

              <rect width="100%" height="100%" fill="url(#depGrid)" />

              <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}>
                {/* EDGES */}
                {graphData?.edges.map((edge) => {
                  const sPos = nodePositions[edge.sourceId];
                  const tPos = nodePositions[edge.targetId];
                  if (!sPos || !tPos) return null;

                  const isHighlighted = highlightedEdgeIds?.has(edge.id);
                  const isDimmed = highlightedEdgeIds && !isHighlighted;

                  // Connect from right side of source to left side of target
                  const sx = sPos.x + 200;
                  const sy = sPos.y + 24;
                  const tx = tPos.x;
                  const ty = tPos.y + 24;

                  const dx = (tx - sx) * 0.5;
                  const path = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;

                  return (
                    <g key={edge.id} opacity={isDimmed ? 0.15 : 0.85}>
                      <path
                        d={path}
                        fill="none"
                        stroke={isHighlighted ? "#38bdf8" : "#475569"}
                        strokeWidth={isHighlighted ? 2.5 : 1.2}
                        markerEnd={isHighlighted ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                      />
                    </g>
                  );
                })}

                {/* NODES */}
                {filteredNodes.map((node) => {
                  const pos = nodePositions[node.id];
                  if (!pos) return null;

                  const isSelected = selectedNodeId === node.id;
                  const isChainHighlighted = highlightedNodeIds?.has(node.id);
                  const isDimmed = highlightedNodeIds && !isChainHighlighted;
                  const colorConfig = NODE_COLORS[node.type];
                  const Icon = colorConfig.icon;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectNode(isSelected ? null : node.id);
                      }}
                      style={{ cursor: "pointer" }}
                      opacity={isDimmed ? 0.25 : 1}
                    >
                      {/* Glow on selection */}
                      {isSelected && (
                        <rect
                          x="-4"
                          y="-4"
                          width="208"
                          height="56"
                          rx="8"
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2.5"
                          filter="drop-shadow(0 0 6px #38bdf8)"
                        />
                      )}

                      {/* Card Body */}
                      <rect
                        width="200"
                        height="48"
                        rx="6"
                        fill="rgba(24, 29, 41, 0.95)"
                        stroke={isSelected ? "#38bdf8" : node.isOrphan ? "#f59e0b" : colorConfig.border}
                        strokeWidth={isSelected ? 2 : 1}
                      />

                      {/* Node Icon */}
                      <rect
                        x="6"
                        y="6"
                        width="36"
                        height="36"
                        rx="4"
                        fill={colorConfig.bg}
                      />
                      <foreignObject x="14" y="14" width="20" height="20">
                        <Icon size={18} color={colorConfig.text} />
                      </foreignObject>

                      {/* Node Title */}
                      <text
                        x="50"
                        y="20"
                        fill="#f8fafc"
                        fontSize="12"
                        fontWeight="600"
                        style={{ pointerEvents: "none" }}
                      >
                        {node.name.length > 18 ? `${node.name.substring(0, 16)}...` : node.name}
                      </text>

                      {/* Node Type & Reference Count */}
                      <text
                        x="50"
                        y="36"
                        fill="#94a3b8"
                        fontSize="10"
                        style={{ pointerEvents: "none" }}
                      >
                        {node.type} • {node.referenceCount} refs
                      </text>

                      {/* Orphan Warning Icon */}
                      {node.isOrphan && (
                        <foreignObject x="176" y="6" width="16" height="16">
                          <AlertTriangle size={14} color="#f59e0b" />
                        </foreignObject>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* SIDE INSPECTOR DRAWER */}
            {selectedNode && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 320,
                  height: "100%",
                  backgroundColor: "rgba(15, 17, 23, 0.96)",
                  borderLeft: "1px solid var(--color-border, #1e2433)",
                  backdropFilter: "blur(12px)",
                  display: "flex",
                  flexDirection: "column",
                  zIndex: 20,
                  boxShadow: "-10px 0 25px rgba(0,0,0,0.5)",
                }}
              >
                {/* Drawer Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--color-border, #242c3d)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        padding: 4,
                        borderRadius: 4,
                        backgroundColor: NODE_COLORS[selectedNode.type].bg,
                        color: NODE_COLORS[selectedNode.type].text,
                      }}
                    >
                      {React.createElement(NODE_COLORS[selectedNode.type].icon, { size: 16 })}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>
                        {selectedNode.name}
                      </div>
                      <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase" }}>
                        {selectedNode.type}
                      </div>
                    </div>
                  </div>
                  <X
                    size={16}
                    style={{ cursor: "pointer", color: "#94a3b8" }}
                    onClick={() => selectNode(null)}
                  />
                </div>

                {/* Drawer Content */}
                <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Status Banner */}
                  {selectedNode.isOrphan && (
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: 6,
                        backgroundColor: "rgba(245, 158, 11, 0.15)",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                        color: "#fbbf24",
                        fontSize: 11,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <AlertTriangle size={15} flex-shrink="0" />
                      <span>Orphaned Asset: No incoming references or bindings found.</span>
                    </div>
                  )}

                  {/* Metadata Stats */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      padding: 10,
                      backgroundColor: "var(--color-bg-secondary, #181d29)",
                      borderRadius: 6,
                      border: "1px solid var(--color-border, #242c3d)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>AST Footprint</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
                        {formatBytes(selectedNode.sizeBytes)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>Total Referencers</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
                        {selectedNode.referenceCount} incoming
                      </div>
                    </div>
                  </div>

                  {/* Forward Dependencies (This entity depends on...) */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                      Dependencies ({forwardRefs.length})
                    </div>
                    {forwardRefs.length === 0 ? (
                      <div style={{ fontSize: 11, color: "#64748b", fontStyle: "italic" }}>
                        None (leaf node)
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {forwardRefs.map((dep) => (
                          <div
                            key={dep.id}
                            onClick={() => selectNode(dep.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 8px",
                              backgroundColor: "var(--color-bg-secondary, #181d29)",
                              border: "1px solid var(--color-border, #242c3d)",
                              borderRadius: 4,
                              cursor: "pointer",
                              fontSize: 11,
                            }}
                          >
                            <span style={{ fontWeight: 600, color: "#cbd5e1" }}>{dep.name}</span>
                            <span style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase" }}>
                              {dep.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Backward References (This entity is used by...) */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                      Referenced By ({backwardRefs.length})
                    </div>
                    {backwardRefs.length === 0 ? (
                      <div style={{ fontSize: 11, color: "#64748b", fontStyle: "italic" }}>
                        None (root or orphan)
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {backwardRefs.map((ref) => (
                          <div
                            key={ref.id}
                            onClick={() => selectNode(ref.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 8px",
                              backgroundColor: "var(--color-bg-secondary, #181d29)",
                              border: "1px solid var(--color-border, #242c3d)",
                              borderRadius: 4,
                              cursor: "pointer",
                              fontSize: 11,
                            }}
                          >
                            <span style={{ fontWeight: 600, color: "#cbd5e1" }}>{ref.name}</span>
                            <span style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase" }}>
                              {ref.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: ORPHANS VIEW */}
        {viewMode === "orphans" && (
          <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
            <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  backgroundColor: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: 8,
                }}
              >
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "#fbbf24" }}>
                    Orphaned Assets ({graphData?.orphanNodes.length || 0})
                  </h3>
                  <p style={{ fontSize: 11, color: "#cbd5e1", margin: "4px 0 0 0" }}>
                    These components, state variables, or database schemas have zero active incoming references
                    or are detached from the active page hierarchy.
                  </p>
                </div>
              </div>

              {graphData?.orphanNodes.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 48,
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  Zero orphans detected! Every asset in the project is actively referenced.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {graphData?.orphanNodes.map((orphan) => (
                    <div
                      key={orphan.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        backgroundColor: "var(--color-bg-secondary, #181d29)",
                        border: "1px solid var(--color-border, #242c3d)",
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <AlertTriangle size={16} color="#f59e0b" />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>
                            {orphan.name}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            Type: <b style={{ color: "#94a3b8" }}>{orphan.type}</b> • Size:{" "}
                            {formatBytes(orphan.sizeBytes)}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          selectNode(orphan.id);
                          setViewMode("canvas");
                        }}
                        style={{
                          padding: "4px 10px",
                          backgroundColor: "rgba(99, 102, 241, 0.15)",
                          border: "1px solid rgba(99, 102, 241, 0.3)",
                          color: "#c7d2fe",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Inspect in Canvas
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: SIZE MAP VIEW */}
        {viewMode === "sizemap" && (
          <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
            <div style={{ maxWidth: 840, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>
                Asset Complexity & Footprint Breakdown
              </div>

              {/* Categorical Size Distribution */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.values(graphData?.nodes || {})
                  .sort((a, b) => b.sizeBytes - a.sizeBytes)
                  .map((node) => {
                    const total = graphData?.metrics.totalSizeBytes || 1;
                    const pct = Math.max(1, Math.round((node.sizeBytes / total) * 100));
                    return (
                      <div
                        key={node.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          padding: "8px 12px",
                          backgroundColor: "var(--color-bg-secondary, #181d29)",
                          border: "1px solid var(--color-border, #242c3d)",
                          borderRadius: 6,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span style={{ fontWeight: 600, color: "#f8fafc" }}>
                            {node.name} <span style={{ color: "#64748b", fontSize: 11 }}>({node.type})</span>
                          </span>
                          <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>
                            {formatBytes(node.sizeBytes)} ({pct}%)
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div
                          style={{
                            width: "100%",
                            height: 6,
                            backgroundColor: "#0f1117",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              backgroundColor: NODE_COLORS[node.type].border,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
