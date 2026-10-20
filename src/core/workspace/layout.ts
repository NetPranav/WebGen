/**
 * ROADMAP Phase 14: the workspace layout as data. The shell renders from a
 * `WorkspaceLayout` (zone sizes, collapsed state, active tabs, the AI dock)
 * instead of local `useState` calls, so it can be saved, restored and, from
 * Phase 15, switched between presets. Pure: no React, no storage.
 */
import { z } from "zod";

import type { Edition } from "../flags";

export const PRESET_IDS = ["design", "animate", "code", "logic", "data", "debug"] as const;
export type PresetId = (typeof PRESET_IDS)[number];

/** Logic, Data and Debug belong to the full edition; Design, Animate and Code ship in both. */
const FULL_EDITION_PRESETS: readonly PresetId[] = ["logic", "data", "debug"];

export function presetsFor(edition: Edition): PresetId[] {
  return PRESET_IDS.filter((id) => edition === "full" || !FULL_EDITION_PRESETS.includes(id));
}

/** The inspector's tabs (right dock). Debug is full-edition only. */
export const INSPECTOR_TABS = [
  { id: "design", title: "Design", edition: "initial" },
  { id: "motion", title: "Motion", edition: "initial" },
  { id: "code", title: "Code", edition: "initial" },
  { id: "debug", title: "Debug", edition: "full" },
] as const;
export type InspectorTabId = (typeof INSPECTOR_TABS)[number]["id"];

export function inspectorTabsFor(edition: Edition) {
  return INSPECTOR_TABS.filter((t) => edition === "full" || t.edition === "initial");
}

/** A tab id from an old or edited layout that isn't an inspector tab falls back to Design. */
export function normalizeInspectorTab(tabId: string, edition: Edition): InspectorTabId {
  const known = inspectorTabsFor(edition).find((t) => t.id === tabId);
  return known ? known.id : "design";
}

const ZoneSchema = z.object({
  /** Width in px for left/right zones, height in px for the bottom zone. */
  size: z.number().finite().min(0).max(4000),
  collapsed: z.boolean(),
  activeTab: z.string().min(1),
});

export const WorkspaceLayoutSchema = z.object({
  version: z.literal(1),
  preset: z.string().min(1),
  left: ZoneSchema,
  right: ZoneSchema,
  bottom: ZoneSchema,
  center: z.object({ activeTab: z.string().min(1) }),
  outputLogOpen: z.boolean(),
  ai: z.object({ open: z.boolean(), side: z.enum(["left", "right"]), width: z.number().finite().min(200).max(900) }),
});

export type WorkspaceLayout = z.infer<typeof WorkspaceLayoutSchema>;
export type ZoneId = "left" | "right" | "bottom";

/** The tabs of the left dock: the layer tree and the imported files (Phase 32, 36). */
export const LEFT_TABS = [
  { id: "layers", title: "Layers" },
  { id: "assets", title: "Assets" },
] as const;

/** A tab id from an old or edited layout (the retired "outliner") falls back to Layers. */
export function normalizeLeftTab(tabId: string): (typeof LEFT_TABS)[number]["id"] {
  return LEFT_TABS.find((t) => t.id === tabId)?.id ?? "layers";
}

/** The Design workspace: Layers (Phase 32) │ stage │ Design inspector, the timeline folded away to the transport bar in the status bar. */
export const DEFAULT_LAYOUT: WorkspaceLayout = {
  version: 1,
  preset: "design",
  left: { size: 280, collapsed: false, activeTab: "layers" },
  right: { size: 360, collapsed: false, activeTab: "design" },
  bottom: { size: 290, collapsed: true, activeTab: "sequencer" },
  center: { activeTab: "viewport" },
  outputLogOpen: false,
  ai: { open: false, side: "right", width: 340 },
};

/** Things a preset asks the shell to do that aren't layout data: open a full-page panel, raise a zone. */
export type PresetEffect = { type: "fullPage"; panelId: string; title: string } | { type: "focusZone"; zone: ZoneId };

export interface PresetResult {
  layout: WorkspaceLayout;
  effects: PresetEffect[];
}

