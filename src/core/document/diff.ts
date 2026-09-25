/**
 * ============================================================================
 * DOCUMENT DIFF
 * ============================================================================
 * ROADMAP Phase 3.1. `diffPatches(from, to)` returns Immer patches that turn
 * `from` into `to`. Transactions and history merges use it to squash many
 * small edits (a drag, a slider scrub) into one compact change.
 *
 * Documents are immutable and structurally shared, so unchanged subtrees are
 * skipped by reference and the diff costs O(changed nodes).
 * ============================================================================
 */

import type { Patch } from "immer";

type Json = unknown;

function isPlainObject(value: Json): value is Record<string, Json> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function walk(from: Json, to: Json, path: (string | number)[], out: Patch[]): void {
  if (Object.is(from, to)) return;

  if (Array.isArray(from) && Array.isArray(to)) {
    if (from.length !== to.length) {
      out.push({ op: "replace", path, value: to });
      return;
    }
    for (let i = 0; i < from.length; i++) walk(from[i], to[i], [...path, i], out);
    return;
  }

  if (isPlainObject(from) && isPlainObject(to)) {
    for (const key of Object.keys(from)) {
      if (!Object.prototype.hasOwnProperty.call(to, key)) out.push({ op: "remove", path: [...path, key] });
    }
    for (const key of Object.keys(to)) {
      if (!Object.prototype.hasOwnProperty.call(from, key)) out.push({ op: "add", path: [...path, key], value: to[key] });
      else walk(from[key], to[key], [...path, key], out);
    }
    return;
  }

  out.push({ op: "replace", path, value: to });
}

/** Patches that turn `from` into `to`. Empty when they are structurally equal. */
export function diffPatches(from: Json, to: Json): Patch[] {
  const out: Patch[] = [];
  walk(from, to, [], out);
  return out;
}
