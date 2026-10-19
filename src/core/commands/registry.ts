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
import type { ZodType, z } from "zod";
import type { Command, CommandOutcome } from "./types";
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

/** `defineCommand` for a command with an `args` schema: `run` receives the parsed, typed arguments. */
export function defineTypedCommand<S extends ZodType>(command: Omit<Command, "args" | "run"> & { args: S; run: (args: z.infer<S>) => unknown }): () => void {
  return defineCommand({ ...command, run: command.run as Command["run"] });
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

/** Validates `args` against the command's schema (when it has one), runs it, and checks its result. Never throws. */
function execute(command: Command, args: unknown): CommandOutcome {
  let parsed: unknown = undefined;
  if (command.args) {
    const check = command.args.safeParse(args);
    if (!check.success) return { ok: false, reason: "invalid-args", message: check.error.message };
    parsed = check.data;
  }
  let result: unknown;
  try {
    result = (command.run as (a?: unknown) => unknown)(parsed);
  } catch (error) {
    return { ok: false, reason: "threw", message: error instanceof Error ? error.message : String(error) };
  }
  if (command.result) {
    const check = command.result.safeParse(result);
    if (!check.success) return { ok: false, reason: "invalid-result", message: check.error.message };
    result = check.data;
  }
  return { ok: true, result };
}

/** Runs a command by id if it's registered and its `when` clause currently passes, validating `args`. */
export function tryRunCommand(id: string, args?: unknown): CommandOutcome {
  const command = commands.get(id);
  if (!command) return { ok: false, reason: "unknown-command" };
  if (!isCommandAvailable(command)) return { ok: false, reason: "unavailable" };
  return execute(command, args);
}

/** Like `tryRunCommand`, but returns only whether the command ran. Kept for keyboard and palette callers. */
export function runCommand(id: string, args?: unknown): boolean {
  return tryRunCommand(id, args).ok;
}

/**
 * Runs a command by id for a deliberate pointer action (menu item, toolbar
 * button, palette row), skipping the `when` clause. `when` exists to
 * disambiguate a *keystroke*; a click has no competing keyboard meaning, and
 * gating it would silently no-op e.g. Edit > Undo while a text field elsewhere
 * has focus. Returns whether the command exists (and its args, if any, were valid).
 */
export function invokeCommand(id: string, args?: unknown): boolean {
  const command = commands.get(id);
  if (!command) return false;
  return execute(command, args).ok;
}

/**
 * Registers a command for the lifetime of the calling component, with a
 * fresh closure whenever `deps` changes (same semantics as `useEffect`).
 */
export function useCommand(command: Command, deps: React.DependencyList): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => defineCommand(command), deps);
}
