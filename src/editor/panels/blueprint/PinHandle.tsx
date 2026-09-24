"use client";

/**
 * ============================================================================
 * BLUEPRINT PIN HANDLE COMPONENT
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Sub-Phase 4.5 & UI.md §2.2
 *
 * Modular interactive pin connector:
 *   1. Expanded 26px interactive hit target for magnetic wire snapping (36px radius)
 *   2. Strict color taxonomy per UI.md §2.2 (never red for valid data pins)
 *   3. Distinctive execution flow arrowhead/dot styling
 *   4. Inline literal input editor for unlinked input data pins
 *   5. Luminous glow state when magnetized or actively selected
 * ============================================================================
 */

import React from "react";
import { PinDefinition, PinDirection, getPinColor } from "@/core/types/node-registry";

export interface PinHandleProps {
  nodeId: string;
  pin: PinDefinition;
  direction: PinDirection;
  isConnected?: boolean;
  isSnapped?: boolean;
  isClickActive?: boolean;
  value?: unknown;
  onValueChange?: (val: unknown) => void;
  onMouseDown: (e: React.MouseEvent, nodeId: string, pin: PinDefinition, direction: PinDirection) => void;
  onClick: (e: React.MouseEvent, nodeId: string, pin: PinDefinition, direction: PinDirection) => void;
}

export const PinHandle: React.FC<PinHandleProps> = ({
  nodeId,
  pin,
  direction,
  isConnected = false,
  isSnapped = false,
  isClickActive = false,
  value,
  onValueChange,
  onMouseDown,
  onClick,
}) => {
  const isExec = pin.type === "exec";
  const isInput = direction === "input";
  const pinColor = isExec ? "#0F172A" : getPinColor(pin.type);

  return (
    <div
      className={`bp-pin bp-pin--${direction}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        position: "relative",
        userSelect: "none",
        ...(isInput ? {} : { marginLeft: "auto", justifyContent: "flex-end" }),
      }}
    >
      {/* If Output pin: Label on left, Pin dot on right */}
      {!isInput && (
        <span
          style={{
            fontSize: 11,
            color: isSnapped ? "#10B981" : "#334155",
            fontWeight: isSnapped ? 600 : 400,
            whiteSpace: "nowrap",
          }}
        >
          {pin.label}
        </span>
      )}

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
        onMouseDown={(e) => onMouseDown(e, nodeId, pin, direction)}
        onClick={(e) => onClick(e, nodeId, pin, direction)}
        title={`${pin.label} (${pin.type}) - Drag or Click to connect`}
      >
        <span
          data-pin-dot-key={`${nodeId}:${direction}:${pin.id}`}
          className={`bp-pin__dot ${isExec ? "bp-pin__dot--exec" : ""}`}
          style={{
            width: 10,
            height: 10,
            borderRadius: isExec ? "2px" : "50%",
            backgroundColor: isConnected || isSnapped ? pinColor : "transparent",
            border: `1.8px solid ${pinColor}`,
            boxShadow: isSnapped
              ? "0 0 0 4px #10B981, 0 0 12px rgba(16, 185, 129, 0.9)"
              : isClickActive
              ? "0 0 0 3px #206859, 0 0 8px rgba(32, 104, 89, 0.7)"
              : undefined,
            transform: isSnapped || isClickActive ? "scale(1.35)" : undefined,
            transition: "transform 0.12s ease, box-shadow 0.12s ease, background-color 0.12s ease",
            boxSizing: "border-box",
            display: "inline-block",
          }}
        />
      </div>

      {/* If Input pin: Pin dot on left, Label on right */}
      {isInput && (
        <span
          style={{
            fontSize: 11,
            color: isSnapped ? "#10B981" : "#334155",
            fontWeight: isSnapped ? 600 : 400,
            whiteSpace: "nowrap",
          }}
        >
          {pin.label}
        </span>
      )}

      {/* Inline Literal Input for Unconnected Data Input Pins */}
      {isInput && !isConnected && !isExec && (
        <input
          type={pin.type === "number" ? "number" : "text"}
          className="bp-literal-input"
          value={
            typeof value === "string" || typeof value === "number"
              ? value
              : typeof pin.defaultValue === "string" || typeof pin.defaultValue === "number"
              ? pin.defaultValue
              : ""
          }
          onChange={(e) => {
            if (onValueChange) {
              onValueChange(pin.type === "number" ? Number(e.target.value) : e.target.value);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            height: 20,
            fontSize: 10,
            padding: "1px 6px",
            backgroundColor: "#F1F5F9",
            border: "1px solid #CBD5E1",
            borderRadius: 4,
            color: "#1E293B",
            maxWidth: 72,
            outline: "none",
          }}
        />
      )}
    </div>
  );
};
