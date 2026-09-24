"use client";

/**
 * ============================================================================
 * REACT-THREE-FIBER & WEBGL 3D PRODUCTION EMITTER
 * ============================================================================
 * Compiles visual 3D scene graphs into declarative React-Three-Fiber (R3F) JSX,
 * complete with Canvas, cameras, lights, PBR materials, and geometry primitives.
 * Includes "Lite Mode" zero-bundle CSS 3D transform fallback and tree-shaking gates.
 * Architecture Ref: ROADMAP.md §Phase 8 (Sub-Phase 8.5)
 * ============================================================================
 */

import { ProjectElement } from "@/core/store/useProjectStore";
import {
  Object3DProperties,
  Camera3DProperties,
  Light3DProperties,
  DEFAULT_OBJECT3D_PROPERTIES,
  DEFAULT_CAMERA3D_PROPERTIES,
  DEFAULT_LIGHT3D_PROPERTIES,
} from "@/core/types/scene3d";
import { Scene3DEngine } from "@/core/engine/Scene3DEngine";

export interface ThreeSceneEmitterOptions {
  mode?: "r3f" | "lite"; // "r3f" uses React-Three-Fiber, "lite" emits pure CSS 3D transforms
  componentName?: string;
  enableShadows?: boolean;
  enableOrbitControls?: boolean;
  canvasHeight?: string;
}

export interface EmittedThreeScene {
  has3DContent: boolean;
  isLiteMode: boolean;
  code: string;
  requiredPackages: string[];
}

export class ThreeSceneEmitter {
  /**
   * Checks if an element is a 3D archetype.
   */
  public static is3DElement(element: ProjectElement): boolean {
    return (
      element.archetype === "object3D" ||
      element.archetype === "camera3D" ||
      element.archetype === "light3D"
    );
  }

  /**
   * Extracts all 3D elements from an element registry.
   */
  public static filter3DElements(
    elements: Record<string, ProjectElement>
  ): ProjectElement[] {
    return Object.values(elements).filter((el) => this.is3DElement(el));
  }

  /**
   * Compiles the 3D scene graph into production JSX.
   * If zero 3D elements exist, returns has3DContent=false and code="", guaranteeing zero Three.js weight.
   */
  public static emit(
    elements: Record<string, ProjectElement>,
    options: ThreeSceneEmitterOptions = {}
  ): EmittedThreeScene {
    const all3D = this.filter3DElements(elements);

    // Tree-shaking guarantee: Zero 3D elements produces zero Three.js code
    if (all3D.length === 0) {
      return {
        has3DContent: false,
        isLiteMode: false,
        code: "",
        requiredPackages: [],
      };
    }

    const mode = options.mode || "r3f";
    const componentName = options.componentName || "Scene3DCanvas";

    if (mode === "lite") {
      return {
        has3DContent: true,
        isLiteMode: true,
        code: this.emitLiteCss3D(all3D, componentName),
        requiredPackages: [], // zero external dependencies in lite mode
      };
    }

    return {
      has3DContent: true,
      isLiteMode: false,
      code: this.emitR3F(all3D, elements, componentName, options),
      requiredPackages: ["three", "@react-three/fiber", "@react-three/drei"],
    };
  }

