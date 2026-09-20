"use client";

/**
 * ============================================================================
 * MODULAR BLUEPRINT NODE CARD COMPONENT
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Sub-Phase 4.5 & UI.md §4.6
 *
 * Dedicated modular Node Card component:
 *   1. Category header with distinctive color accents (Never Red!)
 *   2. Responsive interleaved pin rows pairing inputs and outputs
 *   3. Integrated PinHandle connectors with magnetic snapping
 *   4. Inline literal parameter editors
 *   5. Selection aura & hover elevation
 * ============================================================================
 */

import React, { memo } from "react";
import { Zap, X } from "lucide-react";
import { NodeDefinition, PinDefinition, PinDirection } from "@/core/types/node-registry";
import { PinHandle } from "./PinHandle";

export interface BlueprintNodeData {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number };
  customParams?: Record<string, unknown>;
  pinValues?: Record<string, unknown>;
}

export interface NodeCardProps {
  node: BlueprintNodeData;
  definition?: NodeDefinition;
  isSelected?: boolean;
  connectedPinKeys?: Set<string>;
  hoveredPinTarget?: { nodeId: string; pinId: string; isValid: boolean } | null;
  activeClickPin?: { nodeId: string; pin: PinDefinition; direction: PinDirection } | null;
  breakpoint?: { isEnabled: boolean; condition?: string; hitCount: number } | null;
  isPausedHere?: boolean;
  hotMetric?: { durationMs: number; percentage: number } | null;
  onSelect: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onHeaderMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onPinMouseDown: (e: React.MouseEvent, nodeId: string, pin: PinDefinition, direction: PinDirection) => void;
  onPinClick: (e: React.MouseEvent, nodeId: string, pin: PinDefinition, direction: PinDirection) => void;
  onPinValueChange?: (nodeId: string, pinId: string, value: unknown) => void;
  onToggleBreakpoint?: (nodeId: string) => void;
  onSetBreakpointCondition?: (nodeId: string, condition?: string) => void;
}

