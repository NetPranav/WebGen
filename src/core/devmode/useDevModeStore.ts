/** Whether Dev Mode is showing (FigCraft port F13): the Code tab's Inspect view is open, so the canvas draws the measurements kept in the file. */

import { create } from "zustand";

export const useDevModeStore = create<{ on: boolean; setOn: (on: boolean) => void }>((set, get) => ({
  on: false,
  setOn: (on) => {
    if (get().on !== on) set({ on });
  },
}));
