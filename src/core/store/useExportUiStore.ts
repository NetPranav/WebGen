"use client";

import { create } from "zustand";

/** Whether the Export dialog is open (ROADMAP Phase 49). */
interface State {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useExportUiStore = create<State>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
