"use client";

/**
 * The shell's view of the workspace layout (Phase 14): the same names the shell
 * used when each was a `useState`, now backed by `useWorkspaceStore` so the
 * layout is one saved document. Setters accept a value or an updater like
 * `useState` did.
 */
import { useCallback } from "react";
import { useWorkspaceStore } from "@/core/workspace/useWorkspaceStore";
import type { PresetEffect } from "@/core/workspace/layout";

type Update<T> = T | ((current: T) => T);

export function useWorkspace() {
  const layout = useWorkspaceStore((s) => s.layout);
  const store = useWorkspaceStore.getState;

  const setLeftCollapsed = useCallback((v: Update<boolean>) => store().setZoneCollapsed("left", v), [store]);
  const setRightCollapsed = useCallback((v: Update<boolean>) => store().setZoneCollapsed("right", v), [store]);
  const setBottomCollapsed = useCallback((v: Update<boolean>) => store().setZoneCollapsed("bottom", v), [store]);
  const setRightWidth = useCallback((v: number) => store().setZoneSize("right", v), [store]);
  const setBottomHeight = useCallback((v: number) => store().setZoneSize("bottom", v), [store]);
  const setLeftActiveTab = useCallback((v: string) => store().setZoneTab("left", v), [store]);
  const setRightActiveTab = useCallback((v: string) => store().setZoneTab("right", v), [store]);
  const setBottomActiveTab = useCallback((v: string) => store().setZoneTab("bottom", v), [store]);
  const setCenterActiveTab = useCallback(
    (v: Update<string>) => store().setZoneTab("center", typeof v === "function" ? v(store().layout.center.activeTab) : v),
    [store],
  );
  const setIsOutputLogOpen = useCallback((v: Update<boolean>) => store().setOutputLogOpen(v), [store]);
  const selectPreset = useCallback((preset: string): PresetEffect[] => store().selectPreset(preset), [store]);

  return {
    layout,
    leftWidth: layout.left.size,
    rightWidth: layout.right.size,
    bottomHeight: layout.bottom.size,
    leftCollapsed: layout.left.collapsed,
    rightCollapsed: layout.right.collapsed,
    bottomCollapsed: layout.bottom.collapsed,
    leftActiveTab: layout.left.activeTab,
    rightActiveTab: layout.right.activeTab,
    bottomActiveTab: layout.bottom.activeTab,
    centerActiveTab: layout.center.activeTab,
    isOutputLogOpen: layout.outputLogOpen,
    activeWorkspace: layout.preset,
    setLeftCollapsed,
    setRightCollapsed,
    setBottomCollapsed,
    setRightWidth,
    setBottomHeight,
    setLeftActiveTab,
    setRightActiveTab,
    setBottomActiveTab,
    setCenterActiveTab,
    setIsOutputLogOpen,
    selectPreset,
    resetLayout: useCallback(() => store().resetLayout(), [store]),
  };
}

export type Workspace = ReturnType<typeof useWorkspace>;