  /**
   * Emits "Lite Mode" pure CSS 3D transforms without Three.js bundle weight.
   */
  private static emitLiteCss3D(
    elements: ProjectElement[],
    componentName: string
  ): string {
    const lines: string[] = [];
    lines.push('"use client";');
    lines.push('import React from "react";');
    lines.push("");
    lines.push(`export const ${componentName}: React.FC = () => {`);
    lines.push('  return (');
    lines.push('    <div style={{ perspective: "1000px", width: "100%", height: "100%", position: "relative" }}>');
    lines.push('      <div style={{ transformStyle: "preserve-3d", width: "100%", height: "100%" }}>');

    for (const el of elements) {
      if (el.archetype !== "object3D") continue;
      const props = (el.properties || {}) as Partial<Object3DProperties>;
      const pos = props.position3D || DEFAULT_OBJECT3D_PROPERTIES.position3D;
      const scl = props.scale3D || DEFAULT_OBJECT3D_PROPERTIES.scale3D;
      const col = props.material?.color || "#4f46e5";

      const transformStr = `translate3d(${pos[0]}px, ${pos[1]}px, ${pos[2]}px) scale3d(${scl[0]}, ${scl[1]}, ${scl[2]})`;

      lines.push(`        {/* ${el.name} (CSS 3D Lite) */}`);
      lines.push(
        `        <div key="${el.id}" style={{ position: "absolute", transform: "${transformStr}", backgroundColor: "${col}", width: 100, height: 100, borderRadius: 8 }} />`
      );
    }

    lines.push("      </div>");
    lines.push("    </div>");
    lines.push("  );");
    lines.push("};");

    return lines.join("\n");
  }

  /**
   * Emits declarative React-Three-Fiber JSX.
   */
  private static emitR3F(
    all3D: ProjectElement[],
    allElements: Record<string, ProjectElement>,
    componentName: string,
    options: ThreeSceneEmitterOptions
  ): string {
    const cameraEl = all3D.find((el) => el.archetype === "camera3D");
    const camProps = ((cameraEl?.properties || {}) as Partial<Camera3DProperties>) || DEFAULT_CAMERA3D_PROPERTIES;
    const fov = camProps.fov ?? 60;
    const near = camProps.near ?? 0.1;
    const far = camProps.far ?? 1000;

    const hasGltf = all3D.some((el) => {
      const g = (el.properties?.geometry as { type?: string } | undefined)?.type;
      return g === "gltf";
    });

    const lines: string[] = [];
    lines.push('"use client";');
    lines.push('import React, { Suspense } from "react";');
    lines.push('import { Canvas } from "@react-three/fiber";');

    const dreiImports = [];
    if (options.enableOrbitControls ?? true) dreiImports.push("OrbitControls");
    if (hasGltf) dreiImports.push("useGLTF");
    if (dreiImports.length > 0) {
      lines.push(`import { ${dreiImports.join(", ")} } from "@react-three/drei";`);
    }

    lines.push("");
    lines.push(`export const ${componentName}: React.FC = () => {`);
    lines.push("  return (");
    lines.push(
      `    <div style={{ width: "100%", height: "${options.canvasHeight || "500px"}", background: "#0a0a0c" }}>`
    );
    lines.push(
      `      <Canvas shadows camera={{ fov: ${fov}, near: ${near}, far: ${far}, position: [0, 5, 10] }}>`
    );
    lines.push('        <Suspense fallback={null}>');

    if (options.enableOrbitControls ?? true) {
      lines.push('          <OrbitControls makeDefault />');
    }

    // Lights
    const lights = all3D.filter((el) => el.archetype === "light3D");
    if (lights.length === 0) {
      // Default ambient and directional light if none defined
      lines.push('          <ambientLight intensity={0.6} />');
      lines.push(
        '          <directionalLight position={[10, 10, 5]} intensity={1.0} castShadow />'
      );
    } else {
      for (const light of lights) {
        const lp = (light.properties || {}) as Partial<Light3DProperties>;
        const lType = lp.lightType || DEFAULT_LIGHT3D_PROPERTIES.lightType;
        const color = lp.color || DEFAULT_LIGHT3D_PROPERTIES.color;
        const intensity = lp.intensity ?? DEFAULT_LIGHT3D_PROPERTIES.intensity;
        const castShadow = lp.castShadow ? " castShadow" : "";

        if (lType === "ambient") {
          lines.push(`          <ambientLight color="${color}" intensity={${intensity}} />`);
        } else if (lType === "directional") {
          lines.push(
            `          <directionalLight color="${color}" intensity={${intensity}} position={[5, 10, 5]}${castShadow} />`
          );
        } else if (lType === "point") {
          lines.push(
            `          <pointLight color="${color}" intensity={${intensity}} position={[0, 5, 0]}${castShadow} />`
          );
        } else if (lType === "spot") {
          lines.push(
            `          <spotLight color="${color}" intensity={${intensity}} position={[0, 10, 0]}${castShadow} />`
          );
        }
      }
    }

    // Meshes / Objects
    const objects = all3D.filter((el) => el.archetype === "object3D");
    for (const obj of objects) {
      lines.push(this.emitMeshJSX(obj, "          "));
    }

    lines.push("        </Suspense>");
    lines.push("      </Canvas>");
    lines.push("    </div>");
    lines.push("  );");
    lines.push("};");

    return lines.join("\n");
  }

