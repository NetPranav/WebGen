"use client";

import { create } from "zustand";

/**
 * The breakpoint being edited and viewed (ROADMAP Phase 43): its id, or null for the base. Edits made while a smaller
 * breakpoint is active go to the layers' overrides for it; what the canvas, the layers panel and the inspector show
 * is the document as seen at that breakpoint. A choice that isn't one of the document's breakpoints counts as the base.
 */
interface State {
  activeId: string | null;
  setActive: (id: string | null) => void;
}

export const useBreakpointStore = create<State>((set) => ({
  activeId: null,
  setActive: (activeId) => set({ activeId }),
}));
