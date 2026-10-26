/**
 * Live boolean groups (FigCraft port F5). A boolean group is a container with `boolean.operation`: its children stay
 * layers of their own (move, resize, edit their points, recolour one) and the group draws the combined shape, redrawn
 * as they change. Each operand above the bottom one combines with what is below by its own `boolean.operandOp`, or
 * the group's operation.
 *
 * - `makeBooleanGroup` wraps the selection into a new group with an operation (the group takes the bottom operand's
 *   fill and stroke, as Figma's does).
 * - `setBooleanOperation`: with one boolean group selected, sets the group's operation (operands follow it again);
 *   with operands selected, sets theirs; otherwise wraps the selection.
 * - `flattenBooleanGroup` replaces a group with one path layer of its result.
 *
 * Behaviour translated from FigCraft (`crates/engine/src/booleans.rs`), commit 6ea44e9. MIT, Copyright (c) 2026
 * ArtCraft Team and the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 */

import type { Layer } from "../document/schema";
import type { PathBoolOp } from "../paths/pathOps";
import { fromPath, serializeNetwork } from "../paths/vectorNetwork";
import { documentCommands } from "../store/useDocumentStore";
import { getDocument } from "../store/documentState";
import { useSelectionStore } from "../store/useSelectionStore";
import { groupLayers, setLayerProps, transaction } from "./editOps";
import { booleanGroupResult, isBooleanGroup, isBooleanOp, layerSize } from "./layerOutline";

const layers = () => getDocument().layers;
const LABEL: Record<PathBoolOp, string> = { union: "Union", subtract: "Subtract", intersect: "Intersect", exclude: "Exclude" };

/** The boolean group a layer is an operand of, if any. */
export function groupOf(id: string): string | null {
  const parent = layers()[id]?.parentId;
  return parent && isBooleanGroup(layers()[parent]) ? parent : null;
}

/** How an operand combines with the ones below it: its own operation or its group's; null outside boolean groups. */
export function operandOp(id: string): PathBoolOp | null {
  const g = groupOf(id);
  const own = layers()[id]?.properties["boolean.operandOp"];
  const group = g ? layers()[g].properties["boolean.operation"] : null;
  if (!isBooleanOp(group)) return null;
  return isBooleanOp(own) ? own : group;
}

/** The operation the boolean controls show: the group's for a lone group, the operands' when they share one. */
export function shownOp(ids: readonly string[]): PathBoolOp | null {
  if (ids.length === 1 && isBooleanGroup(layers()[ids[0]])) return layers()[ids[0]].properties["boolean.operation"] as PathBoolOp;
  const ops = ids.map(operandOp);
  return ops.length > 0 && ops[0] !== null && ops.every((o) => o === ops[0]) ? ops[0] : null;
}

/** The style a new group takes from its bottom operand: a shape's fill becomes the group's fill, its stroke the group's border. */
function styleFrom(bottom: Layer | undefined): Record<string, string | number> {
  if (!bottom) return { "paint.fills": JSON.stringify([{ type: "solid", color: "#d9d9d9" }]) };
  const p = bottom.properties;
  const fills = typeof p["paint.fills"] === "string" && p["paint.fills"] ? p["paint.fills"] : null;
  const plain = typeof p["svg.fill"] === "string" && p["svg.fill"] !== "none" ? p["svg.fill"] : typeof p["appearance.background.color"] === "string" ? p["appearance.background.color"] : "#d9d9d9";
  const out: Record<string, string | number> = { "paint.fills": fills ?? JSON.stringify([{ type: "solid", color: plain }]) };
  if (typeof p["svg.stroke"] === "string" && p["svg.stroke"] !== "none" && typeof p["svg.strokeWidth"] === "number" && p["svg.strokeWidth"] > 0) {
    out["appearance.border.color"] = p["svg.stroke"];
    out["appearance.border.width"] = p["svg.strokeWidth"];
    out["appearance.border.style"] = "solid";
  }
  return out;
}

