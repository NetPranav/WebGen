/**
 * ROADMAP Phase 14: the workspace layout as data. The shell renders from a
 * `WorkspaceLayout` (zone sizes, collapsed state, active tabs, the AI dock)
 * instead of local `useState` calls, so it can be saved, restored and, from
 * Phase 15, switched between presets. Pure: no React, no storage.
 */
import { z } from "zod";

export const PRESET_IDS = ["full-studio", "design", "animate", "logic", "data", "debug"] as const;
export type PresetId = (typeof PRESET_IDS)[number];

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

export const DEFAULT_LAYOUT: WorkspaceLayout = {
  version: 1,
  preset: "full-studio",
  left: { size: 300, collapsed: false, activeTab: "outliner" },
  right: { size: 320, collapsed: false, activeTab: "details" },
  bottom: { size: 290, collapsed: false, activeTab: "content-browser" },
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

/** Applies a workspace preset (UI.md §5.2) to a layout. Unknown ids leave the layout unchanged. */
export function applyPreset(layout: WorkspaceLayout, preset: string): PresetResult {
  const next: WorkspaceLayout = structuredClone(layout);
  next.preset = preset;
  const effects: PresetEffect[] = [];

  switch (preset) {
    case "full-studio":
      next.left.collapsed = false;
      next.right.collapsed = false;
      next.bottom.collapsed = false;
      next.left.size = 300;
      next.right.size = 320;
      next.bottom.size = 240;
      next.bottom.activeTab = "content-browser";
      next.center.activeTab = "viewport";
      break;
    case "design":
      next.left.collapsed = false;
      next.right.collapsed = false;
      next.bottom.collapsed = true;
      next.left.size = 340;
      next.right.size = 360;
      next.left.activeTab = "outliner";
      next.right.activeTab = "details";
      next.center.activeTab = "viewport";
      break;
    case "animate":
      next.left.collapsed = true;
      next.right.collapsed = false;
      next.right.size = 340;
      next.right.activeTab = "details";
      next.bottom.collapsed = false;
      next.bottom.size = 420;
      next.bottom.activeTab = "sequencer";
      next.center.activeTab = "viewport";
      effects.push({ type: "focusZone", zone: "bottom" });
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
  right: { min: 240, max: 550 },
  bottom: { min: 140, max: 480 },
  ai: { min: 260, max: 600 },
} as const;

/** Clamps stored sizes into the splitter limits (a layout saved on a larger screen, or edited by hand). */
export function clampLayout(layout: WorkspaceLayout): WorkspaceLayout {
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  return {
    ...layout,
    right: { ...layout.right, size: clamp(layout.right.size, ZONE_LIMITS.right.min, ZONE_LIMITS.right.max) },
    bottom: { ...layout.bottom, size: clamp(layout.bottom.size, ZONE_LIMITS.bottom.min, ZONE_LIMITS.bottom.max) },
    ai: { ...layout.ai, width: clamp(layout.ai.width, ZONE_LIMITS.ai.min, ZONE_LIMITS.ai.max) },
  };
}
