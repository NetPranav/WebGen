"use client";

/**
 * ============================================================================
 * VERSION CONTROL & SNAPSHOT MANAGEMENT STORE
 * ============================================================================
 * Manages project checkpoint snapshots, branch records, active HEAD states,
 * visual comparisons, and seamless snapshot restorations.
 * Architecture Ref: ROADMAP.md §Sub-Phase 8.2 & PANELS.md §Panel 24
 * ============================================================================
 */

import { create } from "zustand";
import {
  ProjectSnapshotRecord,
  BranchRecord,
  SnapshotDiffReport,
  BranchMergeResult,
} from "../types/versioning";
import { VersionControlEngine } from "../engine/VersionControlEngine";
import { useProjectStore, ProjectStateSnapshot } from "./useProjectStore";

export interface VersionControlState {
  branches: Record<string, BranchRecord>;
  activeBranchId: string;
  snapshots: Record<string, ProjectSnapshotRecord>;
  comparingSnapshotIds: [string, string] | null;
  autoSnapshotIntervalMinutes: number;
  isAutoSnapshotEnabled: boolean;

  // Actions
  createSnapshot: (
    name: string,
    description?: string,
    tags?: string[],
    isAutoSnapshot?: boolean
  ) => ProjectSnapshotRecord;
  restoreSnapshot: (snapshotId: string) => boolean;
  deleteSnapshot: (snapshotId: string) => void;
  createBranch: (name: string, fromBranchId?: string, description?: string) => BranchRecord;
  switchBranch: (branchId: string, restoreHead?: boolean) => boolean;
  setComparingSnapshots: (baseId: string | null, targetId: string | null) => void;
  getDiffReport: () => SnapshotDiffReport | null;
  mergeBranch: (sourceBranchId: string) => BranchMergeResult;
  getActiveBranch: () => BranchRecord;
  getSnapshotsForActiveBranch: () => ProjectSnapshotRecord[];
  setAutoSnapshotEnabled: (enabled: boolean) => void;
  setAutoSnapshotIntervalMinutes: (minutes: number) => void;
  clearAllSnapshots: () => void;
}

const DEFAULT_MAIN_BRANCH: BranchRecord = {
  id: "branch_main",
  name: "main",
  headSnapshotId: null,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  isDefault: true,
  description: "Default production branch",
};

