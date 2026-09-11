"use client";

/**
 * ============================================================================
 * DETACHED PANEL PAGE (DYNAMIC ROUTE)
 * ============================================================================
 * UI Element: Detached Panel Viewer
 * Screen / Scope: `/editor/detach/[panelId]`
 * Role: Reads the panelId from URL params and renders the corresponding panel
 *       component inside the DetachedPanelShell.
 *
 * ARCHITECTURE NOTE:
 * This is a client component that dynamically maps panelId to the correct
 * panel React component. Supported panels: blueprint, sequencer.
 * ============================================================================
 */

import React, { use } from "react";
import { DetachedPanelShell } from "@/editor/shell/DetachedPanelShell";
import { BlueprintCanvas } from "@/editor/panels/blueprint/BlueprintCanvas";
import { TimelineSequencer } from "@/editor/panels/sequencer/TimelineSequencer";
import { OutputConsole } from "@/editor/panels/console/OutputConsole";
import { ContentBrowser } from "@/editor/panels/content-browser/ContentBrowser";
import { DatabaseDesigner } from "@/editor/panels/database/DatabaseDesigner";
import { AssetFileEditor } from "@/editor/panels/content-browser/AssetFileEditor";

const PANEL_MAP: Record<string, { title: string; component: React.FC<any> }> = {
  blueprint: { title: "Logic Blueprint", component: BlueprintCanvas },
  sequencer: { title: "Timeline Sequencer", component: TimelineSequencer },
  console: { title: "Output Log", component: OutputConsole },
  "content-browser": { title: "Content Browser", component: ContentBrowser },
  "er-modeler": { title: "Database Studio", component: DatabaseDesigner },
};

export default function DetachPage({
  params,
}: {
  params: Promise<{ panelId: string }>;
}) {
  const { panelId } = use(params);
  const panel = PANEL_MAP[panelId];

  if (panel) {
    const PanelComponent = panel.component;
    return (
      <DetachedPanelShell panelId={panelId} panelTitle={panel.title}>
        <PanelComponent />
      </DetachedPanelShell>
    );
  }

  // Dynamic asset/component title formatting
  const formattedTitle = panelId
    .replace(/^ast_/, "")
    .replace(/^comp_/, "")
    .replace(/^page_/, "")
    .replace(/^bp_/, "")
    .replace(/^db_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <DetachedPanelShell panelId={panelId} panelTitle={`${formattedTitle} Asset`}>
      <AssetFileEditor assetId={panelId} assetTitle={`${formattedTitle}.tsx`} />
    </DetachedPanelShell>
  );
}
