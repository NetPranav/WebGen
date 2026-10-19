"use client";

/**
 * Project file handling for the shell (moved out of `EditorShell.tsx`, Phase 14):
 * opening the project named in the URL, autosave on hide, export and import of
 * `.lazy.json` files, drag-and-drop of a project file, and the crash-recovery prompt.
 */
import { useState, useCallback, useEffect } from "react";
import { useProjectStore } from "@/core/store/useProjectStore";
import { useProjectMetaStore } from "@/core/store/useProjectMetaStore";
import { ProjectDatabase, generateProjectId, createDefaultBlankSnapshot } from "@/core/storage/ProjectDatabase";
import { projectSession, type PendingRecovery } from "@/core/storage/ProjectSession";
import { installGestureCoalescing } from "@/core/store/useDocumentStore";
import { LazyFileError, MAX_LAZY_FILE_CHARS, isLazyFileName, lazyFileName, parseLazyFile, serializeLazyFile } from "@/core/storage/lazyFile";

export function useProjectFiles() {
  const [recovery, setRecovery] = useState<PendingRecovery | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isFileDragOver, setIsFileDragOver] = useState(false);

  /* --------------------------------------------------------------------------
   * Sub-Phase 2.4: Workspace Tailoring & Project Initialization from query params
   * -------------------------------------------------------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    const currentId = params.get("projectId") || params.get("id") || "";
    const archetype = params.get("archetype");
    const name = params.get("name") ? decodeURIComponent(params.get("name")!) : "";
    const settings = {
      archetype: archetype || "container",
      framework: params.get("framework") || "nextjs-app",
      styling: params.get("styling") || "tailwind",
      animation: params.get("animation") || "gsap",
      language: params.get("lang") || "typescript",
      template: params.get("template") || "blank",
    };

    let cancelled = false;
    void (async () => {
      const id = currentId || generateProjectId();
      if (!currentId) {
        // No project in the URL: start a new blank one and put its id in the URL.
        const updatedUrl = new URL(window.location.href);
        updatedUrl.searchParams.set("projectId", id);
        window.history.replaceState({}, "", updatedUrl.pathname + updatedUrl.search);
      }
      const result = await projectSession.open(id, {
        create: { name: name || "Blank Project", settings, snapshot: createDefaultBlankSnapshot(id, name || "Blank Project", settings) },
      });
      if (!cancelled && result.recovery) setRecovery(result.recovery);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave safety: save when the tab is hidden or the page goes away.
  useEffect(() => {
    const flush = () => void projectSession.flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  // A pointer press (drag, scrub, slider) is one undo step.
  useEffect(() => installGestureCoalescing(window), []);

  // Sub-Phase 43.1: undo/redo are now commands (registered below, with the
  // rest of the editor's global commands) instead of their own listener.

  /** Exports the open project as a `.lazy.json` file download. */
  const handleExportProjectFile = useCallback(async () => {
    const state = useProjectStore.getState();
    const meta = useProjectMetaStore.getState();
    const record = meta.projectId ? await ProjectDatabase.getProject(meta.projectId) : null;
    const blob = new Blob([serializeLazyFile(state.getSnapshot(), record?.settings)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = lazyFileName(meta.projectName || "project");
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  /** Imports a `.lazy.json` file as a new project and opens it. */
  const handleImportProjectFile = useCallback(async (file: File) => {
    try {
      // check the size before reading: a huge file shouldn't be pulled into memory just to be refused
      if (file.size > MAX_LAZY_FILE_CHARS) throw new LazyFileError(`This file is larger than the ${Math.round(MAX_LAZY_FILE_CHARS / 1_000_000)} MB a project import accepts.`);
      const parsed = parseLazyFile(await file.text());
      await projectSession.flush();
      const id = generateProjectId();
      await ProjectDatabase.registerProject({
        id,
        name: parsed.project.name,
        settings: parsed.project.settings,
        snapshot: { ...parsed.snapshot, projectId: id },
      });
      const result = await projectSession.open(id);
      setRecovery(result.recovery);
      const updatedUrl = new URL(window.location.href);
      for (const key of [...updatedUrl.searchParams.keys()]) updatedUrl.searchParams.delete(key);
      updatedUrl.searchParams.set("projectId", id);
      window.history.replaceState({}, "", updatedUrl.pathname + updatedUrl.search);
      setFileError(null);
    } catch (error) {
      setFileError(error instanceof LazyFileError ? error.message : `Could not open "${file.name}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

  const handleOpenImportPicker = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) void handleImportProjectFile(file);
    };
    input.click();
  }, [handleImportProjectFile]);

  // Drop a .lazy.json file anywhere on the window to open it.
  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setIsFileDragOver(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setIsFileDragOver(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setIsFileDragOver(false);
      const file = Array.from(e.dataTransfer?.files ?? []).find((f) => isLazyFileName(f.name));
      if (file) void handleImportProjectFile(file);
      else setFileError("Drop a LazyLayout project file (.lazy.json) to open it.");
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [handleImportProjectFile]);


  return {
    recovery,
    setRecovery,
    fileError,
    setFileError,
    isFileDragOver,
    handleExportProjectFile,
    handleOpenImportPicker,
  };
}