/** Wraps `ids` (siblings, or layers kept in place under the first one's parent) into a new boolean group. Returns its id. */
export function makeBooleanGroup(ids: readonly string[], op: PathBoolOp): string | null {
  if (ids.length < 2) return null;
  return transaction(LABEL[op], () => {
    const g = groupLayers(ids, "group");
    if (!g) return null;
    const children = layers()[g].children;
    documentCommands.updateProps(g, { "boolean.operation": op, ...styleFrom(layers()[children[0]]) });
    documentCommands.renameLayer(g, LABEL[op]);
    for (const c of children) if (layers()[c]?.properties["boolean.operandOp"]) documentCommands.updateProps(c, { "boolean.operandOp": "" });
    return g;
  });
}

/** See the module notes. Returns how many layers changed (or the new group's id when the selection was wrapped). */
export function setBooleanOperation(ids: readonly string[], op: PathBoolOp): number | string | null {
  const l = layers();
  if (ids.length === 1 && isBooleanGroup(l[ids[0]])) {
    const g = ids[0];
    return transaction(LABEL[op], () => {
      let n = setLayerProps([g], { "boolean.operation": op }, LABEL[op]);
      for (const c of l[g].children) if (l[c]?.properties["boolean.operandOp"]) n += setLayerProps([c], { "boolean.operandOp": "" }, LABEL[op]);
      return n;
    });
  }
  if (ids.length > 0 && ids.every((id) => groupOf(id) !== null)) {
    return transaction(LABEL[op], () =>
      ids.reduce((n, id) => {
        const group = l[groupOf(id)!].properties["boolean.operation"];
        return n + setLayerProps([id], { "boolean.operandOp": op === group ? "" : op }, LABEL[op]);
      }, 0),
    );
  }
  return makeBooleanGroup(ids, op);
}

/** Replaces each boolean group in `ids` with one path layer of its result (a vector network, fill rule kept). Returns the new layers. */
export function flattenBooleanGroups(ids: readonly string[]): string[] {
  const out: string[] = [];
  transaction("Flatten", () => {
    for (const id of ids) {
      const g = layers()[id];
      if (!isBooleanGroup(g) || !g.parentId) continue;
      const result = booleanGroupResult(g, layers());
      const { w, h } = layerSize(g);
      if (!result || w <= 0 || h <= 0) continue;
      const unit = result.map((p) => ({ x: (p.x / w) * 200, y: (p.y / h) * 200 }));
      const net = fromPath(unit);
      for (const r of net.regions) r.winding = "evenodd";
      const parent = layers()[g.parentId];
      const index = parent.children.indexOf(id);
      const p = g.properties;
      const fills = typeof p["paint.fills"] === "string" ? p["paint.fills"] : "";
      const created = documentCommands.addLayer(
        {
          archetype: "svgPath",
          parentId: g.parentId,
          name: g.name ?? "Path",
          index,
          properties: {
            positioning: "absolute",
            "frame.x": p["frame.x"] ?? 0,
            "frame.y": p["frame.y"] ?? 0,
            "frame.width": w,
            "frame.height": h,
            ...(typeof p["frame.rotation"] === "number" ? { "frame.rotation": p["frame.rotation"] } : {}),
            "svg.network": serializeNetwork(net),
            "svg.path": unit.toSvg(3),
            "svg.fillRule": "evenodd",
            "svg.fill": "#d9d9d9",
            ...(fills ? { "paint.fills": fills } : {}),
            "svg.stroke": typeof p["appearance.border.color"] === "string" && Number(p["appearance.border.width"]) > 0 ? p["appearance.border.color"] : "none",
            "svg.strokeWidth": Number(p["appearance.border.width"]) || 0,
          },
        },
        "Flatten",
      );
      documentCommands.removeLayer(id);
      out.push(created);
    }
    if (out.length) useSelectionStore.getState().selectMultiple(out, "element");
  });
  return out;
}
