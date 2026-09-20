"use client";

/**
 * ============================================================================
 * BLUEPRINT ACTION PALETTE MODAL COMPONENT
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Sub-Phase 4.5 & Detailed Roadmap.md §Sub-Phase 4.5
 *
 * Unreal Engine-style Contextual Node Search Palette:
 *   1. Invoked via `Tab` key, Right-Click, or Wire-Drop on empty canvas
 *   2. Starts directly at the mouse release cursor (or flips upward near screen bottom)
 *   3. Closes immediately when clicking anywhere outside (backdrop + pointerdown listener)
 *   4. Fuzzy-matched against the Phase 3.1 built-in node registry
 *   5. Context-Sensitive wire filtering (Unreal Engine 5 standard, default ON)
 *   6. Category filter pills & real-time search scoring
 *   7. Full keyboard navigation (Arrow Up/Down, Enter to place, Esc to cancel)
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  NodeDefinition,
  PinDefinition,
  getAllNodeCategories,
  getPinColor,
  searchNodeDefinitions,
} from "@/core/types/node-registry";
import { TypeChecker } from "@/core/ast/TypeChecker";

export interface PendingWireContext {
  nodeId: string;
  pinId: string;
  pin: PinDefinition;
  isOutput: boolean;
}

export interface ActionPaletteModalProps {
  isOpen: boolean;
  x: number;
  y: number;
  zoom: number;
  pan: { x: number; y: number };
  pendingWire?: PendingWireContext;
  onSelectNode: (nodeDef: NodeDefinition, compatiblePin?: PinDefinition | null) => void;
  onClose: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export const ActionPaletteModal: React.FC<ActionPaletteModalProps> = ({
  isOpen,
  x,
  y,
  zoom,
  pan,
  pendingWire,
  onSelectNode,
  onClose,
  containerRef,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isContextSensitive, setIsContextSensitive] = useState<boolean>(true);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset search and selection whenever palette is opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedCategory("All");
      setSelectedIndex(0);
      setIsContextSensitive(true);
      // Auto-focus input on open
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 25);
    }
  }, [isOpen, pendingWire]);

  // Close palette whenever user clicks/touches anywhere outside the modal
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | PointerEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use capture phase so any outside click anywhere on canvas or window dismisses it
    window.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isOpen, onClose]);

  // Helper to test if a node definition has any pin compatible with the pending wire
  const getCompatiblePinForNode = useCallback(
    (nodeDef: NodeDefinition, pending?: PendingWireContext): PinDefinition | null => {
      if (!pending) return null;
      const candidatePins = pending.isOutput ? nodeDef.inputs : nodeDef.outputs;

      for (const pin of candidatePins) {
        const sourcePin = pending.isOutput ? pending.pin : pin;
        const targetPin = pending.isOutput ? pin : pending.pin;
        const check = TypeChecker.validateWireConnection(
          {
            sourceNodeId: pending.isOutput ? pending.nodeId : "virtual_node",
            sourcePin,
            targetNodeId: pending.isOutput ? "virtual_node" : pending.nodeId,
            targetPin,
          },
          { silent: true }
        );
        if (check.isValid) {
          return pin;
        }
      }
      return null;
    },
    []
  );

  // Filter and fuzzy-rank nodes based on search, category, and context-sensitivity
  const filteredNodes = useMemo(() => {
    let nodes = searchNodeDefinitions(searchQuery);

    if (selectedCategory !== "All") {
      nodes = nodes.filter((n) => n.category === selectedCategory);
    }

    if (pendingWire && isContextSensitive) {
      nodes = nodes.filter((def) => getCompatiblePinForNode(def, pendingWire) !== null);
    }

    // Fuzzy scoring boost: prioritize title match over description match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      nodes = [...nodes].sort((a, b) => {
        const aTitleMatch = a.title.toLowerCase().includes(q);
        const bTitleMatch = b.title.toLowerCase().includes(q);
        if (aTitleMatch && !bTitleMatch) return -1;
        if (!aTitleMatch && bTitleMatch) return 1;

        const aExact = a.title.toLowerCase().startsWith(q);
        const bExact = b.title.toLowerCase().startsWith(q);
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        return 0;
      });
    }

    return nodes;
  }, [searchQuery, selectedCategory, pendingWire, isContextSensitive, getCompatiblePinForNode]);

  // Clamp selected index within range whenever filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredNodes.length, searchQuery, selectedCategory]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLElement>("[data-palette-item]");
    const activeItem = items[selectedIndex];
    if (activeItem) {
      activeItem.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Keyboard navigation within the palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredNodes.length > 0 ? (prev + 1) % filteredNodes.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredNodes.length > 0 ? (prev - 1 + filteredNodes.length) % filteredNodes.length : 0
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredNodes[selectedIndex]) {
        const targetNode = filteredNodes[selectedIndex];
        const compatiblePin = pendingWire
          ? getCompatiblePinForNode(targetNode, pendingWire)
          : null;
        onSelectNode(targetNode, compatiblePin);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  // Compute exact viewport position starting directly at mouse cursor
  const screenX = x * zoom + pan.x;
  const screenY = y * zoom + pan.y;

  const MODAL_WIDTH = 340;
  const MODAL_MAX_HEIGHT = 420;

  let leftPos = screenX;
  let topPos = screenY;
  let computedMaxHeight = MODAL_MAX_HEIGHT;

  if (containerRef?.current) {
    const rect = containerRef.current.getBoundingClientRect();

    // Horizontal clamping: if modal would overflow right canvas edge, shift left
    if (leftPos + MODAL_WIDTH > rect.width - 10) {
      leftPos = Math.max(10, rect.width - MODAL_WIDTH - 10);
    }

    // Vertical positioning:
    // If there is not enough room below the mouse cursor (< 200px), flip upwards
    if (screenY + 220 > rect.height) {
      topPos = Math.max(10, screenY - MODAL_MAX_HEIGHT);
      computedMaxHeight = Math.min(MODAL_MAX_HEIGHT, screenY - 10);
    } else {
      // Start the top of the card EXACTLY at the mouse cursor
      topPos = screenY;
      computedMaxHeight = Math.min(MODAL_MAX_HEIGHT, rect.height - screenY - 10);
    }
  }

  const categories = ["All", ...getAllNodeCategories()];

  return (
    <>
      {/* Invisible Full-Screen Backdrop to intercept outside clicks and dismiss */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 145,
          cursor: "default",
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onContextMenu={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClose();
        }}
      />

      {/* Action Palette Card */}
      <div
        ref={modalRef}
        className="bp-palette-modal"
        style={{
          position: "absolute",
          left: leftPos,
          top: topPos,
          width: MODAL_WIDTH,
          maxHeight: computedMaxHeight,
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid #CBD5E1",
          borderRadius: 10,
          boxShadow: "0 14px 36px rgba(15, 23, 42, 0.18), 0 2px 8px rgba(15, 23, 42, 0.08)",
          zIndex: 150,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          outline: "none",
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Palette Header */}
        <div
          style={{
            padding: "8px 12px",
            borderBottom: "1px solid #E2E8F0",
            backgroundColor: "#F8FAFC",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Sparkles size={14} style={{ color: "#206859" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.01em" }}>
              Node Action Palette
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 4px",
              color: "#64748B",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
            }}
            title="Close Palette (Esc)"
          >
            <X size={13} />
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: "6px 8px", borderBottom: "1px solid #F1F5F9", backgroundColor: "#FFFFFF" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              backgroundColor: "#F1F5F9",
              borderRadius: 6,
              padding: "5px 10px",
              border: "1px solid #E2E8F0",
            }}
          >
            <Search size={13} style={{ color: "#64748B", flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              placeholder={
                pendingWire
                  ? `Connect from ${pendingWire.pin.label}...`
                  : "Search all blueprint nodes..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                fontSize: 11,
                width: "100%",
                outline: "none",
                color: "#0F172A",
                fontWeight: 500,
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  color: "#94A3B8",
                  display: "flex",
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Context-Sensitive Wire Banner (Unreal Engine 5 Pattern) */}
        {pendingWire && (
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
                  backgroundColor: getPinColor(pendingWire.pin.type),
                  display: "inline-block",
                  boxShadow: "0 0 0 2px #BBF7D0",
                }}
              />
              <span>
                Connecting: <strong>{pendingWire.pin.label}</strong>{" "}
                <span style={{ opacity: 0.75 }}>({pendingWire.pin.type})</span>
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
            padding: "5px 8px",
            borderBottom: "1px solid #F1F5F9",
            overflowX: "auto",
            backgroundColor: "#FFFFFF",
            scrollbarWidth: "none",
          }}
        >
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  background: isActive ? "#206859" : "#F1F5F9",
                  color: isActive ? "#FFFFFF" : "#475569",
                  border: "none",
                  borderRadius: 12,
                  padding: "2px 8px",
                  fontSize: 9.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.12s ease",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Matching Nodes List */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "4px 0",
            maxHeight: Math.max(160, computedMaxHeight - 160),
          }}
        >
          {filteredNodes.length === 0 ? (
            <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 11, color: "#64748B" }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: "#334155" }}>
                No compatible nodes found
              </div>
              <div style={{ fontSize: 10, color: "#94A3B8" }}>
                {pendingWire && isContextSensitive ? (
                  <span>
                    Uncheck <em>Context Sensitive</em> above to explore all registered nodes
                  </span>
                ) : (
                  "Try searching for another keyword"
                )}
              </div>
            </div>
          ) : (
            filteredNodes.map((def, idx) => {
              const isHighlighted = idx === selectedIndex;
              const compatiblePin = pendingWire
                ? getCompatiblePinForNode(def, pendingWire)
                : null;

              return (
                <div
                  key={def.type}
                  data-palette-item
                  onClick={() => onSelectNode(def, compatiblePin)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    padding: "6px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    borderBottom: "1px solid #F8FAFC",
                    backgroundColor: isHighlighted ? "#EBF5F3" : "transparent",
                    transition: "background 0.08s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: def.headerColor,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: isHighlighted ? "#206859" : "#0F172A",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {def.title}
                        </span>
                        {compatiblePin && (
                          <span
                            style={{
                              fontSize: 8.5,
                              color: "#059669",
                              backgroundColor: "#ECFDF5",
                              border: "1px solid #A7F3D0",
                              padding: "0.5px 5px",
                              borderRadius: 3,
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            → {compatiblePin.label} ({compatiblePin.type})
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "#64748B",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {def.description}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 8.5,
                      padding: "1px 6px",
                      borderRadius: 4,
                      backgroundColor: isHighlighted ? "#D1EBE5" : "#F1F5F9",
                      color: isHighlighted ? "#206859" : "#475569",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      marginLeft: 6,
                    }}
                  >
                    {def.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Palette Footer with Keyboard Tips */}
        <div
          style={{
            padding: "5px 10px",
            borderTop: "1px solid #E2E8F0",
            backgroundColor: "#F8FAFC",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 9,
            color: "#94A3B8",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <kbd style={{ backgroundColor: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: 3, padding: "0 3px", fontSize: 8 }}>↑↓</kbd>
              Navigate
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <kbd style={{ backgroundColor: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: 3, padding: "0 3px", fontSize: 8 }}>↵</kbd>
              Place
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <kbd style={{ backgroundColor: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: 3, padding: "0 3px", fontSize: 8 }}>Esc</kbd>
              Close
            </span>
          </div>
          <span style={{ fontWeight: 600, color: "#64748B" }}>
            {filteredNodes.length} {filteredNodes.length === 1 ? "node" : "nodes"}
          </span>
        </div>
      </div>
    </>
  );
};
