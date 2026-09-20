import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isSvgElementType,
  SVG_ELEMENT_TYPES,
  parseViewBox,
  formatViewBox,
  validateSvgPathData,
  parseSvgPathCommands,
} from "../svg";
import {
  ARCHETYPE_PROPERTY_BINDING_MATRIX,
  DatabasePropertyCategory,
} from "../database";
import { ARCHETYPE_ANIMATION_COMPATIBILITY } from "../animations";
import { DataBindingValidator } from "@/core/engine/DataBindingValidator";
import { DiagnosticBus } from "@/core/engine/DiagnosticBus";
import { DataBindingDescriptor, DataContext } from "../data-binding";

describe("Sub-Phase 7.1: SVG Element Archetype & Path Data Model", () => {
  describe("1. Archetype Identification & Type Guards", () => {
    it("recognizes all standard SVG element archetypes", () => {
      assert.deepStrictEqual([...SVG_ELEMENT_TYPES], [
        "svgPath",
        "svgGroup",
        "svgUse",
        "svgText",
      ]);

      assert.strictEqual(isSvgElementType("svgPath"), true);
      assert.strictEqual(isSvgElementType("svgGroup"), true);
      assert.strictEqual(isSvgElementType("svgUse"), true);
      assert.strictEqual(isSvgElementType("svgText"), true);
      assert.strictEqual(isSvgElementType("button"), false);
      assert.strictEqual(isSvgElementType("container"), false);
    });
  });

  describe("2. ViewBox Parsing & Serialization", () => {
    it("parses valid space- and comma-delimited viewBox strings", () => {
      const parsed1 = parseViewBox("0 0 800 600");
      assert.deepStrictEqual(parsed1, { minX: 0, minY: 0, width: 800, height: 600 });

      const parsed2 = parseViewBox("-10, -20, 200, 150");
      assert.deepStrictEqual(parsed2, { minX: -10, minY: -20, width: 200, height: 150 });
    });

    it("returns null for malformed viewBox strings", () => {
      assert.strictEqual(parseViewBox("invalid"), null);
      assert.strictEqual(parseViewBox("0 0 100"), null);
      assert.strictEqual(parseViewBox(""), null);
    });

    it("formats SVGViewBox object to standard string representation", () => {
      const str = formatViewBox({ minX: 0, minY: 0, width: 1024, height: 768 });
      assert.strictEqual(str, "0 0 1024 768");
    });
  });

  describe("3. Path Data Validation & Command Parsing", () => {
    it("validates well-formed SVG path d strings", () => {
      const validD = "M 10 80 Q 52.5 10, 95 80 T 180 80 Z";
      const result = validateSvgPathData(validD);
      assert.strictEqual(result.isValid, true);
    });

    it("rejects path d strings that do not begin with MoveTo", () => {
      const invalidD = "L 10 20 Z";
      const result = validateSvgPathData(invalidD);
      assert.strictEqual(result.isValid, false);
      assert.match(result.error || "", /MoveTo/i);
    });

    it("rejects path d strings containing invalid characters", () => {
      const invalidD = "M 10 20 <script>alert(1)</script> Z";
      const result = validateSvgPathData(invalidD);
      assert.strictEqual(result.isValid, false);
      assert.match(result.error || "", /Invalid character/i);
    });

    it("parses path d string into structured SVGPathCommands", () => {
      const d = "M 0 0 L 100 200 C 10 20 30 40 50 60 Z";
      const commands = parseSvgPathCommands(d);

      assert.strictEqual(commands.length, 4);
      assert.strictEqual(commands[0].type, "M");
      assert.deepStrictEqual(commands[0].params, [0, 0]);

      assert.strictEqual(commands[1].type, "L");
      assert.deepStrictEqual(commands[1].params, [100, 200]);

      assert.strictEqual(commands[2].type, "C");
      assert.deepStrictEqual(commands[2].params, [10, 20, 30, 40, 50, 60]);

      assert.strictEqual(commands[3].type, "Z");
      assert.deepStrictEqual(commands[3].params, []);
    });
  });

  describe("4. ArchetypePropertyBindingMatrix Compatibility", () => {
    it("defines property binding rules for svgPath with PATH_DATA and TEXTUAL_SCALAR", () => {
      const pathRules = ARCHETYPE_PROPERTY_BINDING_MATRIX.svgPath;
      assert.ok(pathRules, "svgPath must be defined in binding matrix");

      // d attribute
      assert.ok(pathRules.d, "d attribute must be registered");
      assert.deepStrictEqual(pathRules.d.allowedCategories, ["PATH_DATA", "TEXTUAL_SCALAR"]);

      // stroke and fill
      assert.ok(pathRules.stroke);
      assert.ok(pathRules.fill);
      assert.ok(pathRules.strokeWidth);
      assert.ok(pathRules.strokeDashoffset);
    });

    it("defines property binding rules for svgGroup, svgUse, and svgText", () => {
      assert.ok(ARCHETYPE_PROPERTY_BINDING_MATRIX.svgGroup.transform);
      assert.ok(ARCHETYPE_PROPERTY_BINDING_MATRIX.svgUse.href);
      assert.ok(ARCHETYPE_PROPERTY_BINDING_MATRIX.svgText.text);
    });
  });

  describe("5. Archetype Animation Compatibility Matrix", () => {
    it("allows transform, opacity, color and blur on svgPath while disallowing text letterSpacing", () => {
      const rule = ARCHETYPE_ANIMATION_COMPATIBILITY.svgPath;
      assert.ok(rule);
      assert.ok(rule.allowedTracks.includes("opacity"));
      assert.ok(rule.allowedTracks.includes("scale"));
      assert.ok(rule.disallowedTracks["letterSpacing"]);
    });
  });

  describe("6. Trapping Relational Array Binding on svgPath.d (Zero New Validators)", () => {
    it("traps assigning a relational array to svgPath.d via existing DataBindingValidator", () => {
      let trappedEvent: unknown = null;
      const unsubscribe = DiagnosticBus.subscribeChannel("BIND_ERR", (event) => {
        trappedEvent = event;
      });

      const mockContext: DataContext = {
        database: {
          users: [
            { id: "u_1", name: "Alice", role: "Admin" },
            { id: "u_2", name: "Bob", role: "Member" },
          ],
        },
        stateVariables: {
          userList: [
            { id: "u_1", name: "Alice" },
            { id: "u_2", name: "Bob" },
          ],
        },
        urlParams: {},
        localStorage: {},
      };

      // Attempt to bind relational array to svgPath.d
      const illegalDescriptor: DataBindingDescriptor = {
        id: "binding_rel_to_svg_path",
        target: {
          elementId: "path_element_1",
          archetype: "svgPath",
          propertyKey: "d",
        },
        sourceType: "state_variable",
        stateVariableId: "userList",
      };

      const result = DataBindingValidator.evaluateBinding(illegalDescriptor, mockContext);

      unsubscribe();

      // Verification: Trapped cleanly by existing validator
      assert.strictEqual(result.isValid, false, "Must mark assignment invalid");
      assert.strictEqual(result.fallbackApplied, true, "Must apply safe fallback value");
      assert.strictEqual(result.value, "M0,0 L10,10 Z", "Must apply svgPath.d safeFallback");
      assert.match(result.error || "", /not allowed for svgPath\.d/);

      // Verify diagnostic was dispatched to bus
      assert.ok(trappedEvent, "Must dispatch [BIND_ERR] diagnostic event to bus");
    });

    it("successfully binds valid path data string to svgPath.d", () => {
      const mockContext: DataContext = {
        database: {},
        stateVariables: {
          activeIconPath: "M 10 10 H 90 V 90 H 10 L 10 10 Z",
        },
        urlParams: {},
        localStorage: {},
      };

      const validDescriptor: DataBindingDescriptor = {
        id: "binding_path_to_svg_d",
        target: {
          elementId: "path_element_1",
          archetype: "svgPath",
          propertyKey: "d",
        },
        sourceType: "state_variable",
        stateVariableId: "activeIconPath",
      };

      const result = DataBindingValidator.evaluateBinding(validDescriptor, mockContext);

      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.value, "M 10 10 H 90 V 90 H 10 L 10 10 Z");
      assert.strictEqual(result.fallbackApplied, undefined);
    });
  });
});
