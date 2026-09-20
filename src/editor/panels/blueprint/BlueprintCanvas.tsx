"use client";

/**
 * ============================================================================
 * LOGIC BLUEPRINT CANVAS PANEL
 * ============================================================================
 * Unreal Engine-style Visual Scripting & Node-and-Wire Canvas:
 * - Live AST graph rendering driven by `useProjectStore`
 * - Hardware-accelerated 120 FPS Wasm cable & spring tension simulation
 * - Dynamic SVG cubic Bezier wires with pin type colors (never red for valid pins)
 * - Proximity-based magnetic snapping to connectors (44px radius)
 * - Dual connection workflows: Drag-to-Connect & Click-to-Connect
 * - Modular components: `NodeCard`, `PinHandle`, `RerouteNode`, `CommentBox`, `ActionPaletteModal`
 * - Unreal Engine-style Comment grouping boxes with enclosed node dragging
 * - Unreal Engine-style Reroute knots with double-click wire insertion
 * - Contextual Node Search Palette (`Tab` key / Right-Click / Wire drop)
 * - Unlinked input pins with inline literal editors
 * - Integrated `MyBlueprintPanel` (left sidebar) & `ValidationPanel` (bottom drawer)
 *
 * Architecture Ref: ROADMAP.md §Sub-Phase 4.5 & Detailed Roadmap.md §Sub-Phase 4.5
 * ============================================================================
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Play,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Layers,
  Terminal,
  Grid,
  CornerDownRight,
  ArrowLeft,
  Link2,
  Save,
  Undo2,
  Redo2,
  Workflow,
  MessageSquare,
  Maximize2,
  RotateCcw,
} from "lucide-react";
import { useProjectStore } from "@/core/store/useProjectStore";
import { useHistoryStore } from "@/core/store/useHistoryStore";
import {
  getNodeDefinition,
  getPinColor,
  PinDefinition,
  PinDirection,
} from "@/core/types/node-registry";
import { BlueprintWire } from "@/core/ast/ASTManager";
import { TypeChecker } from "@/core/ast/TypeChecker";
import { SplineSolver } from "@/core/wasm/SplineSolver";
import { WasmCableCanvas, CanvasWire } from "@/editor/canvas/WasmCableCanvas";
import { NodeCard } from "./NodeCard";
import { RerouteNode } from "./RerouteNode";
import { CommentBox, CommentBoxData } from "./CommentBox";
import { ActionPaletteModal, PendingWireContext } from "./ActionPaletteModal";
import { MyBlueprintPanel } from "./MyBlueprintPanel";
import { ValidationPanel } from "./ValidationPanel";
import { executionTracer } from "@/runtime/ExecutionTracer";
import { breakpointManager } from "@/runtime/BreakpointManager";
import { Breakpoint } from "@/core/types/debugger";
import { performanceProfiler } from "@/runtime/PerformanceProfiler";
import { NodePerformanceMetric, ProfilerReport } from "@/core/types/profiler";
import "@/editor/styles/panels.css";
import "@/editor/styles/forms.css";

interface DraggingWireState {
  sourceNodeId: string;
  sourcePinId: string;
  sourcePin: PinDefinition;
  isSourceOutput: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface ActiveClickPinState {
  nodeId: string;
  pin: PinDefinition;
  direction: PinDirection;
  coord: { x: number; y: number };
}

interface PaletteModalState {
  isOpen: boolean;
  x: number;
  y: number;
  pendingWire?: PendingWireContext;
}

interface BlueprintCanvasProps {
  onBackToViewport?: () => void;
  focusedNodeId?: string | null;
}

const SNAP_RADIUS = 44;

export const BlueprintCanvas: React.FC<BlueprintCanvasProps> = ({
  onBackToViewport,
  focusedNodeId,
}) => {
  const {
    blueprintGraphs,
    activeBlueprintGraphId,
    setActiveBlueprintGraph,
    addBlueprintNode,
    removeBlueprintNode,
    moveBlueprintNode,
    connectBlueprintPins,
    disconnectBlueprintWire,
    setBlueprintPinValue,
    compileActiveBlueprintGraph,
    undo,
    redo,
  } = useProjectStore();

  const canUndo = useHistoryStore((s) => s.past.length > 0);
  const canRedo = useHistoryStore((s) => s.future.length > 0);

  // Viewport Floating Save feedback state
  const [justSaved, setJustSaved] = useState(false);

  const activeGraph = activeBlueprintGraphId
    ? blueprintGraphs[activeBlueprintGraphId]
    : undefined;

  // Side Panels Visibility
  const [isMyBpOpen, setIsMyBpOpen] = useState(true);
  const [isValidationOpen, setIsValidationOpen] = useState(false);

  // Canvas Pan & Zoom
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Canvas Grid Pattern Style ('graph' | 'subtle' | 'empty')
  const [gridPattern, setGridPattern] = useState<"graph" | "subtle" | "empty">("graph");

  // Selection State (Single & Multi-Selection)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedWireIds, setSelectedWireIds] = useState<Set<string>>(new Set());
  const [selectedCommentIds, setSelectedCommentIds] = useState<Set<string>>(new Set());

  // Marquee / Box Selection State ("select mode")
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Group Dragging Ref (Synchronized multi-element translation)
  const groupDragStartRef = useRef<{
    nodes: Record<string, { x: number; y: number }>;
    comments: Record<string, { x: number; y: number }>;
    anchorCanvasPos: { x: number; y: number };
  } | null>(null);

  // Node Dragging State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [nodeDragOffset, setNodeDragOffset] = useState({ x: 0, y: 0 });

  // Wire Dragging State (Hold & Drag)
  const [draggingWire, setDraggingWire] = useState<DraggingWireState | null>(null);

  // Click-to-Connect State (Click pin A, then click pin B)
  const [activeClickPin, setActiveClickPin] = useState<ActiveClickPinState | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Magnetically Snapped or Hovered Pin Target
  const [hoveredPinTarget, setHoveredPinTarget] = useState<{
    nodeId: string;
    pinId: string;
    pin: PinDefinition;
    isValid: boolean;
    error?: string;
    x: number;
    y: number;
  } | null>(null);

  // Contextual Node Palette Modal
  const [palette, setPalette] = useState<PaletteModalState>({ isOpen: false, x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Invariant refs for wheel/trackpad pan & zoom listener without listener churn
  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Track right-click dragging vs stationary right-click context menu
  const rightClickStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef<boolean>(false);

  // --------------------------------------------------------------------------
  // Comment Boxes State & Logic (Unreal Engine 5 standard)
  // --------------------------------------------------------------------------
  const [commentBoxes, setCommentBoxes] = useState<Record<string, CommentBoxData>>({
    "comment-auth": {
      id: "comment-auth",
      title: "Authentication & Authorization Workflow",
      position: { x: 30, y: 20 },
      size: { width: 620, height: 340 },
      color: "#206859",
    },
  });
  const [draggingCommentId, setDraggingCommentId] = useState<string | null>(null);
  const [resizingCommentId, setResizingCommentId] = useState<string | null>(null);
  const [resizingCommentInfo, setResizingCommentInfo] = useState<{
    id: string;
    mode: "corner" | "width" | "height";
    startX: number;
    startY: number;
    initialWidth: number;
    initialHeight: number;
  } | null>(null);
  const [commentDragOffset, setCommentDragOffset] = useState({ x: 0, y: 0 });
  const [enclosedNodesOnDragStart, setEnclosedNodesOnDragStart] = useState<
    Array<{ id: string; offsetX: number; offsetY: number }>
  >([]);

  // --------------------------------------------------------------------------
  // Sub-Phase 5.5: Breakpoints & Debugger Pause State
  // --------------------------------------------------------------------------
  const [breakpointsMap, setBreakpointsMap] = useState<Map<string, Breakpoint>>(() => {
    const m = new Map<string, Breakpoint>();
    breakpointManager.getBreakpoints().forEach((b) => m.set(b.nodeId, b));
    return m;
  });
  const [debuggerPausedNodeId, setDebuggerPausedNodeId] = useState<string | null>(() => {
    return breakpointManager.getLastHitEvent()?.nodeId || null;
  });

  useEffect(() => {
    const unsub = breakpointManager.subscribe((state, hitEvent) => {
      const m = new Map<string, Breakpoint>();
      breakpointManager.getBreakpoints().forEach((b) => m.set(b.nodeId, b));
      setBreakpointsMap(m);
      setDebuggerPausedNodeId(state === "paused" ? (hitEvent?.nodeId || null) : null);
    });
    return unsub;
  }, []);

  // --------------------------------------------------------------------------
  // Sub-Phase 5.6: Performance Profiler & Hot Node State
  // --------------------------------------------------------------------------
  const [hotNodesMap, setHotNodesMap] = useState<Map<string, NodePerformanceMetric>>(() => {
    const report = performanceProfiler.getLatestReport();
    const map = new Map<string, NodePerformanceMetric>();
    if (report) {
      report.hotNodes.forEach((node: NodePerformanceMetric) => map.set(node.nodeId, node));
    }
    return map;
  });

  useEffect(() => {
    const unsub = performanceProfiler.subscribe((report: ProfilerReport) => {
      const map = new Map<string, NodePerformanceMetric>();
      report.hotNodes.forEach((node: NodePerformanceMetric) => map.set(node.nodeId, node));
      setHotNodesMap(map);
    });
    return unsub;
  }, []);

  // Quick compilation status
  const [compilationStatus, setCompilationStatus] = useState<{
    status: "ready" | "valid" | "error" | "warning";
    message: string;
  }>({ status: "ready", message: "Ready to compile" });

  const handleCompile = useCallback(() => {
    const result = compileActiveBlueprintGraph();
    const errors = result.issues.filter((i) => i.severity === "error").length;
    const warnings = result.issues.filter((i) => i.severity === "warning").length;

    if (errors > 0) {
      setCompilationStatus({ status: "error", message: `${errors} Errors` });
      setIsValidationOpen(true);
    } else if (warnings > 0) {
      setCompilationStatus({ status: "warning", message: `${warnings} Warnings` });
    } else {
      setCompilationStatus({ status: "valid", message: "Good to Go" });
    }
  }, [compileActiveBlueprintGraph]);

  // Ensure semantically correct wire between Query Collection Success and Branch Condition on initialization
  useEffect(() => {
    if (!activeGraph) return;
    const dbNode = activeGraph.nodes["node_db_query"];
    const branchNode = activeGraph.nodes["node_flow_branch"];
    if (dbNode && branchNode) {
      const hasSuccessWire = activeGraph.wires.some(
        (w) =>
          w.sourceNodeId === "node_db_query" &&
          w.sourcePinId === "success" &&
          w.targetNodeId === "node_flow_branch" &&
          w.targetPinId === "condition"
      );
      if (!hasSuccessWire) {
        connectBlueprintPins(
          activeGraph.id,
          "node_db_query",
          "success",
          "node_flow_branch",
          "condition",
          "Connect Query Success to Branch Condition"
        );
      }
    }
  }, [activeGraph?.id, connectBlueprintPins]);

  const handleSaveGraph = useCallback(() => {
    handleCompile();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  }, [handleCompile]);

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  // Pin geometry calculation (Pixel-perfect graph-space coordinates using live relative DOM measurement)
  const getPinCoordinate = useCallback(
    (nodeId: string, pinId: string, direction: "input" | "output") => {
      const node = activeGraph?.nodes[nodeId];
      if (!node) return { x: 0, y: 0 };

      // Reroute knot geometry
      if (node.type === "flow/reroute" || node.type === "reroute") {
        return {
          x: direction === "input" ? node.position.x - 4 : node.position.x + 4,
          y: node.position.y,
        };
      }

      // 1. Live DOM measurement: calculate pin center relative to node container
      // (Invariant to pan, zoom, scroll, container padding, or browser layout engine)
      if (canvasRef.current) {
        const pinEl = canvasRef.current.querySelector<HTMLElement>(
          `[data-pin-dot-key="${nodeId}:${direction}:${pinId}"]`
        );
        const nodeEl = canvasRef.current.querySelector<HTMLElement>(
          `[data-node-id="${nodeId}"]`
        );

        if (pinEl && nodeEl) {
          const pinRect = pinEl.getBoundingClientRect();
          const nodeRect = nodeEl.getBoundingClientRect();
          if (pinRect.width > 0 && nodeRect.width > 0) {
            return {
              x: node.position.x + (pinRect.left + pinRect.width / 2 - nodeRect.left) / zoom,
              y: node.position.y + (pinRect.top + pinRect.height / 2 - nodeRect.top) / zoom,
            };
          }
        }
      }

      // 2. High-precision analytical fallback matching NodeCard DOM layout
      const def = getNodeDefinition(node.type);
      const pins = direction === "input" ? def?.inputs || [] : def?.outputs || [];
      const pinIndex = pins.findIndex((p) => p.id === pinId);
      const safeIndex = pinIndex >= 0 ? pinIndex : 0;

      let nodeWidth = Math.max(260, Math.min(340, (node.title?.length || 10) * 12 + 120));
      if (canvasRef.current) {
        const nodeEl = canvasRef.current.querySelector<HTMLElement>(
          `[data-node-id="${nodeId}"]`
        );
        if (nodeEl && nodeEl.offsetWidth > 50) {
          nodeWidth = nodeEl.offsetWidth;
        }
      }

      const x = direction === "input" ? node.position.x + 20 : node.position.x + nodeWidth - 20;
      const y = node.position.y + 51 + safeIndex * 32;

      return { x, y };
    },
    [activeGraph, zoom]
  );

  // Add Comment Box action (Wraps selection, centers on screen, or places at custom position)
  const handleAddCommentBox = useCallback((pos?: { x: number; y: number } | React.MouseEvent) => {
    const id = `comment-${Date.now()}`;
    const customPos = pos && "x" in pos && typeof (pos as any).x === "number" && !("nativeEvent" in pos)
      ? (pos as { x: number; y: number })
      : undefined;

    if (customPos) {
      setCommentBoxes((prev) => ({
        ...prev,
        [id]: {
          id,
          title: "Logic Sequence",
          position: customPos,
          size: { width: 440, height: 260 },
          color: "#206859",
        },
      }));
    } else if (selectedNodeId && activeGraph?.nodes[selectedNodeId]) {
      const node = activeGraph.nodes[selectedNodeId];
      setCommentBoxes((prev) => ({
        ...prev,
        [id]: {
          id,
          title: `Group: ${node.title}`,
          position: { x: node.position.x - 30, y: node.position.y - 45 },
          size: { width: 340, height: 260 },
          color: "#206859",
        },
      }));
    } else {
      const centerPos = {
        x: Math.round(300 - pan.x / zoom),
        y: Math.round(180 - pan.y / zoom),
      };
      setCommentBoxes((prev) => ({
        ...prev,
        [id]: {
          id,
          title: "Logic Sequence",
          position: centerPos,
          size: { width: 440, height: 260 },
          color: "#206859",
        },
      }));
    }
    setSelectedCommentId(id);
    setSelectedNodeId(null);
    setSelectedWireId(null);
  }, [selectedNodeId, activeGraph, pan, zoom]);

  // Restore default sample wire connections
  const handleRestoreDefaultWires = useCallback(() => {
    if (!activeGraph) return;
    connectBlueprintPins(activeGraph.id, "node_evt_click", "exec", "node_db_query", "execIn", "Restore Sample Flow");
    connectBlueprintPins(activeGraph.id, "node_db_query", "execOut", "node_flow_branch", "execIn", "Restore Sample Flow");
    connectBlueprintPins(activeGraph.id, "node_db_query", "success", "node_flow_branch", "condition", "Restore Sample Flow");
    connectBlueprintPins(activeGraph.id, "node_flow_branch", "trueExec", "node_print_success", "execIn", "Restore Sample Flow");
    connectBlueprintPins(activeGraph.id, "node_flow_branch", "falseExec", "node_print_fail", "execIn", "Restore Sample Flow");
    handleCompile();
  }, [activeGraph, connectBlueprintPins, handleCompile]);

  // Double click wire handler: split wire with Reroute Knot
  const handleWireDoubleClick = useCallback(
    (e: React.MouseEvent, wire: BlueprintWire) => {
      e.stopPropagation();
      if (!activeGraph || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const clickCanvasX = Math.round((e.clientX - rect.left - pan.x) / zoom);
      const clickCanvasY = Math.round((e.clientY - rect.top - pan.y) / zoom);

      // 1. Add reroute node at click position
      const knotNode = addBlueprintNode(
        activeGraph.id,
        "flow/reroute",
        { x: clickCanvasX, y: clickCanvasY },
        { pinType: wire.pinType },
        "Insert Reroute Knot"
      );

      // 2. Disconnect original wire
      disconnectBlueprintWire(activeGraph.id, wire.id, "Split Wire");

      // 3. Connect source to reroute input, and reroute output to target
      connectBlueprintPins(
        activeGraph.id,
        wire.sourceNodeId,
        wire.sourcePinId,
        knotNode.id,
        "in",
        "Wire to Reroute"
      );
      connectBlueprintPins(
        activeGraph.id,
        knotNode.id,
        "out",
        wire.targetNodeId,
        wire.targetPinId,
        "Reroute to Target"
      );

      handleCompile();
    },
    [activeGraph, pan, zoom, addBlueprintNode, disconnectBlueprintWire, connectBlueprintPins, handleCompile]
  );

  // --------------------------------------------------------------------------
  // Keyboard Shortcuts (Tab = Palette, C = Comment, Delete/Backspace = Remove, Esc = Cancel)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "SELECT"
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveGraph();
      } else if (e.key === "Tab") {
        e.preventDefault();
        if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          // Open palette centered in viewport on Tab key
          const centerX = (rect.width / 2 - pan.x) / zoom;
          const centerY = (rect.height / 2 - 140 - pan.y) / zoom;
          setPalette((prev) => ({
            isOpen: !prev.isOpen,
            x: Math.round(centerX),
            y: Math.round(centerY),
          }));
        }
      } else if (e.key.toLowerCase() === "c" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleAddCommentBox();
      } else if (e.key === "Escape") {
        setPalette({ isOpen: false, x: 0, y: 0 });
        setDraggingWire(null);
        setActiveClickPin(null);
        setHoveredPinTarget(null);
        setSelectedNodeId(null);
        setSelectedWireId(null);
        setSelectedCommentId(null);
        setSelectedNodeIds(new Set());
        setSelectedWireIds(new Set());
        setSelectedCommentIds(new Set());
        setIsSelecting(false);
        setSelectionStart(null);
        setSelectionBox(null);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const nodesToDelete = new Set(selectedNodeIds);
        if (selectedNodeId) nodesToDelete.add(selectedNodeId);

        const wiresToDelete = new Set(selectedWireIds);
        if (selectedWireId) wiresToDelete.add(selectedWireId);

        const commentsToDelete = new Set(selectedCommentIds);
        if (selectedCommentId) commentsToDelete.add(selectedCommentId);

        if (nodesToDelete.size > 0 || wiresToDelete.size > 0 || commentsToDelete.size > 0) {
          if (activeGraph) {
            // Delete all selected nodes (AST automatically cleans up connected wires)
            nodesToDelete.forEach((nodeId) => {
              removeBlueprintNode(activeGraph.id, nodeId, "Delete Selected Node");
            });
            // Delete all selected wires
            wiresToDelete.forEach((wireId) => {
              disconnectBlueprintWire(activeGraph.id, wireId, "Delete Selected Wire");
            });
          }
          // Delete all selected comments
          if (commentsToDelete.size > 0) {
            setCommentBoxes((prev) => {
              const next = { ...prev };
              commentsToDelete.forEach((cId) => delete next[cId]);
              return next;
            });
          }
          // Reset selection state
          setSelectedNodeIds(new Set());
          setSelectedWireIds(new Set());
          setSelectedCommentIds(new Set());
          setSelectedNodeId(null);
          setSelectedWireId(null);
          setSelectedCommentId(null);
          handleCompile();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedNodeId,
    selectedWireId,
    selectedCommentId,
    selectedNodeIds,
    selectedWireIds,
    selectedCommentIds,
    activeGraph,
    pan,
    zoom,
    removeBlueprintNode,
    disconnectBlueprintWire,
    handleUndo,
    handleRedo,
    handleSaveGraph,
    handleAddCommentBox,
    handleCompile,
  ]);

  // --------------------------------------------------------------------------
  // Trackpad Two-Finger Pan & Pinch-to-Zoom (Native Non-Passive Wheel Listener)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom centered at mouse cursor
        const rect = el.getBoundingClientRect();
        const currentPan = panRef.current;
        const currentZoom = zoomRef.current;

        const mouseCanvasX = (e.clientX - rect.left - currentPan.x) / currentZoom;
        const mouseCanvasY = (e.clientY - rect.top - currentPan.y) / currentZoom;

        const zoomDelta = -e.deltaY * 0.005;
        const nextZoom = Math.min(2.0, Math.max(0.25, currentZoom * (1 + zoomDelta)));
        const roundedZoom = Number(nextZoom.toFixed(2));

        const nextPanX = e.clientX - rect.left - mouseCanvasX * roundedZoom;
        const nextPanY = e.clientY - rect.top - mouseCanvasY * roundedZoom;

        setZoom(roundedZoom);
        setPan({ x: Math.round(nextPanX), y: Math.round(nextPanY) });
      } else {
        // Two-finger trackpad swipe or mouse wheel pan
        setPan((prev) => ({
          x: Math.round(prev.x - e.deltaX),
          y: Math.round(prev.y - e.deltaY),
        }));
      }
    };

    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheelNative);
    };
  }, []);

  // --------------------------------------------------------------------------
  // Mouse Event Handlers (Canvas Panning, Node Dragging, Wire Dragging)
  // --------------------------------------------------------------------------
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Right click, Middle click, or Alt+Left click: Canvas Panning
    if (e.button === 2 || e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      if (e.button === 2) {
        rightClickStartRef.current = { x: e.clientX, y: e.clientY };
        hasDraggedRef.current = false;
      }
      if (e.button !== 2) {
        setPalette({ isOpen: false, x: 0, y: 0 });
      }
    } else if (e.button === 0) {
      // Left click on canvas background:
      // Start Marquee Selection mode ("select mode")
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - pan.x) / zoom;
      const canvasY = (e.clientY - rect.top - pan.y) / zoom;

      setIsSelecting(true);
      setSelectionStart({ x: canvasX, y: canvasY });
      setSelectionBox(null);

      // If Shift key is not held, clear existing selection
      if (!e.shiftKey) {
        setSelectedNodeIds(new Set());
        setSelectedWireIds(new Set());
        setSelectedCommentIds(new Set());
        setSelectedNodeId(null);
        setSelectedWireId(null);
        setSelectedCommentId(null);
      }
      setActiveClickPin(null);
      setHoveredPinTarget(null);
      setPalette({ isOpen: false, x: 0, y: 0 });
    }
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    // If right-click dragged beyond threshold, suppress context menu
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      rightClickStartRef.current = null;
      return;
    }
    rightClickStartRef.current = null;

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clampedScreenX = Math.max(12, Math.min(rect.width - 350, e.clientX - rect.left));
    const clampedScreenY = Math.max(12, Math.min(rect.height - 100, e.clientY - rect.top));
    const canvasX = (clampedScreenX - pan.x) / zoom;
    const canvasY = (clampedScreenY - pan.y) / zoom;

    setPalette({
      isOpen: true,
      x: canvasX,
      y: canvasY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;

    setCursorPos({ x: canvasX, y: canvasY });

    if (isPanning) {
      if (rightClickStartRef.current) {
        const dist = Math.hypot(
          e.clientX - rightClickStartRef.current.x,
          e.clientY - rightClickStartRef.current.y
        );
        if (dist > 4) {
          hasDraggedRef.current = true;
        }
      }
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (isSelecting && selectionStart) {
      // Marquee box selection calculation in graph coordinates
      const boxX = Math.min(selectionStart.x, canvasX);
      const boxY = Math.min(selectionStart.y, canvasY);
      const boxW = Math.abs(canvasX - selectionStart.x);
      const boxH = Math.abs(canvasY - selectionStart.y);

      setSelectionBox({ x: boxX, y: boxY, width: boxW, height: boxH });

      // Hit-test elements if drag threshold is exceeded
      if (boxW > 3 || boxH > 3) {
        const newSelectedNodes = new Set<string>();
        const newSelectedWires = new Set<string>();
        const newSelectedComments = new Set<string>();

        // 1. Intersect Nodes & Reroute Knots
        if (activeGraph) {
          Object.values(activeGraph.nodes).forEach((node) => {
            const isReroute = node.type === "flow/reroute" || node.type === "reroute";
            const nodeW = isReroute ? 28 : Math.max(260, Math.min(340, (node.title?.length || 10) * 12 + 120));
            const nodeH = isReroute ? 28 : 160;
            const nodeX = isReroute ? node.position.x - 14 : node.position.x;
            const nodeY = isReroute ? node.position.y - 14 : node.position.y;

            const overlaps =
              nodeX < boxX + boxW &&
              nodeX + nodeW > boxX &&
              nodeY < boxY + boxH &&
              nodeY + nodeH > boxY;

            if (overlaps) {
              newSelectedNodes.add(node.id);
            }
          });
        }

        // 2. Intersect Comment Boxes
        Object.values(commentBoxes).forEach((comment) => {
          const overlaps =
            comment.position.x < boxX + boxW &&
            comment.position.x + comment.size.width > boxX &&
            comment.position.y < boxY + boxH &&
            comment.position.y + comment.size.height > boxY;

          if (overlaps) {
            newSelectedComments.add(comment.id);
          }
        });

        // 3. Intersect Wires
        if (activeGraph) {
          activeGraph.wires.forEach((wire) => {
            const srcCoord = getPinCoordinate(wire.sourceNodeId, wire.sourcePinId, "output");
            const tgtCoord = getPinCoordinate(wire.targetNodeId, wire.targetPinId, "input");
            const midX = (srcCoord.x + tgtCoord.x) / 2;
            const midY = (srcCoord.y + tgtCoord.y) / 2;

            const isPtInBox = (px: number, py: number) =>
              px >= boxX && px <= boxX + boxW && py >= boxY && py <= boxY + boxH;

            const wireSelected =
              isPtInBox(srcCoord.x, srcCoord.y) ||
              isPtInBox(tgtCoord.x, tgtCoord.y) ||
              isPtInBox(midX, midY) ||
              (newSelectedNodes.has(wire.sourceNodeId) && newSelectedNodes.has(wire.targetNodeId));

            if (wireSelected) {
              newSelectedWires.add(wire.id);
            }
          });
        }

        setSelectedNodeIds(newSelectedNodes);
        setSelectedWireIds(newSelectedWires);
        setSelectedCommentIds(newSelectedComments);

        if (newSelectedNodes.size === 1) {
          setSelectedNodeId(Array.from(newSelectedNodes)[0]);
        } else if (newSelectedNodes.size === 0) {
          setSelectedNodeId(null);
        }
        if (newSelectedWires.size === 1) {
          setSelectedWireId(Array.from(newSelectedWires)[0]);
        } else if (newSelectedWires.size === 0) {
          setSelectedWireId(null);
        }
        if (newSelectedComments.size === 1) {
          setSelectedCommentId(Array.from(newSelectedComments)[0]);
        } else if (newSelectedComments.size === 0) {
          setSelectedCommentId(null);
        }
      }
    } else if (draggingNodeId && activeGraph) {
      if (groupDragStartRef.current) {
        // Group dragging: translate ALL selected nodes and comments together
        const dx = canvasX - groupDragStartRef.current.anchorCanvasPos.x;
        const dy = canvasY - groupDragStartRef.current.anchorCanvasPos.y;

        Object.entries(groupDragStartRef.current.nodes).forEach(([id, startPos]) => {
          moveBlueprintNode(activeGraph.id, id, {
            x: Math.round(startPos.x + dx),
            y: Math.round(startPos.y + dy),
          });
        });

        if (Object.keys(groupDragStartRef.current.comments).length > 0) {
          setCommentBoxes((prev) => {
            const next = { ...prev };
            Object.entries(groupDragStartRef.current!.comments).forEach(([cId, startPos]) => {
              if (next[cId]) {
                next[cId] = {
                  ...next[cId],
                  position: {
                    x: Math.round(startPos.x + dx),
                    y: Math.round(startPos.y + dy),
                  },
                };
              }
            });
            return next;
          });
        }
      } else {
        moveBlueprintNode(activeGraph.id, draggingNodeId, {
          x: canvasX - nodeDragOffset.x,
          y: canvasY - nodeDragOffset.y,
        });
      }
    } else if (draggingCommentId) {
      const comment = commentBoxes[draggingCommentId];
      if (comment) {
        const newCommentX = Math.round(canvasX - commentDragOffset.x);
        const newCommentY = Math.round(canvasY - commentDragOffset.y);

        setCommentBoxes((prev) => ({
          ...prev,
          [draggingCommentId]: {
            ...prev[draggingCommentId],
            position: { x: newCommentX, y: newCommentY },
          },
        }));

        // Move all enclosed nodes synchronously
        if (activeGraph && enclosedNodesOnDragStart.length > 0) {
          enclosedNodesOnDragStart.forEach((enclosed) => {
            moveBlueprintNode(activeGraph.id, enclosed.id, {
              x: Math.round(newCommentX + enclosed.offsetX),
              y: Math.round(newCommentY + enclosed.offsetY),
            });
          });
        }
      }
    } else if (resizingCommentId) {
      const comment = commentBoxes[resizingCommentId];
      if (comment) {
        if (resizingCommentInfo && resizingCommentInfo.id === resizingCommentId) {
          const deltaX = Math.round(canvasX - resizingCommentInfo.startX);
          const deltaY = Math.round(canvasY - resizingCommentInfo.startY);

          const newWidth =
            resizingCommentInfo.mode === "height"
              ? comment.size.width
              : Math.max(240, resizingCommentInfo.initialWidth + deltaX);

          const newHeight =
            resizingCommentInfo.mode === "width"
              ? comment.size.height
              : Math.max(140, resizingCommentInfo.initialHeight + deltaY);

          setCommentBoxes((prev) => ({
            ...prev,
            [resizingCommentId]: {
              ...prev[resizingCommentId],
              size: { width: newWidth, height: newHeight },
            },
          }));
        } else {
          const newWidth = Math.max(240, Math.round(canvasX - comment.position.x));
          const newHeight = Math.max(140, Math.round(canvasY - comment.position.y));
          setCommentBoxes((prev) => ({
            ...prev,
            [resizingCommentId]: {
              ...prev[resizingCommentId],
              size: { width: newWidth, height: newHeight },
            },
          }));
        }
      }
    } else if (draggingWire || activeClickPin) {
      // Magnetic Proximity Snapping to other pins
      const sourceNodeId = draggingWire ? draggingWire.sourceNodeId : activeClickPin!.nodeId;
      const sourcePin = draggingWire ? draggingWire.sourcePin : activeClickPin!.pin;
      const isSourceOutput = draggingWire ? draggingWire.isSourceOutput : activeClickPin!.direction === "output";
      const targetDirection = isSourceOutput ? "input" : "output";

      let closestCandidate: {
        nodeId: string;
        pinId: string;
        pin: PinDefinition;
        isValid: boolean;
        error?: string;
        x: number;
        y: number;
      } | null = null;
      let minDistance = Infinity;

      if (activeGraph) {
        Object.values(activeGraph.nodes).forEach((otherNode) => {
          if (otherNode.id === sourceNodeId) return; // Disallow self-loop

          // Handle Reroute node target
          if (otherNode.type === "flow/reroute" || otherNode.type === "reroute") {
            const reroutePinId = targetDirection === "input" ? "in" : "out";
            const coord = getPinCoordinate(otherNode.id, reroutePinId, targetDirection);
            const dist = Math.hypot(coord.x - canvasX, coord.y - canvasY);

            if (dist < SNAP_RADIUS && dist < minDistance) {
              minDistance = dist;
              const fakePin: PinDefinition = {
                id: reroutePinId,
                name: reroutePinId,
                label: reroutePinId,
                type: (otherNode.customParams?.pinType as any) || sourcePin.type,
                direction: targetDirection,
              };
              closestCandidate = {
                nodeId: otherNode.id,
                pinId: reroutePinId,
                pin: fakePin,
                isValid: true,
                x: coord.x,
                y: coord.y,
              };
            }
            return;
          }

          const def = getNodeDefinition(otherNode.type);
          if (!def) return;
          const candidatePins = targetDirection === "input" ? def.inputs : def.outputs;

          candidatePins.forEach((candidatePin) => {
            const coord = getPinCoordinate(otherNode.id, candidatePin.id, targetDirection);
            const dist = Math.hypot(coord.x - canvasX, coord.y - canvasY);

            if (dist < SNAP_RADIUS && dist < minDistance) {
              minDistance = dist;
              const srcId = isSourceOutput ? sourceNodeId : otherNode.id;
              const srcPin = isSourceOutput ? sourcePin : candidatePin;
              const tgtId = isSourceOutput ? otherNode.id : sourceNodeId;
              const tgtPin = isSourceOutput ? candidatePin : sourcePin;

              const check = TypeChecker.validateWireConnection(
                { sourceNodeId: srcId, sourcePin: srcPin, targetNodeId: tgtId, targetPin: tgtPin },
                { silent: true }
              );

              closestCandidate = {
                nodeId: otherNode.id,
                pinId: candidatePin.id,
                pin: candidatePin,
                isValid: check.isValid,
                error: check.error,
                x: coord.x,
                y: coord.y,
              };
            }
          });
        });
      }

      setHoveredPinTarget(closestCandidate);

      if (draggingWire) {
        setDraggingWire((prev) =>
          prev
            ? {
                ...prev,
                currentX: closestCandidate && (closestCandidate as any).isValid ? (closestCandidate as any).x : canvasX,
                currentY: closestCandidate && (closestCandidate as any).isValid ? (closestCandidate as any).y : canvasY,
              }
            : null
        );
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      setTimeout(() => {
        rightClickStartRef.current = null;
      }, 50);
    }

    if (isSelecting) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionBox(null);
    }

    if (draggingNodeId) {
      setDraggingNodeId(null);
      groupDragStartRef.current = null;
    }

    if (draggingCommentId) {
      setDraggingCommentId(null);
      setEnclosedNodesOnDragStart([]);
    }

    if (resizingCommentId) {
      setResizingCommentId(null);
      setResizingCommentInfo(null);
    }

    if (draggingWire) {
      let targetToConnect = hoveredPinTarget;

      // 1. Direct DOM Element Hit-Test: check if released directly on a pin or its row container
      if ((!targetToConnect || !targetToConnect.isValid) && activeGraph) {
        const el = typeof document !== "undefined" ? document.elementFromPoint(e.clientX, e.clientY) : null;
        const pinDotEl =
          el?.closest("[data-pin-dot-key]") ||
          el?.querySelector("[data-pin-dot-key]") ||
          el?.closest(".bp-pin")?.querySelector("[data-pin-dot-key]");

        if (pinDotEl) {
          const dotKey = pinDotEl.getAttribute("data-pin-dot-key");
          if (dotKey) {
            const [hitNodeId, hitDirection, hitPinId] = dotKey.split(":");
            const targetDirection = draggingWire.isSourceOutput ? "input" : "output";
            if (hitNodeId !== draggingWire.sourceNodeId && hitDirection === targetDirection) {
              const targetNode = activeGraph.nodes[hitNodeId];
              const targetDef = targetNode ? getNodeDefinition(targetNode.type) : null;
              const targetPin = targetDef
                ? (hitDirection === "input" ? targetDef.inputs : targetDef.outputs).find((p) => p.id === hitPinId)
                : null;

              if (targetPin) {
                const srcId = draggingWire.isSourceOutput ? draggingWire.sourceNodeId : hitNodeId;
                const srcPin = draggingWire.isSourceOutput ? draggingWire.sourcePin : targetPin;
                const tgtId = draggingWire.isSourceOutput ? hitNodeId : draggingWire.sourceNodeId;
                const tgtPin = draggingWire.isSourceOutput ? targetPin : draggingWire.sourcePin;

                const check = TypeChecker.validateWireConnection(
                  { sourceNodeId: srcId, sourcePin: srcPin, targetNodeId: tgtId, targetPin: tgtPin },
                  { silent: true }
                );

                if (check.isValid) {
                  const coord = getPinCoordinate(hitNodeId, hitPinId, hitDirection as any);
                  targetToConnect = {
                    nodeId: hitNodeId,
                    pinId: hitPinId,
                    pin: targetPin,
                    isValid: true,
                    x: coord.x,
                    y: coord.y,
                  };
                }
              }
            }
          }
        }
      }

      // 2. Robust Proximity Fallback: if elementFromPoint didn't hit,
      // inspect pins within a generous 48px radius around release position
      if ((!targetToConnect || !targetToConnect.isValid) && activeGraph && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const dropCanvasX = (e.clientX - rect.left - pan.x) / zoom;
        const dropCanvasY = (e.clientY - rect.top - pan.y) / zoom;
        const targetDirection = draggingWire.isSourceOutput ? "input" : "output";

        let bestDist = 48;
        Object.values(activeGraph.nodes).forEach((otherNode) => {
          if (otherNode.id === draggingWire.sourceNodeId) return;
          const def = getNodeDefinition(otherNode.type);
          if (!def) return;
          const candidatePins = targetDirection === "input" ? def.inputs : def.outputs;

          candidatePins.forEach((candidatePin) => {
            const coord = getPinCoordinate(otherNode.id, candidatePin.id, targetDirection);
            const dist = Math.hypot(coord.x - dropCanvasX, coord.y - dropCanvasY);
            if (dist < bestDist) {
              const srcId = draggingWire.isSourceOutput ? draggingWire.sourceNodeId : otherNode.id;
              const srcPin = draggingWire.isSourceOutput ? draggingWire.sourcePin : candidatePin;
              const tgtId = draggingWire.isSourceOutput ? otherNode.id : draggingWire.sourceNodeId;
              const tgtPin = draggingWire.isSourceOutput ? candidatePin : draggingWire.sourcePin;

              const check = TypeChecker.validateWireConnection(
                { sourceNodeId: srcId, sourcePin: srcPin, targetNodeId: tgtId, targetPin: tgtPin },
                { silent: true }
              );

              if (check.isValid) {
                bestDist = dist;
                targetToConnect = {
                  nodeId: otherNode.id,
                  pinId: candidatePin.id,
                  pin: candidatePin,
                  isValid: true,
                  x: coord.x,
                  y: coord.y,
                };
              }
            }
          });
        });
      }

      // Check if dropped onto a valid snapped or hovered target pin
      if (targetToConnect && targetToConnect.isValid && activeGraph) {
        const sourceNodeId = draggingWire.isSourceOutput
          ? draggingWire.sourceNodeId
          : targetToConnect.nodeId;
        const sourcePinId = draggingWire.isSourceOutput
          ? draggingWire.sourcePinId
          : targetToConnect.pinId;
        const targetNodeId = draggingWire.isSourceOutput
          ? targetToConnect.nodeId
          : draggingWire.sourceNodeId;
        const targetPinId = draggingWire.isSourceOutput
          ? targetToConnect.pinId
          : draggingWire.sourcePinId;

        connectBlueprintPins(
          activeGraph.id,
          sourceNodeId,
          sourcePinId,
          targetNodeId,
          targetPinId,
          "Connect Pins"
        );
        handleCompile();
      } else if (!targetToConnect && canvasRef.current) {
        // Dropped onto empty canvas: open palette directly starting at mouse release position
        const rect = canvasRef.current.getBoundingClientRect();
        const canvasX = (e.clientX - rect.left - pan.x) / zoom;
        const canvasY = (e.clientY - rect.top - pan.y) / zoom;

        setPalette({
          isOpen: true,
          x: canvasX,
          y: canvasY,
          pendingWire: {
            nodeId: draggingWire.sourceNodeId,
            pinId: draggingWire.sourcePinId,
            pin: draggingWire.sourcePin,
            isOutput: draggingWire.isSourceOutput,
          },
        });
      }

      setDraggingWire(null);
      setHoveredPinTarget(null);
    }
  };

  // Window-level mousemove & mouseup listeners ensure dragging, resizing, panning, wire creation, and marquee selection track smoothly across any window boundary
  useEffect(() => {
    if (
      !draggingWire &&
      !draggingCommentId &&
      !resizingCommentId &&
      !draggingNodeId &&
      !isPanning &&
      !isSelecting
    ) {
      return;
    }

    const handleWindowMouseMove = (e: MouseEvent) => {
      handleMouseMove(e as unknown as React.MouseEvent);
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      handleMouseUp(e as unknown as React.MouseEvent);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [
    draggingWire,
    draggingCommentId,
    resizingCommentId,
    draggingNodeId,
    isPanning,
    isSelecting,
    handleMouseMove,
    handleMouseUp,
  ]);

  // Global Right-Click Context Menu across the entire website
  // Replaces the browser's default context menu everywhere with our Node Action Palette
  // Global Right-Click Context Menu & Node/Wire/Knot Disconnect/Removal
  // Replaces the browser's default context menu everywhere across the entire website
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      e.preventDefault();

      // If right-click was used to drag/pan beyond the threshold, suppress
      if (hasDraggedRef.current) {
        hasDraggedRef.current = false;
        rightClickStartRef.current = null;
        return;
      }
      rightClickStartRef.current = null;

      const target = e.target as HTMLElement | null;

      // 1. Reroute Knot right-clicked: remove the knot and reconnect across if wires exist
      const rerouteEl = target?.closest(".bp-reroute-node");
      if (rerouteEl && activeGraph) {
        const knotId = rerouteEl.getAttribute("data-node-id");
        if (knotId) {
          const inWire = activeGraph.wires.find((w) => w.targetNodeId === knotId);
          const outWire = activeGraph.wires.find((w) => w.sourceNodeId === knotId);

          if (inWire && outWire) {
            connectBlueprintPins(
              activeGraph.id,
              inWire.sourceNodeId,
              inWire.sourcePinId,
              outWire.targetNodeId,
              outWire.targetPinId,
              "Reconnect Wire Across Removed Knot"
            );
          }

          removeBlueprintNode(activeGraph.id, knotId, "Remove Reroute Knot");
          setSelectedNodeId(null);
          handleCompile();
          return;
        }
      }

      // 2. Wire right-clicked: disconnect wire
      const wirePathEl = target?.closest("[data-wire-id]");
      if (wirePathEl && activeGraph) {
        const wireId = wirePathEl.getAttribute("data-wire-id");
        if (wireId) {
          disconnectBlueprintWire(activeGraph.id, wireId, "Disconnect Wire");
          if (selectedWireId === wireId) setSelectedWireId(null);
          handleCompile();
          return;
        }
      }

      // 3. Pin right-clicked: disconnect all wires on this specific pin
      const pinEl = target?.closest("[data-pin-dot-key], .bp-pin");
      if (pinEl && activeGraph) {
        const dotEl = pinEl.hasAttribute("data-pin-dot-key")
          ? pinEl
          : pinEl.querySelector("[data-pin-dot-key]");
        const dotKey = dotEl?.getAttribute("data-pin-dot-key");
        if (dotKey) {
          const [nodeId, direction, pinId] = dotKey.split(":");
          const wiresToDisconnect = activeGraph.wires.filter((w) =>
            direction === "input"
              ? w.targetNodeId === nodeId && w.targetPinId === pinId
              : w.sourceNodeId === nodeId && w.sourcePinId === pinId
          );
          if (wiresToDisconnect.length > 0) {
            wiresToDisconnect.forEach((w) =>
              disconnectBlueprintWire(activeGraph.id, w.id, "Disconnect Pin Wire")
            );
            handleCompile();
            return;
          }
        }
      }

      // 4. Node Card right-clicked: disconnect all wires connected to this node
      const nodeCardEl = target?.closest(".bp-node-card");
      if (nodeCardEl && activeGraph) {
        const nodeId = nodeCardEl.getAttribute("data-node-id");
        if (nodeId) {
          const wiresToDisconnect = activeGraph.wires.filter(
            (w) => w.sourceNodeId === nodeId || w.targetNodeId === nodeId
          );
          if (wiresToDisconnect.length > 0) {
            wiresToDisconnect.forEach((w) =>
              disconnectBlueprintWire(activeGraph.id, w.id, "Disconnect Node Wires")
            );
            handleCompile();
            return;
          }
        }
      }

      // 5. Empty space (canvas background, toolbar, sidebar, empty page): open Node Action Palette
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const clampedScreenX = Math.max(12, Math.min(rect.width - 350, e.clientX - rect.left));
      const clampedScreenY = Math.max(12, Math.min(rect.height - 100, e.clientY - rect.top));
      const canvasX = (clampedScreenX - pan.x) / zoom;
      const canvasY = (clampedScreenY - pan.y) / zoom;

      setPalette({
        isOpen: true,
        x: canvasX,
        y: canvasY,
      });
    };

    window.addEventListener("contextmenu", handleGlobalContextMenu, true);
    return () => {
      window.removeEventListener("contextmenu", handleGlobalContextMenu, true);
    };
  }, [
    pan.x,
    pan.y,
    zoom,
    activeGraph,
    selectedWireId,
    connectBlueprintPins,
    disconnectBlueprintWire,
    removeBlueprintNode,
    handleCompile,
  ]);

  // --------------------------------------------------------------------------
  // Pin Drag Start & Click-to-Connect
  // --------------------------------------------------------------------------
  const handlePinMouseDown = (
    e: React.MouseEvent,
    nodeId: string,
    pin: PinDefinition,
    direction: PinDirection
  ) => {
    e.stopPropagation();
    const coord = getPinCoordinate(nodeId, pin.id, direction);

    setDraggingWire({
      sourceNodeId: nodeId,
      sourcePinId: pin.id,
      sourcePin: pin,
      isSourceOutput: direction === "output",
      startX: coord.x,
      startY: coord.y,
      currentX: coord.x,
      currentY: coord.y,
    });
  };

  const handlePinClick = (
    e: React.MouseEvent,
    nodeId: string,
    pin: PinDefinition,
    direction: PinDirection
  ) => {
    e.stopPropagation();
    const coord = getPinCoordinate(nodeId, pin.id, direction);

    if (!activeClickPin) {
      // Begin click-to-connect session
      setActiveClickPin({
        nodeId,
        pin,
        direction,
        coord,
      });
    } else {
      // Connect click session to this pin
      if (activeClickPin.nodeId === nodeId && activeClickPin.pin.id === pin.id) {
        // Clicked self: cancel
        setActiveClickPin(null);
        setHoveredPinTarget(null);
        return;
      }

      if (activeGraph) {
        const sourceNodeId = activeClickPin.direction === "output" ? activeClickPin.nodeId : nodeId;
        const sourcePinId = activeClickPin.direction === "output" ? activeClickPin.pin.id : pin.id;
        const targetNodeId = activeClickPin.direction === "output" ? nodeId : activeClickPin.nodeId;
        const targetPinId = activeClickPin.direction === "output" ? pin.id : activeClickPin.pin.id;

        const result = connectBlueprintPins(
          activeGraph.id,
          sourceNodeId,
          sourcePinId,
          targetNodeId,
          targetPinId,
          "Click Connect Pins"
        );
        if (result.success) {
          handleCompile();
        }
      }

      setActiveClickPin(null);
      setHoveredPinTarget(null);
    }
  };

  // --------------------------------------------------------------------------
  // Node Drag Start & Group Multi-Selection Drag Init
  // --------------------------------------------------------------------------
  const handleNodeHeaderMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (!canvasRef.current || !activeGraph) return;

    const isAlreadySelected = selectedNodeIds.has(nodeId) || selectedNodeId === nodeId;
    let activeNodes = selectedNodeIds;

    if (e.shiftKey) {
      // Shift+Click: Toggle node in multi-selection
      const next = new Set(selectedNodeIds);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      setSelectedNodeIds(next);
      activeNodes = next;
      setSelectedNodeId(next.size > 0 ? Array.from(next)[0] : null);
    } else if (!isAlreadySelected) {
      // Normal click on an unselected node: select only this node
      const next = new Set([nodeId]);
      setSelectedNodeIds(next);
      activeNodes = next;
      setSelectedNodeId(nodeId);
      setSelectedWireIds(new Set());
      setSelectedCommentIds(new Set());
      setSelectedWireId(null);
      setSelectedCommentId(null);
    } else {
      // Node was already selected: keep entire multi-selection active
      setSelectedNodeId(nodeId);
    }

    setActiveClickPin(null);

    const node = activeGraph.nodes[nodeId];
    if (!node) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;

    setDraggingNodeId(nodeId);
    setNodeDragOffset({
      x: canvasX - node.position.x,
      y: canvasY - node.position.y,
    });

    // Capture starting positions of all selected nodes and comments for synchronized group drag
    const nodesStartPositions: Record<string, { x: number; y: number }> = {};
    activeNodes.forEach((id) => {
      const n = activeGraph.nodes[id];
      if (n) {
        nodesStartPositions[id] = { ...n.position };
      }
    });

    const commentsStartPositions: Record<string, { x: number; y: number }> = {};
    selectedCommentIds.forEach((cId) => {
      const c = commentBoxes[cId];
      if (c) {
        commentsStartPositions[cId] = { ...c.position };
      }
    });

    groupDragStartRef.current = {
      nodes: nodesStartPositions,
      comments: commentsStartPositions,
      anchorCanvasPos: { x: canvasX, y: canvasY },
    };
  };

  // --------------------------------------------------------------------------
  // Comment Box Drag & Resize Start Handlers
  // --------------------------------------------------------------------------
  const handleCommentHeaderMouseDown = (e: React.MouseEvent, commentId: string) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    setSelectedCommentId(commentId);
    setSelectedNodeId(null);
    setSelectedWireId(null);

    const comment = commentBoxes[commentId];
    if (!comment) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;

    setDraggingCommentId(commentId);
    setCommentDragOffset({
      x: canvasX - comment.position.x,
      y: canvasY - comment.position.y,
    });

    // Calculate all enclosed nodes inside this comment box
    if (activeGraph) {
      const enclosed = Object.values(activeGraph.nodes)
        .filter((n) => {
          return (
            n.position.x >= comment.position.x &&
            n.position.x <= comment.position.x + comment.size.width &&
            n.position.y >= comment.position.y &&
            n.position.y <= comment.position.y + comment.size.height
          );
        })
        .map((n) => ({
          id: n.id,
          offsetX: n.position.x - comment.position.x,
          offsetY: n.position.y - comment.position.y,
        }));
      setEnclosedNodesOnDragStart(enclosed);
    }
  };

  const handleCommentResizeMouseDown = (e: React.MouseEvent, commentId: string) => {
    e.stopPropagation();
    setSelectedCommentId(commentId);
    setResizingCommentId(commentId);

    const comment = commentBoxes[commentId];
    if (!comment || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;

    const target = e.target as HTMLElement;
    const cursor = target?.style?.cursor || (typeof window !== "undefined" ? window.getComputedStyle(target).cursor : "");
    const title = target?.getAttribute("title") || "";
    let mode: "corner" | "width" | "height" = "corner";
    if (cursor === "ew-resize" || title.toLowerCase().includes("width")) {
      mode = "width";
    } else if (cursor === "ns-resize" || title.toLowerCase().includes("height")) {
      mode = "height";
    }

    setResizingCommentInfo({
      id: commentId,
      mode,
      startX: canvasX,
      startY: canvasY,
      initialWidth: comment.size.width,
      initialHeight: comment.size.height,
    });
  };

  const handleAddNodeAtCenter = (typeId: string, customParams?: Record<string, unknown>) => {
    if (!activeGraph) return;
    const centerPos = {
      x: Math.round(320 - pan.x / zoom),
      y: Math.round(200 - pan.y / zoom),
    };
    addBlueprintNode(activeGraph.id, typeId, centerPos, customParams, `Add Node '${typeId}'`);
    handleCompile();
  };

  const handleJumpToNode = (nodeId: string) => {
    const node = activeGraph?.nodes[nodeId];
    if (!node) return;
    setSelectedNodeId(nodeId);
    setPan({
      x: -(node.position.x * zoom) + 400,
      y: -(node.position.y * zoom) + 250,
    });
  };

  // Connected Pin Keys for NodeCard rendering
  const connectedPinKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!activeGraph) return keys;
    for (const wire of activeGraph.wires) {
      keys.add(`${wire.sourceNodeId}:output:${wire.sourcePinId}`);
      keys.add(`${wire.targetNodeId}:input:${wire.targetPinId}`);
    }
    return keys;
  }, [activeGraph?.wires]);

  // --------------------------------------------------------------------------
  // 120 FPS Wasm Cable & Wire Coordinates Memo (Sub-Phase 4.4)
  // --------------------------------------------------------------------------
  const [layoutTick, setLayoutTick] = useState(0);

  useEffect(() => {
    setLayoutTick((t) => t + 1);
    const t1 = setTimeout(() => setLayoutTick((t) => t + 1), 60);
    const t2 = setTimeout(() => setLayoutTick((t) => t + 1), 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeGraph?.id, activeGraph?.wires.length]);

  // Sub-Phase 5.3: Wire Pulse Telemetry from ExecutionTracer
  const [pulseTelemetryWires, setPulseTelemetryWires] = useState<Record<string, number>>({});

  useEffect(() => {
    return executionTracer.subscribePulses((pulses) => {
      const map: Record<string, number> = {};
      for (const p of pulses) {
        map[p.wireId] = p.speed;
      }
      setPulseTelemetryWires(map);
    });
  }, []);

  // Sub-Phase 5.3: Focus and center node when navigated from ExecutionTracePanel
  useEffect(() => {
    if (!focusedNodeId || !activeGraph) return;
    const node = activeGraph.nodes[focusedNodeId];
    if (node) {
      setSelectedNodeIds(new Set([focusedNodeId]));
      setSelectedNodeId(focusedNodeId);
      setPan({
        x: 420 - node.position.x * zoom,
        y: 260 - node.position.y * zoom,
      });
    }
  }, [focusedNodeId, activeGraph, zoom]);

  const canvasWires: CanvasWire[] = useMemo(() => {
    if (!activeGraph) return [];
    return activeGraph.wires.map((wire) => {
      const sourceCoord = getPinCoordinate(wire.sourceNodeId, wire.sourcePinId, "output");
      const targetCoord = getPinCoordinate(wire.targetNodeId, wire.targetPinId, "input");
      const isExec = wire.pinType === "exec" || wire.isExec;
      const isTelemetryPulsing = Boolean(pulseTelemetryWires[wire.id]);
      return {
        id: wire.id,
        sourceNodeId: wire.sourceNodeId,
        sourcePinId: wire.sourcePinId,
        targetNodeId: wire.targetNodeId,
        targetPinId: wire.targetPinId,
        pinType: wire.pinType,
        start: sourceCoord,
        end: targetCoord,
        isSelected: selectedWireIds.has(wire.id) || selectedWireId === wire.id,
        hasPulse: isExec || isTelemetryPulsing,
        pulseSpeed: pulseTelemetryWires[wire.id] || (isExec ? 0.0012 : 0.0016),
      };
    });
  }, [activeGraph, getPinCoordinate, selectedWireId, selectedWireIds, layoutTick, pulseTelemetryWires]);

  const activeDraggingWire = useMemo(() => {
    if (!draggingWire) return null;
    const start = { x: draggingWire.startX, y: draggingWire.startY };
    const end = hoveredPinTarget?.isValid
      ? { x: hoveredPinTarget.x, y: hoveredPinTarget.y }
      : { x: draggingWire.currentX, y: draggingWire.currentY };
    return {
      start: draggingWire.isSourceOutput ? start : end,
      current: draggingWire.isSourceOutput ? end : start,
      pinType: draggingWire.sourcePin.type,
    };
  }, [draggingWire, hoveredPinTarget]);

  return (
    <div
      className="bp-shell"
      role="region"
      aria-label="Logic Blueprint Editor"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#FCFDFD",
        overflow: "hidden",
      }}
    >
      {/* Blueprint Toolbar */}
      <div
        className="bp-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          height: 38,
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
          zIndex: 20,
        }}
      >
        {/* Left: Back Button & Active Graph Name */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {onBackToViewport && (
            <button
              type="button"
              onClick={onBackToViewport}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                backgroundColor: "#F1F5F9",
                border: "1px solid #CBD5E1",
                color: "#0F172A",
                borderRadius: 4,
                padding: "0 8px",
                height: 26,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                boxSizing: "border-box",
              }}
              title="Return to Visual Design Canvas"
            >
              <ArrowLeft size={12} />
              <span>Viewport</span>
            </button>
          )}

          {/* Active Graph Event Name */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "0 8px",
              height: 26,
              backgroundColor: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 4,
              whiteSpace: "nowrap",
              flexShrink: 0,
              boxSizing: "border-box",
            }}
          >
            <Workflow size={13} style={{ color: "#206859", flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap" }}>
              {activeGraph ? activeGraph.name : "Main Event Graph"}
            </span>
            {activeGraph && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#64748B",
                  backgroundColor: "#E2E8F0",
                  padding: "1px 5px",
                  borderRadius: 3,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  lineHeight: "14px",
                }}
              >
                {Object.keys(activeGraph.nodes).length} nodes
              </span>
            )}
          </div>

          {activeClickPin && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                backgroundColor: "#EBF5F3",
                border: "1px solid rgba(32, 104, 89, 0.3)",
                color: "#206859",
                fontSize: 10,
                fontWeight: 600,
                padding: "0 8px",
                height: 26,
                borderRadius: 4,
                whiteSpace: "nowrap",
                flexShrink: 0,
                boxSizing: "border-box",
              }}
            >
              <Link2 size={11} />
              <span>Click target connector to connect (or Esc to cancel)</span>
            </div>
          )}
        </div>

        {/* Center: Graph Actions (Comment Box, Reroute Knot, Center) */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleAddCommentBox}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "0 9px",
              height: 26,
              borderRadius: 4,
              border: "1px solid #CBD5E1",
              backgroundColor: "#FFFFFF",
              color: "#1E293B",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: "nowrap",
              flexShrink: 0,
              boxSizing: "border-box",
            }}
            title="Add Grouping Comment Box (Press C)"
          >
            <MessageSquare size={12} style={{ color: "#206859" }} />
            <span>Add Comment (C)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!activeGraph) return;
              const centerPos = {
                x: Math.round(320 - pan.x / zoom),
                y: Math.round(200 - pan.y / zoom),
              };
              addBlueprintNode(
                activeGraph.id,
                "flow/reroute",
                centerPos,
                { pinType: "exec" },
                "Add Reroute Knot"
              );
              handleCompile();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "0 9px",
              height: 26,
              borderRadius: 4,
              border: "1px solid #CBD5E1",
              backgroundColor: "#FFFFFF",
              color: "#1E293B",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: "nowrap",
              flexShrink: 0,
              boxSizing: "border-box",
            }}
            title="Add Reroute Knot (or double-click wire)"
          >
            <CornerDownRight size={12} style={{ color: "#206859" }} />
            <span>Reroute Knot</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setZoom(1.0);
              setPan({ x: 0, y: 0 });
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "0 8px",
              height: 26,
              borderRadius: 4,
              border: "1px solid #CBD5E1",
              backgroundColor: "#FFFFFF",
              color: "#475569",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 500,
              whiteSpace: "nowrap",
              flexShrink: 0,
              boxSizing: "border-box",
            }}
            title="Reset Pan & Zoom"
          >
            <Maximize2 size={11} />
            <span>Reset View</span>
          </button>

          <button
            type="button"
            onClick={handleRestoreDefaultWires}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "0 8px",
              height: 26,
              borderRadius: 4,
              border: "1px solid #CBD5E1",
              backgroundColor: "#FFFFFF",
              color: "#206859",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: "nowrap",
              flexShrink: 0,
              boxSizing: "border-box",
            }}
            title="Restore Sample Wire Connections"
          >
            <RotateCcw size={11} />
            <span>Rewire Sample</span>
          </button>
        </div>

        {/* Right: Panel Toggles */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setIsMyBpOpen(!isMyBpOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              backgroundColor: isMyBpOpen ? "#EBF5F3" : "#FFFFFF",
              border: `1px solid ${isMyBpOpen ? "rgba(32, 104, 89, 0.4)" : "#CBD5E1"}`,
              color: isMyBpOpen ? "#206859" : "#475569",
              borderRadius: 4,
              padding: "0 8px",
              height: 26,
              fontSize: 11,
              cursor: "pointer",
              fontWeight: 500,
              whiteSpace: "nowrap",
              flexShrink: 0,
              boxSizing: "border-box",
            }}
          >
            <Layers size={12} />
            <span>My Blueprint</span>
          </button>

          <button
            type="button"
            onClick={() => setIsValidationOpen(!isValidationOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              backgroundColor: isValidationOpen ? "#EBF5F3" : "#FFFFFF",
              border: `1px solid ${isValidationOpen ? "rgba(32, 104, 89, 0.4)" : "#CBD5E1"}`,
              color: isValidationOpen ? "#206859" : "#475569",
              borderRadius: 4,
              padding: "0 8px",
              height: 26,
              fontSize: 11,
              cursor: "pointer",
              fontWeight: 500,
              whiteSpace: "nowrap",
              flexShrink: 0,
              boxSizing: "border-box",
            }}
          >
            <Terminal size={12} />
            <span>Compiler Log</span>
          </button>
        </div>
      </div>

      {/* Main Center Area: Left Hierarchy Panel + Node Stage + Bottom Drawer */}
      <div style={{ display: "flex", flex: 1, position: "relative", overflow: "hidden" }}>
        {/* My Blueprint Panel */}
        <MyBlueprintPanel
          isOpen={isMyBpOpen}
          onToggle={() => setIsMyBpOpen(!isMyBpOpen)}
          onAddNodeAtCenter={handleAddNodeAtCenter}
        />

        {/* Interactive Visual Scripting Canvas */}
        <div
          ref={canvasRef}
          className="bp-node-stage"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={handleCanvasContextMenu}
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            padding: 0,
            cursor: isPanning ? "grabbing" : activeClickPin ? "crosshair" : "default",
            backgroundColor: "#F8FAFC",
            ...(gridPattern === "empty"
              ? {
                  backgroundImage: "none",
                }
              : gridPattern === "subtle"
              ? {
                  backgroundImage:
                    "linear-gradient(to right, rgba(226, 232, 240, 0.7) 1px, transparent 1px), linear-gradient(to bottom, rgba(226, 232, 240, 0.7) 1px, transparent 1px)",
                  backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
                  backgroundPosition: `${pan.x}px ${pan.y}px`,
                }
              : {
                  backgroundImage: `
                    linear-gradient(to right, rgba(226, 232, 240, 0.75) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(226, 232, 240, 0.75) 1px, transparent 1px),
                    linear-gradient(to right, rgba(148, 163, 184, 0.45) 1.2px, transparent 1.2px),
                    linear-gradient(to bottom, rgba(148, 163, 184, 0.45) 1.2px, transparent 1.2px)
                  `,
                  backgroundSize: `
                    ${20 * zoom}px ${20 * zoom}px,
                    ${20 * zoom}px ${20 * zoom}px,
                    ${100 * zoom}px ${100 * zoom}px,
                    ${100 * zoom}px ${100 * zoom}px
                  `,
                  backgroundPosition: `${pan.x}px ${pan.y}px`,
                }),
          }}
        >
          {/* Top-Right Canvas Overlay Status & Controls */}
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
              zIndex: 30,
              pointerEvents: "auto",
            }}
          >
            {/* Quick Compilation Trigger & Badge */}
            <button
              type="button"
              onClick={handleCompile}
              title="Compile and validate Active Blueprint Graph"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid #CBD5E1",
                backgroundColor: "rgba(255, 255, 255, 0.94)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                boxShadow: "0 2px 6px rgba(15, 23, 42, 0.08)",
                color: "#1E293B",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
            >
              <Play size={12} style={{ fill: "#206859", color: "#206859" }} />
              <span>Compile</span>
              {compilationStatus.status === "valid" ? (
                <CheckCircle2 size={13} style={{ color: "#059669" }} />
              ) : compilationStatus.status === "error" ? (
                <AlertCircle size={13} style={{ color: "#EA580C" }} />
              ) : compilationStatus.status === "warning" ? (
                <AlertTriangle size={13} style={{ color: "#D97706" }} />
              ) : null}
            </button>

            {/* Quick Save Graph Button */}
            <button
              type="button"
              onClick={handleSaveGraph}
              title="Save & Compile Blueprint Graph (Ctrl+S / Cmd+S)"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                borderRadius: 6,
                border: `1px solid ${justSaved ? "#10B981" : "#CBD5E1"}`,
                backgroundColor: justSaved ? "#ECFDF5" : "rgba(255, 255, 255, 0.94)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                boxShadow: "0 2px 6px rgba(15, 23, 42, 0.08)",
                color: justSaved ? "#065F46" : "#1E293B",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
            >
              <Save size={12} style={{ color: justSaved ? "#10B981" : "#206859" }} />
              <span>{justSaved ? "Saved!" : "Save"}</span>
            </button>

            {/* Undo & Redo Action Buttons */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.94)",
                backdropFilter: "blur(8px)",
                border: "1px solid #CBD5E1",
                borderRadius: 6,
                boxShadow: "0 2px 6px rgba(15, 23, 42, 0.08)",
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                title="Undo Canvas Action (Cmd+Z)"
                style={{
                  padding: "4px 7px",
                  border: "none",
                  borderRight: "1px solid #E2E8F0",
                  backgroundColor: "transparent",
                  color: canUndo ? "#1E293B" : "#94A3B8",
                  cursor: canUndo ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Undo2 size={12} />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                title="Redo Canvas Action (Cmd+Y / Cmd+Shift+Z)"
                style={{
                  padding: "4px 7px",
                  border: "none",
                  backgroundColor: "transparent",
                  color: canRedo ? "#1E293B" : "#94A3B8",
                  cursor: canRedo ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Redo2 size={12} />
              </button>
            </div>

            {/* Zoom Indicator pill */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#475569",
                padding: "3px 8px",
                borderRadius: 6,
                border: "1px solid #CBD5E1",
                backgroundColor: "rgba(255, 255, 255, 0.94)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 2px 6px rgba(15, 23, 42, 0.08)",
              }}
            >
              {Math.round(zoom * 100)}%
            </span>

            {/* Grid Pattern Mode Toggle */}
            <button
              type="button"
              onClick={() => setGridPattern((prev) => (prev === "graph" ? "empty" : "graph"))}
              title="Toggle Grid Graph Pattern"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 9px",
                borderRadius: 6,
                border: "1px solid #CBD5E1",
                backgroundColor: "rgba(255, 255, 255, 0.94)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                boxShadow: "0 2px 6px rgba(15, 23, 42, 0.08)",
                color: "#1E293B",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
            >
              <Grid size={13} style={{ color: gridPattern === "graph" ? "#206859" : "#94A3B8" }} />
              <span>{gridPattern === "graph" ? "Grid Graph" : "Empty Canvas"}</span>
            </button>
          </div>

          {/* 120 FPS Wasm Hardware-Accelerated Cable & Pulse Renderer (Sub-Phase 4.4) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          >
            <WasmCableCanvas
              wires={canvasWires}
              draggingWire={activeDraggingWire}
              pan={pan}
              zoom={zoom}
              onWireClick={(wireId) => {
                setSelectedWireIds(new Set([wireId]));
                setSelectedWireId(wireId);
                setSelectedNodeIds(new Set());
                setSelectedCommentIds(new Set());
                setSelectedNodeId(null);
                setSelectedCommentId(null);
              }}
              onWireContextMenu={(wireId) => {
                if (activeGraph) {
                  disconnectBlueprintWire(activeGraph.id, wireId, "Disconnect Wire");
                  if (selectedWireId === wireId) setSelectedWireId(null);
                  handleCompile();
                }
              }}
            />
          </div>

          {/* Transform Container applying Pan & Zoom */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          >
            {/* Marquee Selection Box Overlay ("Select Mode") */}
            {isSelecting && selectionBox && (
              <div
                style={{
                  position: "absolute",
                  left: selectionBox.x,
                  top: selectionBox.y,
                  width: selectionBox.width,
                  height: selectionBox.height,
                  border: "1.5px dashed #206859",
                  backgroundColor: "rgba(32, 104, 89, 0.12)",
                  borderRadius: 4,
                  pointerEvents: "none",
                  zIndex: 60,
                  boxShadow: "0 0 12px rgba(32, 104, 89, 0.18)",
                }}
              />
            )}

            {/* SVG Bezier Wires Layer with double-click reroute knot creation */}
            <svg
              style={{
                position: "absolute",
                inset: 0,
                width: 5000,
                height: 5000,
                overflow: "visible",
                pointerEvents: "none",
                zIndex: 1,
              }}
            >
              {/* Existing Connected Wires (C++ SplineSolver Evaluation) */}
              {activeGraph?.wires.map((wire) => {
                const sourceCoord = getPinCoordinate(wire.sourceNodeId, wire.sourcePinId, "output");
                const targetCoord = getPinCoordinate(wire.targetNodeId, wire.targetPinId, "input");
                const spline = SplineSolver.calculateWireSpline(sourceCoord, targetCoord);
                const pathData = spline.path;
                const isWireSelected = selectedWireIds.has(wire.id) || selectedWireId === wire.id;

                return (
                  <g key={wire.id} style={{ pointerEvents: "all" }}>
                    {/* Visual selection halo for SVG wire */}
                    {isWireSelected && (
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#206859"
                        strokeWidth="8"
                        opacity="0.4"
                        style={{ pointerEvents: "none" }}
                      />
                    )}
                    {/* Wider transparent hit path for click selection, double-click split & right-click disconnect */}
                    <path
                      data-wire-id={wire.id}
                      d={pathData}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="24"
                      style={{ cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (e.shiftKey) {
                          setSelectedWireIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(wire.id)) next.delete(wire.id);
                            else next.add(wire.id);
                            return next;
                          });
                        } else {
                          setSelectedWireIds(new Set([wire.id]));
                          setSelectedWireId(wire.id);
                          setSelectedNodeIds(new Set());
                          setSelectedCommentIds(new Set());
                          setSelectedNodeId(null);
                          setSelectedCommentId(null);
                        }
                      }}
                      onDoubleClick={(e) => handleWireDoubleClick(e, wire)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (activeGraph) {
                          disconnectBlueprintWire(activeGraph.id, wire.id, "Disconnect Wire");
                          if (selectedWireId === wire.id) setSelectedWireId(null);
                          handleCompile();
                        }
                      }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Comment / Grouping Boxes Layer (Sits beneath nodes) */}
            {Object.values(commentBoxes).map((comment) => (
              <CommentBox
                key={comment.id}
                comment={comment}
                isSelected={selectedCommentIds.has(comment.id) || selectedCommentId === comment.id}
                onSelect={(id) => {
                  setSelectedCommentIds(new Set([id]));
                  setSelectedCommentId(id);
                  setSelectedNodeIds(new Set());
                  setSelectedWireIds(new Set());
                  setSelectedNodeId(null);
                  setSelectedWireId(null);
                }}
                onUpdateTitle={(id, title) => {
                  setCommentBoxes((prev) => ({
                    ...prev,
                    [id]: { ...prev[id], title },
                  }));
                }}
                onUpdateColor={(id, color) => {
                  setCommentBoxes((prev) => ({
                    ...prev,
                    [id]: { ...prev[id], color },
                  }));
                }}
                onDelete={(id) => {
                  setCommentBoxes((prev) => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                  });
                  if (selectedCommentId === id) setSelectedCommentId(null);
                }}
                onHeaderMouseDown={handleCommentHeaderMouseDown}
                onResizeMouseDown={handleCommentResizeMouseDown}
              />
            ))}

            {/* Nodes Layer (Modular NodeCard & RerouteNode Components) */}
            {activeGraph &&
              Object.values(activeGraph.nodes).map((node) => {
                // If this is a reroute knot, render compact Unreal Engine Reroute knot
                if (node.type === "flow/reroute" || node.type === "reroute") {
                  return (
                    <RerouteNode
                      key={node.id}
                      node={{
                        id: node.id,
                        position: node.position,
                        pinType: (node.customParams?.pinType as any) || "exec",
                      }}
                      isSelected={selectedNodeIds.has(node.id) || selectedNodeId === node.id}
                      onSelect={(id) => {
                        setSelectedNodeIds(new Set([id]));
                        setSelectedNodeId(id);
                        setSelectedWireIds(new Set());
                        setSelectedCommentIds(new Set());
                        setSelectedWireId(null);
                        setSelectedCommentId(null);
                      }}
                      onDelete={(id) => {
                        removeBlueprintNode(activeGraph.id, id, "Delete Reroute Knot");
                        handleCompile();
                      }}
                      onMouseDown={(e) => handleNodeHeaderMouseDown(e, node.id)}
                      onPinMouseDown={(e, id, direction) => {
                        const pinDef: PinDefinition = {
                          id: direction === "input" ? "in" : "out",
                          name: direction === "input" ? "in" : "out",
                          label: direction === "input" ? "in" : "out",
                          type: (node.customParams?.pinType as any) || "exec",
                          direction: direction,
                        };
                        handlePinMouseDown(e, id, pinDef, direction);
                      }}
                    />
                  );
                }

                // Standard Node Card
                const def = getNodeDefinition(node.type);
                return (
                  <NodeCard
                    key={node.id}
                    node={node}
                    definition={def}
                    isSelected={selectedNodeIds.has(node.id) || selectedNodeId === node.id}
                    connectedPinKeys={connectedPinKeys}
                    hoveredPinTarget={hoveredPinTarget}
                    activeClickPin={activeClickPin}
                    breakpoint={breakpointsMap.get(node.id) || null}
                    isPausedHere={debuggerPausedNodeId === node.id}
                    hotMetric={
                      hotNodesMap.has(node.id)
                        ? {
                            durationMs: hotNodesMap.get(node.id)!.totalDurationMs,
                            percentage: hotNodesMap.get(node.id)!.percentageOfTotal,
                          }
                        : null
                    }
                    onToggleBreakpoint={(id) => {
                      if (breakpointManager.hasBreakpoint(id)) {
                        breakpointManager.removeBreakpoint(id);
                      } else {
                        breakpointManager.addBreakpoint(id, activeGraph.id);
                      }
                      const m = new Map<string, Breakpoint>();
                      breakpointManager.getBreakpoints().forEach((b) => m.set(b.nodeId, b));
                      setBreakpointsMap(m);
                    }}
                    onSetBreakpointCondition={(id, cond) => {
                      breakpointManager.setCondition(id, cond);
                      const m = new Map<string, Breakpoint>();
                      breakpointManager.getBreakpoints().forEach((b) => m.set(b.nodeId, b));
                      setBreakpointsMap(m);
                    }}
                    onSelect={(id) => {
                      setSelectedNodeIds(new Set([id]));
                      setSelectedNodeId(id);
                      setSelectedWireIds(new Set());
                      setSelectedCommentIds(new Set());
                      setSelectedWireId(null);
                      setSelectedCommentId(null);
                    }}
                    onDelete={(id) => {
                      removeBlueprintNode(activeGraph.id, id, `Delete Node ${node.title}`);
                      handleCompile();
                    }}
                    onHeaderMouseDown={handleNodeHeaderMouseDown}
                    onPinMouseDown={handlePinMouseDown}
                    onPinClick={handlePinClick}
                    onPinValueChange={(nodeId, pinId, val) => {
                      setBlueprintPinValue(activeGraph.id, nodeId, pinId, val);
                    }}
                  />
                );
              })}

            {/* ===================================================================
             * FOREGROUND OVERLAY WIRE LAYER (Z-INDEX 50: ON TOP OF ALL NODE CARDS)
             * =================================================================== */}
            <svg
              style={{
                position: "absolute",
                inset: 0,
                width: 5000,
                height: 5000,
                overflow: "visible",
                pointerEvents: "none",
                zIndex: 50,
              }}
            >
              {/* Active In-Progress Wire Being Dragged (Hold & Drag) */}
              {draggingWire && (() => {
                const start = { x: draggingWire.startX, y: draggingWire.startY };
                const end = hoveredPinTarget?.isValid
                  ? { x: hoveredPinTarget.x, y: hoveredPinTarget.y }
                  : { x: draggingWire.currentX, y: draggingWire.currentY };

                const spline = draggingWire.isSourceOutput
                  ? SplineSolver.calculateWireSpline(start, end)
                  : SplineSolver.calculateWireSpline(end, start);

                const wireColor = hoveredPinTarget
                  ? hoveredPinTarget.isValid
                    ? "#10B981"
                    : "#D97706"
                  : getPinColor(draggingWire.sourcePin.type);

                return (
                  <g style={{ pointerEvents: "none" }}>
                    <path
                      d={spline.path}
                      fill="none"
                      stroke={wireColor}
                      strokeWidth="6"
                      opacity="0.25"
                    />
                    <path
                      d={spline.path}
                      fill="none"
                      stroke={wireColor}
                      strokeWidth="3.2"
                      strokeDasharray="6 3"
                    />
                    <circle
                      cx={end.x}
                      cy={end.y}
                      r="5"
                      fill={wireColor}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })()}

              {/* Active In-Progress Wire in Click-to-Connect Mode */}
              {activeClickPin && !draggingWire && (() => {
                const start = activeClickPin.coord;
                const end = hoveredPinTarget?.isValid
                  ? { x: hoveredPinTarget.x, y: hoveredPinTarget.y }
                  : cursorPos;

                const spline = activeClickPin.direction === "output"
                  ? SplineSolver.calculateWireSpline(start, end)
                  : SplineSolver.calculateWireSpline(end, start);

                const wireColor = hoveredPinTarget
                  ? hoveredPinTarget.isValid
                    ? "#10B981"
                    : "#D97706"
                  : getPinColor(activeClickPin.pin.type);

                return (
                  <g style={{ pointerEvents: "none" }}>
                    <path
                      d={spline.path}
                      fill="none"
                      stroke={wireColor}
                      strokeWidth="6"
                      opacity="0.25"
                    />
                    <path
                      d={spline.path}
                      fill="none"
                      stroke={wireColor}
                      strokeWidth="3.2"
                      strokeDasharray="6 3"
                    />
                    <circle
                      cx={end.x}
                      cy={end.y}
                      r="5"
                      fill={wireColor}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })()}

              {/* In-Flight Wire Connected to Contextual Node Palette While Open */}
              {palette.isOpen && palette.pendingWire && (() => {
                const startCoord = getPinCoordinate(
                  palette.pendingWire.nodeId,
                  palette.pendingWire.pinId,
                  palette.pendingWire.isOutput ? "output" : "input"
                );
                const endCoord = { x: palette.x, y: palette.y };
                const spline = palette.pendingWire.isOutput
                  ? SplineSolver.calculateWireSpline(startCoord, endCoord)
                  : SplineSolver.calculateWireSpline(endCoord, startCoord);
                const wireColor = getPinColor(palette.pendingWire.pin.type);

                return (
                  <g style={{ pointerEvents: "none" }}>
                    <path
                      d={spline.path}
                      fill="none"
                      stroke={wireColor}
                      strokeWidth="9"
                      opacity="0.22"
                      strokeLinecap="round"
                    />
                    <path
                      d={spline.path}
                      fill="none"
                      stroke={wireColor}
                      strokeWidth="2.8"
                      strokeDasharray="6 3"
                    />
                    <circle
                      cx={palette.x}
                      cy={palette.y}
                      r="5"
                      fill={wireColor}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Floating Proximity Connection Badge / Tooltip */}
          {hoveredPinTarget && (
            <div
              style={{
                position: "absolute",
                left: hoveredPinTarget.x * zoom + pan.x,
                top: (hoveredPinTarget.y - 28) * zoom + pan.y,
                backgroundColor: hoveredPinTarget.isValid ? "#059669" : "#D97706",
                color: "#FFFFFF",
                padding: "3px 8px",
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                pointerEvents: "none",
                zIndex: 100,
                transform: "translate(-50%, -50%)",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {hoveredPinTarget.isValid ? (
                <>
                  <CheckCircle2 size={11} />
                  <span>Connect to {hoveredPinTarget.pin.label}</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={11} />
                  <span>{hoveredPinTarget.error || "Type Mismatch"}</span>
                </>
              )}
            </div>
          )}

          {/* Contextual Node Action Palette Modal (Tab or Right-Click or Wire Drop) */}
          <ActionPaletteModal
            isOpen={palette.isOpen}
            x={palette.x}
            y={palette.y}
            zoom={zoom}
            pan={pan}
            pendingWire={palette.pendingWire}
            onSelectNode={(def, compatiblePin) => {
              if (!activeGraph) return;

              const newNode = addBlueprintNode(
                activeGraph.id,
                def.type,
                { x: Math.round(palette.x), y: Math.round(palette.y) },
                {},
                `Add Node '${def.title}'`
              );

              // If there was a pending wire, auto-connect to compatible pin
              if (palette.pendingWire && compatiblePin) {
                const pending = palette.pendingWire;
                const sourceNodeId = pending.isOutput ? pending.nodeId : newNode.id;
                const sourcePinId = pending.isOutput ? pending.pin.id : compatiblePin.id;
                const targetNodeId = pending.isOutput ? newNode.id : pending.nodeId;
                const targetPinId = pending.isOutput ? compatiblePin.id : pending.pin.id;

                connectBlueprintPins(
                  activeGraph.id,
                  sourceNodeId,
                  sourcePinId,
                  targetNodeId,
                  targetPinId,
                  "Auto Connect Context Pin"
                );
              }

              setPalette({ isOpen: false, x: 0, y: 0 });
              handleCompile();
            }}
            onClose={() => setPalette({ isOpen: false, x: 0, y: 0 })}
            containerRef={canvasRef}
          />
        </div>
      </div>

      {/* Blueprint Validation & Serialization Drawer */}
      <ValidationPanel
        isOpen={isValidationOpen}
        onToggle={() => setIsValidationOpen(!isValidationOpen)}
        onJumpToNode={handleJumpToNode}
      />
    </div>
  );
};
