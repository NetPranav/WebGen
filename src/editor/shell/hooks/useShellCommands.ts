"use client";

/**
 * The editor's global commands (moved out of `EditorShell.tsx`, Phase 14):
 * one registration point for what used to be hardcoded keydown chains, plus the
 * File / View / Edit commands the menus run (Phase 13).
 */
import { useEffect } from "react";
import { z } from "zod";
import { defineCommand, defineTypedCommand, installGlobalCommands } from "@/core/commands";
import { edition } from "@/core/flags";
import { PRESET_IDS, presetsFor } from "@/core/workspace/layout";
import { useWorkspaceStore } from "@/core/workspace/useWorkspaceStore";
import { useCameraStore } from "@/core/store/useCameraStore";
import { registerFrameCommands } from "@/core/frames/frameCommands";
import { useSavedLayouts } from "@/core/workspace/useSavedLayouts";

export interface ShellCommandActions {
  toggleCommandPalette: () => void;
  toggleGlobalSearch: () => void;
  toggleAiCoPilot: () => void;
  dockFullPage: (panelId: string, title: string) => void;
  showBottomTab: (tabId: string) => void;
  exportProjectFile: () => void;
  openImportPicker: () => void;
  openSettings: () => void;
  /** Switches to a workspace preset and performs what it asks beyond layout. */
  selectPreset: (preset: string) => void;
}

