"use client";

/**
 * ============================================================================
 * GLOBAL SHORTCUT REGISTRY & CONFLICT DETECTION
 * ============================================================================
 * Master central singleton managing keybindings, hotkeys, conflict detection,
 * customizable shortcut remapping, and Command Palette actions.
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.3 & Detailed Roadmap §Phase 28
 * ============================================================================
 */

import {
  ShortcutCommand,
  ShortcutConflict,
  RegisterCommandResult,
} from "../core/types/shortcuts";
import { DiagnosticBus } from "../core/engine/DiagnosticBus";

export class ShortcutRegistryManager {
  private commands: Map<string, ShortcutCommand> = new Map();
  private keybindings: Map<string, string> = new Map(); // normalizedShortcut -> commandId
  private recentExecutedCommandIds: string[] = [];

  constructor() {
    this.registerBuiltInCommands();
  }

  /**
   * Normalizes a keyboard event or shortcut string into a standard canonical form:
   * e.g., "Ctrl+Shift+P", "Ctrl+S", "Ctrl+Enter".
   */
  public normalizeShortcut(input: KeyboardEvent | string): string {
    if (typeof input === "string") {
      const parts = input.split("+").map((p) => p.trim());
      let hasCtrl = false;
      let hasAlt = false;
      let hasShift = false;
      let key = "";

      for (const part of parts) {
        const lower = part.toLowerCase();
        if (lower === "ctrl" || lower === "control" || lower === "meta" || lower === "cmd" || lower === "command") {
          hasCtrl = true;
        } else if (lower === "alt" || lower === "option") {
          hasAlt = true;
        } else if (lower === "shift") {
          hasShift = true;
        } else {
          key = part.length === 1 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1);
        }
      }

      const result: string[] = [];
      if (hasCtrl) result.push("Ctrl");
      if (hasAlt) result.push("Alt");
      if (hasShift) result.push("Shift");
      if (key) result.push(key);
      return result.join("+");
    }

    // Process KeyboardEvent
    const e = input;
    const result: string[] = [];
    if (e.ctrlKey || e.metaKey) result.push("Ctrl");
    if (e.altKey) result.push("Alt");
    if (e.shiftKey) result.push("Shift");

    let key = e.key;
    if (key === "Control" || key === "Meta" || key === "Alt" || key === "Shift") {
      return result.join("+");
    }

    // Capitalize single letter or standardize special keys
    if (key.length === 1) {
      key = key.toUpperCase();
    } else {
      key = key.charAt(0).toUpperCase() + key.slice(1);
    }

