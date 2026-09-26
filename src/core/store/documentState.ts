"use client";

/**
 * ============================================================================
 * THE MOTION DOCUMENT'S OWN STORE (ROADMAP Sub-Phase 41.1)
 * ============================================================================
 * The raw storage primitive for `MotionDocument`, independent of
 * `useProjectStore`. Deliberately tiny and dependency-free: `useProjectStore.ts`
 * and `useDocumentStore.ts` both need document access, and importing from each
 * other would cycle, so the primitive they share lives here instead. Everyday
 * code should import `getDocument`/`useDocument`/`documentCommands` etc. from
 * `useDocumentStore.ts` (which re-exports this module's primitives) — this
 * file exists for the two store modules themselves, and for
 * `ProjectSession.ts`'s low-level autosave subscription.
 * ============================================================================
 */

import { create } from "zustand";
import { createDocumentFromLayers, createLayer } from "../document/factories";
import type { MotionDocument } from "../document/schema";

/** The document a brand-new element project starts from, before any snapshot is restored. */
export const DEFAULT_DOCUMENT: MotionDocument = createDocumentFromLayers([
  createLayer({
    id: "el_root_container",
    archetype: "container",
    name: "RootContainer",
    children: ["el_hero_heading", "el_buy_button"],
    properties: { "layout.display": "flex", "layout.flexDirection": "column", "layout.gap": 16, "layout.padding": 24 },
  }),
  createLayer({
    id: "el_hero_heading",
    archetype: "text",
    name: "HeroHeading",
    parentId: "el_root_container",
    properties: {
      "content.text": "Unreal Engine for Web Applications",
      "typography.fontSize": 32,
      "typography.fontWeight": 700,
      "typography.color": "#ffffff",
    },
  }),
  createLayer({
    id: "el_buy_button",
    archetype: "button",
    name: "BuyButton",
    parentId: "el_root_container",
    properties: { "content.label": "Get Started Free", "interaction.disabled": false, "appearance.background.color": "#206859" },
  }),
]);

interface DocumentOnlyState {
  document: MotionDocument;
}

export const documentStore = create<DocumentOnlyState>(() => ({ document: DEFAULT_DOCUMENT }));

export function getDocument(): MotionDocument {
  return documentStore.getState().document;
}

export function setDocument(next: MotionDocument): void {
  documentStore.setState({ document: next });
}
