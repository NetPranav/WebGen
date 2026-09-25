/**
 * Typed views of layer props for code that wants an object shape.
 *
 * Layer props are stored flat, keyed by canonical property path
 * (`properties.ts`, Phase 42): `media.filter.blur`, `scene3d.material.color`.
 * These views assemble the grouped shapes the Details sections and the 3D
 * emitter work with. Every field is optional because stored props may omit
 * any path; callers apply their own defaults.
 */

import type { Layer } from "./schema";
import { propReader } from "./properties";

export interface ImageProps {
  src?: string;
  fallbackSrc?: string;
  alt?: string;
  objectFit?: string;
  aspectRatio?: string;
  clipPath?: string;
  focalPoint: { x?: number; y?: number };
  filter: { grayscale?: number; blur?: number; brightness?: number; contrast?: number; saturate?: number };
  overlay: { color?: string; opacity?: number; blendMode?: string };
}

export interface IconProps {
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  strokeDashoffset?: number;
  path?: string;
}

export interface DividerProps {
  orientation?: string;
  length?: number;
  thickness?: number;
  style?: string;
  color?: string;
  capStyle?: string;
}

export interface BackgroundProps {
  type?: string;
  color?: string;
  gradientAngle?: number;
  parallaxSpeed?: number;
  blendMode?: string;
  noiseOpacity?: number;
}

export interface Object3DProps {
  position?: number[];
  rotation?: number[];
  scale?: number[];
  geometry?: { type?: string; dimensions?: number[]; radius?: number; tubeRadius?: number; segments?: number; url?: string; [key: string]: unknown };
  material: {
    color?: string;
    roughness?: number;
    metalness?: number;
    emissive?: string;
    emissiveIntensity?: number;
    wireframe?: boolean;
    transparent?: boolean;
    opacity?: number;
  };
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export interface Camera3DProps {
  projection?: string;
  fov?: number;
  near?: number;
  far?: number;
}

export interface Light3DProps {
  type?: string;
  color?: string;
  intensity?: number;
  castShadow?: boolean;
}

export interface ArchetypePropViews {
  image: ImageProps;
  icon: IconProps;
  divider: DividerProps;
  background: BackgroundProps;
  object3D: Object3DProps;
  camera3D: Camera3DProps;
  light3D: Light3DProps;
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const num = (v: unknown) => (typeof v === "number" ? v : undefined);
const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);
const nums = (v: unknown) => (Array.isArray(v) && v.every((n) => typeof n === "number") ? (v as number[]) : undefined);

type ViewBuilder<A extends keyof ArchetypePropViews> = (get: ReturnType<typeof propReader>) => ArchetypePropViews[A];

const VIEWS: { [A in keyof ArchetypePropViews]: ViewBuilder<A> } = {
  image: (get) => ({
    src: str(get("media.src")),
    fallbackSrc: str(get("media.fallbackSrc")),
    alt: str(get("media.alt")),
    objectFit: str(get("media.objectFit")),
    aspectRatio: str(get("media.aspectRatio")),
    clipPath: str(get("media.clipPath")),
    focalPoint: { x: num(get("media.focalPoint.x")), y: num(get("media.focalPoint.y")) },
    filter: {
      grayscale: num(get("media.filter.grayscale")),
      blur: num(get("media.filter.blur")),
      brightness: num(get("media.filter.brightness")),
      contrast: num(get("media.filter.contrast")),
      saturate: num(get("media.filter.saturate")),
    },
    overlay: {
      color: str(get("media.overlay.color")),
      opacity: num(get("media.overlay.opacity")),
      blendMode: str(get("media.overlay.blendMode")),
    },
  }),
  icon: (get) => ({
    stroke: str(get("svg.stroke")),
    strokeWidth: num(get("svg.strokeWidth")),
    fill: str(get("svg.fill")),
    strokeDashoffset: num(get("svg.strokeDashoffset")),
    path: str(get("svg.path")),
  }),
  divider: (get) => ({
    orientation: str(get("divider.orientation")),
    length: num(get("divider.length")),
    thickness: num(get("divider.thickness")),
    style: str(get("divider.style")),
    color: str(get("divider.color")),
    capStyle: str(get("divider.capStyle")),
  }),
  background: (get) => ({
    type: str(get("background.type")),
    color: str(get("background.color")),
    gradientAngle: num(get("background.gradient.angle")),
    parallaxSpeed: num(get("background.parallax.speed")),
    blendMode: str(get("background.blendMode")),
    noiseOpacity: num(get("background.noise.opacity")),
  }),
  object3D: (get) => {
    const geometry = get("scene3d.geometry");
    return {
      position: nums(get("scene3d.position")),
      rotation: nums(get("scene3d.rotation")),
      scale: nums(get("scene3d.scale")),
      geometry: geometry && typeof geometry === "object" && !Array.isArray(geometry) ? (geometry as Object3DProps["geometry"]) : undefined,
      material: {
        color: str(get("scene3d.material.color")),
        roughness: num(get("scene3d.material.roughness")),
        metalness: num(get("scene3d.material.metalness")),
        emissive: str(get("scene3d.material.emissive")),
        emissiveIntensity: num(get("scene3d.material.emissiveIntensity")),
        wireframe: bool(get("scene3d.material.wireframe")),
        transparent: bool(get("scene3d.material.transparent")),
        opacity: num(get("scene3d.material.opacity")),
      },
      castShadow: bool(get("scene3d.castShadow")),
      receiveShadow: bool(get("scene3d.receiveShadow")),
    };
  },
  camera3D: (get) => ({
    projection: str(get("scene3d.camera.projection")),
    fov: num(get("scene3d.camera.fov")),
    near: num(get("scene3d.camera.near")),
    far: num(get("scene3d.camera.far")),
  }),
  light3D: (get) => ({
    type: str(get("scene3d.light.type")),
    color: str(get("scene3d.light.color")),
    intensity: num(get("scene3d.light.intensity")),
    castShadow: bool(get("scene3d.light.castShadow")),
  }),
};

/** Reads a layer's props as the typed view for `archetype` (every field empty when the layer is missing). */
export function readProps<A extends keyof ArchetypePropViews>(
  layer: Pick<Layer, "properties"> | undefined,
  archetype: A
): ArchetypePropViews[A] {
  return VIEWS[archetype](propReader(layer?.properties));
}