    result.push(key);
    return result.join("+");
  }

  /**
   * Registers a new command with conflict detection.
   * If a shortcut is already bound and options.override is false, registration fails with conflict details.
   */
  public registerCommand(
    command: ShortcutCommand,
    options?: { override?: boolean }
  ): RegisterCommandResult {
    const desiredShortcut = command.currentShortcut || command.defaultShortcut;
    const normalized = desiredShortcut ? this.normalizeShortcut(desiredShortcut) : undefined;

    // Check for conflict if shortcut specified
    if (normalized) {
      const existingId = this.keybindings.get(normalized);
      if (existingId && existingId !== command.id && !options?.override) {
        const existingCmd = this.commands.get(existingId);
        const conflict: ShortcutConflict = {
          shortcut: normalized,
          existingCommandId: existingId,
          existingCommandTitle: existingCmd?.title || existingId,
          newCommandId: command.id,
          newCommandTitle: command.title,
          message: `Shortcut "${normalized}" is already bound to "${existingCmd?.title || existingId}". Registration rejected.`,
        };

        DiagnosticBus.emit({
          channel: "PROP_ERR",
          severity: "warning",
          source: { panel: "ShortcutRegistry", entityId: command.id },
          message: conflict.message,
          suggestion: "Use a different keyboard shortcut or specify override: true.",
        });

        return { success: false, conflict };
      }
    }

    // Unbind any previous shortcut this command held
    this.removeKeybindingForCommand(command.id);

    const updatedCommand: ShortcutCommand = {
      ...command,
      currentShortcut: normalized,
    };

    this.commands.set(command.id, updatedCommand);

    if (normalized) {
      this.keybindings.set(normalized, command.id);
    }

    return { success: true };
  }

  /**
   * Unregisters a command and frees its shortcut binding.
   */
  public unregisterCommand(commandId: string): boolean {
    if (!this.commands.has(commandId)) return false;
    this.removeKeybindingForCommand(commandId);
    this.commands.delete(commandId);
    return true;
  }

  /**
   * Remaps the shortcut for an existing command with conflict detection.
   */
  public remapShortcut(
    commandId: string,
    newShortcut?: string,
    options?: { override?: boolean }
  ): RegisterCommandResult {
    const cmd = this.commands.get(commandId);
    if (!cmd) {
      throw new Error(`Command "${commandId}" is not registered.`);
    }

    return this.registerCommand(
      {
        ...cmd,
        currentShortcut: newShortcut,
      },
      options
    );
  }

  private removeKeybindingForCommand(commandId: string): void {
    for (const [shortcut, id] of this.keybindings.entries()) {
      if (id === commandId) {
        this.keybindings.delete(shortcut);
      }
    }
  }

  public getCommand(commandId: string): ShortcutCommand | undefined {
    return this.commands.get(commandId);
  }

  public getAllCommands(): ShortcutCommand[] {
    return Array.from(this.commands.values());
  }

  public findCommandByShortcut(shortcut: string | KeyboardEvent): ShortcutCommand | undefined {
    const normalized = this.normalizeShortcut(shortcut);
    const commandId = this.keybindings.get(normalized);
    return commandId ? this.commands.get(commandId) : undefined;
  }

  public getRecentCommands(): ShortcutCommand[] {
    return this.recentExecutedCommandIds
      .map((id) => this.commands.get(id))
      .filter((c): c is ShortcutCommand => !!c);
  }

  /**
   * Executes a command by ID.
   */
  public async executeCommand(commandId: string): Promise<boolean> {
    const cmd = this.commands.get(commandId);
    if (!cmd) return false;

    this.recentExecutedCommandIds = [
      commandId,
      ...this.recentExecutedCommandIds.filter((id) => id !== commandId),
    ].slice(0, 10);

    try {
      await cmd.action();
      return true;
    } catch (err) {
      console.error(`[ShortcutRegistry] Error executing "${commandId}":`, err);
      return false;
    }
  }

  /**
   * Dispatches keyboard events against registered shortcut bindings.
   */
  public handleKeyEvent(e: KeyboardEvent): boolean {
    // Avoid capturing inside inputs unless it's a global modal shortcut
    const target = e.target as HTMLElement | null;
    const isTyping =
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable);

    const normalized = this.normalizeShortcut(e);

    // Escape always allowed
    if (isTyping && normalized !== "Escape" && normalized !== "Ctrl+P" && normalized !== "Ctrl+Shift+F") {
      return false;
    }

    const commandId = this.keybindings.get(normalized);
    if (commandId) {
      e.preventDefault();
      this.executeCommand(commandId);
      return true;
    }

    return false;
  }

  /**
   * Pre-registers built-in canonical IDE commands.
   */
  private registerBuiltInCommands(): void {
    const builtIns: ShortcutCommand[] = [
      {
        id: "core.save",
        title: "Save Project",
        category: "File",
        defaultShortcut: "Ctrl+S",
        description: "Save active canvas element hierarchy and project state",
        icon: "Save",
        action: () => {
          window.dispatchEvent(new CustomEvent("antigravity:save"));
        },
      },
      {
        id: "core.command_palette",
        title: "Command Palette...",
        category: "View",
        defaultShortcut: "Ctrl+P",
        description: "Search and execute any IDE studio command",
        icon: "Terminal",
        action: () => {
          window.dispatchEvent(new CustomEvent("antigravity:open_command_palette"));
        },
      },
      {
        id: "core.global_search",
        title: "Global Search (Find in Blueprints)",
        category: "Navigation",
        defaultShortcut: "Ctrl+Shift+F",
        description: "Find entities, nodes, routes, and variables across project",
        icon: "Search",
        action: () => {
          window.dispatchEvent(new CustomEvent("antigravity:open_global_search"));
        },
      },
      {
        id: "core.plugins",
        title: "Plugin Manager",
        category: "Navigation",
        defaultShortcut: "Ctrl+Shift+X",
        description: "Manage installed plugins, custom Blueprint nodes, element archetypes, and permissions",
        icon: "Boxes",
        action: () => {
          window.dispatchEvent(new CustomEvent("antigravity:open_plugins"));
        },
      },
      {
        id: "core.undo_history",
        title: "Undo History & Transaction Timeline",
        category: "Navigation",
        defaultShortcut: "Ctrl+Shift+H",
        description: "Inspect chronological action timeline and jump directly to any historical state",
        icon: "History",
        action: () => {
          window.dispatchEvent(new CustomEvent("antigravity:open_history"));
        },
      },
      {
        id: "core.version_control",
        title: "Version Control & Snapshots",
        category: "Navigation",
        defaultShortcut: "Ctrl+Shift+V",
        description: "Manage project checkpoints, branches, visual AST diffs, and recovery states",
        icon: "GitBranch",
        action: () => {
          window.dispatchEvent(new CustomEvent("antigravity:open_versioning"));
        },
      },
      {
        id: "core.reference_viewer",
        title: "Reference Viewer & Dependency Graph",
        category: "Navigation",
        defaultShortcut: "Ctrl+Shift+R",
        description: "Explore cross-asset dependency graph, orphan assets, and circular loops",
        icon: "Network",
        action: () => {
          window.dispatchEvent(new CustomEvent("antigravity:open_dependencies"));
        },
      },
      {
        id: "core.deploy",
        title: "Deployment & Cloud Studio",
        category: "Deployment",
        defaultShortcut: "Ctrl+Shift+D",
        description: "Open build pipeline visualizer and multi-target deployment dashboard",
        icon: "Rocket",
        action: () => {
          window.dispatchEvent(new CustomEvent("antigravity:open_deployment"));
        },
      },
      {
        id: "core.pages_manager",
        title: "Pages & Routing Manager",
        category: "Navigation",
        defaultShortcut: "Ctrl+Shift+P",
        description: "Manage visual sitemap, dynamic routes, and URL redirects",
        icon: "Compass",
        action: () => {
          window.dispatchEvent(new CustomEvent("antigravity:open_pages_manager"));
        },
      },
      {
        id: "core.code_inspector",
        title: "Live Code Inspector",
        category: "View",
        defaultShortcut: "Ctrl+Shift+G",
        description: "Inspect multi-domain generated Next.js 15 & React 19 source code",
        icon: "Code",
        action: () => {
          window.dispatchEvent(new CustomEvent("antigravity:open_code_inspector"));
        },
      },
      {
        id: "core.copilot",
        title: "LayoutAI Copilot",
        category: "AI",
        defaultShortcut: "Ctrl+Shift+I",
        description: "Toggle generative AI prompt bar and design assistant",
        icon: "Sparkles",
        action: () => {
          window.dispatchEvent(new CustomEvent("antigravity:open_copilot"));
        },
      },
      {
        id: "core.run_compile",
        title: "Compile & Run Project",
        category: "Blueprints",
        defaultShortcut: "Ctrl+Enter",
        description: "Trigger compiler bundle build and update in-memory runtime sandbox",
        icon: "Play",
        action: () => {
          window.dispatchEvent(new CustomEvent("antigravity:compile_run"));
        },
      },
      {
        id: "core.undo",
        title: "Undo Action",
        category: "Edit",
        defaultShortcut: "Ctrl+Z",
        description: "Revert last canvas or property edit",
        icon: "Undo2",
        action: () => {
          window.dispatchEvent(new CustomEvent("antigravity:undo"));
        },
      },
      {
        id: "core.redo",
        title: "Redo Action",
        category: "Edit",
        defaultShortcut: "Ctrl+Shift+Z",
        description: "Redo previously undone action",
        icon: "Redo2",
        action: () => {
          window.dispatchEvent(new CustomEvent("antigravity:redo"));
        },
      },
    ];

    for (const cmd of builtIns) {
      this.registerCommand(cmd, { override: true });
    }
  }
}

export const ShortcutRegistry = new ShortcutRegistryManager();
