"use client";

/**
 * ============================================================================
 * LOGIC BLUEPRINT CANVAS PANEL
 * ============================================================================
 * Unreal Engine-style Visual Scripting & Node-and-Wire Canvas:
 * - Live AST graph rendering driven by `useProjectStore`
 * - Dynamic SVG cubic Bezier wires with pin type colors (never red for valid pins)
 * - Proximity-based magnetic snapping to connectors (36px radius)
 * - Dual connection workflows: Drag-to-Connect & Click-to-Connect
 * - Expanded 26px invisible hit targets on all pin connectors
 * - Floating connection preview badge (`✓ Connect [source] ➔ [target]`)
 * - Contextual Node Search Palette (`Tab` key / Right-Click / Wire drop)
 * - Draggable nodes with smooth AST position updates
 * - Unlinked input pins with inline literal editors
 * - Integrated `MyBlueprintPanel` (left sidebar) & `ValidationPanel` (bottom drawer)
 *
 * Architecture Ref: ROADMAP.md §5 (Phase 3), DOCS/suggestions.md & UI.md §4.6
 * ============================================================================
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Play,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Search,
  Plus,
  Trash2,
  X,
  Layers,
  Terminal,
  Grid,
  Zap,
  CornerDownRight,
  HelpCircle,
  ArrowLeft,
  Link2,
  Save,
  Undo2,
  Redo2,
  Workflow,
} from "lucide-react";
import { useProjectStore } from "@/core/store/useProjectStore";
import { useHistoryStore } from "@/core/store/useHistoryStore";
import {
  getNodeDefinition,
  searchNodeDefinitions,
  getPinColor,
  getAllNodeCategories,
  NodeDefinition,
  PinDefinition,
  NodeCategory,
} from "@/core/types/node-registry";
import { TypeChecker } from "@/core/ast/TypeChecker";
import { SplineSolver } from "@/core/wasm/SplineSolver";
import { MyBlueprintPanel } from "./MyBlueprintPanel";
import { ValidationPanel } from "./ValidationPanel";
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
  direction: "input" | "output";
  coord: { x: number; y: number };
}

interface PaletteModalState {
  isOpen: boolean;
  x: number;
  y: number;
  pendingWire?: {
    nodeId: string;
    pinId: string;
    pin: PinDefinition;
    isOutput: boolean;
  };
}

interface BlueprintCanvasProps {
  onBackToViewport?: () => void;
}

const SNAP_RADIUS = 36;

export const BlueprintCanvas: React.FC<BlueprintCanvasProps> = ({
  onBackToViewport,
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

  // Selection
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);

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
  const [paletteSearch, setPaletteSearch] = useState("");
  const [paletteCategory, setPaletteCategory] = useState<string>("All");
  const canvasRef = useRef<HTMLDivElement>(null);

  // Invariant refs for wheel/trackpad pan & zoom listener without listener churn
  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Track right-click dragging vs stationary right-click context menu
  const rightClickStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef<boolean>(false);

  // Context-Sensitive Palette filter toggle (Unreal Engine 5 standard, default true)
  const [isContextSensitive, setIsContextSensitive] = useState<boolean>(true);

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

  // Pin geometry calculation (Exact live DOM measurement with high-precision analytical fallback)
  const getPinCoordinate = useCallback(
    (nodeId: string, pinId: string, direction: "input" | "output") => {
      const node = activeGraph?.nodes[nodeId];
      if (!node) return { x: 0, y: 0 };

      // 1. Live DOM measurement if element exists on canvas
      if (canvasRef.current) {
        const pinEl = canvasRef.current.querySelector<HTMLElement>(
          `[data-pin-dot-key="${nodeId}:${direction}:${pinId}"]`
        );
        if (pinEl) {
          const pRect = pinEl.getBoundingClientRect();
          const sRect = canvasRef.current.getBoundingClientRect();
          return {
            x: (pRect.left + pRect.width / 2 - sRect.left - pan.x) / zoom,
            y: (pRect.top + pRect.height / 2 - sRect.top - pan.y) / zoom,
          };
        }
      }

      // 2. High-precision analytical fallback (250px node width, 30px header, 26px row with 6px gap)
      const def = getNodeDefinition(node.type);
      const pins = direction === "input" ? def?.inputs || [] : def?.outputs || [];
      const pinIndex = pins.findIndex((p) => p.id === pinId);
      const safeIndex = pinIndex >= 0 ? pinIndex : 0;

      const x = direction === "input" ? node.position.x + 17 : node.position.x + 250 - 17;
      const y = node.position.y + 30 + 8 + 13 + safeIndex * 32;

      return { x, y };
    },
    [activeGraph, pan, zoom]
  );

  // --------------------------------------------------------------------------
  // Keyboard Shortcuts (Tab = Palette, Delete/Backspace = Remove Node/Wire, Esc = Cancel)
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
        setPalette((prev) => ({
          isOpen: !prev.isOpen,
          x: 240,
          y: 120,
        }));
      } else if (e.key === "Escape") {
        setPalette({ isOpen: false, x: 0, y: 0 });
        setDraggingWire(null);
        setActiveClickPin(null);
        setHoveredPinTarget(null);
        setSelectedNodeId(null);
        setSelectedWireId(null);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeId && activeGraph) {
          removeBlueprintNode(activeGraph.id, selectedNodeId, "Delete Node");
          setSelectedNodeId(null);
        } else if (selectedWireId && activeGraph) {
          disconnectBlueprintWire(activeGraph.id, selectedWireId, "Delete Wire");
          setSelectedWireId(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, selectedWireId, activeGraph, removeBlueprintNode, disconnectBlueprintWire, handleUndo, handleRedo, handleSaveGraph]);

  // --------------------------------------------------------------------------
  // Trackpad Two-Finger Pan & Pinch-to-Zoom (Native Non-Passive Wheel Listener)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom (trackpad pinch gesture or Ctrl+MouseWheel centered at mouse cursor)
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
    // Right click (button 2), Middle click (button 1), Alt+Left click, or Left click on canvas background
    if (
      e.button === 2 ||
      e.button === 1 ||
      (e.button === 0 && e.altKey) ||
      (e.button === 0 && e.target === canvasRef.current)
    ) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      if (e.button === 2) {
        rightClickStartRef.current = { x: e.clientX, y: e.clientY };
        hasDraggedRef.current = false;
      }
      setSelectedNodeId(null);
      setSelectedWireId(null);
      setActiveClickPin(null);
      setHoveredPinTarget(null);
      if (e.button !== 2) {
        setPalette({ isOpen: false, x: 0, y: 0 });
      }
    }
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    // If right-click dragged beyond threshold, suppress context menu!
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      rightClickStartRef.current = null;
      return;
    }
    rightClickStartRef.current = null;

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;

    setPalette({
      isOpen: true,
      x: canvasX,
      y: canvasY,
    });
    setPaletteSearch("");
    setPaletteCategory("All");
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
    } else if (draggingNodeId && activeGraph) {
      moveBlueprintNode(activeGraph.id, draggingNodeId, {
        x: canvasX - nodeDragOffset.x,
        y: canvasY - nodeDragOffset.y,
      });
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

    if (draggingNodeId) {
      setDraggingNodeId(null);
    }

    if (draggingWire) {
      // Check if dropped onto a valid snapped or hovered target pin
      if (hoveredPinTarget && hoveredPinTarget.isValid && activeGraph) {
        const sourceNodeId = draggingWire.isSourceOutput
          ? draggingWire.sourceNodeId
          : hoveredPinTarget.nodeId;
        const sourcePinId = draggingWire.isSourceOutput
          ? draggingWire.sourcePinId
          : hoveredPinTarget.pinId;
        const targetNodeId = draggingWire.isSourceOutput
          ? hoveredPinTarget.nodeId
          : draggingWire.sourceNodeId;
        const targetPinId = draggingWire.isSourceOutput
          ? hoveredPinTarget.pinId
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
      } else if (!hoveredPinTarget && canvasRef.current) {
        // Dropped onto empty canvas: open palette to connect!
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

  // --------------------------------------------------------------------------
  // Pin Drag Start & Click-to-Connect
  // --------------------------------------------------------------------------
  const handlePinMouseDown = (
    e: React.MouseEvent,
    nodeId: string,
    pin: PinDefinition,
    direction: "input" | "output"
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
    direction: "input" | "output"
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
      // Connect click session to this pin!
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
  // Node Drag Start
  // --------------------------------------------------------------------------
  const handleNodeHeaderMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    setSelectedNodeId(nodeId);
    setSelectedWireId(null);
    setActiveClickPin(null);

    const node = activeGraph?.nodes[nodeId];
    if (!node) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;

    setDraggingNodeId(nodeId);
    setNodeDragOffset({
      x: canvasX - node.position.x,
      y: canvasY - node.position.y,
    });
  };

  // Helper to find the first compatible pin between a node definition and a pending wire
  const getCompatiblePinForNode = useCallback(
    (nodeDef: NodeDefinition, pending: PaletteModalState["pendingWire"]) => {
      if (!pending) return null;
      const candidatePins = pending.isOutput ? nodeDef.inputs : nodeDef.outputs;

      for (const pin of candidatePins) {
        const sourcePin = pending.isOutput ? pending.pin : pin;
        const targetPin = pending.isOutput ? pin : pending.pin;
        const check = TypeChecker.validateWireConnection({
          sourceNodeId: pending.isOutput ? pending.nodeId : "virtual_node",
          sourcePin,
          targetNodeId: pending.isOutput ? "virtual_node" : pending.nodeId,
          targetPin,
        });
        if (check.isValid) {
          return pin;
        }
      }
      return null;
    },
    []
  );

  const handleSelectPaletteNode = (def: NodeDefinition) => {
    if (!activeGraph) return;

    const newNode = addBlueprintNode(
      activeGraph.id,
      def.type,
      { x: Math.round(palette.x), y: Math.round(palette.y) },
      {},
      `Add Node '${def.title}'`
    );

    // If there was a pending wire, auto-connect to the first compatible pin
    if (palette.pendingWire) {
      const pending = palette.pendingWire;
      const compatiblePin = getCompatiblePinForNode(def, pending);

      if (compatiblePin) {
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
    }

    setPalette({ isOpen: false, x: 0, y: 0 });
    handleCompile();
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

  // --------------------------------------------------------------------------
  // Filtered Palette Nodes (Context-Sensitive by default when dragging a wire)
  // --------------------------------------------------------------------------
  const filteredPaletteNodes = useMemo(() => {
    let nodes = searchNodeDefinitions(paletteSearch);
    if (paletteCategory !== "All") {
      nodes = nodes.filter((n) => n.category === paletteCategory);
    }

    if (palette.pendingWire && isContextSensitive) {
      nodes = nodes.filter((def) => getCompatiblePinForNode(def, palette.pendingWire) !== null);
    }

    return nodes;
  }, [paletteSearch, paletteCategory, palette.pendingWire, isContextSensitive, getCompatiblePinForNode]);

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
        {/* Left: Back Button & Active Graph Name (Shifted directly into left position) */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
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
              padding: "4px 9px",
              backgroundColor: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 4,
            }}
          >
            <Workflow size={13} style={{ color: "#206859" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>
              {activeGraph ? activeGraph.name : "Main Event Graph"}
            </span>
            {activeGraph && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#64748B",
                  backgroundColor: "#E2E8F0",
                  padding: "1px 6px",
                  borderRadius: 3,
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
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              <Link2 size={11} />
              <span>Click target connector to connect (or Esc)</span>
            </div>
          )}
        </div>

        {/* Right: Helper Badge & Panel Toggles */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              backgroundColor: "#EBF5F3",
              border: "1px solid rgba(32, 104, 89, 0.3)",
              color: "#206859",
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            <Sparkles size={11} style={{ color: "#206859" }} />
            <span>Tab / Right-Click = Node Palette</span>
          </span>

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
              padding: "2px 8px",
              fontSize: 11,
              cursor: "pointer",
              fontWeight: 500,
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
              padding: "2px 8px",
              fontSize: 11,
              cursor: "pointer",
              fontWeight: 500,
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
                  // Dual-level Engineering Graph Grid (Unreal Engine / Blueprint Graph CAD)
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
                  backgroundPosition: `
                    ${pan.x}px ${pan.y}px,
                    ${pan.x}px ${pan.y}px,
                    ${pan.x}px ${pan.y}px,
                    ${pan.x}px ${pan.y}px
                  `,
                }),
          }}
        >
          {/* Viewport Floating Action Pill (Save, Undo, Redo) in Top-Left Corner */}
          <div
            id="bp-viewport-floating-actions"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              display: "flex",
              alignItems: "center",
              gap: 2,
              backgroundColor: "rgba(255, 255, 255, 0.94)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid #CBD5E1",
              borderRadius: 6,
              padding: "2px 4px",
              boxShadow: "0 2px 6px rgba(15, 23, 42, 0.08)",
              zIndex: 35,
              userSelect: "none",
            }}
          >
            <button
              id="bp-save-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSaveGraph();
              }}
              title="Save Graph & Compile (Ctrl+S)"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 8px",
                borderRadius: 4,
                border: "none",
                backgroundColor: justSaved ? "#DCFCE7" : "transparent",
                color: justSaved ? "#15803D" : "#1E293B",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
            >
              {justSaved ? (
                <>
                  <CheckCircle2 size={13} style={{ color: "#16A34A" }} />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Save size={13} style={{ color: "#206859" }} />
                  <span>Save</span>
                </>
              )}
            </button>

            <div style={{ width: 1, height: 14, backgroundColor: "#E2E8F0", margin: "0 2px" }} />

            <button
              id="bp-undo-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleUndo();
              }}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                borderRadius: 4,
                border: "none",
                backgroundColor: "transparent",
                color: canUndo ? "#1E293B" : "#94A3B8",
                cursor: canUndo ? "pointer" : "default",
                transition: "all 0.15s ease",
                opacity: canUndo ? 1 : 0.4,
              }}
            >
              <Undo2 size={13} />
            </button>

            <button
              id="bp-redo-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRedo();
              }}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                borderRadius: 4,
                border: "none",
                backgroundColor: "transparent",
                color: canRedo ? "#1E293B" : "#94A3B8",
                cursor: canRedo ? "pointer" : "default",
                transition: "all 0.15s ease",
                opacity: canRedo ? 1 : 0.4,
              }}
            >
              <Redo2 size={13} />
            </button>
          </div>

          {/* Viewport Floating Grid Switcher (Top-Right Corner just below menu bar) */}
          <div
            id="bp-viewport-grid-switcher"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              zIndex: 35,
              userSelect: "none",
            }}
          >
            <button
              id="bp-grid-toggle-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setGridPattern((prev) => (prev === "graph" ? "empty" : "graph"));
              }}
              title={gridPattern === "graph" ? "Switch to Empty Canvas" : "Switch to Grid Graph"}
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
            {/* SVG Bezier Wires Layer */}
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

                const isExec = wire.pinType === "exec" || wire.isExec;
                const strokeColor = isExec ? "#0F172A" : getPinColor(wire.pinType);
                const isSelected = selectedWireId === wire.id;

                return (
                  <g key={wire.id} style={{ pointerEvents: "all" }}>
                    {/* Wider transparent hit path for easy clicking */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="16"
                      style={{ cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWireId(wire.id);
                        setSelectedNodeId(null);
                      }}
                    />
                    {/* Rendered visible wire */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={isSelected ? "#206859" : strokeColor}
                      strokeWidth={isSelected ? 4 : isExec ? 2.8 : 2.2}
                      className="bp-wire-path"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWireId(wire.id);
                        setSelectedNodeId(null);
                      }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Nodes Layer */}
            {activeGraph &&
              Object.values(activeGraph.nodes).map((node) => {
                const def = getNodeDefinition(node.type);
                const isSelected = selectedNodeId === node.id;
                const headerColor = def ? def.headerColor : "#4338CA";

                return (
                  <div
                    key={node.id}
                    className={`bp-node ${isSelected ? "bp-node--selected" : ""}`}
                    style={{
                      left: node.position.x,
                      top: node.position.y,
                      pointerEvents: "all",
                      zIndex: isSelected ? 10 : 2,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(node.id);
                      setSelectedWireId(null);
                    }}
                    onContextMenu={(e) => {
                      // Suppress right-click context menu on node cards
                      e.stopPropagation();
                    }}
                  >
                    {/* Node Header (Never Red!) */}
                    <div
                      className="bp-node__header"
                      style={{ backgroundColor: headerColor }}
                      onMouseDown={(e) => handleNodeHeaderMouseDown(e, node.id)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                        <Zap size={11} style={{ opacity: 0.95 }} />
                        <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {node.title}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 8, opacity: 0.8, textTransform: "uppercase" }}>
                          {def?.category || "NODE"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBlueprintNode(activeGraph.id, node.id, `Delete Node ${node.title}`);
                            handleCompile();
                          }}
                          title="Delete Node"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "1px 2px",
                            color: "#FFFFFF",
                            opacity: 0.75,
                            display: "flex",
                          }}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Node Body with Input & Output Pins */}
                    <div className="bp-node__body">
                      {/* Interleaved Pin Rows */}
                      {Array.from({
                        length: Math.max(def?.inputs.length || 0, def?.outputs.length || 0),
                      }).map((_, idx) => {
                        const inputPin = def?.inputs[idx];
                        const outputPin = def?.outputs[idx];

                        // Check if input pin has an incoming wire
                        const isInputConnected = activeGraph.wires.some(
                          (w) => w.targetNodeId === node.id && w.targetPinId === inputPin?.id
                        );

                        const isInputSnapped =
                          hoveredPinTarget?.nodeId === node.id &&
                          hoveredPinTarget?.pinId === inputPin?.id &&
                          hoveredPinTarget?.isValid;

                        const isInputClickActive =
                          activeClickPin?.nodeId === node.id &&
                          activeClickPin?.pin.id === inputPin?.id;

                        const isOutputSnapped =
                          hoveredPinTarget?.nodeId === node.id &&
                          hoveredPinTarget?.pinId === outputPin?.id &&
                          hoveredPinTarget?.isValid;

                        const isOutputClickActive =
                          activeClickPin?.nodeId === node.id &&
                          activeClickPin?.pin.id === outputPin?.id;

                        return (
                          <div key={idx} className="bp-node__row">
                            {/* Input Pin (Left) */}
                            {inputPin ? (
                              <div className="bp-pin">
                                {/* Expanded 26px Interactive Hit Target for effortless snapping */}
                                <div
                                  style={{
                                    width: 26,
                                    height: 26,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "crosshair",
                                    position: "relative",
                                    margin: "-8px -6px",
                                  }}
                                  onMouseDown={(e) => handlePinMouseDown(e, node.id, inputPin, "input")}
                                  onClick={(e) => handlePinClick(e, node.id, inputPin, "input")}
                                  title={`${inputPin.label} (${inputPin.type}) - Drag or Click to connect`}
                                >
                                  <span
                                    data-pin-dot-key={`${node.id}:input:${inputPin.id}`}
                                    className={`bp-pin__dot ${
                                      inputPin.type === "exec" ? "bp-pin__dot--exec" : ""
                                    }`}
                                    style={{
                                      backgroundColor:
                                        inputPin.type === "exec" ? "#0F172A" : getPinColor(inputPin.type),
                                      boxShadow: isInputSnapped
                                        ? "0 0 0 4px #10B981, 0 0 12px rgba(16, 185, 129, 0.9)"
                                        : isInputClickActive
                                        ? "0 0 0 3px #206859, 0 0 8px rgba(32, 104, 89, 0.7)"
                                        : undefined,
                                      transform: isInputSnapped || isInputClickActive ? "scale(1.4)" : undefined,
                                    }}
                                  />
                                </div>
                                <span style={{ color: isInputSnapped ? "#10B981" : "#334155", fontWeight: isInputSnapped ? 600 : 400 }}>
                                  {inputPin.label}
                                </span>

                                {/* Inline Literal Input for Unconnected Data Pins */}
                                {!isInputConnected && inputPin.type !== "exec" && (
                                  <input
                                    type={inputPin.type === "number" ? "number" : "text"}
                                    className="bp-literal-input"
                                    value={
                                      (node.pinValues?.[inputPin.id] as string | number) ??
                                      inputPin.defaultValue ??
                                      ""
                                    }
                                    onChange={(e) =>
                                      setBlueprintPinValue(
                                        activeGraph.id,
                                        node.id,
                                        inputPin.id,
                                        inputPin.type === "number"
                                          ? Number(e.target.value)
                                          : e.target.value
                                       )
                                     }
                                     onClick={(e) => e.stopPropagation()}
                                   />
                                )}
                              </div>
                            ) : (
                              <span />
                            )}

                            {/* Output Pin (Right) */}
                            {outputPin ? (
                              <div className="bp-pin bp-pin--output">
                                <span style={{ color: isOutputSnapped ? "#10B981" : "#334155", fontWeight: isOutputSnapped ? 600 : 400 }}>
                                  {outputPin.label}
                                </span>
                                {/* Expanded 26px Interactive Hit Target */}
                                <div
                                  style={{
                                    width: 26,
                                    height: 26,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "crosshair",
                                    position: "relative",
                                    margin: "-8px -6px",
                                  }}
                                  onMouseDown={(e) => handlePinMouseDown(e, node.id, outputPin, "output")}
                                  onClick={(e) => handlePinClick(e, node.id, outputPin, "output")}
                                  title={`${outputPin.label} (${outputPin.type}) - Drag or Click to connect`}
                                >
                                  <span
                                    data-pin-dot-key={`${node.id}:output:${outputPin.id}`}
                                    className={`bp-pin__dot ${
                                      outputPin.type === "exec" ? "bp-pin__dot--exec" : ""
                                    }`}
                                    style={{
                                      backgroundColor:
                                        outputPin.type === "exec" ? "#0F172A" : getPinColor(outputPin.type),
                                      boxShadow: isOutputSnapped
                                        ? "0 0 0 4px #10B981, 0 0 12px rgba(16, 185, 129, 0.9)"
                                        : isOutputClickActive
                                        ? "0 0 0 3px #206859, 0 0 8px rgba(32, 104, 89, 0.7)"
                                        : undefined,
                                      transform: isOutputSnapped || isOutputClickActive ? "scale(1.4)" : undefined,
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
                    {/* Outer luminous glow aura */}
                    <path
                      d={spline.path}
                      fill="none"
                      stroke={wireColor}
                      strokeWidth="6"
                      opacity="0.25"
                    />
                    {/* Main high-contrast active wire */}
                    <path
                      d={spline.path}
                      fill="none"
                      stroke={wireColor}
                      strokeWidth="3.2"
                      strokeDasharray="6 3"
                    />
                    {/* Snapping Terminal Dot on cursor */}
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

          {/* Contextual Node Palette Modal (Tab or Right-Click) */}
          {palette.isOpen && (
            <div
              className="bp-palette-modal"
              style={{
                left: palette.x * zoom + pan.x,
                top: palette.y * zoom + pan.y,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Palette Header */}
              <div
                style={{
                  padding: "8px 10px",
                  borderBottom: "1px solid #E2E8F0",
                  backgroundColor: "#F8FAFC",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={13} style={{ color: "#206859" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#0F172A" }}>
                    Node Search Palette
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPalette({ isOpen: false, x: 0, y: 0 })}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px 4px",
                    color: "#64748B",
                  }}
                >
                  <X size={12} />
                </button>
              </div>

              {/* Search Bar */}
              <div style={{ padding: "6px 8px", borderBottom: "1px solid #F1F5F9" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: "#F1F5F9",
                    borderRadius: 4,
                    padding: "4px 8px",
                  }}
                >
                  <Search size={12} style={{ color: "#94A3B8" }} />
                  <input
                    type="text"
                    autoFocus
                    placeholder={
                      palette.pendingWire
                        ? `Search nodes connecting to ${palette.pendingWire.pin.label}...`
                        : "Search all blueprint nodes..."
                    }
                    value={paletteSearch}
                    onChange={(e) => setPaletteSearch(e.target.value)}
                    style={{
                      border: "none",
                      background: "transparent",
                      fontSize: 11,
                      width: "100%",
                      outline: "none",
                      color: "#0F172A",
                    }}
                  />
                </div>
              </div>

              {/* Context-Sensitive Wire Banner (Unreal Engine 5 Pattern) */}
              {palette.pendingWire && (
                <div
                  style={{
                    padding: "6px 10px",
                    backgroundColor: "#F0FDF4",
                    borderBottom: "1px solid #DCFCE7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#166534" }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: getPinColor(palette.pendingWire.pin.type),
                        display: "inline-block",
                        boxShadow: "0 0 0 2px #BBF7D0",
                      }}
                    />
                    <span>
                      Connecting from: <strong>{palette.pendingWire.pin.label}</strong>{" "}
                      <span style={{ opacity: 0.75 }}>({palette.pendingWire.pin.type})</span>
                    </span>
                  </div>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      cursor: "pointer",
                      color: "#15803D",
                      fontWeight: 600,
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isContextSensitive}
                      onChange={(e) => setIsContextSensitive(e.target.checked)}
                      style={{ cursor: "pointer", accentColor: "#16A34A" }}
                    />
                    <span>Context Sensitive</span>
                  </label>
                </div>
              )}

              {/* Category Filter Chips */}
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  padding: "4px 8px",
                  borderBottom: "1px solid #F1F5F9",
                  overflowX: "auto",
                  backgroundColor: "#FFFFFF",
                }}
              >
                {["All", ...getAllNodeCategories()].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPaletteCategory(cat)}
                    style={{
                      background: paletteCategory === cat ? "#206859" : "#F1F5F9",
                      color: paletteCategory === cat ? "#FFFFFF" : "#475569",
                      border: "none",
                      borderRadius: 10,
                      padding: "2px 8px",
                      fontSize: 9,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Matching Nodes List */}
              <div style={{ flex: 1, overflowY: "auto", padding: "4px 0", maxHeight: 260 }}>
                {filteredPaletteNodes.length === 0 ? (
                  <div style={{ padding: "16px 12px", textAlign: "center", fontSize: 11, color: "#64748B" }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>No compatible nodes found</div>
                    <div style={{ fontSize: 10, color: "#94A3B8" }}>
                      {palette.pendingWire && isContextSensitive ? (
                        <span>
                          Uncheck <em>Context Sensitive</em> above to view all nodes
                        </span>
                      ) : (
                        "Try a different search query"
                      )}
                    </div>
                  </div>
                ) : (
                  filteredPaletteNodes.map((def) => {
                    const compatiblePin = palette.pendingWire
                      ? getCompatiblePinForNode(def, palette.pendingWire)
                      : null;

                    return (
                      <div
                        key={def.type}
                        onClick={() => handleSelectPaletteNode(def)}
                        style={{
                          padding: "6px 12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                          borderBottom: "1px solid #F8FAFC",
                          transition: "background 0.1s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#EBF5F3")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              backgroundColor: def.headerColor,
                              flexShrink: 0,
                            }}
                          />
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#0F172A" }}>
                                {def.title}
                              </span>
                              {compatiblePin && (
                                <span
                                  style={{
                                    fontSize: 9,
                                    color: "#059669",
                                    backgroundColor: "#ECFDF5",
                                    border: "1px solid #A7F3D0",
                                    padding: "0.5px 5px",
                                    borderRadius: 3,
                                    fontWeight: 600,
                                  }}
                                >
                                  → {compatiblePin.label} ({compatiblePin.type})
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 9, color: "#64748B" }}>
                              {def.description}
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: 9,
                            padding: "1px 5px",
                            borderRadius: 4,
                            backgroundColor: "#F1F5F9",
                            color: "#475569",
                            fontWeight: 500,
                          }}
                        >
                          {def.category}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
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
