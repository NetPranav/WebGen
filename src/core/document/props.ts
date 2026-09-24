/**
 * Typed views of layer props for archetypes whose Details sections edit them.
 *
 * `Layer.properties` is validated as JSON data; which keys an archetype may
 * carry is not checked yet (the Rules Engine does that in ROADMAP Phase 8).
 * Until then these views are the one place a props bag is read as a typed
 * shape. Every field is optional because stored props may predate a field.
 */

import type { Layer } from "./schema";

export interface ImageProps {
  src?: string;
  fallbackSrc?: string;
  alt?: string;
  objectFit?: string;
  aspectRatio?: string;
  focalPoint?: { x: number; y: number };
  filter?: { grayscale: number; blur: number; brightness: number; contrast: number; saturate: number };
  overlay?: { color: string; opacity: number; blendMode: string };
  clipPath?: string;
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

export interface ArchetypePropViews {
  image: ImageProps;
  icon: IconProps;
  divider: DividerProps;
  background: BackgroundProps;
}

/** Reads a layer's props as the typed view for `archetype` (empty when the layer is missing). */
export function readProps<A extends keyof ArchetypePropViews>(
  layer: Layer | undefined,
  archetype: A
): ArchetypePropViews[A] {
  void archetype;
  return (layer?.properties ?? {}) as ArchetypePropViews[A];
}
