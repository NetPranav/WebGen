/**
 * ============================================================================
 * NODESCRIPT STANDARD LIBRARY & CANONICAL NAMING REGISTRY
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 5.5
 *
 * Defines the canonical 1:1 bidirectional mapping between visual registry node
 * identifiers and NodeScript standard library identifiers, enforcing build-time
 * parity across 100% of registered blueprint nodes.
 * ============================================================================
 */

import { getAllRegisteredNodes, NodeDefinition } from "@/core/types/node-registry";

export const NODESCRIPT_STDLIB_VERSION = "1.0.0";
export const SUPPORTED_NLS_VERSIONS = ["1.0", "1.0.0"];

/**
 * Canonical 1:1 bidirectional mapping table between runtime registry types
 * and textual NodeScript identifiers.
 */
export const CANONICAL_BUILTIN_MAP: Record<string, string> = {
  // Events
  "event/onClick": "Event.onClick",
  "event/onPageLoad": "Event.onPageLoad",
  "event/onSubmit": "Event.onSubmit",
  "event/onHover": "Event.onHover",
  "event/onTimer": "Event.onTimer",

  // Flow Control
  "flow/branch": "Flow.branch",
  "flow/reroute": "Flow.reroute",
  "flow/delay": "Flow.delay",
  "flow/forLoop": "Flow.forLoop",
  "flow/sequence": "Flow.sequence",

  // Variables
  "variables/get": "Variables.get",
  "variables/set": "Variables.set",

  // Database
  "database/query": "Database.query",
  "database/insert": "Database.insert",

  // API
  "api/request": "API.request",

  // Navigation
  "navigation/push": "Navigation.push",

  // Math
  "math/add": "Math.add",
  "math/compare": "Math.compare",

  // Utility
  "utility/printString": "Utility.printString",
  "utility/formatText": "Utility.formatText",
};

/**
 * Reverse mapping from canonical NodeScript name to runtime registry type.
 */
export const REVERSE_CANONICAL_MAP: Record<string, string> = Object.entries(
  CANONICAL_BUILTIN_MAP
).reduce((acc, [reg, canonical]) => {
  acc[canonical] = reg;
  return acc;
}, {} as Record<string, string>);

/**
 * Converts a registry type identifier (e.g. "event/onClick") to its
 * canonical NodeScript name (e.g. "Event.onClick").
 */
export function toCanonicalNodeName(registryType: string): string {
  if (CANONICAL_BUILTIN_MAP[registryType]) {
    return CANONICAL_BUILTIN_MAP[registryType];
  }

  // Dynamic fallback for plugin/custom nodes (e.g. "stripe/charge" -> "Stripe.charge")
  if (registryType.includes("/")) {
    const [ns, name] = registryType.split("/");
    const capitalizedNs = ns.charAt(0).toUpperCase() + ns.slice(1);
    return `${capitalizedNs}.${name}`;
  }

  return registryType;
}

/**
 * Converts a canonical NodeScript name (e.g. "Event.onClick") to its
 * runtime registry type identifier (e.g. "event/onClick").
 */
export function toRegistryNodeType(canonicalName: string): string {
  if (REVERSE_CANONICAL_MAP[canonicalName]) {
    return REVERSE_CANONICAL_MAP[canonicalName];
  }

  // Reverse dynamic fallback (e.g. "Stripe.charge" -> "stripe/charge")
  if (canonicalName.includes(".")) {
    const [ns, name] = canonicalName.split(".");
    return `${ns.toLowerCase()}/${name}`;
  }

  return canonicalName;
}

export interface StandardLibraryParityReport {
  isParityComplete: boolean;
  totalNodes: number;
  canonicalNames: string[];
  unmappedTypes: string[];
  duplicateNames: string[];
}

/**
 * Build-time lint rule verifying that every node in the registry has
 * exactly one canonical NodeScript name with zero unmapped nodes or collisions.
 */
export function verifyStandardLibraryParity(): StandardLibraryParityReport {
  const allNodes = getAllRegisteredNodes();
  const allTypes = Object.keys(allNodes);

  const unmappedTypes: string[] = [];
  const nameCounts = new Map<string, number>();
  const canonicalNames: string[] = [];

  for (const type of allTypes) {
    const canonical = toCanonicalNodeName(type);
    canonicalNames.push(canonical);

    // Verify reverse resolvable
    const reverse = toRegistryNodeType(canonical);
    if (reverse !== type && !CANONICAL_BUILTIN_MAP[type]) {
      unmappedTypes.push(type);
    }

    nameCounts.set(canonical, (nameCounts.get(canonical) || 0) + 1);
  }

  const duplicateNames: string[] = [];
  for (const [name, count] of nameCounts.entries()) {
    if (count > 1) {
      duplicateNames.push(name);
    }
  }

  return {
    isParityComplete: unmappedTypes.length === 0 && duplicateNames.length === 0,
    totalNodes: allTypes.length,
    canonicalNames,
    unmappedTypes,
    duplicateNames,
  };
}

/**
 * Validates the `#nls-version: <version>` header directive.
 */
export function validateSchemaVersion(headerText: string): {
  isValid: boolean;
  version?: string;
  error?: string;
} {
  const match = headerText.match(/^\s*#nls-version:\s*([0-9.]+)/m);
  if (!match) {
    return {
      isValid: false,
      error: "Missing required '#nls-version: 1.0' header directive.",
    };
  }

  const version = match[1];
  if (!SUPPORTED_NLS_VERSIONS.includes(version)) {
    return {
      isValid: false,
      version,
      error: `Unsupported NodeScript schema version '${version}'. Supported: ${SUPPORTED_NLS_VERSIONS.join(", ")}`,
    };
  }

  return {
    isValid: true,
    version,
  };
}
