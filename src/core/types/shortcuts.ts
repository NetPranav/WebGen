"use client";

/**
 * ============================================================================
 * KEYBOARD SHORTCUTS & COMMAND PALETTE CONTRACTS
 * ============================================================================
 * Pure TypeScript contracts for global shortcut keybindings, command palette
 * action definitions, conflict detection payloads, and category metadata.
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.3 & Detailed Roadmap §Phase 28
 * ============================================================================
 */

export type CommandCategory =
  | "File"
  | "Edit"
  | "View"
  | "Navigation"
  | "Blueprints"
  | "Database"
  | "Deployment"
  | "AI";

export interface ShortcutCommand {
  id: string;
  title: string;
  category: CommandCategory;
  defaultShortcut?: string; // e.g. "Ctrl+S", "Ctrl+Shift+P"
  currentShortcut?: string;
  description?: string;
  icon?: string;
  action: () => void | Promise<void>;
  scope?: "global" | "canvas" | "blueprint";
  isPlugin?: boolean;
  pluginId?: string;
}

export interface ShortcutConflict {
  shortcut: string;
  existingCommandId: string;
  existingCommandTitle: string;
  newCommandId: string;
  newCommandTitle: string;
  message: string;
}

export interface RegisterCommandResult {
  success: boolean;
  conflict?: ShortcutConflict;
}

export interface KeybindingMapEntry {
  normalizedShortcut: string;
  commandId: string;
}
