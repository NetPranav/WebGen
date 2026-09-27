"use client";

/**
 * ============================================================================
 * FULL-EDITION PROJECT STORE TYPING (ROADMAP Sub-Phase 41.1)
 * ============================================================================
 * The After-track action fields (blueprints, databases, multi-page CRUD,
 * redirects, state variables) are optional on `ProjectStoreState` — they're
 * `undefined` until the matching `src/after/store/*.ts` module registers
 * them (imported only behind `edition === "full"`, see `afterTrackPanels.tsx`).
 *
 * This file's cast helpers make them non-optional again, for code that only
 * runs once they're guaranteed registered — a gated panel, or a test that
 * imports the relevant after-track module for its side effect. Casting here,
 * once per call site, is far less noise than an `!`/`?.` everywhere; it is
 * not safe to use from code reachable in the Initial edition.
 * ============================================================================
 */

import { useProjectStore, type ProjectStoreState } from "./useProjectStore";
import type { AfterTrackActionSignatures } from "./afterTrackActionSignatures";

export type FullEditionActions = AfterTrackActionSignatures;
export type FullEditionProjectStoreState = ProjectStoreState & FullEditionActions;

/** `.getState()` typed for After-track-only code (see `FullEditionProjectStoreState`). */
export function getFullEditionState(): FullEditionProjectStoreState {
  return useProjectStore.getState() as FullEditionProjectStoreState;
}

/** The `useProjectStore()` hook typed for After-track-only code (see `FullEditionProjectStoreState`). */
export function useFullEditionProjectStore(): FullEditionProjectStoreState {
  return useProjectStore() as unknown as FullEditionProjectStoreState;
}
