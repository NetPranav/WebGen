"use client";

/**
 * ============================================================================
 * CAMERA STORE (ROADMAP Phase 20)
 * ============================================================================
 * The canvas camera (pan and zoom) and the canvas' size in px. The canvas
 * writes the camera straight to its DOM node from a store subscription, so a
 * wheel tick never re-renders React; only the zoom read-out subscribes.
 *
 * The camera is saved per document: one localStorage entry per project id,
 * written a moment after the camera stops moving. It is a view setting, not
 * document content, so it is not in `ProjectStateSnapshot` (the `.lazy.json`
 * contract) and not on the undo stack.
 * ============================================================================
 */

import { create } from "zustand";
import {
  type Camera,
  type Point,
  type Rect,
  type Size,
  DEFAULT_CAMERA,
  centerOn,
  fitRect,
  isCamera,
  isUsableCamera,
  clampZoom,
  panBy,
  stepZoom,
  zoomAt,
  zoomByAt,
} from "@/core/viewport/camera";

const STORAGE_PREFIX = "lazylayout:camera:";
const SAVE_DELAY_MS = 300;

function storageKey(projectId: string | undefined): string {
  return `${STORAGE_PREFIX}${projectId ?? "default"}`;
}

export function loadSavedCamera(projectId: string | undefined): Camera | null {
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    // a hand-edited or old entry can hold any zoom: clamp it into range like every other camera
    return isCamera(parsed) ? { x: parsed.x, y: parsed.y, zoom: clampZoom(parsed.zoom) } : null;
  } catch {
    return null;
  }
}

function saveCamera(projectId: string | undefined, camera: Camera): void {
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(camera));
  } catch {
    // Storage can be full or blocked; the camera simply isn't remembered.
  }
}

interface CameraStoreState {
  camera: Camera;
  /** The canvas element's size in px; zoom steps and fit use it. 0 x 0 until the canvas has laid out. */
  viewport: Size;
  /** True once the camera was moved by the person (or restored), so an auto-fit does not override it. */
  touched: boolean;
  projectId: string | undefined;

  setViewport: (size: Size) => void;
  setCamera: (camera: Camera) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (anchor: Point, zoom: number) => void;
  zoomByAt: (anchor: Point, factor: number) => void;
  /** One keyboard / button zoom step, around the viewport centre unless `anchor` is given. */
  stepZoom: (direction: 1 | -1, anchor?: Point) => void;
  zoomTo100: () => void;
  /** `auto: true` marks a layout the canvas did on its own (not the person's view): it is not saved and does not count as touched. */
  fitToRect: (rect: Rect, options?: { padding?: number; maxZoom?: number; bottomInset?: number; auto?: boolean }) => void;
  centerOrigin: (auto?: boolean) => void;
  /** Switches to another document's saved camera; with none, keeps the current one (or `fallback`) as an unsaved auto layout. */
  loadFor: (projectId: string | undefined, fallback?: Camera) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useCameraStore = create<CameraStoreState>((set, get) => {
  /** `auto` moves (the canvas laying itself out) don't count as the person's own view and aren't saved. */
  const move = (camera: Camera, auto = false) => {
    if (camera === get().camera || !isUsableCamera(camera)) return; // never a NaN or out-of-range camera
    set({ camera, touched: auto ? get().touched : true });
  };
  const center = (): Point => {
    const { width, height } = get().viewport;
    return { x: width / 2, y: height / 2 };
  };

  return {
    camera: DEFAULT_CAMERA,
    viewport: { width: 0, height: 0 },
    touched: false,
    projectId: undefined,

    setViewport: (viewport) => {
      const cur = get().viewport;
      if (cur.width === viewport.width && cur.height === viewport.height) return;
      set({ viewport });
    },
    setCamera: (camera) => move(camera),
    panBy: (dx, dy) => move(panBy(get().camera, dx, dy)),
    zoomAt: (anchor, zoom) => move(zoomAt(get().camera, anchor, zoom)),
    zoomByAt: (anchor, factor) => move(zoomByAt(get().camera, anchor, factor)),
    stepZoom: (direction, anchor) => {
      const cam = get().camera;
      move(zoomAt(cam, anchor ?? center(), stepZoom(cam.zoom, direction)));
    },
    zoomTo100: () => move(zoomAt(get().camera, center(), 1)),
    fitToRect: (rect, options) => {
      const { viewport } = get();
      if (viewport.width === 0 || viewport.height === 0) return;
      move(fitRect(viewport, rect, options), options?.auto);
    },
    centerOrigin: (auto) => {
      const { viewport } = get();
      if (viewport.width === 0 || viewport.height === 0) return;
      move(centerOn(viewport, { x: 0, y: 0 }, 1), auto);
    },
    loadFor: (projectId, fallback) => {
      const saved = loadSavedCamera(projectId);
      // With no saved view the current camera stays (the canvas lays itself out); `touched` says whether it is the person's.
      set({ projectId, camera: saved ?? fallback ?? get().camera, touched: saved !== null });
    },
  };
});

// Save a moment after the camera stops moving.
useCameraStore.subscribe((state, prev) => {
  if (typeof window === "undefined" || state.camera === prev.camera || !state.touched) return;
  if (saveTimer) clearTimeout(saveTimer);
  const { projectId, camera } = state;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveCamera(projectId, camera);
  }, SAVE_DELAY_MS);
});

/** The zoom as a whole percent, for read-outs. Subscribing to this re-renders only when the percent changes. */
export const selectZoomPercent = (state: CameraStoreState): number => Math.round(state.camera.zoom * 100);