export function useShellCommands(actions: ShellCommandActions) {
  const {
    toggleCommandPalette,
    toggleGlobalSearch,
    toggleAiCoPilot,
    dockFullPage,
    showBottomTab,
    exportProjectFile,
    openImportPicker,
    openSettings,
    selectPreset,
  } = actions;

  /**
   * Sub-Phase 43.1: the editor's global commands — one registration point
   * for what used to be 3 separate hardcoded keydown chains (this one, plus
   * undo/redo and save above) and `ShortcutRegistry.ts`'s dead built-in list
   * (its `handleKeyEvent` was never called; its only real effect was
   * supplying `CommandPalette.tsx`'s data and, on a palette click,
   * dispatching a `window` CustomEvent this component listened for — that
   * indirection is gone now that the palette calls `runCommand` directly).
   * `defineCommand` doesn't check `textEditing` for these (undo/redo do,
   * just below) — that matches this chain's pre-existing behavior, not a
   * new gate; see the Phase 43 progress log.
   */
  // `edit.undo`/`edit.redo`/`file.save` + the dispatcher are installed by
  // `installGlobalCommands`, shared with `DetachedPanelShell` (a detached
  // panel is a separate browser tab with no `EditorShell`, so it needs its
  // own copy of these three — see globalCommands.ts). Keeping that trio out
  // of this effect also means this effect must never call
  // `installCommandDispatcher` itself, or the main window would get two
  // dispatchers and every shortcut would double-fire.
  useEffect(() => installGlobalCommands(window), []);

  useEffect(() => {
    const unregisters = [
      defineCommand({
        id: "view.commandPalette",
        title: "Command Palette...",
        category: "View",
        keybinding: ["Ctrl+P", "Ctrl+K"],
        run: () => toggleCommandPalette(),
      }),
      defineCommand({
        id: "ai.copilot",
        title: "Toggle LayoutAI Copilot",
        category: "AI",
        keybinding: "Ctrl+Shift+I",
        run: () => toggleAiCoPilot(),
      }),
      defineCommand({
        id: "view.codeInspector",
        title: "Live Code Inspector",
        category: "View",
        keybinding: "Ctrl+Shift+G",
        run: () => dockFullPage("code", "Live Code Inspector"),
      }),
      defineCommand({
        id: "nav.pagesManager",
        title: "Pages & Routing Manager",
        category: "Navigation",
        keybinding: "Ctrl+Shift+P",
        run: () => dockFullPage("pages-manager", "Pages & Routing Manager"),
      }),
      defineCommand({
        id: "deploy.dashboard",
        title: "Deployment & Cloud Studio",
        category: "Deployment",
        keybinding: "Ctrl+Shift+D",
        run: () => dockFullPage("deploy", "Deployment & Cloud Studio"),
      }),
      defineCommand({
        id: "nav.globalSearch",
        title: "Global Search (Find in Blueprints)",
        category: "Navigation",
        keybinding: "Ctrl+Shift+F",
        run: () => toggleGlobalSearch(),
      }),
      defineCommand({
        id: "nav.plugins",
        title: "Plugin Manager",
        category: "Navigation",
        keybinding: "Ctrl+Shift+X",
        run: () => dockFullPage("plugins", "Plugin Manager"),
      }),
      defineCommand({
        id: "nav.history",
        title: "Undo History & Transaction Timeline",
        category: "Navigation",
        keybinding: "Ctrl+Shift+H",
        run: () => dockFullPage("history", "Undo History"),
      }),
      defineCommand({
        id: "nav.versionControl",
        title: "Version Control & Snapshots",
        category: "Navigation",
        keybinding: "Ctrl+Shift+V",
        run: () => dockFullPage("versioning", "Version Control & Snapshots"),
      }),
      defineCommand({
        id: "nav.dependencies",
        title: "Reference Viewer & Dependency Graph",
        category: "Navigation",
        keybinding: "Ctrl+Shift+R",
        run: () => dockFullPage("dependencies", "Reference Viewer & Dependency Graph"),
      }),
      defineCommand({
        id: "view.sequencer",
        title: "Open Sequencer",
        category: "View",
        keybinding: "Ctrl+Shift+M",
        run: () => {
          showBottomTab("sequencer");
        },
      }),
      defineCommand({
        id: "view.curves",
        title: "Open Curve Editor",
        category: "View",
        keybinding: "Ctrl+Shift+K",
        run: () => {
          showBottomTab("curves");
        },
      }),
    ];

    return () => {
      for (const unregister of unregisters) unregister();
    };
  }, [toggleAiCoPilot, dockFullPage, toggleCommandPalette, toggleGlobalSearch, showBottomTab]);

  // Phase 13: every File/Edit/View menu item runs one of these through the
  // command bus (see `menus/menuModel.tsx`), so menu, palette and (later) MCP
  // all reach the same handler.
  useEffect(() => {
    const unregisters = [
      defineCommand({ id: "file.exportProjectFile", title: "Export Project File (.lazy.json)", category: "File", run: () => exportProjectFile() }),
      defineCommand({ id: "file.importProjectFile", title: "Import Project File...", category: "File", run: () => openImportPicker() }),
      defineCommand({ id: "view.zoomIn", title: "Zoom In", category: "View", run: () => useCameraStore.getState().stepZoom(1) }),
      defineCommand({ id: "view.zoomOut", title: "Zoom Out", category: "View", run: () => useCameraStore.getState().stepZoom(-1) }),
      defineCommand({ id: "view.zoomReset", title: "Reset Zoom (100%)", category: "View", run: () => useCameraStore.getState().zoomTo100() }),
      defineCommand({ id: "app.preferences", title: "Preferences...", category: "Edit", run: () => openSettings() }),
    ];
    return () => {
      for (const unregister of unregisters) unregister();
    };
  }, [exportProjectFile, openImportPicker, openSettings]);

  // Phase 21: add, duplicate, rename, resize, reorder and delete frames, and focus one.
  useEffect(() => registerFrameCommands(), []);

  // Phase 15: workspace presets and saved layouts. The no-argument commands are what the
  // palette runs; the typed ones (`args`) are what an agent calls (Law 20).
  useEffect(() => {
    const label: Record<string, string> = { design: "Design", animate: "Animate", code: "Code", logic: "Logic", data: "Data", debug: "Debug" };
    const available = presetsFor(edition);
    const unregisters = [
      ...available.map((id) =>
        defineCommand({ id: `workspace.preset.${id}`, title: `${label[id]} Workspace`, category: "Workspace", run: () => selectPreset(id) }),
      ),
      defineTypedCommand({
        id: "workspace.setPreset",
        title: "Switch Workspace Preset",
        category: "Workspace",
        args: z.object({ preset: z.enum(PRESET_IDS) }),
        result: z.object({ preset: z.string() }),
        run: ({ preset }) => {
          if (!available.includes(preset)) throw new Error(`The ${preset} workspace is not in this edition.`);
          selectPreset(preset);
          return { preset };
        },
      }),
      defineTypedCommand({
        id: "workspace.saveLayout",
        title: "Save Current Layout As...",
        category: "Workspace",
        args: z.object({ name: z.string() }),
        result: z.object({ ok: z.boolean(), replaced: z.boolean().optional(), reason: z.string().optional() }),
        run: ({ name }) => {
          const result = useSavedLayouts.getState().save(name, useWorkspaceStore.getState().layout);
          return result.ok ? { ok: true, replaced: result.replaced } : { ok: false, reason: result.reason };
        },
      }),
      defineTypedCommand({
        id: "workspace.applyLayout",
        title: "Apply Saved Layout",
        category: "Workspace",
        args: z.object({ name: z.string() }),
        result: z.object({ applied: z.boolean() }),
        run: ({ name }) => {
          const layout = useSavedLayouts.getState().get(name);
          if (layout) useWorkspaceStore.getState().applyLayout(layout, name);
          return { applied: !!layout };
        },
      }),
      defineTypedCommand({
        id: "workspace.deleteLayout",
        title: "Delete Saved Layout",
        category: "Workspace",
        args: z.object({ name: z.string() }),
        run: ({ name }) => useSavedLayouts.getState().remove(name),
      }),
      defineCommand({ id: "workspace.resetLayout", title: "Reset Layout to Default", category: "Workspace", run: () => selectPreset("design") }),
    ];
    return () => {
      for (const unregister of unregisters) unregister();
    };
  }, [selectPreset]);
}
