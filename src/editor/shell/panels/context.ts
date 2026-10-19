/**
 * What the shell hands every panel. Panels get callbacks and plain values,
 * never the shell's state setters, so the shell can change how it stores
 * layout (Phase 14) without touching a panel.
 */
export interface SelectedElement {
  id: string;
  name: string;
}

export interface PanelContext {
  selectedElement: SelectedElement | null;
  setSelectedElement: (element: SelectedElement | null) => void;
  /** Opens a panel as a full-page tab. */
  dockFullPage: (panelId: string, title: string) => void;
  /** Starts dragging a file or item out of its panel (tear-off). */
  startGenericTearOff: (panelId: string, title: string, originX: number, originY: number) => void;
  /** Opens the bottom drawer on a tab. */
  showBottomTab: (tabId: string) => void;
  /** Switches the bottom drawer's tab without opening or closing it. */
  setBottomTab: (tabId: string) => void;
  collapseBottom: () => void;
  focusedBlueprintNodeId: string | null;
  focusBlueprintNode: (nodeId: string) => void;
  isDirty: boolean;
  save: () => void;
  deviceMode: "desktop" | "tablet" | "mobile";
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  closeSettings: () => void;
}
