import { z } from "zod";
import { defineCommand, defineTypedCommand } from "../commands";
import type { ContextKeys } from "../commands/types";
import { useTimelineUiStore } from "../store/useTimelineUiStore";
import { getTransport } from "../time/transport";
import { useSelectionStore } from "../store/useSelectionStore";
import { addMarkerAt, removeMarkerById, setLayerBarTimes, setLayerSwitch, setStopwatch, setWorkArea, setWorkAreaEdge, slideLayer, trimLayer } from "./timelineOps";

/**
 * The timeline's commands (ROADMAP Phase 61, Law 20): the panel's buttons and drags, and agents, call these. Times
 * default to the playhead where that makes sense. Keyboard shortcuts for them arrive with the navigation phase (63).
 */
const ids = () => useSelectionStore.getState().selectedIds;
const targets = z.array(z.string()).optional();
const timelineOnly = (ctx: ContextKeys) => !ctx.textEditing && ctx.timelineFocus;

export function registerTimelineCommands(): () => void {
  const offs: Array<() => void> = [];
  const add = (unregister: () => void) => offs.push(unregister);

  add(defineTypedCommand({
    id: "layer.setSwitch", title: "Set Layer Switch", category: "Layer",
    args: z.object({ ids: targets, switch: z.enum(["solo", "shy", "motionBlur"]), on: z.boolean() }),
    run: ({ ids: t, switch: key, on }) => ({ changed: setLayerSwitch(t ?? ids(), key, on) }),
  }));
  add(defineTypedCommand({
    id: "timeline.trimLayer", title: "Trim Layer", category: "Timeline",
    args: z.object({ layerId: z.string(), edge: z.enum(["in", "out"]), time: z.number().optional() }),
    run: ({ layerId, edge, time }) => ({ bar: trimLayer(layerId, edge, time ?? getTransport().time) }),
  }));
  add(defineTypedCommand({
    id: "timeline.slideLayer", title: "Move Layer in Time", category: "Timeline",
    args: z.object({ layerId: z.string(), delta: z.number() }),
    run: ({ layerId, delta }) => ({ bar: slideLayer(layerId, delta) }),
  }));
  add(defineTypedCommand({
    id: "timeline.setLayerBar", title: "Set Layer Bar", category: "Timeline",
    args: z.object({ layerId: z.string(), in: z.number().optional(), out: z.number().optional(), start: z.number().optional() }),
    run: ({ layerId, ...times }) => ({ bar: setLayerBarTimes(layerId, times) }),
  }));
  add(defineTypedCommand({
    id: "timeline.setWorkArea", title: "Set Work Area", category: "Timeline",
    args: z.object({ start: z.number(), end: z.number() }),
    run: ({ start, end }) => ({ area: setWorkArea(start, end) }),
  }));
  add(defineTypedCommand({
    id: "timeline.setWorkAreaStart", title: "Set Work Area Start at Playhead", category: "Timeline",
    args: z.object({ time: z.number().optional() }),
    run: ({ time }) => ({ area: setWorkAreaEdge("start", time ?? getTransport().time) }),
  }));
  add(defineTypedCommand({
    id: "timeline.setWorkAreaEnd", title: "Set Work Area End at Playhead", category: "Timeline",
    args: z.object({ time: z.number().optional() }),
    run: ({ time }) => ({ area: setWorkAreaEdge("end", time ?? getTransport().time) }),
  }));
  add(defineTypedCommand({
    id: "timeline.addMarker", title: "Add Marker at Playhead", category: "Timeline",
    args: z.object({ time: z.number().optional(), label: z.string().optional() }),
    run: ({ time, label }) => ({ id: addMarkerAt(time ?? getTransport().time, label) }),
  }));
  add(defineTypedCommand({
    id: "timeline.removeMarker", title: "Delete Marker", category: "Timeline",
    args: z.object({ id: z.string() }),
    run: ({ id }) => ({ removed: removeMarkerById(id) }),
  }));
  // Phase 62: stopwatches, and U / UU to reveal animated / modified properties of the selected layers.
  add(defineTypedCommand({
    id: "timeline.setStopwatch", title: "Turn a Stopwatch On or Off", category: "Timeline",
    args: z.object({ layerId: z.string(), property: z.string(), on: z.boolean(), time: z.number().optional() }),
    run: ({ layerId, property, on, time }) => setStopwatch(layerId, property, on, time ?? getTransport().time),
  }));
  add(defineCommand({
    id: "timeline.revealAnimated", title: "Reveal Animated Properties (U, twice for modified)", category: "Timeline", keybinding: "U", when: timelineOnly,
    run: () => void useTimelineUiStore.getState().pressReveal(ids()),
  }));
  add(defineTypedCommand({
    id: "timeline.setReveal", title: "Reveal Properties", category: "Timeline",
    args: z.object({ ids: targets, mode: z.enum(["animated", "modified", "off"]) }),
    run: ({ ids: t, mode }) => {
      useTimelineUiStore.getState().setReveal(t ?? ids(), mode === "off" ? null : mode);
      return { mode };
    },
  }));
  return () => offs.forEach((off) => off());
}