export interface PresetOptions {
  /** Window height in px, so Animate can give the timeline about 40% of it. */
  viewportHeight?: number;
}

/** Applies a workspace preset to a layout. Unknown ids leave the layout unchanged. */
export function applyPreset(layout: WorkspaceLayout, preset: string, options: PresetOptions = {}): PresetResult {
  const next: WorkspaceLayout = structuredClone(layout);
  next.preset = preset;
  const effects: PresetEffect[] = [];

  switch (preset) {
    case "design":
      next.left.collapsed = false;
      next.left.size = 280;
      next.left.activeTab = "layers";
      next.right.collapsed = false;
      next.right.size = 360;
      next.right.activeTab = "design";
      next.bottom.collapsed = true;
      next.bottom.activeTab = "sequencer";
      next.center.activeTab = "viewport";
      next.outputLogOpen = false;
      break;
    case "animate": {
      const height = options.viewportHeight ?? 900;
      next.left.collapsed = true;
      next.right.collapsed = false;
      next.right.size = 340;
      next.right.activeTab = "motion";
      next.bottom.collapsed = false;
      next.bottom.size = Math.round(Math.min(ZONE_LIMITS.bottom.max, Math.max(ZONE_LIMITS.bottom.min, height * 0.4)));
      next.bottom.activeTab = "sequencer";
      next.center.activeTab = "viewport";
      next.outputLogOpen = false;
      effects.push({ type: "focusZone", zone: "bottom" });
      break;
    }
    case "code":
      next.left.collapsed = true;
      next.right.collapsed = false;
      next.right.size = ZONE_LIMITS.right.max - 30;
      next.right.activeTab = "code";
      next.bottom.collapsed = true;
      next.center.activeTab = "viewport";
      next.outputLogOpen = false;
      break;
    case "logic":
      next.left.collapsed = true;
      next.right.collapsed = false;
      next.bottom.collapsed = true;
      effects.push({ type: "fullPage", panelId: "blueprint", title: "Logic Blueprint" });
      break;
    case "data":
      next.left.collapsed = true;
      next.right.collapsed = false;
      next.bottom.collapsed = false;
      next.bottom.activeTab = "content-browser";
      next.bottom.size = 420;
      effects.push({ type: "focusZone", zone: "bottom" });
      break;
    case "debug":
      next.left.collapsed = false;
      next.right.collapsed = false;
      next.right.activeTab = "debug";
      next.outputLogOpen = true;
      break;
    default:
      return { layout, effects };
  }
  return { layout: next, effects };
}

/** Parses stored JSON into a layout; anything missing, malformed or from another version falls back to the default. */
export function parseLayout(raw: unknown): WorkspaceLayout {
  const result = WorkspaceLayoutSchema.safeParse(raw);
  return result.success ? result.data : structuredClone(DEFAULT_LAYOUT);
}

/** Size limits the splitters enforce, shared so a restored layout can't exceed what a user could drag to. */
export const ZONE_LIMITS = {
  left: { min: 200, max: 480 },
  right: { min: 240, max: 550 },
  bottom: { min: 140, max: 480 },
  ai: { min: 260, max: 600 },
} as const;

/** Clamps stored sizes into the splitter limits (a layout saved on a larger screen, or edited by hand). */
export function clampLayout(layout: WorkspaceLayout): WorkspaceLayout {
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  return {
    ...layout,
    left: { ...layout.left, size: clamp(layout.left.size, ZONE_LIMITS.left.min, ZONE_LIMITS.left.max), activeTab: normalizeLeftTab(layout.left.activeTab) },
    right: { ...layout.right, size: clamp(layout.right.size, ZONE_LIMITS.right.min, ZONE_LIMITS.right.max) },
    bottom: { ...layout.bottom, size: clamp(layout.bottom.size, ZONE_LIMITS.bottom.min, ZONE_LIMITS.bottom.max) },
    ai: { ...layout.ai, width: clamp(layout.ai.width, ZONE_LIMITS.ai.min, ZONE_LIMITS.ai.max) },
  };
}
