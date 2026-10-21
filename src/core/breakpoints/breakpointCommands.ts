/** Breakpoint commands (ROADMAP Phase 43, Law 20): what the breakpoint bar, the inspector and agents call. */

import { z } from "zod";
import { defineTypedCommand } from "../commands";
import { useSelectionStore } from "../store/useSelectionStore";
import { addBreakpoint, removeBreakpoint, resetOverrides, setActiveBreakpoint, setResponsive, targetFrameId, updateBreakpoint } from "./breakpointOps";

export function registerBreakpointCommands(): () => void {
  const category = "Breakpoints";
  const offs = [
    defineTypedCommand({
      id: "breakpoint.set",
      title: "Edit at Breakpoint",
      category,
      args: z.object({ id: z.string().nullable() }),
      run: ({ id }) => ({ ok: setActiveBreakpoint(id) }),
    }),
    defineTypedCommand({
      id: "breakpoint.add",
      title: "Add Breakpoint",
      category,
      args: z.object({ name: z.string().min(1).max(40), width: z.number().int().min(100).max(10000) }),
      run: ({ name, width }) => ({ id: addBreakpoint(name, width) }),
    }),
    defineTypedCommand({
      id: "breakpoint.update",
      title: "Change Breakpoint",
      category,
      args: z.object({ id: z.string(), name: z.string().min(1).max(40).optional(), width: z.number().int().min(100).max(10000).optional() }),
      run: ({ id, ...patch }) => ({ ok: updateBreakpoint(id, patch) }),
    }),
    defineTypedCommand({ id: "breakpoint.remove", title: "Remove Breakpoint", category, args: z.object({ id: z.string() }), run: ({ id }) => ({ ok: removeBreakpoint(id) }) }),
    defineTypedCommand({
      id: "breakpoint.setResponsive",
      title: "Make Frame Responsive",
      category,
      args: z.object({ on: z.boolean(), frameId: z.string().optional() }),
      run: ({ on, frameId }) => {
        const id = frameId ?? targetFrameId();
        return { ok: id ? setResponsive(id, on) : false };
      },
    }),
    defineTypedCommand({
      id: "breakpoint.reset",
      title: "Reset Overrides",
      category,
      args: z.object({ ids: z.array(z.string()).optional(), keys: z.array(z.string()).optional() }),
      run: ({ ids, keys }) => ({ changed: resetOverrides(ids ?? useSelectionStore.getState().selectedIds, keys) }),
    }),
  ];
  return () => offs.forEach((off) => off());
}
