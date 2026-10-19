"use client";

/**
 * ============================================================================
 * PROJECT METADATA STORE (ROADMAP Phase 13, the gap left by Phase 12)
 * ============================================================================
 * Identity and framing of the open project: its id, name, scope and root
 * archetype. Independent of `useProjectStore`, the same way the document and
 * the World Environment are. `ProjectStateSnapshot` still carries these four
 * fields (they are part of the `.lazy.json` / IndexedDB contract); `getSnapshot`
 * and `restoreSnapshot` compose them from, and write them to, this store, and
 * "project" history entries swap the name, scope and root archetype through it.
 * ============================================================================
 */

import { create } from "zustand";

export type ProjectScope = "element" | "component" | "page";

export interface ProjectMeta {
  projectId?: string;
  projectName: string;
  scope: ProjectScope;
  rootArchetype: string;
}

interface ProjectMetaStoreState extends ProjectMeta {
  setProjectId: (projectId: string) => void;
  setProjectName: (name: string) => void;
  /** Replaces any of the four fields; an unset field keeps its value. */
  setProjectMeta: (partial: Partial<ProjectMeta>) => void;
}

export const INITIAL_PROJECT_META: ProjectMeta = {
  projectName: "Visual Web App",
  scope: "element",
  rootArchetype: "button",
};

export const useProjectMetaStore = create<ProjectMetaStoreState>((set) => ({
  ...INITIAL_PROJECT_META,
  setProjectId: (projectId) => set({ projectId }),
  setProjectName: (projectName) => set({ projectName }),
  setProjectMeta: (partial) => set(partial),
}));

/** The live metadata as plain data (no actions), for snapshots. */
export function getProjectMeta(): ProjectMeta {
  const { projectId, projectName, scope, rootArchetype } = useProjectMetaStore.getState();
  return { projectId, projectName, scope, rootArchetype };
}

const META_KEYS = ["projectId", "projectName", "scope", "rootArchetype"] as const;

/** Splits the metadata fields off a snapshot-shaped object; `meta` holds only the keys that were present. */
export function splitProjectMeta<T extends Record<string, unknown>>(
  state: T,
): { meta: Partial<ProjectMeta>; rest: Omit<T, (typeof META_KEYS)[number]> } {
  const meta: Record<string, unknown> = {};
  const rest: Record<string, unknown> = { ...state };
  for (const key of META_KEYS) {
    if (key in rest) {
      meta[key] = rest[key];
      delete rest[key];
    }
  }
  return { meta: meta as Partial<ProjectMeta>, rest: rest as Omit<T, (typeof META_KEYS)[number]> };
}
