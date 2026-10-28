import { z } from "zod";
import { defineTypedCommand } from "../commands";
import { createId } from "../ids";
import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import { isScrollPosition } from "./model";

/**
 * Scroll commands (ROADMAP Phase 81, Law 20): set what a scroll-driven clip's range, scrub and pin are. A clip is
 * scroll-driven when its trigger is `scrollProgress` or `inView`. Any field left out keeps its value; `clear` removes
 * the whole configuration (back to the default range, no scrub, no pin).
 */
const position = z.string().refine(isScrollPosition, 'A position like "top 80%", "center center" or "bottom top": an edge of the element, then an edge of the viewport.');

export function registerScrollCommands(): () => void {
  const off = defineTypedCommand({
    id: "motion.setScrollTrigger",
    title: "Set a Clip's Scroll Range, Scrub and Pin",
    category: "Motion",
    args: z.object({
      clipId: z.string(),
      start: position.optional(),
      end: position.optional(),
      scrub: z.union([z.boolean(), z.number().min(0).max(10)]).optional(),
      pin: z.boolean().optional(),
      clear: z.boolean().optional(),
    }),
    run: ({ clipId, start, end, scrub, pin, clear }) => {
      const clip = getDocument().clips[clipId];
      if (!clip) return { changed: false, reason: `No clip "${clipId}".` };
      if (clip.trigger !== "scrollProgress" && clip.trigger !== "inView") return { changed: false, reason: "That clip isn't triggered by scrolling." };
      if (clear) {
        documentCommands.updateClip(clipId, { scrollTrigger: undefined }, "Clear scroll trigger");
        return { changed: true };
      }
      const next = { ...(clip.scrollTrigger ?? {}), ...(start !== undefined ? { start } : {}), ...(end !== undefined ? { end } : {}), ...(scrub !== undefined ? { scrub } : {}), ...(pin !== undefined ? { pin } : {}) };
      documentCommands.updateClip(clipId, { scrollTrigger: next }, "Set scroll trigger");
      return { changed: true, scrollTrigger: next };
    },
  });
  return off;
}

/** Adds a scroll-driven animation to a layer in one call: a parallax (scrubbed) or a reveal (plays when it comes into view). */
export function registerScrollClipCommand(): () => void {
  return defineTypedCommand({
    id: "motion.addScrollClip",
    title: "Add a Scroll Animation to a Layer",
    category: "Motion",
    args: z.object({
      layerId: z.string(),
      property: z.string(),
      from: z.union([z.number(), z.string()]),
      to: z.union([z.number(), z.string()]),
      /** Scrubbed (a parallax that follows the scroll) or played once when entered (a reveal). Default: scrubbed. */
      mode: z.enum(["scrub", "reveal"]).optional(),
      duration: z.number().positive().optional(),
      easing: z.string().optional(),
      start: position.optional(),
      end: position.optional(),
      pin: z.boolean().optional(),
    }),
    run: ({ layerId, property, from, to, mode, duration, easing, start, end, pin }) => {
      const layer = getDocument().layers[layerId];
      if (!layer) return { clipId: null, reason: `No layer "${layerId}".` };
      const scrub = (mode ?? "scrub") === "scrub";
      const length = duration ?? (scrub ? 1 : 0.6);
      const scrollTrigger = { ...(start ? { start } : {}), ...(end ? { end } : {}), ...(scrub ? { scrub: true } : {}), ...(pin ? { pin: true } : {}) };
      const clipId = documentCommands.addClip(
        layerId,
        {
          name: scrub ? "Scroll scrub" : "Scroll reveal",
          type: scrub ? "scroll" : "entrance",
          trigger: scrub ? "scrollProgress" : "inView",
          duration: length,
          easing: easing ?? "linear",
          enabled: true,
          ...(Object.keys(scrollTrigger).length > 0 ? { scrollTrigger } : {}),
          tracks: [{ id: createId("trk"), property, keyframes: [{ id: createId("kf"), time: 0, value: from }, { id: createId("kf"), time: length, value: to }] }],
        } as never,
        "Add scroll animation",
      );
      return { clipId };
    },
  });
}
