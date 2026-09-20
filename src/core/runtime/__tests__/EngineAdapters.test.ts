import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  synthesizeSingleTransformMatrix,
  CssCompositorAdapter,
  FramerMotionAdapter,
  GsapEngineAdapter,
  EngineAdapterManager,
  engineAdapterManager,
} from "../EngineAdapters";
import { AnimationBinding } from "../../types/element-grammar";

describe("Engine Adapters & Single Transform Authority (STA)", () => {
  describe("synthesizeSingleTransformMatrix", () => {
    it("returns 'none' for empty or zero components", () => {
      assert.equal(synthesizeSingleTransformMatrix({}), "none");
      assert.equal(
        synthesizeSingleTransformMatrix({ x: "0px", y: "0px", z: "0px", scale: 1, rotate: 0 }),
        "none"
      );
    });

    it("synthesizes canonical translate3d, rotate, and scale string", () => {
      const result = synthesizeSingleTransformMatrix({
        x: "10px",
        y: "20px",
        scale: 1.05,
        rotate: 45,
      });
      assert.ok(result.includes("translate3d(10px, 20px, 0px)"));
      assert.ok(result.includes("rotate(45deg)"));
      assert.ok(result.includes("scale(1.05, 1.05)"));
    });

    it("handles 3D rotations and non-uniform scaling", () => {
      const result = synthesizeSingleTransformMatrix({
        x: "0px",
        y: "5px",
        z: "12px",
        scaleX: 1.2,
        scaleY: 0.9,
        rotateX: 15,
        rotateY: -30,
      });
      assert.ok(result.includes("translate3d(0px, 5px, 12px)"));
      assert.ok(result.includes("rotateX(15deg)"));
      assert.ok(result.includes("rotateY(-30deg)"));
      assert.ok(result.includes("scale(1.2, 0.9)"));
    });
  });

  describe("CssCompositorAdapter (Target A: Zero-Dependency Web)", () => {
    const adapter = new CssCompositorAdapter();

    it("verifies single transform authority is respected", () => {
      assert.equal(adapter.respectsSingleTransformAuthority(), true);
      assert.equal(adapter.target, "zero-dependency-web");
    });

    it("supports only GPU compositor and paint properties", () => {
      assert.equal(adapter.supportsProperty("transform.y"), true);
      assert.equal(adapter.supportsProperty("opacity"), true);
      assert.equal(adapter.supportsProperty("filter.blur"), true);
      assert.equal(adapter.supportsProperty("width"), false);
      assert.equal(adapter.supportsProperty("marginTop"), false);
    });

    it("strips transition: all on element to prevent reflow collisions", () => {
      const mockElement = {
        style: {
          transition: "all 0.3s ease",
          transform: "",
          opacity: "",
          filter: "",
          backgroundColor: "",
        },
      } as unknown as HTMLElement;

      const bindings: AnimationBinding[] = [
        {
          id: "b1",
          targetElementId: "el1",
          category: "Entrance",
          trigger: "OnLoad",
          properties: ["transform.y", "opacity"],
          priority: 6,
        },
      ];

      adapter.apply(mockElement, bindings, 1.0, false);
      assert.ok(!mockElement.style.transition.includes("all"));
      assert.ok(mockElement.style.transition.includes("transform, opacity"));
      assert.ok(mockElement.style.transform.length > 0);
    });

    it("applies reduced motion fallback by stripping transforms", () => {
      const bindings: AnimationBinding[] = [
        {
          id: "b1",
          targetElementId: "el1",
          category: "Entrance",
          trigger: "OnLoad",
          properties: ["transform.y", "transform.scale"],
          priority: 6,
        },
      ];

      const patch = adapter.apply(null, bindings, 1.0, true);
      assert.equal(patch.transform, undefined);
      assert.equal(patch.opacity, "1");
    });
  });

  describe("FramerMotionAdapter (Target B)", () => {
    const adapter = new FramerMotionAdapter();

    it("generates correct initial, animate, and gesture props", () => {
      const bindings: AnimationBinding[] = [
        {
          id: "b1",
          targetElementId: "btn",
          category: "Entrance",
          trigger: "OnLoad",
          properties: ["transform.y", "opacity"],
          priority: 6,
        },
        {
          id: "b2",
          targetElementId: "btn",
          category: "Hover",
          trigger: "OnHoverEnter",
          properties: ["transform.scale"],
          priority: 3,
        },
        {
          id: "b3",
          targetElementId: "btn",
          category: "Press",
          trigger: "OnPress",
          properties: ["transform.scale"],
          priority: 2,
        },
      ];

      const props = adapter.generateMotionProps(bindings);
      assert.deepEqual(props.initial, { opacity: 0, y: 20 });
      assert.deepEqual(props.animate, { opacity: 1, y: 0 });
      assert.deepEqual(props.whileHover, { scale: 1.05 });
      assert.deepEqual(props.whileTap, { scale: 0.95 });
    });
  });

  describe("GsapEngineAdapter (Target C: Studio Authoring)", () => {
    const adapter = new GsapEngineAdapter();

    it("evaluates continuous time keyframes into transform matrices", () => {
      const bindings: AnimationBinding[] = [
        {
          id: "b_rot",
          targetElementId: "dial",
          category: "Ambient",
          trigger: "Ambient",
          properties: ["transform.rotate", "opacity"],
          priority: 8,
        },
      ];

      const patch = adapter.apply(null, bindings, 2.0, false);
      assert.ok(patch.transform?.includes("rotate(90deg)"));
      assert.equal(patch.opacity, "1");
    });
  });

  describe("EngineAdapterManager", () => {
    it("routes to appropriate adapter and unifies styles", () => {
      const manager = new EngineAdapterManager();
      const cssAdapter = manager.getAdapter("zero-dependency-web");
      assert.equal(cssAdapter.name, "CssCompositor");

      const motionAdapter = manager.getAdapter("framer-motion");
      assert.equal(motionAdapter.name, "FramerMotion");

      const gsapAdapter = manager.getAdapter("gsap");
      assert.equal(gsapAdapter.name, "GsapEngine");

      const bindings: AnimationBinding[] = [
        {
          id: "b1",
          targetElementId: "card",
          category: "Entrance",
          trigger: "OnLoad",
          properties: ["transform.y", "opacity"],
          priority: 6,
        },
      ];

      // Respects OS reduced motion
      const reducedPatch = manager.applyUnifiedStyles(
        null,
        bindings,
        0,
        "zero-dependency-web",
        "respect-os",
        true
      );
      assert.equal(reducedPatch.opacity, "1");
      assert.equal(reducedPatch.transform, undefined);
    });
  });
});
