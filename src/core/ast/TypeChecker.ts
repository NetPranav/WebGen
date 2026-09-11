/**
 * ============================================================================
 * LOGIC BLUEPRINT TYPE CHECKER & PIN WIRE VALIDATOR
 * ============================================================================
 * Evaluates pin connection compatibility between nodes, enforces Unreal Engine
 * style wiring rules, and routes `[PIN_TYPE_MISMATCH]` diagnostics to Output Log.
 *
 * Architecture Ref: ROADMAP.md §Sub-Phase 3.2 & CONVENTIONS.md §7
 * ============================================================================
 */

import { PinDataType, PinDefinition } from "@/core/types/node-registry";
import { DiagnosticBus } from "@/core/engine/DiagnosticBus";

export interface PinConnectionValidationResult {
  isValid: boolean;
  reason?: string;
  error?: string;
  isCoerced?: boolean;
}

export interface WireConnectionRequest {
  sourceNodeId: string;
  sourcePin: PinDefinition;
  targetNodeId: string;
  targetPin: PinDefinition;
}

export class TypeChecker {
  /**
   * Evaluates compatibility between two candidate pins.
   * If invalid, dispatches structured diagnostic to Output Log.
   */
  public static validateWireConnection(
    req: WireConnectionRequest,
    options?: { silent?: boolean }
  ): PinConnectionValidationResult {
    const { sourceNodeId, sourcePin, targetNodeId, targetPin } = req;

    // 1. Self-Loop Check: Cannot connect a pin to the same node
    if (sourceNodeId === targetNodeId) {
      const errorMsg = `[PIN_TYPE_MISMATCH] Cannot wire node '${sourceNodeId}' to itself.`;
      if (!options?.silent) {
        DiagnosticBus.emit({
          channel: "BLUEPRINT_ERR",
          severity: "error",
          source: {
            panel: "Panel 05: Logic Blueprint",
            entityId: sourceNodeId,
          },
          message: errorMsg,
          suggestion: "Connect output pins to input pins on a different node.",
        });
      }
      return {
        isValid: false,
        reason: "SELF_CONNECTION",
        error: errorMsg,
      };
    }

    // 2. Direction Check: Must be Output -> Input (or Input -> Output)
    if (sourcePin.direction === targetPin.direction) {
      const errorMsg = `[PIN_TYPE_MISMATCH] Cannot connect ${sourcePin.direction} pin to another ${targetPin.direction} pin. Must connect Output to Input.`;
      if (!options?.silent) {
        DiagnosticBus.emit({
          channel: "BLUEPRINT_ERR",
          severity: "error",
          source: {
            panel: "Panel 05: Logic Blueprint",
            entityId: sourceNodeId,
          },
          message: errorMsg,
          suggestion: "Drag from an output pin (right side) to an input pin (left side).",
        });
      }
      return {
        isValid: false,
        reason: "DIRECTION_MISMATCH",
        error: errorMsg,
      };
    }

    // Standardize: ensure source is Output and target is Input
    const outputPin = sourcePin.direction === "output" ? sourcePin : targetPin;
    const inputPin = sourcePin.direction === "input" ? sourcePin : targetPin;

    // 3. Execution Flow Pin Isolation:
    // 'exec' pins can ONLY connect to 'exec' pins.
    if (outputPin.type === "exec" || inputPin.type === "exec") {
      if (outputPin.type !== inputPin.type) {
        const errorMsg = `[PIN_TYPE_MISMATCH] Execution flow pin (white) cannot connect to data pin '${inputPin.name}' (${inputPin.type}).`;
        if (!options?.silent) {
          DiagnosticBus.emit({
            channel: "BLUEPRINT_ERR",
            severity: "error",
            source: {
              panel: "Panel 05: Logic Blueprint",
              entityId: sourceNodeId,
            },
            message: errorMsg,
            suggestion: "Exec pins represent program flow; data pins hold values.",
          });
        }
        return {
          isValid: false,
          reason: "EXEC_DATA_MISMATCH",
          error: errorMsg,
        };
      }
      // Both are 'exec' -> Valid!
      return { isValid: true };
    }

    // 4. Data Pin Type Compatibility:
    const fromType = outputPin.type;
    const toType = inputPin.type;

    // Case A: Exact Match
    if (fromType === toType) {
      return { isValid: true };
    }

    // Case B: Wildcard / Any Pin
    if (fromType === "any" || toType === "any") {
      return { isValid: true };
    }

    // Case C: Safe Widening / Formatting Coercion (Number -> String, Boolean -> String)
    if ((fromType === "number" || fromType === "boolean") && toType === "string") {
      return {
        isValid: true,
        isCoerced: true,
        reason: `Auto-coerced ${fromType} to string.`,
      };
    }

    // Case D: Strict Incompatible Rejection (Array -> String, Object -> Number, etc.)
    const errorMsg = `[PIN_TYPE_MISMATCH] Type '${fromType}' cannot connect to '${toType}' on pin '${inputPin.name}'. Required: ${toType}.`;
    if (!options?.silent) {
      DiagnosticBus.emit({
        channel: "BLUEPRINT_ERR",
        severity: "error",
        source: {
          panel: "Panel 05: Logic Blueprint",
          entityId: sourceNodeId,
        },
        message: errorMsg,
        suggestion: `Provide a value of type '${toType}' or use a conversion function.`,
      });
    }

    return {
      isValid: false,
      reason: "INCOMPATIBLE_TYPES",
      error: errorMsg,
    };
  }

  /**
   * Helper to verify if an existing type can accept a candidate type
   */
  public static isTypeAssignable(from: PinDataType, to: PinDataType): boolean {
    if (from === to) return true;
    if (from === "exec" || to === "exec") return false;
    if (from === "any" || to === "any") return true;
    if ((from === "number" || from === "boolean") && to === "string") return true;
    return false;
  }
}
