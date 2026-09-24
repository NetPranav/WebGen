"use client";

/**
 * ============================================================================
 * DATA BINDING VALIDATOR & TRANSFORM ENGINE
 * ============================================================================
 * Evaluates live data sources (database collections, state variables, URL params)
 * against element archetype property rules. Traps incompatible assignments
 * before they reach the canvas and dispatches [BIND_ERR] diagnostics.
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.2 & SCHEMA_REFERENCE.md §13
 * ============================================================================
 */

import {
  DataBindingDescriptor,
  DataContext,
  ResolvedBindingValue,
  TransformFunctionType,
} from "../types/data-binding";
import {
  ARCHETYPE_PROPERTY_BINDING_MATRIX,
  DatabasePropertyCategory,
  PropertyBindingRule,
} from "../types/database";
import { DiagnosticBus } from "./DiagnosticBus";

export class DataBindingValidatorService {
  /**
   * Resolves the raw value from the specified data context.
   */
  public resolveRawValue(
    descriptor: DataBindingDescriptor,
    context: DataContext
  ): { value: unknown; sourceDesc: string } {
    switch (descriptor.sourceType) {
      case "database": {
        const collection = descriptor.sourceCollection;
        const field = descriptor.sourceField;
        const sourceDesc = `${collection || "unknown"}.${field || "unknown"}`;

        if (!collection || !field) {
          return { value: undefined, sourceDesc };
        }

        const table = context.database[collection];
        if (!table || table.length === 0) {
          return { value: undefined, sourceDesc };
        }

        // Target record: specific recordId or default to the first record
        let record: Record<string, unknown> | undefined;
        if (descriptor.recordId && descriptor.recordId !== "first") {
          record = table.find(
            (r) => String(r.id) === String(descriptor.recordId)
          );
        } else {
          record = table[0];
        }

        return {
          value: record ? record[field] : undefined,
          sourceDesc,
        };
      }

      case "state_variable": {
        const varId = descriptor.stateVariableId || "";
        return {
          value: context.stateVariables[varId],
          sourceDesc: `State.${varId}`,
        };
      }

      case "url_param": {
        const key = descriptor.paramKey || "";
        return {
          value: context.urlParams[key],
          sourceDesc: `URL.?${key}`,
        };
      }

      case "local_storage": {
        const key = descriptor.storageKey || "";
        return {
          value: context.localStorage[key],
          sourceDesc: `LocalStorage.${key}`,
        };
      }

      case "formula": {
        return {
          value: descriptor.formulaExpression,
          sourceDesc: `Formula(${descriptor.formulaExpression})`,
        };
      }

      default:
        return { value: undefined, sourceDesc: "unknown" };
    }
  }

  /**
   * Infers the functional database/property category from a runtime value.
   */
  public inferValueCategory(val: unknown): {
    category: DatabasePropertyCategory;
    typeName: string;
  } {
    if (val === null || val === undefined) {
      return { category: "TEXTUAL_SCALAR", typeName: "null" };
    }

    if (Array.isArray(val)) {
      return { category: "RELATIONAL_COLLECTION", typeName: "Array" };
    }

    const t = typeof val;

    if (t === "boolean") {
      return { category: "BOOLEAN_FLAG", typeName: "Boolean" };
    }

    if (t === "number") {
      return { category: "NUMERIC", typeName: "Number" };
    }

    if (val instanceof Date) {
      return { category: "TEMPORAL", typeName: "DateTime" };
    }

    if (t === "string") {
      const s = val as string;
      // Date heuristic
      if (
        s.length >= 10 &&
        !isNaN(Date.parse(s)) &&
        /^\d{4}-\d{2}-\d{2}/.test(s)
      ) {
        return { category: "TEMPORAL", typeName: "DateTime" };
      }
      // URL heuristic
      if (
        s.startsWith("http://") ||
        s.startsWith("https://") ||
        s.startsWith("/") ||
        s.startsWith("data:image/") ||
        /\.(png|jpe?g|svg|webp|gif)$/i.test(s)
      ) {
        return { category: "MEDIA_URL", typeName: "MediaURL" };
      }
      return { category: "TEXTUAL_SCALAR", typeName: "String" };
    }

    if (t === "object") {
      return { category: "STRUCTURED_DOCUMENT", typeName: "Object/JSON" };
    }

    return { category: "TEXTUAL_SCALAR", typeName: t };
  }

  /**
   * Applies pure value transformation functions.
   */
  public applyTransform(
    value: unknown,
    transform: TransformFunctionType = "none"
  ): unknown {
    if (transform === "none" || value === undefined || value === null) {
      return value;
    }

    switch (transform) {
      case "currency_usd": {
        const num = Number(value);
        if (isNaN(num)) return value;
        return `$${num.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      }

      case "date_iso": {
        const d = new Date(value as string | number | Date);
        return isNaN(d.getTime()) ? value : d.toISOString();
      }

      case "date_localized": {
        const d = new Date(value as string | number | Date);
        return isNaN(d.getTime()) ? value : d.toLocaleDateString();
      }

      case "uppercase":
        return String(value).toUpperCase();

      case "lowercase":
        return String(value).toLowerCase();

      case "stringify":
        return typeof value === "object"
          ? JSON.stringify(value)
          : String(value);

      case "boolean_not":
        return !Boolean(value);

      case "number_round": {
        const n = Number(value);
        return isNaN(n) ? value : Math.round(n);
      }

      default:
        return value;
    }
  }

  /**
   * Validates and resolves a binding descriptor against a live DataContext.
   */
  public evaluateBinding(
    descriptor: DataBindingDescriptor,
    context: DataContext
  ): ResolvedBindingValue {
    const { target } = descriptor;
    const { value: rawVal, sourceDesc } = this.resolveRawValue(
      descriptor,
      context
    );

    // Look up archetype property rules
    const archetypeRules = ARCHETYPE_PROPERTY_BINDING_MATRIX[target.archetype];
    let rule: PropertyBindingRule | undefined;

    if (archetypeRules && archetypeRules[target.propertyKey]) {
      rule = archetypeRules[target.propertyKey];
    } else {
      rule = {
        propertyKey: target.propertyKey,
        allowedCategories: ["TEXTUAL_SCALAR", "NUMERIC"],
        description: "Generic element property",
        safeFallback: "",
      };
    }

    const effectiveFallback =
      descriptor.fallbackValue !== undefined
        ? descriptor.fallbackValue
        : rule.safeFallback;

    // If source is null or undefined, apply fallback cleanly without error
    if (rawVal === undefined || rawVal === null) {
      return {
        isValid: true,
        value: effectiveFallback,
        rawSourceValue: rawVal,
        fallbackApplied: true,
      };
    }

    // Infer category and verify legality
    const { category, typeName } = this.inferValueCategory(rawVal);
    const isAllowed = rule.allowedCategories.includes(category);

    if (!isAllowed) {
      // Intercept and report violation
      DiagnosticBus.reportBindingError(
        target,
        sourceDesc,
        typeName,
        rule.allowedCategories,
        effectiveFallback
      );

      return {
        isValid: false,
        value: effectiveFallback,
        rawSourceValue: rawVal,
        fallbackApplied: true,
        error: `Incompatible binding: ${sourceDesc} (${typeName}) not allowed for ${target.archetype}.${target.propertyKey}`,
      };
    }

    // Apply transformation
    const finalValue = this.applyTransform(rawVal, descriptor.transformFn);

    return {
      isValid: true,
      value: finalValue,
      rawSourceValue: rawVal,
    };
  }
}

export const DataBindingValidator = new DataBindingValidatorService();
