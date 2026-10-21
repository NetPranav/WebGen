/**
 * ROADMAP Phase 14: every panel the shell can show, registered in one place.
 * Three panels are in every default layout (the stage, Details, Content
 * Browser) and are imported statically; everything else is fetched the first
 * time it is shown. The After-track panels come from `afterTrackPanels.tsx`,
 * which gates them by edition (Phase 6); they are `edition: "full"` here too.
 */
import { WhiteboardCanvas } from "@/editor/canvas/WhiteboardCanvas";
import { DetailsInspector } from "@/editor/panels/details/DetailsInspector";
import { ContentBrowser } from "@/editor/panels/content-browser/ContentBrowser";
import { LayersPanel } from "@/editor/panels/layers/LayersPanel";
import { AssetsPanel } from "@/editor/panels/assets/AssetsPanel";
import { BlueprintCanvas, ExecutionTracePanel, PagesManager, DeploymentDashboard, PluginManager, VersionControlPanel } from "../afterTrackPanels";
import { registerPanel } from "./registry";
import type { PanelContext } from "./context";

const lc = (s: string) => s.toLowerCase();

/** Props for the stage, which is the same in the center zone and in the full-page "viewport" tab. */
const stageProps = (c: PanelContext) => ({
  deviceMode: c.deviceMode,
  onSelectElement: c.setSelectedElement,
  onDropAsset: (asset: { id: string; name: string }) => c.setSelectedElement({ id: asset.id, name: asset.name }),
  onOpenExecutionTrace: () => c.showBottomTab("trace"),
});

const detailsProps = (c: PanelContext) => ({
  selectedElementId: c.selectedElement?.id || null,
  selectedElementName: c.selectedElement?.name || "",
  onOpenBlueprint: () => c.dockFullPage("blueprint", "Logic Blueprint"),
  onDeselect: () => c.setSelectedElement(null),
});

const contentBrowserProps = (c: PanelContext, zone: "bottom" | "fullpage") => ({
  selectedFolderId: c.selectedElement?.id || "",
  selectedFolderName: c.selectedElement?.name || "",
  onSelectFolder: (folderId: string, folderName: string) => c.setSelectedElement({ id: folderId, name: folderName }),
  onOpenAsset: (id: string, title: string) => c.dockFullPage(id, title),
  onTearOffItem: c.startGenericTearOff,
  ...(zone === "bottom" ? { onSelectElement: c.setSelectedElement } : {}),
  // From the drawer the Curve Editor and Export Preview are sibling tabs; from a full-page tab the drawer must open first.
  onOpenCurveEditor: () => (zone === "bottom" ? c.setBottomTab("sequencer") : c.showBottomTab("sequencer")),
  onOpenExportPreview: () => (zone === "bottom" ? c.setBottomTab("export-code") : c.showBottomTab("export-code")),
});

const traceProps = (c: PanelContext) => ({
  onNavigateToNode: (nodeId: string) => {
    c.focusBlueprintNode(nodeId);
    c.dockFullPage("blueprint", "Logic Blueprint");
  },
});

