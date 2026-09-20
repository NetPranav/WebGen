/**
 * ============================================================================
 * NODESCRIPT SERIALIZER & AST CODE EMITTER
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 5.2
 *
 * Emits canonical, diff-friendly, deterministic .nls textual IR from an
 * in-memory BlueprintGraph AST. Enforces stable node and wire ordering to
 * guarantee that equivalent visual graphs produce identical text diffs.
 * ============================================================================
 */

import {
  BlueprintGraph,
  BlueprintNodeInstance,
  BlueprintVariable,
  BlueprintWire,
} from "@/core/ast/ASTManager";
import { NodeScriptReference } from "./types";

export interface SerializerOptions {
  /** If true, emits the #nls-version: 1.0 header directive (default: true) */
  includeHeader?: boolean;
  /** Schema version to output in header directive (default: "1.0") */
  schemaVersion?: string;
  /** If true, emits @pos(x, y) coordinates for nodes (default: true) */
  includePositions?: boolean;
}

export class NodeScriptSerializer {
  /**
   * Serializes a BlueprintGraph AST to a formatted, deterministic .nls string.
   */
  public static serialize(
    graph: BlueprintGraph,
    options: SerializerOptions = {}
  ): string {
    const opts: Required<SerializerOptions> = {
      includeHeader: options.includeHeader ?? true,
      schemaVersion: options.schemaVersion ?? "1.0",
      includePositions: options.includePositions ?? true,
    };

    const lines: string[] = [];

    // 1. Header Directive
    if (opts.includeHeader) {
      lines.push(`#nls-version: ${opts.schemaVersion}`);
      lines.push("");
    }

    // 2. Graph Declaration
    const typeModifier =
      graph.type && graph.type !== "event" ? `(type: ${graph.type}) ` : "";
    lines.push(`graph ${graph.name} ${typeModifier}{`.replace(/\s+/g, " ").trim());

    let hasBodyContent = false;

    // 3. Variables (Sorted Alphabetically by Name)
    if (graph.variables && graph.variables.length > 0) {
      const sortedVars = [...graph.variables].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      for (const v of sortedVars) {
        lines.push(`  variable ${v.name} : ${v.type} = ${this.formatValue(v.defaultValue)}`);
        hasBodyContent = true;
      }
    }

    // 4. Nodes (Sorted by Position X, then Y, then ID)
    const nodeEntries = Object.values(graph.nodes || {});
    if (nodeEntries.length > 0) {
      if (hasBodyContent) lines.push("");

      const sortedNodes = [...nodeEntries].sort((a, b) => {
        if (a.position && b.position) {
          if (a.position.x !== b.position.x) return a.position.x - b.position.x;
          if (a.position.y !== b.position.y) return a.position.y - b.position.y;
        }
        return a.id.localeCompare(b.id);
      });

      for (const node of sortedNodes) {
        lines.push(`  ${this.formatNode(node, opts.includePositions)}`);
        hasBodyContent = true;
      }
    }

    // 5. Wires (Sorted by Source Node, Source Pin, Target Node, Target Pin)
    if (graph.wires && graph.wires.length > 0) {
      if (hasBodyContent) lines.push("");

      const sortedWires = [...graph.wires].sort((a, b) => {
        if (a.sourceNodeId !== b.sourceNodeId)
          return a.sourceNodeId.localeCompare(b.sourceNodeId);
        if (a.sourcePinId !== b.sourcePinId)
          return a.sourcePinId.localeCompare(b.sourcePinId);
        if (a.targetNodeId !== b.targetNodeId)
          return a.targetNodeId.localeCompare(b.targetNodeId);
        return a.targetPinId.localeCompare(b.targetPinId);
      });

      for (const wire of sortedWires) {
        lines.push(`  ${this.formatWire(wire)}`);
      }
    }

    lines.push("}");
    return lines.join("\n") + "\n";
  }

  // --------------------------------------------------------------------------
  // Formatting Helpers
  // --------------------------------------------------------------------------

  private static formatNode(
    node: BlueprintNodeInstance,
    includePositions: boolean
  ): string {
    const alias = node.id;
    const type = node.type;

    // Parameters
    const params = node.customParams || node.pinValues || {};
    const paramEntries = Object.entries(params);
    let paramsStr = "";

    if (paramEntries.length > 0) {
      // Sort parameter keys alphabetically for diff stability
      paramEntries.sort(([k1], [k2]) => k1.localeCompare(k2));
      const formatted = paramEntries
        .map(([k, v]) => `${k}: ${this.formatValue(v)}`)
        .join(", ");
      paramsStr = `(${formatted})`;
    }

    // Position annotation
    let posStr = "";
    if (includePositions && node.position) {
      posStr = ` @pos(${Math.round(node.position.x)}, ${Math.round(node.position.y)})`;
    }

    return `node ${alias} : ${type}${paramsStr}${posStr}`;
  }

  private static formatWire(wire: BlueprintWire): string {
    let wireStr = `wire ${wire.sourceNodeId}.${wire.sourcePinId} -> ${wire.targetNodeId}.${wire.targetPinId}`;

    const whenCondition = (wire as unknown as Record<string, unknown>)["when"];
    if (whenCondition && typeof whenCondition === "string" && whenCondition.trim()) {
      wireStr += ` [when: ${whenCondition.trim()}]`;
    }

    return wireStr;
  }

  private static formatValue(val: unknown): string {
    if (val === null || val === undefined) {
      return "null";
    }

    if (typeof val === "boolean") {
      return val ? "true" : "false";
    }

    if (typeof val === "number") {
      return Number.isFinite(val) ? String(val) : "0";
    }

    if (typeof val === "string") {
      // Escape internal double quotes and newlines
      const escaped = val
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\t/g, "\\t");
      return `"${escaped}"`;
    }

    // Check for $reference expression
    if (
      typeof val === "object" &&
      val !== null &&
      (val as Record<string, unknown>)["__ref"] === true
    ) {
      const ref = val as NodeScriptReference;
      return `$${ref.node}.${ref.pin}`;
    }

    if (Array.isArray(val)) {
      const elements = val.map((v) => this.formatValue(v)).join(", ");
      return `[${elements}]`;
    }

    if (typeof val === "object") {
      const keys = Object.keys(val as Record<string, unknown>).sort();
      const entries = keys.map(
        (k) => `${k}: ${this.formatValue((val as Record<string, unknown>)[k])}`
      );
      return `{ ${entries.join(", ")} }`;
    }

    return String(val);
  }
}