export const NodeCard: React.FC<NodeCardProps> = memo(({
  node,
  definition,
  isSelected = false,
  connectedPinKeys = new Set(),
  hoveredPinTarget = null,
  activeClickPin = null,
  breakpoint = null,
  isPausedHere = false,
  hotMetric = null,
  onSelect,
  onDelete,
  onHeaderMouseDown,
  onPinMouseDown,
  onPinClick,
  onPinValueChange,
  onToggleBreakpoint,
  onSetBreakpointCondition,
}) => {
  const headerColor = definition?.headerColor || "#4338CA";
  const inputs = definition?.inputs || [];
  const outputs = definition?.outputs || [];
  const maxRows = Math.max(inputs.length, outputs.length);

  return (
    <div
      data-node-id={node.id}
      className={`bp-node ${isSelected ? "bp-node--selected" : ""} ${isPausedHere ? "debugger-paused-glow" : ""}`}
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        minWidth: 250,
        maxWidth: 340,
        width: "max-content",
        backgroundColor: "#FFFFFF",
        border: isPausedHere
          ? "2px solid #F59E0B"
          : hotMetric
          ? "1.5px solid #EA580C"
          : isSelected
          ? "1.5px solid #206859"
          : "1px solid #CBD5E1",
        borderRadius: 8,
        boxShadow: isPausedHere
          ? "0 0 0 3px rgba(245, 158, 11, 0.4), 0 0 20px rgba(245, 158, 11, 0.5)"
          : hotMetric
          ? "0 0 0 2px rgba(234, 88, 12, 0.35), 0 6px 20px rgba(234, 88, 12, 0.15)"
          : isSelected
          ? "0 0 0 2px rgba(32, 104, 89, 0.3), 0 8px 24px rgba(15, 23, 42, 0.16)"
          : "0 4px 14px rgba(15, 23, 42, 0.08)",
        userSelect: "none",
        pointerEvents: "all",
        zIndex: isPausedHere ? 35 : isSelected ? 10 : 2,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Node Header */}
      <div
        className="bp-node__header"
        style={{
          backgroundColor: headerColor,
          padding: "6px 12px",
          color: "#FFFFFF",
          fontSize: 11,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "grab",
        }}
        onMouseDown={(e) => onHeaderMouseDown(e, node.id)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
          {/* Breakpoint Gutter Circle */}
          <button
            type="button"
            className={`breakpoint-gutter ${
              breakpoint
                ? breakpoint.isEnabled
                  ? "breakpoint-active"
                  : "breakpoint-disabled"
                : ""
            } ${breakpoint?.condition ? "breakpoint-conditional" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleBreakpoint) onToggleBreakpoint(node.id);
            }}
            onContextMenu={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (onSetBreakpointCondition) {
                const current = breakpoint?.condition || "";
                const cond = window.prompt(
                  `Set condition for breakpoint on '${node.title}' (e.g. inputs.amount > 100):`,
                  current
                );
                if (cond !== null) {
                  onSetBreakpointCondition(node.id, cond.trim() || undefined);
                }
              }
            }}
            title={
              breakpoint
                ? `Breakpoint (${breakpoint.isEnabled ? "Active" : "Disabled"})${
                    breakpoint.condition ? ` • Condition: ${breakpoint.condition}` : ""
                  } • Hit count: ${breakpoint.hitCount}. Left-click to toggle, Right-click to set condition.`
                : "Click to add Breakpoint. Right-click to add Conditional Breakpoint."
            }
          />
          <Zap size={11} style={{ opacity: 0.95 }} />
          <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
            {node.title}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {hotMetric && (
            <span
              className="hot-node-badge"
              title={`Performance Bottleneck: ${hotMetric.durationMs}ms (${hotMetric.percentage}% of run total)`}
            >
              🔥 {hotMetric.durationMs}ms
            </span>
          )}
          {isPausedHere && (
            <span className="debugger-paused-badge">
              ⏸ PAUSED
            </span>
          )}
          <span style={{ fontSize: 8, opacity: 0.8, textTransform: "uppercase" }}>
            {definition?.category || "NODE"}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
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

      {/* Node Body with Interleaved Input & Output Pins */}
      <div
        className="bp-node__body"
        style={{
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: 11,
          boxSizing: "border-box",
        }}
      >
        {Array.from({ length: maxRows }).map((_, idx) => {
          const inputPin = inputs[idx];
          const outputPin = outputs[idx];

          const isInputConnected = inputPin
            ? connectedPinKeys.has(`${node.id}:input:${inputPin.id}`)
            : false;
          const isInputSnapped =
            hoveredPinTarget?.nodeId === node.id &&
            hoveredPinTarget?.pinId === inputPin?.id &&
            hoveredPinTarget?.isValid;
          const isInputClickActive =
            activeClickPin?.nodeId === node.id &&
            activeClickPin?.pin.id === inputPin?.id;

          const isOutputConnected = outputPin
            ? connectedPinKeys.has(`${node.id}:output:${outputPin.id}`)
            : false;
          const isOutputSnapped =
            hoveredPinTarget?.nodeId === node.id &&
            hoveredPinTarget?.pinId === outputPin?.id &&
            hoveredPinTarget?.isValid;
          const isOutputClickActive =
            activeClickPin?.nodeId === node.id &&
            activeClickPin?.pin.id === outputPin?.id;

          return (
            <div
              key={idx}
              className="bp-node__row"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: 26,
                gap: 16,
                position: "relative",
              }}
            >
              {/* Left Input Pin */}
              {inputPin ? (
                <PinHandle
                  nodeId={node.id}
                  pin={inputPin}
                  direction="input"
                  isConnected={isInputConnected}
                  isSnapped={isInputSnapped}
                  isClickActive={isInputClickActive}
                  value={node.pinValues?.[inputPin.id]}
                  onValueChange={(val) => {
                    if (onPinValueChange) {
                      onPinValueChange(node.id, inputPin.id, val);
                    }
                  }}
                  onMouseDown={onPinMouseDown}
                  onClick={onPinClick}
                />
              ) : (
                <span />
              )}

              {/* Right Output Pin */}
              {outputPin ? (
                <PinHandle
                  nodeId={node.id}
                  pin={outputPin}
                  direction="output"
                  isConnected={isOutputConnected}
                  isSnapped={isOutputSnapped}
                  isClickActive={isOutputClickActive}
                  onMouseDown={onPinMouseDown}
                  onClick={onPinClick}
                />
              ) : (
                <span />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

NodeCard.displayName = "NodeCard";