export function registerBuiltInPanels(): void {
  // ---- center ----
  registerPanel({ id: "viewport", title: "Viewport (Design)", zone: "center", edition: "initial", focusScope: "canvas", component: WhiteboardCanvas, props: stageProps });
  registerPanel({
    id: "settings",
    title: "Project Settings",
    zone: "center",
    edition: "initial",
    load: async () => (await import("@/editor/panels/settings/ProjectSettings")).ProjectSettings,
    props: (c: PanelContext) => ({ onClose: c.closeSettings }),
  });

  // ---- left ----
  registerPanel({ id: "layers", title: "Layers", zone: "left", edition: "initial", focusScope: "canvas", component: LayersPanel });
  registerPanel({ id: "assets", title: "Assets", zone: "left", edition: "initial", component: AssetsPanel });

  // ---- right ----
  // The inspector's tabs (Phase 15): Design · Motion · Code, and Debug in the full edition.
  registerPanel({ id: "design", title: "Design", zone: "right", edition: "initial", component: DetailsInspector, props: detailsProps });
  registerPanel({ id: "tokens", title: "Tokens", zone: "right", edition: "initial", load: async () => (await import("@/editor/panels/tokens/TokenManager")).TokenManager });
  registerPanel({
    id: "motion",
    title: "Motion",
    zone: "right",
    edition: "initial",
    load: async () => (await import("@/editor/panels/motion/MotionInspector")).MotionInspector,
    props: (c: PanelContext) => ({
      selectedElementId: c.selectedElement?.id ?? null,
      selectedElementName: c.selectedElement?.name ?? "",
      onOpenTimeline: () => c.showBottomTab("sequencer"),
    }),
  });
  registerPanel({ id: "code", title: "Code", zone: "right", edition: "initial", load: async () => (await import("@/editor/panels/code-view")).LiveCodeInspector });
  registerPanel({ id: "debug", title: "Debug", zone: "right", edition: "full", load: async () => (await import("@/editor/panels/console/OutputConsole")).OutputConsole });
  // The Output Log drawer renders the console on its own.
  registerPanel({ id: "console", title: "Output Log", zone: "right", edition: "initial", load: async () => (await import("@/editor/panels/console/OutputConsole")).OutputConsole });
  registerPanel({
    id: "asset-details",
    title: "Asset Details",
    zone: "right",
    edition: "initial",
    load: async () => (await import("@/editor/panels/details/AssetDetailsInspector")).AssetDetailsInspector,
    props: (c: PanelContext, t) => ({ panelId: t.panelId, panelTitle: t.title, onOpenBlueprint: () => c.dockFullPage("blueprint", "Logic Blueprint") }),
  });

  // ---- bottom drawer ----
  registerPanel({ id: "content-browser", title: "Content Browser", zone: "bottom", edition: "initial", component: ContentBrowser, props: (c: PanelContext) => contentBrowserProps(c, "bottom") });
  registerPanel({
    id: "export-code",
    title: "Export Preview",
    zone: "bottom",
    edition: "initial",
    load: async () => (await import("@/editor/panels/sequencer/AnimationExportPreview")).AnimationExportPreview,
    props: (c: PanelContext) => ({ elementId: c.selectedElement?.id, elementName: c.selectedElement?.name }),
  });
  registerPanel({ id: "trace", title: "Execution Trace (Debug)", zone: "bottom", edition: "full", component: ExecutionTracePanel, props: traceProps });
  registerPanel({ id: "blueprint", title: "Logic Blueprint", zone: "bottom", edition: "full", focusScope: "blueprint", component: BlueprintCanvas, props: (c: PanelContext) => ({ focusedNodeId: c.focusedBlueprintNodeId, onBackToViewport: c.collapseBottom }) });
  registerPanel({ id: "curves", title: "Curve Editor", zone: "bottom", edition: "initial", load: async () => (await import("@/editor/panels/curves/CurveEditor")).CurveEditor });
  // Phase 61: the layer timeline (rows, bars, work area, markers). The Motion Sequencer stays until Phase 68 retires it.
  registerPanel({ id: "timeline", title: "Layer Timeline", zone: "bottom", edition: "initial", focusScope: "timeline", load: async () => (await import("@/editor/panels/timeline/TimelinePanel")).TimelinePanel });
  registerPanel({ id: "sequencer", title: "Motion Sequencer", zone: "bottom", edition: "initial", focusScope: "timeline", load: async () => (await import("@/editor/panels/sequencer/TimelineSequencer")).TimelineSequencer });

  // ---- full-page tabs (matched in this order; the asset editor is the fallback) ----
  registerPanel({ id: "viewport", title: "Viewport (Design)", zone: "fullpage", edition: "initial", focusScope: "canvas", component: WhiteboardCanvas, props: stageProps });
  registerPanel({ id: "content-browser", title: "Content Browser", zone: "fullpage", edition: "initial", component: ContentBrowser, props: (c: PanelContext) => contentBrowserProps(c, "fullpage") });
  registerPanel({
    id: "blueprint",
    title: "Logic Blueprint",
    zone: "fullpage",
    edition: "full",
    focusScope: "blueprint",
    component: BlueprintCanvas,
    props: (c: PanelContext) => ({ focusedNodeId: c.focusedBlueprintNodeId }),
    match: (id, title) => id.includes("bp") || lc(title).includes(".bp"),
  });
  registerPanel({ id: "trace", title: "Execution Trace", zone: "fullpage", edition: "full", component: ExecutionTracePanel, props: traceProps });
  registerPanel({ id: "copilot", title: "LazyLayout AI", zone: "fullpage", edition: "initial", load: async () => (await import("@/editor/panels/copilot/AiPromptBar")).AiPromptBar });
  registerPanel({ id: "curves", title: "Curve Editor", zone: "fullpage", edition: "initial", load: async () => (await import("@/editor/panels/curves/CurveEditor")).CurveEditor });
  registerPanel({
    id: "sequencer",
    title: "Timeline Sequencer",
    zone: "fullpage",
    edition: "initial",
    focusScope: "timeline",
    load: async () => (await import("@/editor/panels/sequencer/TimelineSequencer")).TimelineSequencer,
    match: (id, title) => id.includes("seq") || lc(title).includes(".seq"),
  });
  registerPanel({ id: "console", title: "Output Log", zone: "fullpage", edition: "initial", load: async () => (await import("@/editor/panels/console/OutputConsole")).OutputConsole });
  registerPanel({
    id: "code",
    title: "Live Code Inspector",
    zone: "fullpage",
    edition: "initial",
    load: async () => (await import("@/editor/panels/code-view")).LiveCodeInspector,
    match: (id, title) => id === "code-view" || lc(title).includes("code"),
  });
  registerPanel({
    id: "pages-manager",
    title: "Pages & Routing Manager",
    zone: "fullpage",
    edition: "full",
    component: PagesManager,
    match: (id, title) => id === "sitemap" || id === "pages" || lc(title).includes("pages"),
  });
  registerPanel({
    id: "deploy",
    title: "Deployment & Cloud Studio",
    zone: "fullpage",
    edition: "full",
    component: DeploymentDashboard,
    match: (id, title) => id === "deployment" || lc(title).includes("deploy"),
  });
  registerPanel({
    id: "search",
    title: "Global Search",
    zone: "fullpage",
    edition: "initial",
    load: async () => (await import("@/editor/panels/global-search")).GlobalSearchPanel,
    props: (c: PanelContext) => ({ onNavigate: (id: string, title?: string) => c.dockFullPage(id, title || id) }),
    match: (id, title) => id === "global-search" || lc(title).includes("search"),
  });
  registerPanel({
    id: "plugins",
    title: "Plugin Manager",
    zone: "fullpage",
    edition: "full",
    component: PluginManager,
    match: (id, title) => id === "plugin-manager" || lc(title).includes("plugin"),
  });
  registerPanel({
    id: "history",
    title: "Undo History",
    zone: "fullpage",
    edition: "initial",
    load: async () => (await import("@/editor/panels/history")).UndoHistoryPanel,
    match: (id, title) => id === "undo-history" || lc(title).includes("history"),
  });
  registerPanel({
    id: "versioning",
    title: "Version Control & Snapshots",
    zone: "fullpage",
    edition: "full",
    component: VersionControlPanel,
    match: (id, title) => id === "version-control" || lc(title).includes("version"),
  });
  registerPanel({
    id: "dependencies",
    title: "Reference Viewer & Dependency Graph",
    zone: "fullpage",
    edition: "initial",
    load: async () => (await import("@/editor/panels/dependencies")).ReferenceViewerPanel,
    match: (id, title) => id === "reference-viewer" || lc(title).includes("depend") || lc(title).includes("reference"),
  });
  registerPanel({
    id: "asset-file",
    title: "Asset",
    zone: "fullpage",
    edition: "initial",
    load: async () => (await import("@/editor/panels/content-browser/AssetFileEditor")).AssetFileEditor,
    props: (c: PanelContext, t) => ({
      assetId: t.panelId,
      assetTitle: t.title,
      isDirty: c.isDirty,
      onSave: c.save,
      onSwitchToBlueprint: () => c.dockFullPage("blueprint", "Logic Blueprint"),
    }),
    match: () => true,
  });
}
