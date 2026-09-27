"use client";

/**
 * ============================================================================
 * COMMAND REGISTRY (ROADMAP Sub-Phase 43.1)
 * ============================================================================
 * The single registry every shortcut, menu item, palette entry, toolbar
 * button and AI action resolves through. Global commands (save, undo, open a
 * panel, ...) are registered once at module load via `defineCommand`.
 * Panel-scoped commands (delete the selected keyframe, duplicate a node, ...)
 * need a fresh closure over that panel's local React state, so
 * `useCommand` (below) registers/re-registers them on mount and dependency
 * change, and unregisters on unmount — the panel's command simply doesn't
 * exist while the panel isn't mounted, which is also how a Blueprint-only
 * command (Full edition) never appears in the Initial edition's palette.
 * ============================================================================
 */

import { useEffect } from "react";
import type { Command } from "./types";
import { getContextKeys } from "./contextKeys";

const commands = new Map<string, Command>();

/** Registers a command, replacing any existing one with the same id. Returns an unregister function. */
export function defineCommand(command: Command): () => void {
  commands.set(command.id, command);
  return () => {
    // Only remove if it's still the same registration (a later re-register
    // shouldn't be undone by an earlier command's stale cleanup running late).
    if (commands.get(command.id) === command) commands.delete(command.id);
  };
}

export function getCommand(id: string): Command | undefined {
  return commands.get(id);
}

export function getAllCommands(): Command[] {
  return Array.from(commands.values());
}

/** Whether `command` currently applies, given the live context keys (or an explicit snapshot for testing). */
export function isCommandAvailable(command: Command, ctx = getContextKeys()): boolean {
  return !command.when || command.when(ctx);
}

/** Runs a command by id if it's registered and its `when` clause currently passes. Returns whether it ran. */
export function runCommand(id: string): boolean {
  const command = commands.get(id);
  if (!command || !isCommandAvailable(command)) return false;
  void command.run();
  return true;
}

/**
 * Registers a command for the lifetime of the calling component, with a
 * fresh closure whenever `deps` changes (same semantics as `useEffect`).
 */
export function useCommand(command: Command, deps: React.DependencyList): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => defineCommand(command), deps);
}
