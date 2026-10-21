import type { PropValue } from "../document/registry";
import { documentCommands } from "../store/useDocumentStore";
import type { PathNode } from "./pathFit";
import { buildPath, serializePathNodes } from "./pathLayer";

export interface PathStyle {
  stroke: string;
  strokeWidth: number;
  cap: "butt" | "round" | "square";
  join: "miter" | "round" | "bevel";
  /** The fill a closed path starts with. */
  fill: string;
}

export const PENCIL_STYLE: PathStyle = { stroke: "#0f172a", strokeWidth: 2, cap: "round", join: "round", fill: "#cbd5e1" };
export const PEN_STYLE: PathStyle = { stroke: "#0f172a", strokeWidth: 2, cap: "butt", join: "miter", fill: "#cbd5e1" };

/**
 * Makes the vector layer for a finished path (one undo step): an `svgPath` inside `parent`, framed around the path.
 * `nodes` are in canvas space; `parent.origin` is where the parent's top-left is. A closed path starts with a fill,
 * an open one with none. Returns the layer's id, or null when there is nothing to draw or nowhere to put it.
 */
export function createPathLayer(nodes: readonly PathNode[], closed: boolean, parent: { id: string; origin: { x: number; y: number } } | null, style: PathStyle, name = "Path"): string | null {
  if (nodes.length < 2 || !parent) return null;
  const built = buildPath(nodes, closed, style.strokeWidth);
  const props: Record<string, PropValue> = {
    positioning: "absolute",
    "frame.x": Math.round((built.frame.x - parent.origin.x) * 100) / 100,
    "frame.y": Math.round((built.frame.y - parent.origin.y) * 100) / 100,
    "frame.width": built.frame.width,
    "frame.height": built.frame.height,
    "svg.path": built.d,
    "svg.nodes": serializePathNodes(built.nodes, closed),
    "svg.stroke": style.stroke,
    "svg.strokeWidth": style.strokeWidth,
    "svg.strokeLinecap": style.cap,
    "svg.strokeLinejoin": style.join,
    "svg.fill": closed ? style.fill : "none",
  };
  return documentCommands.addLayer({ archetype: "svgPath", parentId: parent.id, name, properties: props }, `Draw ${name.toLowerCase()}`);
}
