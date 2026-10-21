import type { PanelTab } from "@/core/types/workspace";
import type { Edition } from "@/core/flags";
import { inspectorTabsFor } from "@/core/workspace/layout";

/** The tabs of the bottom drawer, before panels that are torn off or open full-page are filtered out. */
export const ALL_BOTTOM_TABS: PanelTab[] = [
  { id: "content-browser", title: "Content Browser", closable: false },
  { id: "timeline", title: "Layer Timeline", closable: false },
  { id: "sequencer", title: "Motion Sequencer", closable: false },
  { id: "export-code", title: "Export Preview", closable: false },
];

/** The inspector's tabs for an edition: Design, Motion and Code; Debug in the full edition. */
export function rightTabsFor(edition: Edition): PanelTab[] {
  return inspectorTabsFor(edition).map((t) => ({ id: t.id, title: t.title, closable: false }));
}
