import { test } from "node:test";
import assert from "node:assert/strict";
import { ThreeSceneEmitter } from "../ThreeSceneEmitter";
import type { Layer } from "@/core/document/schema";

test("Sub-Phase 8.5 Verification Gate: Zero 3D content produces zero Three.js code (tree-shaking guaranteed)", () => {
  const elements2DOnly: Record<string, Layer> = {
    btn_1: {
      id: "btn_1",
      name: "PrimaryButton",
      archetype: "button",
      parentId: null,
      children: [],
      properties: { textContent: "Click Me" },
    },
    cont_1: {
      id: "cont_1",
      name: "MainContainer",
      archetype: "container",
      parentId: null,
      children: ["btn_1"],
      properties: { padding: 16 },
    },
  };

  const emitted = ThreeSceneEmitter.emit(elements2DOnly);

  assert.equal(emitted.has3DContent, false);
  assert.equal(emitted.code, "");
  assert.equal(emitted.requiredPackages.length, 0);
  assert.equal(emitted.isLiteMode, false);
});

test("ThreeSceneEmitter: Emits declarative React-Three-Fiber (R3F) JSX with meshes, cameras, and lights", () => {
  const elements3D: Record<string, Layer> = {
    cam_main: {
      id: "cam_main",
      name: "SceneCamera",
      archetype: "camera3D",
      parentId: null,
      children: [],
      properties: {
        fov: 75,
        near: 0.1,
        far: 500,
      },
    },
    sun_dir: {
      id: "sun_dir",
      name: "Sunlight",
      archetype: "light3D",
      parentId: null,
      children: [],
      properties: {
        lightType: "directional",
        color: "#fef08a",
        intensity: 1.5,
        castShadow: true,
      },
    },
    mesh_cube: {
      id: "mesh_cube",
      name: "HeroCube",
      archetype: "object3D",
      parentId: null,
      children: [],
      properties: {
        position3D: [0, 1, 0],
        scale3D: [2, 2, 2],
        geometry: {
          type: "box",
          dimensions: [2, 2, 2],
        },
        material: {
          color: "#6366f1",
          roughness: 0.2,
          metalness: 0.8,
          wireframe: false,
        },
        castShadow: true,
      },
    },
  };

  const emitted = ThreeSceneEmitter.emit(elements3D, {
    componentName: "Hero3DCanvas",
    enableOrbitControls: true,
  });

  assert.equal(emitted.has3DContent, true);
  assert.equal(emitted.isLiteMode, false);
  assert.ok(emitted.requiredPackages.includes("three"));
  assert.ok(emitted.requiredPackages.includes("@react-three/fiber"));
  assert.ok(emitted.requiredPackages.includes("@react-three/drei"));

  // Verify JSX contents
  assert.match(emitted.code, /export const Hero3DCanvas: React.FC/);
  assert.match(emitted.code, /<Canvas shadows camera=\{\{ fov: 75, near: 0.1, far: 500/);
  assert.match(emitted.code, /<OrbitControls makeDefault \/>/);
  assert.match(emitted.code, /<directionalLight color="#fef08a" intensity=\{1.5\}/);
  assert.match(emitted.code, /<mesh position=\{\[0, 1, 0\]\} scale=\{\[2, 2, 2\]\} castShadow>/);
  assert.match(emitted.code, /<boxGeometry args=\{\[2, 2, 2\]\} \/>/);
  assert.match(emitted.code, /<meshStandardMaterial color="#6366f1" roughness=\{0.2\} metalness=\{0.8\} \/>/);
});

test("ThreeSceneEmitter: Emits Lite Mode CSS 3D transforms without external bundle weight", () => {
  const elements3D: Record<string, Layer> = {
    card3d: {
      id: "card3d",
      name: "FloatingCard3D",
      archetype: "object3D",
      parentId: null,
      children: [],
      properties: {
        position3D: [20, 40, -100],
        scale3D: [1.2, 1.2, 1],
        material: {
          color: "#ec4899",
        },
      },
    },
  };

  const emitted = ThreeSceneEmitter.emit(elements3D, {
    mode: "lite",
    componentName: "LiteCard3D",
  });

  assert.equal(emitted.has3DContent, true);
  assert.equal(emitted.isLiteMode, true);
  assert.equal(emitted.requiredPackages.length, 0); // zero bundle dependencies

  // Verify CSS 3D transforms
  assert.match(emitted.code, /perspective: "1000px"/);
  assert.match(emitted.code, /transformStyle: "preserve-3d"/);
  assert.match(emitted.code, /translate3d\(20px, 40px, -100px\) scale3d\(1.2, 1.2, 1\)/);
  assert.match(emitted.code, /backgroundColor: "#ec4899"/);
});
