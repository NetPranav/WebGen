"use client";

import { useEffect } from "react";
import { getContextKeys } from "@/core/commands";
import { useToolStore } from "@/core/store/useToolStore";

/**
 * Spring-loaded tools (ROADMAP Phase 24): holding Space gives the Hand, holding Cmd/Ctrl gives deep select, and
 * releasing returns to the previous tool. A hold needs a key-up, which doesn't fit the command bus' one-shot
 * `run()`, so these are the canvas' two raw key listeners. Pressing is gated on canvas focus (so Space over the
 * timeline still plays); releasing never is, and losing the window's focus ends every hold, so a key released
 * elsewhere can't leave a tool stuck on.
 */
export function useToolKeys(): void {
  useEffect(() => {
    const editingText = (t: EventTarget | null) =>
      t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || (t as HTMLElement | null)?.isContentEditable === true;

    const down = (e: KeyboardEvent) => {
      if (editingText(e.target) || e.repeat) return;
      if (e.code === "Space" && getContextKeys().canvasFocus) {
        e.preventDefault();
        useToolStore.getState().beginSpring("space", "pan");
      } else if ((e.key === "Control" || e.key === "Meta") && getContextKeys().canvasFocus) {
        useToolStore.getState().beginSpring("mod", "deepSelect");
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        // A focused button would take the Space release as a click: the hold that just ended owns it.
        if (useToolStore.getState().springKeys.includes("space")) e.preventDefault();
        useToolStore.getState().endSpring("space");
      }
      else if ((e.key === "Control" || e.key === "Meta") && !e.ctrlKey && !e.metaKey) useToolStore.getState().endSpring("mod");
    };
    const blur = () => useToolStore.getState().endAllSprings();

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      useToolStore.getState().endAllSprings();
    };
  }, []);
}
