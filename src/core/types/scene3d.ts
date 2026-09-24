"use client";

/**
 * ============================================================================
 * 3D SCENE GRAPH & WEBGL ANIMATION DATA CONTRACTS
 * ============================================================================
 * Defines pure contracts for 3D elements, transform hierarchies, quaternions,
 * cameras, lights, PBR materials, and geometry primitives.
 * Architecture Ref: ROADMAP.md §Phase 8 (Sub-Phase 8.1 & 8.6)
 * ============================================================================
 */

export type Vector3D = [number, number, number]; // [x, y, z]

/**
 * Quaternion representation [x, y, z, w] for gimbal-lock-free 3D orientation.
 */
export type Quaternion = [number, number, number, number];

/**
 * 4x4 Transformation Matrix stored as a 16-element column-major array:
 * [ m0,  m1,  m2,  m3,   // col 0
 *   m4,  m5,  m6,  m7,   // col 1
 *   m8,  m9,  m10, m11,  // col 2
 *   m12, m13, m14, m15 ] // col 3
 */
export type Matrix4x4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number
];

export type Geometry3DType =
  | "box"
  | "sphere"
  | "plane"
  | "cylinder"
  | "torus"
  | "gltf"
  | "custom";

export interface Geometry3DConfig {
  type: Geometry3DType;
  dimensions?: Vector3D; // [width, height, depth]
  radius?: number;
  tubeRadius?: number;
  segments?: number;
  modelUrl?: string; // for .gltf / .glb asset imports
}

export interface PbrMaterialConfig {
  color: string;
  roughness: number; // 0 (mirror) to 1 (diffuse)
  metalness: number; // 0 (dielectric) to 1 (metallic)
  emissive?: string;
  emissiveIntensity?: number;
  wireframe?: boolean;
  transparent?: boolean;
  opacity?: number;
}

export type Camera3DProjection = "perspective" | "orthographic";

export interface Camera3DProperties {
  projection: Camera3DProjection;
  fov: number; // Field of View in degrees (for perspective)
  near: number; // Near clipping plane
  far: number; // Far clipping plane
  aspect?: number;
  zoom?: number; // for orthographic
  lookAtTarget?: Vector3D;
}

export type Light3DType = "ambient" | "directional" | "point" | "spot";

export interface Light3DProperties {
  lightType: Light3DType;
  color: string;
  intensity: number;
  castShadow: boolean;
  distance?: number; // range of point/spot light
  decay?: number;
  penumbra?: number; // for spotlight
}

export interface Object3DProperties {
  position3D: Vector3D;
  rotation3D: Quaternion; // Quaternion orientation
  scale3D: Vector3D;
  geometry: Geometry3DConfig;
  material: PbrMaterialConfig;
  visible: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
}

export const DEFAULT_OBJECT3D_PROPERTIES: Object3DProperties = {
  position3D: [0, 0, 0],
  rotation3D: [0, 0, 0, 1], // Identity quaternion
  scale3D: [1, 1, 1],
  geometry: {
    type: "box",
    dimensions: [1, 1, 1],
  },
  material: {
    color: "#4f46e5",
    roughness: 0.4,
    metalness: 0.2,
    emissive: "#000000",
    emissiveIntensity: 0,
    wireframe: false,
    transparent: false,
    opacity: 1,
  },
  visible: true,
  castShadow: true,
  receiveShadow: true,
};

export const DEFAULT_CAMERA3D_PROPERTIES: Camera3DProperties = {
  projection: "perspective",
  fov: 60,
  near: 0.1,
  far: 1000,
  aspect: 16 / 9,
  lookAtTarget: [0, 0, 0],
};

export const DEFAULT_LIGHT3D_PROPERTIES: Light3DProperties = {
  lightType: "directional",
  color: "#ffffff",
  intensity: 1.0,
  castShadow: true,
  distance: 0,
  decay: 1,
};
