import type { PanelTab } from "@/core/types/workspace";

/** The tabs of the bottom drawer, before panels that are torn off or open full-page are filtered out. */
export const ALL_BOTTOM_TABS: PanelTab[] = [
  { id: "content-browser", title: "Content Browser", closable: false },
  { id: "sequencer", title: "Motion Sequencer", closable: false },
  { id: "export-code", title: "Export Preview", closable: false },
];

export const RIGHT_TABS: PanelTab[] = [
  { id: "details", title: "Details", closable: false },
  { id: "tokens", title: "Tokens", closable: true },
  { id: "validation", title: "Errors (0)", closable: true },
];
