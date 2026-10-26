/**
 * Between our editable paths (`pathData.ts`: subpaths of nodes with absolute bezier handles, Phases 39–40) and the
 * curve paths the FigCraft-port geometry works on (`geometry/bezpath.ts`).
 */
import { BezPath } from "../geometry/bezpath";
import { parsePathData, type SubPath } from "./pathData";

/** Subpaths of nodes as a curve path: a segment is a cubic when either end has a handle, else a line. */
export function subPathsToBez(subpaths: readonly SubPath[]): BezPath {
  const out = new BezPath();
  for (const sp of subpaths) {
    const n = sp.nodes;
    if (n.length === 0) continue;
    out.moveTo({ x: n[0].x, y: n[0].y });
    const count = sp.closed ? n.length : n.length - 1;
    for (let i = 0; i < count; i++) {
      const a = n[i];
      const b = n[(i + 1) % n.length];
      if (a.hout || b.hin) out.curveTo(a.hout ?? { x: a.x, y: a.y }, b.hin ?? { x: b.x, y: b.y }, { x: b.x, y: b.y });
      else out.lineTo({ x: b.x, y: b.y });
    }
    if (sp.closed) out.closePath();
  }
  return out;
}

/** SVG path data as a curve path; null when it doesn't parse. */
export function pathDataToBez(d: string): BezPath | null {
  const sp = parsePathData(d);
  return sp ? subPathsToBez(sp) : null;
}
