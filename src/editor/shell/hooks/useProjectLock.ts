"use client";

import { useEffect } from "react";
import { projectSession } from "@/core/storage/ProjectSession";
import { ProjectLock } from "@/core/storage/ProjectLock";
import { setDocumentReadOnly } from "@/core/store/documentState";
import { useProjectLockStore } from "@/core/store/useProjectLockStore";

/**
 * One editor per project across tabs (Phase 36): each time a project opens, this tab asks the others for it. If
 * another tab has it, this one is read-only (writes, undo and saving are off) until "Edit here instead".
 */
export function useProjectLock(): void {
  useEffect(() => {
    let lock: ProjectLock | null = null;
    const apply = (state: "owner" | "readonly") => {
      setDocumentReadOnly(state === "readonly");
      useProjectLockStore.getState().set(state, lock ? () => lock!.takeOver() : null);
    };
    const start = (id: string) => {
      lock?.release();
      lock = new ProjectLock(id);
      const mine = lock;
      mine.onChange((s) => lock === mine && apply(s));
      void mine.acquire().then((s) => lock === mine && apply(s));
    };
    if (projectSession.currentProjectId) start(projectSession.currentProjectId);
    const off = projectSession.onOpen(start);
    const leave = () => lock?.release();
    window.addEventListener("pagehide", leave);
    return () => {
      off();
      window.removeEventListener("pagehide", leave);
      lock?.release();
      lock = null;
      setDocumentReadOnly(false);
      useProjectLockStore.getState().set("owner", null);
    };
  }, []);
}
