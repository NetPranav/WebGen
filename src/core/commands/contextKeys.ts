"use client";

/**
 * Live context keys the command bus's `when` clauses read (Sub-Phase 43.1/43.3).
 * A plain Zustand store, not React-only state, so `runCommand`/the keydown
 * dispatcher (neither of which run inside a component) can read the current
 * values synchronously via `getContextKeys()`.
 */

import { create } from "zustand";
import type { ContextKeys, FocusScope } from "./types";

const DEFAULT_CONTEXT: ContextKeys = {
  canvasFocus: false,
  timelineFocus: false,
  blueprintFocus: false,
  textEditing: false,
  "selection.count": 0,
  "transport.playing": false,
};

interface ContextKeysStore extends ContextKeys {
  setContext: (patch: Partial<ContextKeys>) => void;
}

export const useContextKeysStore = create<ContextKeysStore>((set) => ({
  ...DEFAULT_CONTEXT,
  setContext: (patch) => set(patch),
}));

export function getContextKeys(): ContextKeys {
  const { setContext: _setContext, ...ctx } = useContextKeysStore.getState();
  return ctx;
}

/**
 * Sub-Phase 43.3: exactly one focused region. Setting a scope clears the
 * other two; `null` clears all three (the pointer is over neither panel).
 */
export function setFocusScope(scope: FocusScope | null): void {
  useContextKeysStore.setState({
    canvasFocus: scope === "canvas",
    timelineFocus: scope === "timeline",
    blueprintFocus: scope === "blueprint",
  });
}

export function setTextEditing(editing: boolean): void {
  useContextKeysStore.setState({ textEditing: editing });
}
