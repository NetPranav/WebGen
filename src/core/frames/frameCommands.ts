/**
 * ============================================================================
 * FRAME COMMANDS (ROADMAP Phase 21)
 * ============================================================================
 * Add, duplicate, rename, resize, reorder and delete frames (top-level
 * layers), and the camera's "focus this frame". Every change is a document
 * command, so each is one undo step; `registerFrameCommands` puts them on the
 * command bus with typed arguments (Law 20), which is what the header switch,
 * the canvas buttons and, later, an agent call.
 * ============================================================================
 */

import { z } from "zod";
import { defineTypedCommand } from "../commands";
import { cloneLayers } from "../editing/cloneLayers";
import { getDefaultProps } from "../document/registry";
import { documentCommands } from "../store/useDocumentStore";
import { getDocument } from "../store/documentState";
import { useCameraStore } from "../store/useCameraStore";
import { useCanvasViewStore } from "../store/useCanvasViewStore";
import { useSelectionStore } from "../store/useSelectionStore";
import {
  FRAME_PRESETS,
  FRAME_GAP,
  clampFrameSize,
  findFrameOfSize,
  frameInfo,
  getPreset,
  listFrames,
  moveInOrder,
  nextFramePosition,
  reflowPositions,
  uniqueFrameName,
  type FrameInfo,
} from "./frames";

export interface AddFrameInput {
  /** A preset id (`desktop`, `laptop`, `tablet`, `mobile`) giving the size and the default title. */
  preset?: string;
  width?: number;
  height?: number;
  name?: string;
}

function framesNow(): FrameInfo[] {
  return listFrames(getDocument().layers);
}

/** Adds an empty frame to the right of the others and returns its layer id. */
export function addFrame(input: AddFrameInput = {}): string {
  const preset = input.preset ? getPreset(input.preset) : undefined;
  if (input.preset && !preset) throw new Error(`Unknown frame preset "${input.preset}".`);
  const width = clampFrameSize(input.width ?? preset?.width ?? 1440);
  const height = clampFrameSize(input.height ?? preset?.height ?? 900);
  const frames = framesNow();
  const { x, y } = nextFramePosition(frames);
  const name = uniqueFrameName(frames, input.name?.trim() || preset?.label || "Frame");
  const id = documentCommands.addLayer(
    {
      archetype: "container",
      parentId: null,
      name,
      properties: { ...getDefaultProps("container"), "frame.x": x, "frame.y": y, "frame.width": width, "frame.height": height },
    },
    `Add frame "${name}"`,
  );
  return id;
}

/** Copies a frame, its layers and their animations, to the right of the others. Returns the copy's id. */
export function duplicateFrame(frameId: string): string {
  const doc = getDocument();
  const source = doc.layers[frameId];
  if (!source || source.parentId !== null) throw new Error(`"${frameId}" is not a frame.`);
  const frames = framesNow();
  const bundle = cloneLayers(doc.layers, doc.clips, [frameId]);
  const { x, y } = nextFramePosition(frames);
  const root = bundle.layers[0];
  root.name = uniqueFrameName(frames, `${source.name} copy`);
  root.properties = { ...root.properties, "frame.x": x, "frame.y": y };
  documentCommands.insertLayers(bundle.layers, bundle.clips, `Duplicate frame "${source.name}"`);
  return root.id;
}

export function renameFrame(frameId: string, name: string): void {
  const title = name.trim();
  if (!title) throw new Error("A frame needs a title.");
  documentCommands.renameLayer(frameId, title, "Rename frame");
}

/** Changes a frame's size. */
export function resizeFrame(frameId: string, size: { width?: number; height?: number }): void {
  const patch: Record<string, number> = {};
  if (size.width !== undefined) patch["frame.width"] = clampFrameSize(size.width);
  if (size.height !== undefined) patch["frame.height"] = clampFrameSize(size.height);
  documentCommands.updateProps(frameId, patch, "Resize frame");
}

/** Moves a frame one place left or right in the row and spaces the row out again. One undo step. */
export function moveFrame(frameId: string, direction: -1 | 1): void {
  const frames = framesNow();
  const order = frames.map((f) => f.id);
  const next = moveInOrder(order, frameId, direction);
  if (next.every((id, i) => id === order[i])) return;
  const positions = reflowPositions(frames, next);
  const tx = documentCommands.begin("Reorder frames");
  for (const [id, x] of positions) documentCommands.updateProps(id, { "frame.x": x });
  tx.commit();
}

