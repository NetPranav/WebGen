import { z } from "zod";
import { defineCommand, defineTypedCommand } from "../commands";
import type { ContextKeys } from "../commands/types";
import { useTimelineUiStore } from "../store/useTimelineUiStore";
import { documentCommands } from "../store/useDocumentStore";
import { getTransport, transport } from "../time/transport";
import { useSelectionStore } from "../store/useSelectionStore";
import { getDocument } from "../store/documentState";
import { navigationTarget, stepZoom, zoomToRange } from "./model";
import { addPrecomp, closeComposition, goToParent, openBreadcrumb, openComposition } from "./compositionOps";
import { alignKeyframes, allKeyframeIds, copyKeyframes, deleteKeyframes, distributeKeyframes, keyClipboard, moveKeyframes, pasteKeyframes, scaleKeyframeTime, setKeyframeAt } from "./keyframeOps";
import { setKeyframeEase, setKeyframeSpring } from "./graph";
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
  // Phase 63: keyboard navigation, all with timeline focus. Page Down / Page Up step frames (Shift: ten), I and O go
  // to the selected layers' in and out points, B and N set the work area from the playhead, = and - zoom, \ fits the work area.
  const key = (id: string, title: string, keybinding: string, run: () => void) => add(defineCommand({ id, title, category: "Timeline", keybinding, when: timelineOnly, run }));
  key("timeline.frameNext", "Next Frame", "PageDown", () => transport.stepFrame(1));
  key("timeline.framePrevious", "Previous Frame", "PageUp", () => transport.stepFrame(-1));
  key("timeline.frameNext10", "Forward Ten Frames", "Shift+PageDown", () => transport.stepFrame(10));
  key("timeline.framePrevious10", "Back Ten Frames", "Shift+PageUp", () => transport.stepFrame(-10));
  const go = (edge: "in" | "out") => () => {
    const t = navigationTarget(getDocument(), getTransport().compositionId, ids(), edge);
    if (t !== null) transport.seek(t);
  };
  key("timeline.goToIn", "Go to In Point (selected layers, or the work area)", "I", go("in"));
  key("timeline.goToOut", "Go to Out Point (selected layers, or the work area)", "O", go("out"));
  key("timeline.workAreaStartHere", "Work Area Starts at the Playhead", "B", () => void setWorkAreaEdge("start", getTransport().time));
  key("timeline.workAreaEndHere", "Work Area Ends at the Playhead", "N", () => void setWorkAreaEdge("end", getTransport().time));
  const zoom = (direction: 1 | -1) => () => useTimelineUiStore.getState().setZoom(stepZoom(useTimelineUiStore.getState().pixelsPerSecond, direction));
  key("timeline.zoomIn", "Zoom Timeline In", "=", zoom(1));
  key("timeline.zoomOut", "Zoom Timeline Out", "-", zoom(-1));
  key("timeline.zoomToWorkArea", "Zoom Timeline to the Work Area", "\\", () => {
    const comp = getDocument().compositions[getTransport().compositionId];
    if (!comp) return;
    const ui = useTimelineUiStore.getState();
    const fit = zoomToRange(comp.workArea.start, comp.workArea.end, Math.max(200, ui.viewportWidth || 800));
    ui.setZoom(fit.pixelsPerSecond, fit.scrollLeft);
  });
  add(defineTypedCommand({
    id: "timeline.setZoom", title: "Set Timeline Zoom", category: "Timeline",
    args: z.object({ pixelsPerSecond: z.number().positive() }),
    run: ({ pixelsPerSecond }) => {
      useTimelineUiStore.getState().setZoom(pixelsPerSecond);
      return { pixelsPerSecond: useTimelineUiStore.getState().pixelsPerSecond };
    },
  }));

  // Phase 65: compositions as tabs, and the breadcrumbs back up.
  add(defineTypedCommand({
    id: "timeline.openComposition", title: "Open Composition in the Timeline", category: "Timeline",
    args: z.object({ compositionId: z.string(), fromBar: z.boolean().optional() }),
    run: ({ compositionId, fromBar }) => openComposition(compositionId, fromBar ?? false),
  }));
  add(defineTypedCommand({
    id: "timeline.openBreadcrumb", title: "Go to Breadcrumb", category: "Timeline",
    args: z.object({ index: z.number().int().min(0) }),
    run: ({ index }) => openBreadcrumb(index),
  }));
  add(defineCommand({ id: "timeline.goToParent", title: "Go Up to the Parent Composition", category: "Timeline", run: () => goToParent() }));
  add(defineTypedCommand({
    id: "timeline.closeComposition", title: "Close Precomp Tab", category: "Timeline",
    args: z.object({ compositionId: z.string() }),
    run: ({ compositionId }) => ({ closed: closeComposition(compositionId) }),
  }));
  add(defineTypedCommand({
    id: "timeline.removeNested", title: "Remove Precomp from this Composition", category: "Timeline",
    args: z.object({ nestedId: z.string() }),
    run: ({ nestedId }) => {
      const compositionId = getTransport().compositionId;
      if (!getDocument().compositions[compositionId]?.nested.some((n) => n.id === nestedId)) return { removed: false };
      documentCommands.removeNested(compositionId, nestedId);
      return { removed: true };
    },
  }));
  add(defineTypedCommand({
    id: "timeline.addPrecomp", title: "Add Precomp", category: "Timeline",
    args: z.object({ name: z.string().optional(), duration: z.number().positive().optional() }),
    run: ({ name, duration }) => addPrecomp(name, duration),
  }));

  // Phase 66: keyframing. Commands act on the selected keyframes unless given ids.
  const keys = (given?: string[]): string[] => given ?? [...useTimelineUiStore.getState().selectedKeys];
  const keyIds = z.array(z.string()).optional();
  add(defineTypedCommand({
    id: "timeline.addKeyframe", title: "Add Keyframe at the Playhead", category: "Timeline",
    args: z.object({ layerId: z.string(), property: z.string(), time: z.number().optional() }),
    run: ({ layerId, property, time }) => ({ id: setKeyframeAt(layerId, property, time ?? getTransport().time) }),
  }));
  add(defineTypedCommand({
    id: "timeline.selectKeyframes", title: "Select Keyframes", category: "Timeline",
    args: z.object({ ids: z.array(z.string()), mode: z.enum(["replace", "add", "toggle"]).optional() }),
    run: ({ ids: picked, mode }) => {
      useTimelineUiStore.getState().selectKeys(picked, mode ?? "replace");
      return { count: useTimelineUiStore.getState().selectedKeys.size };
    },
  }));
  add(defineTypedCommand({
    id: "timeline.selectAllKeyframes", title: "Select All Keyframes (of the selected layers, or all)", category: "Timeline",
    args: z.object({}),
    run: () => {
      const picked = allKeyframeIds(getDocument(), getTransport().compositionId, ids().length > 0 ? ids() : undefined);
      useTimelineUiStore.getState().selectKeys(picked);
      return { count: picked.length };
    },
  }));
  add(defineCommand({ id: "timeline.clearKeyframeSelection", title: "Deselect Keyframes", category: "Timeline", run: () => useTimelineUiStore.getState().clearKeys() }));
  add(defineTypedCommand({
    id: "timeline.moveKeyframes", title: "Move Keyframes in Time", category: "Timeline",
    args: z.object({ ids: keyIds, delta: z.number() }),
    run: ({ ids: given, delta }) => ({ moved: moveKeyframes(keys(given), delta) }),
  }));
  add(defineTypedCommand({
    id: "timeline.alignKeyframes", title: "Align Keyframes in Time", category: "Timeline",
    args: z.object({ ids: keyIds, to: z.enum(["playhead", "first", "last"]) }),
    run: ({ ids: given, to }) => ({ moved: alignKeyframes(keys(given), to) }),
  }));
  add(defineTypedCommand({
    id: "timeline.distributeKeyframes", title: "Distribute Keyframes Evenly in Time", category: "Timeline",
    args: z.object({ ids: keyIds }),
    run: ({ ids: given }) => ({ moved: distributeKeyframes(keys(given)) }),
  }));
  add(defineTypedCommand({
    id: "timeline.scaleKeyframeTime", title: "Scale Keyframe Time", category: "Timeline",
    args: z.object({ ids: keyIds, factor: z.number().positive(), around: z.enum(["first", "playhead"]).optional() }),
    run: ({ ids: given, factor, around }) => ({ moved: scaleKeyframeTime(keys(given), factor, around ?? "first") }),
  }));
  add(defineTypedCommand({
    id: "timeline.deleteKeyframes", title: "Delete Keyframes", category: "Timeline", keybinding: ["Delete", "Backspace"], when: (ctx) => timelineOnly(ctx) && useTimelineUiStore.getState().selectedKeys.size > 0,
    args: z.object({ ids: keyIds }).optional(),
    run: (a) => {
      const deleted = deleteKeyframes(keys(a?.ids));
      useTimelineUiStore.getState().clearKeys();
      return { deleted };
    },
  }));
  add(defineTypedCommand({
    id: "timeline.copyKeyframes", title: "Copy Keyframes", category: "Timeline", keybinding: "Ctrl+C", when: (ctx) => timelineOnly(ctx) && useTimelineUiStore.getState().selectedKeys.size > 0,
    args: z.object({ ids: keyIds }).optional(),
    run: (a) => ({ copied: copyKeyframes(keys(a?.ids)) }),
  }));
  add(defineTypedCommand({
    id: "timeline.pasteKeyframes", title: "Paste Keyframes at the Playhead", category: "Timeline", keybinding: "Ctrl+V", when: (ctx) => timelineOnly(ctx) && keyClipboard() !== null,
    args: z.object({ layerIds: z.array(z.string()).optional(), time: z.number().optional() }).optional(),
    run: (a) => {
      const { layerIds, time } = a ?? {};
      const targets = layerIds ?? (ids().length > 0 ? ids() : (keyClipboard()?.groups.map((g) => g.layerId) ?? []));
      const made = pasteKeyframes(targets, time ?? getTransport().time);
      useTimelineUiStore.getState().selectKeys(made);
      return { pasted: made.length };
    },
  }));
  add(defineTypedCommand({
    id: "timeline.setRecord", title: "Auto-Key: Record Changes as Keyframes", category: "Timeline",
    args: z.object({ on: z.boolean() }),
    run: ({ on }) => {
      useTimelineUiStore.getState().setRecordMode(on);
      return { on };
    },
  }));

  // Phase 67: easing, from the graph editor or the preset strip.
  add(defineTypedCommand({
    id: "timeline.setKeyframeEase", title: "Set Easing into Keyframes", category: "Timeline",
    args: z.object({ ids: keyIds, ease: z.string() }),
    run: ({ ids: given, ease }) => ({ changed: setKeyframeEase(keys(given), ease) }),
  }));
  add(defineCommand({
    id: "timeline.easyEase", title: "Easy Ease the Selected Keyframes (F9)", category: "Timeline", keybinding: "F9", when: (ctx) => timelineOnly(ctx) && useTimelineUiStore.getState().selectedKeys.size > 0,
    run: () => void setKeyframeEase(keys(), "cubic-bezier(0.42, 0, 0.58, 1)"),
  }));
  add(defineTypedCommand({
    id: "timeline.setKeyframeSpring", title: "Set Spring (Bounce and Time) into Keyframes", category: "Timeline",
    args: z.object({ ids: keyIds, bounce: z.number().min(0).max(1), time: z.number().min(0.1).max(3) }),
    run: ({ ids: given, bounce, time }) => ({ changed: setKeyframeSpring(keys(given), bounce, time) }),
  }));
  add(defineTypedCommand({
    id: "timeline.setGraphMode", title: "Graph Editor: Value or Speed", category: "Timeline",
    args: z.object({ mode: z.enum(["value", "speed"]) }),
    run: ({ mode }) => {
      useTimelineUiStore.getState().setGraphMode(mode);
      return { mode };
    },
  }));
  return () => offs.forEach((off) => off());
}
