"use client";

import { create } from "zustand";
import type { LockState } from "../storage/ProjectLock";

/** Whether this tab can edit the open project, or another tab has it (Phase 36). */
interface State {
  state: LockState;
  takeOver: (() => void) | null;
  set: (state: LockState, takeOver: (() => void) | null) => void;
}

export const useProjectLockStore = create<State>((set) => ({
  state: "owner",
  takeOver: null,
  set: (state, takeOver) => set({ state, takeOver }),
}));