/** Deletes a frame. A document keeps at least one. */
export function deleteFrame(frameId: string): void {
  const frames = framesNow();
  if (!frames.some((f) => f.id === frameId)) throw new Error(`"${frameId}" is not a frame.`);
  if (frames.length <= 1) throw new Error("A document keeps at least one frame.");
  documentCommands.removeLayer(frameId, "Delete frame");
  const view = useCanvasViewStore.getState();
  if (view.activeFrameId === frameId) view.setActiveFrame(null);
}

/** Makes `frameId` the active frame, selects it and (unless told not to) brings it into view. */
export function focusFrame(frameId: string, options: { camera?: boolean } = {}): void {
  const layer = getDocument().layers[frameId];
  if (!layer || layer.parentId !== null) throw new Error(`"${frameId}" is not a frame.`);
  useCanvasViewStore.getState().setActiveFrame(frameId);
  useSelectionStore.getState().select(frameId, "element");
  if (options.camera !== false) {
    const f = frameInfo(layer);
    useCameraStore.getState().fitToRect({ x: f.x, y: f.y, width: f.width, height: f.height }, { padding: 64, maxZoom: 1, bottomInset: 56 });
  }
}

/** The header's Desktop / Tablet / Mobile switch: focus the frame of that size, or create one first. */
export function focusOrCreatePreset(presetId: string): string {
  const preset = getPreset(presetId);
  if (!preset) throw new Error(`Unknown frame preset "${presetId}".`);
  const existing = findFrameOfSize(framesNow(), preset.width, preset.height);
  const id = existing?.id ?? addFrame({ preset: presetId });
  focusFrame(id);
  return id;
}

const FrameId = z.object({ frameId: z.string().min(1) });

/** Puts the frame commands on the command bus. Returns the function that removes them. */
export function registerFrameCommands(): () => void {
  const category = "Frame";
  const unregisters = [
    defineTypedCommand({
      id: "frame.add",
      title: "Add Frame",
      category,
      args: z.object({
        preset: z.enum(FRAME_PRESETS.map((p) => p.id) as [string, ...string[]]).optional(),
        width: z.number().positive().optional(),
        height: z.number().positive().optional(),
        name: z.string().optional(),
      }),
      run: (args) => {
        const frameId = addFrame(args);
        focusFrame(frameId);
        return { frameId };
      },
    }),
    defineTypedCommand({
      id: "frame.focusPreset",
      title: "Focus or Create Device Frame",
      category,
      args: z.object({ preset: z.enum(["desktop", "tablet", "mobile"]) }),
      run: ({ preset }) => ({ frameId: focusOrCreatePreset(preset) }),
    }),
    defineTypedCommand({
      id: "frame.focus",
      title: "Focus Frame",
      category,
      // `camera: false` selects the frame and makes it active without moving the view (what clicking its title does)
      args: FrameId.extend({ camera: z.boolean().optional() }),
      run: ({ frameId, camera }) => focusFrame(frameId, { camera }),
    }),
    defineTypedCommand({
      id: "frame.duplicate",
      title: "Duplicate Frame",
      category,
      args: FrameId,
      run: ({ frameId }) => {
        const copy = duplicateFrame(frameId);
        focusFrame(copy);
        return { frameId: copy };
      },
    }),
    defineTypedCommand({ id: "frame.rename", title: "Rename Frame", category, args: FrameId.extend({ name: z.string() }), run: ({ frameId, name }) => renameFrame(frameId, name) }),
    defineTypedCommand({
      id: "frame.resize",
      title: "Resize Frame",
      category,
      args: FrameId.extend({ width: z.number().positive().optional(), height: z.number().positive().optional() }),
      run: ({ frameId, ...size }) => resizeFrame(frameId, size),
    }),
    defineTypedCommand({ id: "frame.moveLeft", title: "Move Frame Left", category, args: FrameId, run: ({ frameId }) => moveFrame(frameId, -1) }),
    defineTypedCommand({ id: "frame.moveRight", title: "Move Frame Right", category, args: FrameId, run: ({ frameId }) => moveFrame(frameId, 1) }),
    defineTypedCommand({ id: "frame.delete", title: "Delete Frame", category, args: FrameId, run: ({ frameId }) => deleteFrame(frameId) }),
  ];
  return () => unregisters.forEach((off) => off());
}

export { FRAME_GAP };
