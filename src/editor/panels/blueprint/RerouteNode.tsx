"use client";

/**
 * ============================================================================
 * BLUEPRINT REROUTE NODE (KNOT) COMPONENT
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Sub-Phase 4.5 & Detailed Roadmap.md §Sub-Phase 4.5
 *
 * Unreal Engine-style Reroute Node:
 *   1. Compact circular knot pinning wire flow between pins
 *   2. Dual connector pins (input on left, output on right)
 *   3. Color-coded per connected wire PinDataType (exec = dark navy/white, data = taxonomy)
 *   4. Draggable across canvas to route complex wire graphs cleanly around nodes
 *   5. Delete key and click selection integration
 * ============================================================================
 */

import React, { memo } from "react";
import { X } from "lucide-react";
import { PinDataType, getPinColor } from "@/core/types/node-registry";

export interface RerouteNodeData {
  id: string;
  position: { x: number; y: number };
  pinType?: PinDataType | string;
  comment?: string;
}

export interface RerouteNodeProps {
  node: RerouteNodeData;
  isSelected?: boolean;
  onSelect: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onPinMouseDown: (e: React.MouseEvent, nodeId: string, direction: "input" | "output") => void;
}

export const RerouteNode: React.FC<RerouteNodeProps> = memo(({
  node,
  isSelected = false,
  onSelect,
  onDelete,
  onMouseDown,
  onPinMouseDown,
}) => {
  const pinType = (node.pinType as PinDataType) || "exec";
  const isExec = pinType === "exec";
  const color = isExec ? "#0F172A" : getPinColor(pinType);

  return (
    <div
      data-node-id={node.id}
      className={`bp-reroute-node ${isSelected ? "bp-reroute-node--selected" : ""}`}
      style={{
        position: "absolute",
        left: node.position.x - 14,
        top: node.position.y - 14,
        width: 28,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "grab",
        userSelect: "none",
        zIndex: isSelected ? 12 : 5,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onMouseDown={(e) => onMouseDown(e, node.id)}
      onContextMenu={(e) => e.stopPropagation()}
    >
      {/* Left Input Hit Zone */}
      <div
        style={{
          position: "absolute",
          left: -4,
          top: 6,
          width: 16,
          height: 16,
          cursor: "crosshair",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onPinMouseDown(e, node.id, "input");
        }}
        title="Reroute Input"
      >
        <span
          data-pin-dot-key={`${node.id}:input:in`}
          style={{
            width: 8,
            height: 8,
            borderRadius: isExec ? "2px" : "50%",
            backgroundColor: color,
            border: "1.5px solid #FFFFFF",
            boxSizing: "border-box",
            display: "inline-block",
          }}
        />
      </div>

      {/* Center Knot Disc */}
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: "#FFFFFF",
          border: isSelected ? "2px solid #206859" : `2px solid ${color}`,
          boxShadow: isSelected
            ? "0 0 0 3px rgba(32, 104, 89, 0.4), 0 4px 12px rgba(15, 23, 42, 0.2)"
            : "0 2px 6px rgba(15, 23, 42, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.1s ease, box-shadow 0.1s ease",
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: isExec ? "1px" : "50%",
            backgroundColor: color,
          }}
        />
      </div>

      {/* Right Output Hit Zone */}
      <div
        style={{
          position: "absolute",
          right: -4,
          top: 6,
          width: 16,
          height: 16,
          cursor: "crosshair",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onPinMouseDown(e, node.id, "output");
        }}
        title="Reroute Output"
      >
        <span
          data-pin-dot-key={`${node.id}:output:out`}
          style={{
            width: 8,
            height: 8,
            borderRadius: isExec ? "2px" : "50%",
            backgroundColor: color,
            border: "1.5px solid #FFFFFF",
            boxSizing: "border-box",
            display: "inline-block",
          }}
        />
      </div>

      {/* Quick Delete Badge on Selection */}
      {isSelected && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(node.id);
          }}
          title="Delete Reroute Node"
          style={{
            position: "absolute",
            top: -10,
            right: -10,
            width: 14,
            height: 14,
            borderRadius: "50%",
            backgroundColor: "#EF4444",
            border: "none",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <X size={9} />
        </button>
      )}
    </div>
  );
});

RerouteNode.displayName = "RerouteNode";
