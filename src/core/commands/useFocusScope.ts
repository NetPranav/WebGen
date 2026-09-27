"use client";

/**
 * Sub-Phase 43.3: declares a panel's focus scope for as long as the pointer
 * is over it — matching how creative tools (Figma, After Effects, Photoshop)
 * scope keyboard shortcuts to whichever panel is under the cursor, not
 * whichever last had a click. This is what makes Space pan the canvas when
 * you're hovering it and toggle playback when you're hovering the timeline,
 * instead of both firing at once (the real, live bug this sub-phase closes —
 * see the Phase 43 progress log).
 *
 * Attach the returned ref to the panel's root element.
 */

import { useEffect, useRef, type RefObject } from "react";
import type { FocusScope } from "./types";
import { setFocusScope, useContextKeysStore } from "./contextKeys";

const FOCUS_KEY_FOR_SCOPE = {
  canvas: "canvasFocus",
  timeline: "timelineFocus",
  blueprint: "blueprintFocus",
} as const;

/**
 * Declares `scope` as focused for as long as the pointer is over `existingRef`'s
 * element. Takes the panel's own ref (rather than returning a new one) since a
 * DOM element can only take one `ref` prop, and every one of this phase's
 * panels already has its own root ref for other purposes (pointer math, etc.).
 */
export function useFocusScope<T extends HTMLElement>(scope: FocusScope, existingRef: RefObject<T | null>): void {
  useEffect(() => {
    const el = existingRef.current;
    if (!el) return;

    const onEnter = () => setFocusScope(scope);
    // Adjacent panels' pointerenter/pointerleave aren't guaranteed to fire
    // leave-before-enter, so only clear the scope if it's still ours —
    // otherwise a late `leave` could stomp on a `pointerenter` that already
    // moved focus to the panel the pointer is now actually over.
    const onLeave = () => {
      if (useContextKeysStore.getState()[FOCUS_KEY_FOR_SCOPE[scope]]) setFocusScope(null);
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [scope, existingRef]);
}

// Convenience for a panel that has no existing root ref to reuse.
export function useOwnFocusScope<T extends HTMLElement>(scope: FocusScope): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  useFocusScope(scope, ref);
  return ref;
}