export const useVersionControlStore = create<VersionControlState>((set, get) => ({
  branches: {
    branch_main: DEFAULT_MAIN_BRANCH,
  },
  activeBranchId: "branch_main",
  snapshots: {},
  comparingSnapshotIds: null,
  autoSnapshotIntervalMinutes: 15,
  isAutoSnapshotEnabled: true,

  createSnapshot: (
    name: string,
    description: string = "",
    tags: string[] = [],
    isAutoSnapshot: boolean = false
  ): ProjectSnapshotRecord => {
    const currentProjectSnapshot = useProjectStore.getState().getSnapshot();
    const state = get();
    const activeBranch = state.branches[state.activeBranchId] || DEFAULT_MAIN_BRANCH;

    const record = VersionControlEngine.createSnapshotRecord({
      name,
      description,
      branchName: activeBranch.name,
      tags,
      isAutoSnapshot,
      snapshot: currentProjectSnapshot,
    });

    set((s) => ({
      snapshots: {
        ...s.snapshots,
        [record.id]: record,
      },
      branches: {
        ...s.branches,
        [s.activeBranchId]: {
          ...activeBranch,
          headSnapshotId: record.id,
          updatedAt: record.timestamp,
        },
      },
    }));

    return record;
  },

  restoreSnapshot: (snapshotId: string): boolean => {
    const record = get().snapshots[snapshotId];
    if (!record || !record.snapshot) return false;

    useProjectStore.getState().restoreSnapshot(record.snapshot);
    return true;
  },

  deleteSnapshot: (snapshotId: string) => {
    set((state) => {
      const updated = { ...state.snapshots };
      delete updated[snapshotId];
      return { snapshots: updated };
    });
  },

  createBranch: (name: string, fromBranchId?: string, description: string = ""): BranchRecord => {
    const state = get();
    const sourceBranch = fromBranchId
      ? state.branches[fromBranchId]
      : state.branches[state.activeBranchId];

    const branchId = `branch_${name.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}_${Math.random().toString(36).substring(2, 6)}`;
    const now = Date.now();

    const newBranch: BranchRecord = {
      id: branchId,
      name,
      headSnapshotId: sourceBranch?.headSnapshotId || null,
      createdAt: now,
      updatedAt: now,
      isDefault: false,
      description,
    };

    set((s) => ({
      branches: {
        ...s.branches,
        [branchId]: newBranch,
      },
    }));

    return newBranch;
  },

  switchBranch: (branchId: string, restoreHead: boolean = true): boolean => {
    const branch = get().branches[branchId];
    if (!branch) return false;

    set({ activeBranchId: branchId });

    if (restoreHead && branch.headSnapshotId) {
      const headSnap = get().snapshots[branch.headSnapshotId];
      if (headSnap) {
        useProjectStore.getState().restoreSnapshot(headSnap.snapshot);
      }
    }

    return true;
  },

  setComparingSnapshots: (baseId: string | null, targetId: string | null) => {
    if (!baseId || !targetId) {
      set({ comparingSnapshotIds: null });
    } else {
      set({ comparingSnapshotIds: [baseId, targetId] });
    }
  },

  getDiffReport: (): SnapshotDiffReport | null => {
    const state = get();
    if (!state.comparingSnapshotIds) {
      return null;
    }

    const [baseId, targetId] = state.comparingSnapshotIds;
    const baseRecord = state.snapshots[baseId];
    const targetRecord = state.snapshots[targetId];

    if (!baseRecord || !targetRecord) return null;

    return VersionControlEngine.diffSnapshots(
      baseRecord.snapshot,
      targetRecord.snapshot,
      baseRecord.name,
      targetRecord.name
    );
  },

  mergeBranch: (sourceBranchId: string): BranchMergeResult => {
    const state = get();
    const currentBranch = state.branches[state.activeBranchId];
    const sourceBranch = state.branches[sourceBranchId];

    if (!currentBranch || !sourceBranch) {
      return {
        success: false,
        conflicts: [],
        summary: "Invalid branches specified for merge operation.",
      };
    }

    const currentHead = currentBranch.headSnapshotId ? state.snapshots[currentBranch.headSnapshotId] : null;
    const sourceHead = sourceBranch.headSnapshotId ? state.snapshots[sourceBranch.headSnapshotId] : null;

    if (!sourceHead) {
      return {
        success: false,
        conflicts: [],
        summary: `Source branch "${sourceBranch.name}" has no snapshots to merge.`,
      };
    }

    // Base ancestor: if current has no head, source can be adopted directly
    if (!currentHead) {
      useProjectStore.getState().restoreSnapshot(sourceHead.snapshot);
      set((s) => ({
        branches: {
          ...s.branches,
          [s.activeBranchId]: {
            ...currentBranch,
            headSnapshotId: sourceHead.id,
            updatedAt: Date.now(),
          },
        },
      }));
      return {
        success: true,
        conflicts: [],
        mergedSnapshot: sourceHead.snapshot,
        summary: `Fast-forward merged "${sourceBranch.name}" into "${currentBranch.name}".`,
      };
    }

    // Common ancestor base snapshot (for 3-way merge):
    // If a branch was created from a specific snapshot, that snapshot is base.
    // Fallback to currentHead if no prior ancestor is isolated.
    const baseSnapshot: ProjectStateSnapshot = currentHead.snapshot;

    const result = VersionControlEngine.detectMergeConflicts(
      baseSnapshot,
      currentHead.snapshot,
      sourceHead.snapshot
    );

    if (result.success && result.mergedSnapshot) {
      useProjectStore.getState().restoreSnapshot(result.mergedSnapshot);
      // Create a merge snapshot
      const mergeSnap = get().createSnapshot(
        `Merge branch '${sourceBranch.name}' into ${currentBranch.name}`,
        `Merged commit from ${sourceBranch.name}`,
        ["merge"]
      );

      return {
        ...result,
        summary: `Successfully merged "${sourceBranch.name}" into "${currentBranch.name}" (Snapshot: ${mergeSnap.name}).`,
      };
    }

    return result;
  },

  getActiveBranch: (): BranchRecord => {
    const state = get();
    return state.branches[state.activeBranchId] || DEFAULT_MAIN_BRANCH;
  },

  getSnapshotsForActiveBranch: (): ProjectSnapshotRecord[] => {
    const state = get();
    const activeBranch = state.branches[state.activeBranchId];
    if (!activeBranch) return [];

    return Object.values(state.snapshots)
      .filter((s) => s.branchName === activeBranch.name)
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  setAutoSnapshotEnabled: (enabled: boolean) => {
    set({ isAutoSnapshotEnabled: enabled });
  },

  setAutoSnapshotIntervalMinutes: (minutes: number) => {
    set({ autoSnapshotIntervalMinutes: Math.max(1, minutes) });
  },

  clearAllSnapshots: () => {
    set({
      snapshots: {},
      comparingSnapshotIds: null,
      branches: {
        branch_main: DEFAULT_MAIN_BRANCH,
      },
      activeBranchId: "branch_main",
    });
  },
}));
