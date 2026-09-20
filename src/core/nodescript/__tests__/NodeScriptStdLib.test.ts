import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  verifyStandardLibraryParity,
  toCanonicalNodeName,
  toRegistryNodeType,
  validateSchemaVersion,
  CANONICAL_BUILTIN_MAP,
} from "../stdlib";
import { getAllRegisteredNodes } from "@/core/types/node-registry";

describe("Sub-Phase 5.5: NodeScript Standard Library Reference & Build-Time Parity", () => {
  // --------------------------------------------------------------------------
  // 1. Build-Time Parity Lint Rule
  // --------------------------------------------------------------------------
  it("should verify that 100% of registered blueprint nodes have a canonical NodeScript name", () => {
    const report = verifyStandardLibraryParity();

    assert.strictEqual(
      report.isParityComplete,
      true,
      `Standard library parity failed with unmapped types: ${report.unmappedTypes.join(", ")}`
    );
    assert.strictEqual(report.unmappedTypes.length, 0, "No node types may be unmapped");
    assert.strictEqual(report.duplicateNames.length, 0, "No duplicate canonical names allowed");
    assert.ok(report.totalNodes >= 20, "Should verify at least 20 built-in nodes");
  });

  // --------------------------------------------------------------------------
  // 2. Bidirectional Mapping Round-Trip
  // --------------------------------------------------------------------------
  it("should round-trip bidirectional node names between registry ID and canonical name", () => {
    const allNodes = getAllRegisteredNodes();

    for (const type of Object.keys(allNodes)) {
      const canonical = toCanonicalNodeName(type);
      assert.ok(canonical, `Canonical name for '${type}' must exist`);
      assert.ok(!canonical.includes("/"), `Canonical name '${canonical}' must not contain slashes`);

      const reversed = toRegistryNodeType(canonical);
      assert.strictEqual(
        reversed,
        type,
        `Reversed mapping for '${canonical}' must match original type '${type}'`
      );
    }
  });

  // --------------------------------------------------------------------------
  // 3. Specific Canonical Name Sanity Checks
  // --------------------------------------------------------------------------
  it("should map core categories to canonical PascalCase.camelCase names", () => {
    assert.strictEqual(toCanonicalNodeName("event/onClick"), "Event.onClick");
    assert.strictEqual(toCanonicalNodeName("flow/branch"), "Flow.branch");
    assert.strictEqual(toCanonicalNodeName("variables/get"), "Variables.get");
    assert.strictEqual(toCanonicalNodeName("database/query"), "Database.query");
    assert.strictEqual(toCanonicalNodeName("api/request"), "API.request");
    assert.strictEqual(toCanonicalNodeName("navigation/push"), "Navigation.push");
    assert.strictEqual(toCanonicalNodeName("math/add"), "Math.add");
    assert.strictEqual(toCanonicalNodeName("utility/printString"), "Utility.printString");
  });

  // --------------------------------------------------------------------------
  // 4. Schema Version Header Directive Validation
  // --------------------------------------------------------------------------
  it("should accept valid #nls-version: 1.0 schema directive", () => {
    const header = "#nls-version: 1.0\ngraph Test {}";
    const result = validateSchemaVersion(header);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.version, "1.0");
  });

  it("should reject missing #nls-version directive", () => {
    const header = "graph Test {}";
    const result = validateSchemaVersion(header);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.error?.includes("Missing required"));
  });

  it("should reject unsupported schema versions", () => {
    const header = "#nls-version: 99.0\ngraph Test {}";
    const result = validateSchemaVersion(header);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.error?.includes("Unsupported NodeScript schema version"));
  });
});