  /**
   * Emits JSX for a single 3D mesh object.
   */
  private static emitMeshJSX(obj: ProjectElement, indent: string): string {
    const props = (obj.properties || {}) as Partial<Object3DProperties>;
    const pos = props.position3D || DEFAULT_OBJECT3D_PROPERTIES.position3D;
    const scl = props.scale3D || DEFAULT_OBJECT3D_PROPERTIES.scale3D;
    const geom = props.geometry || DEFAULT_OBJECT3D_PROPERTIES.geometry;
    const mat = props.material || DEFAULT_OBJECT3D_PROPERTIES.material;

    const lines: string[] = [];
    lines.push(`${indent}{/* ${obj.name} */}`);
    lines.push(
      `${indent}<mesh position={[${pos[0]}, ${pos[1]}, ${pos[2]}]} scale={[${scl[0]}, ${scl[1]}, ${scl[2]}]}${
        props.castShadow ? " castShadow" : ""
      }${props.receiveShadow ? " receiveShadow" : ""}>`
    );

    // Geometry
    if (geom.type === "box") {
      const dim = geom.dimensions || [1, 1, 1];
      lines.push(`${indent}  <boxGeometry args={[${dim[0]}, ${dim[1]}, ${dim[2]}]} />`);
    } else if (geom.type === "sphere") {
      const r = geom.radius ?? 1;
      const seg = geom.segments ?? 32;
      lines.push(`${indent}  <sphereGeometry args={[${r}, ${seg}, ${seg}]} />`);
    } else if (geom.type === "plane") {
      const dim = geom.dimensions || [5, 5, 1];
      lines.push(`${indent}  <planeGeometry args={[${dim[0]}, ${dim[1]}]} />`);
    } else if (geom.type === "cylinder") {
      const r = geom.radius ?? 1;
      const h = geom.dimensions?.[1] ?? 2;
      const seg = geom.segments ?? 32;
      lines.push(`${indent}  <cylinderGeometry args={[${r}, ${r}, ${h}, ${seg}]} />`);
    } else if (geom.type === "torus") {
      const r = geom.radius ?? 1;
      const tr = geom.tubeRadius ?? 0.4;
      const seg = geom.segments ?? 32;
      lines.push(`${indent}  <torusGeometry args={[${r}, ${tr}, ${seg}, ${seg}]} />`);
    } else {
      lines.push(`${indent}  <boxGeometry args={[1, 1, 1]} />`);
    }

    // Material
    const matProps = [
      `color="${mat.color || "#4f46e5"}"`,
      `roughness={${mat.roughness ?? 0.4}}`,
      `metalness={${mat.metalness ?? 0.2}}`,
    ];
    if (mat.wireframe) matProps.push("wireframe");
    if (mat.emissive && mat.emissive !== "#000000") {
      matProps.push(`emissive="${mat.emissive}"`);
      if (mat.emissiveIntensity) matProps.push(`emissiveIntensity={${mat.emissiveIntensity}}`);
    }
    if (mat.transparent) {
      matProps.push("transparent");
      if (mat.opacity !== undefined) matProps.push(`opacity={${mat.opacity}}`);
    }

    lines.push(`${indent}  <meshStandardMaterial ${matProps.join(" ")} />`);
    lines.push(`${indent}</mesh>`);

    return lines.join("\n");
  }
}
