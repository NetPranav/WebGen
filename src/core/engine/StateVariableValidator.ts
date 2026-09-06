"use client";

/**
 * ============================================================================
 * STATE VARIABLE TYPE VALIDATOR & COMPATIBILITY ENGINE
 * ============================================================================
 * Validates initial values and runtime assignments for reactive state variables
 * against declared types (string, number, boolean, json, array, color).
 * Traps mismatches and routes structured warnings to Panel 07 (Output Log).
 * Architecture Ref: SCHEMA_REFERENCE.md §13 & ROADMAP.md §Sub-Phase 2.4
 * ============================================================================
 */

import { StateVariableType, StateVariableScope } from "../store/useProjectStore";
import { DiagnosticBus } from "./DiagnosticBus";

export interface StateVariableValidationResult {
  isValid: boolean;
  parsedValue: unknown;
  fallbackValue: unknown;
  warningMessage?: string;
  suggestion?: string;
}

export class StateVariableValidator {
  /**
   * Validate raw input against a declared variable type, dispatching a diagnostic
   * to DiagnosticBus if an incompatibility or syntax error is trapped.
   */
  public static validateAndEmit(
    varName: string,
    type: StateVariableType,
    rawValue: unknown,
    scope: StateVariableScope = "global"
  ): StateVariableValidationResult {
    const preview = this.checkPreview(type, rawValue);

    if (!preview.isValid) {
      const rawStr = String(rawValue ?? "");
      DiagnosticBus.reportStateVariableWarning(
        varName,
        type,
        rawStr,
        preview.fallbackValue,
        scope
      );
    }

    return preview;
  }

  /**
   * Non-emitting validator for real-time form preview and UI typing assistance.
   */
  public static checkPreview(
    type: StateVariableType,
    rawValue: unknown
  ): StateVariableValidationResult {
    const rawStr = typeof rawValue === "string" ? rawValue.trim() : "";

    switch (type) {
      case "number": {
        if (typeof rawValue === "number" && !isNaN(rawValue)) {
          return { isValid: true, parsedValue: rawValue, fallbackValue: 0 };
        }
        if (rawStr === "") {
          return { isValid: true, parsedValue: 0, fallbackValue: 0 };
        }
        const num = Number(rawStr);
        if (isNaN(num)) {
          return {
            isValid: false,
            parsedValue: 0,
            fallbackValue: 0,
            warningMessage: `Initial value '${rawStr}' is not a valid number.`,
            suggestion: `Input a valid numeric value (e.g. 0, 42, -3.14).`,
          };
        }
        return { isValid: true, parsedValue: num, fallbackValue: 0 };
      }

      case "boolean": {
        if (typeof rawValue === "boolean") {
          return { isValid: true, parsedValue: rawValue, fallbackValue: false };
        }
        if (rawStr === "") {
          return { isValid: true, parsedValue: false, fallbackValue: false };
        }
        const lower = rawStr.toLowerCase();
        if (lower === "true" || lower === "1") {
          return { isValid: true, parsedValue: true, fallbackValue: false };
        }
        if (lower === "false" || lower === "0") {
          return { isValid: true, parsedValue: false, fallbackValue: false };
        }
        return {
          isValid: false,
          parsedValue: false,
          fallbackValue: false,
          warningMessage: `Initial value '${rawStr}' is not a valid boolean ('true' or 'false').`,
          suggestion: `Provide 'true' or 'false'.`,
        };
      }

      case "json": {
        if (typeof rawValue === "object" && rawValue !== null && !Array.isArray(rawValue)) {
          return { isValid: true, parsedValue: rawValue, fallbackValue: {} };
        }
        if (rawStr === "") {
          return { isValid: true, parsedValue: {}, fallbackValue: {} };
        }
        try {
          const parsed = JSON.parse(rawStr);
          if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            return {
              isValid: false,
              parsedValue: {},
              fallbackValue: {},
              warningMessage: `Initial value must be a valid JSON object {...}.`,
              suggestion: `Provide valid JSON syntax (e.g. {"key": "value"}).`,
            };
          }
          return { isValid: true, parsedValue: parsed, fallbackValue: {} };
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : "Malformed syntax";
          return {
            isValid: false,
            parsedValue: {},
            fallbackValue: {},
            warningMessage: `JSON parse error: ${errMsg}`,
            suggestion: `Check JSON syntax and quote all keys.`,
          };
        }
      }

      case "array": {
        if (Array.isArray(rawValue)) {
          return { isValid: true, parsedValue: rawValue, fallbackValue: [] };
        }
        if (rawStr === "") {
          return { isValid: true, parsedValue: [], fallbackValue: [] };
        }
        try {
          const parsed = JSON.parse(rawStr);
          if (!Array.isArray(parsed)) {
            return {
              isValid: false,
              parsedValue: [],
              fallbackValue: [],
              warningMessage: `Initial value must be a JSON array [...].`,
              suggestion: `Provide valid array syntax (e.g. [1, 2, 3]).`,
            };
          }
          return { isValid: true, parsedValue: parsed, fallbackValue: [] };
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : "Malformed array";
          return {
            isValid: false,
            parsedValue: [],
            fallbackValue: [],
            warningMessage: `Array parse error: ${errMsg}`,
            suggestion: `Provide valid array syntax (e.g. [1, 2, 3]).`,
          };
        }
      }

      case "color": {
        if (rawStr === "") {
          return { isValid: true, parsedValue: "#000000", fallbackValue: "#000000" };
        }
        const hexRegex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
        const rgbRegex = /^rgba?\((\s*\d+\s*,){2}\s*\d+\s*(,\s*[\d.]+\s*)?\)$/i;
        const hslRegex = /^hsla?\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*[\d.]+\s*)?\)$/i;
        const validCssNames = ["transparent", "inherit", "currentColor", "white", "black", "red", "green", "blue"];

        if (hexRegex.test(rawStr) || rgbRegex.test(rawStr) || hslRegex.test(rawStr) || validCssNames.includes(rawStr.toLowerCase())) {
          return { isValid: true, parsedValue: rawStr, fallbackValue: "#000000" };
        }

        return {
          isValid: false,
          parsedValue: "#000000",
          fallbackValue: "#000000",
          warningMessage: `Initial value '${rawStr}' is not a valid CSS color.`,
          suggestion: `Provide a valid hex (#ffffff), rgb(), or color name.`,
        };
      }

      case "string":
      default:
        return {
          isValid: true,
          parsedValue: String(rawValue ?? ""),
          fallbackValue: "",
        };
    }
  }
}
