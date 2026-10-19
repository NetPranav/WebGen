/**
 * ROADMAP Phase 15: layouts a user saves under a name and brings back with one
 * click. Pure list operations plus the stored shape; `useSavedLayouts.ts`
 * holds them in the browser.
 */
import { z } from "zod";
import { WorkspaceLayoutSchema, type WorkspaceLayout } from "./layout";

export const MAX_SAVED_LAYOUTS = 20;
export const MAX_NAME_LENGTH = 40;

export const SavedLayoutSchema = z.object({
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  layout: WorkspaceLayoutSchema,
});
export const SavedLayoutsSchema = z.object({ version: z.literal(1), layouts: z.array(SavedLayoutSchema).max(MAX_SAVED_LAYOUTS) });

export type SavedLayout = z.infer<typeof SavedLayoutSchema>;

/** Trims and collapses whitespace; returns null for a name that is empty or too long. */
export function normalizeLayoutName(raw: string): string | null {
  const name = raw.replace(/\s+/g, " ").trim();
  return name.length >= 1 && name.length <= MAX_NAME_LENGTH ? name : null;
}

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export type SaveResult = { ok: true; layouts: SavedLayout[]; replaced: boolean } | { ok: false; reason: "invalid-name" | "limit-reached" };

/** Saves `layout` under `rawName`; saving under an existing name (any case) replaces it. */
export function saveLayoutAs(list: readonly SavedLayout[], rawName: string, layout: WorkspaceLayout): SaveResult {
  const name = normalizeLayoutName(rawName);
  if (!name) return { ok: false, reason: "invalid-name" };
  const entry: SavedLayout = { name, layout: { ...structuredClone(layout), preset: `custom:${name}` } };
  const index = list.findIndex((l) => sameName(l.name, name));
  if (index >= 0) return { ok: true, replaced: true, layouts: list.map((l, i) => (i === index ? entry : l)) };
  if (list.length >= MAX_SAVED_LAYOUTS) return { ok: false, reason: "limit-reached" };
  return { ok: true, replaced: false, layouts: [...list, entry] };
}

export function removeLayout(list: readonly SavedLayout[], name: string): SavedLayout[] {
  return list.filter((l) => !sameName(l.name, name));
}

export function findLayout(list: readonly SavedLayout[], name: string): SavedLayout | undefined {
  return list.find((l) => sameName(l.name, name));
}

/** Parses stored JSON; anything malformed gives an empty list rather than an error. */
export function parseSavedLayouts(raw: unknown): SavedLayout[] {
  const result = SavedLayoutsSchema.safeParse(raw);
  return result.success ? result.data.layouts : [];
}
