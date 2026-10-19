"use client";

import { create } from "zustand";
import { ToolMachine } from "../tools/toolMachine";
import { isToolAvailable, type ToolId } from "../tools/toolDefs";

/** The canvas' tool state (ROADMAP Phase 24): the active tool, and the tool acting now (a held spring wins). Rules in `ToolMachine`. */
interface ToolState {
  /** The tool the person chose. */
  active: ToolId;
  /** The tool acting now: a held spring's, else `active`. */
  current: ToolId;
  /** The keys whose springs are held right now ("space", "mod"). */
  springKeys: string[];
  /** A canvas gesture is in progress (a drag a tool began): Escape cancels it rather than clearing the selection. */
  gesturing: boolean;
  setGesturing: (on: boolean) => void;
  setActive: (id: string) => boolean;
  beginSpring: (key: string, tool: ToolId) => void;
  endSpring: (key: string) => void;
  endAllSprings: () => void;
}

const machine = new ToolMachine("select", isToolAvailable);

export const useToolStore = create<ToolState>((set) => {
  const sync = () => set({ active: machine.active as ToolId, current: machine.current as ToolId, springKeys: machine.springs.map((x) => x.key) });
  machine.subscribe(sync);
  return {
    active: "select",
    current: "select",
    springKeys: [],
    gesturing: false,
    setGesturing: (gesturing) => set({ gesturing }),
    setActive: (id) => machine.setActive(id),
    beginSpring: (key, tool) => void machine.beginSpring(key, tool),
    endSpring: (key) => machine.endSpring(key),
    endAllSprings: () => machine.endAllSprings(),
  };
});
