/**
 * ============================================================================
 * VIEWPORT CAMERA (ROADMAP Phase 20)
 * ============================================================================
 * The document <-> screen transform, as plain functions with no DOM and no
 * store. A camera is `{ x, y, zoom }`: `x` and `y` are where document point
 * (0, 0) sits on screen (px, relative to the canvas element), `zoom` is the
 * scale (1 = 100%). A document point `d` is at `d * zoom + (x, y)` on screen.
 * ============================================================================
 */

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {}

/** 2% to 6,400% (Phase 20). */
export const MIN_ZOOM = 0.02;
export const MAX_ZOOM = 64;

export const DEFAULT_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

/** Each zoom-in / zoom-out step multiplies the scale by this. */
export const ZOOM_STEP = 1.25;

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  return Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
}

/** A camera whose numbers are all finite and whose zoom is in range. */
export function isUsableCamera(c: Camera): boolean {
  return Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.zoom) && c.zoom >= MIN_ZOOM && c.zoom <= MAX_ZOOM;
}

export function isCamera(value: unknown): value is Camera {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.x === "number" && Number.isFinite(c.x) &&
    typeof c.y === "number" && Number.isFinite(c.y) &&
    typeof c.zoom === "number" && Number.isFinite(c.zoom) && c.zoom > 0
  );
}

export function screenToDoc(camera: Camera, screen: Point): Point {
  return { x: (screen.x - camera.x) / camera.zoom, y: (screen.y - camera.y) / camera.zoom };
}

export function docToScreen(camera: Camera, doc: Point): Point {
  return { x: doc.x * camera.zoom + camera.x, y: doc.y * camera.zoom + camera.y };
}

export function docRectToScreen(camera: Camera, rect: Rect): Rect {
  const p = docToScreen(camera, rect);
  return { x: p.x, y: p.y, width: rect.width * camera.zoom, height: rect.height * camera.zoom };
}

export function panBy(camera: Camera, dx: number, dy: number): Camera {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return camera;
  return { ...camera, x: camera.x + dx, y: camera.y + dy };
}

/** Sets the zoom to `zoom` (clamped) and keeps the document point under `anchor` (a screen point) where it is. */
export function zoomAt(camera: Camera, anchor: Point, zoom: number): Camera {
  if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) return camera; // a NaN anchor would blank the canvas for good
  const next = clampZoom(zoom);
  if (next === camera.zoom) return camera;
  const ratio = next / camera.zoom;
  return { zoom: next, x: anchor.x - (anchor.x - camera.x) * ratio, y: anchor.y - (anchor.y - camera.y) * ratio };
}

/** Multiplies the zoom by `factor` around `anchor`. */
export function zoomByAt(camera: Camera, anchor: Point, factor: number): Camera {
  return zoomAt(camera, anchor, camera.zoom * factor);
}

/** The next stop of a zoom-in (`direction` 1) or zoom-out (-1) step, snapping to 100% when a step crosses it. */
export function stepZoom(zoom: number, direction: 1 | -1): number {
  const next = direction === 1 ? zoom * ZOOM_STEP : zoom / ZOOM_STEP;
  if ((zoom < 1 && next > 1) || (zoom > 1 && next < 1)) return 1;
  return clampZoom(next);
}

/**
 * The wheel's zoom factor. A trackpad pinch reports small fractional deltas,
 * a mouse wheel reports large steps; both end up as a bounded smooth factor.
 */
export function wheelZoomFactor(deltaY: number, speed = 1): number {
  const small = Math.abs(deltaY) < 50;
  const delta = -deltaY * (small ? 0.015 : 0.0015) * speed;
  return 1 + Math.max(Math.min(delta, 0.25), -0.25);
}

/** The camera that shows `rect` (document space) centred in `viewport`, never zoomed past `maxZoom`, with `padding` px around it. */
export function fitRect(
  viewport: Size,
  rect: Rect,
  options: { padding?: number; maxZoom?: number; bottomInset?: number } = {}
): Camera {
  const padding = options.padding ?? 48;
  const maxZoom = options.maxZoom ?? MAX_ZOOM;
  const bottomInset = options.bottomInset ?? 0;
  const availW = Math.max(viewport.width - padding * 2, 1);
  const availH = Math.max(viewport.height - padding * 2 - bottomInset, 1);
  const zoom = clampZoom(Math.min(availW / Math.max(rect.width, 1), availH / Math.max(rect.height, 1), maxZoom));
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  return { zoom, x: viewport.width / 2 - cx * zoom, y: (viewport.height - bottomInset) / 2 - cy * zoom };
}

/** The camera at 100% with document point `doc` at the centre of the viewport. */
export function centerOn(viewport: Size, doc: Point, zoom = 1): Camera {
  const z = clampZoom(zoom);
  return { zoom: z, x: viewport.width / 2 - doc.x * z, y: viewport.height / 2 - doc.y * z };
}

/** The visible part of the document, as a document-space rectangle. */
export function visibleDocRect(camera: Camera, viewport: Size): Rect {
  return { x: -camera.x / camera.zoom, y: -camera.y / camera.zoom, width: viewport.width / camera.zoom, height: viewport.height / camera.zoom };
}

/** The dot-grid's on-screen spacing, folded by octaves into 18-36 px so dots never merge or vanish. */
export function gridSpacing(baseSize: number, zoom: number): number {
  let spacing = Math.max(baseSize, 1) * zoom;
  while (spacing < 18) spacing *= 2;
  while (spacing > 36) spacing /= 2;
  return spacing;
}
