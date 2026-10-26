import type { ReactNode } from "react";
import type { Layer } from "../document/schema";
import type { PropValue } from "../document/registry";

/** A layer's props with the archetype's defaults filled in, read through typed accessors. */
export interface ResolvedProps {
  get: (path: string) => PropValue | undefined;
  str: (path: string, fallback: string) => string;
  num: (path: string, fallback: number) => number;
  bool: (path: string, fallback: boolean) => boolean;
}

/** What the surrounding layout asks of a child (a parent's flex direction decides what "fill" means). */
export interface RenderContext {
  /** Replaces `{{name}}` references in text; the identity when omitted. */
  interpolate?: (text: string) => string;
  /** The parent's main axis; `fill` on that axis grows, on the other it stretches. */
  parentDirection?: "row" | "column" | "grid";
  /**
   * The stage is one frame's own frame element (Phase 21): its position on the canvas is the element's,
   * so the top-level layer is drawn at the element's origin instead of at its own `frame.x` / `frame.y`.
   */
  frameAtOrigin?: boolean;
  /**
   * Every layer, when the tree is drawn from a map rather than the live store (the exporter, the gallery, tests): a
   * boolean group reads its operands from here (FigCraft port F5). On the stage the group subscribes to the store.
   */
  layers?: Readonly<Record<string, import("../document/schema").Layer>>;
}

/** Every render definition has this shape: draw `layer` from its resolved props (Phase 17, Law 11). */
export interface ArchetypeRenderProps {
  layer: Layer;
  resolved: ResolvedProps;
  ctx: RenderContext;
  children?: ReactNode;
  /** Receives the element the layer is drawn into (and null when it goes), for the `LayerNodeRegistry` (Phase 19). */
  nodeRef?: (element: Element | null) => void;
}
