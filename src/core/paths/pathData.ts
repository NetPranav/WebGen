/**
 * ============================================================================
 * SVG PATH DATA AND SHAPES AS NODES (ROADMAP Phase 40)
 * ============================================================================
 * Reads the `d` of an SVG path (every command, absolute and relative: M L H V C S Q T A Z) into subpaths of nodes
 * with bezier handles, and turns the basic SVG shapes (rect, circle, ellipse, line, polyline, polygon) into the
 * same thing, so an imported SVG becomes editable vectors. Arcs and quadratics become cubics. Pure functions.
 * ============================================================================
 */

import type { PathNode, Vec } from "./pathFit";

export interface SubPath {
  nodes: PathNode[];
  closed: boolean;
}

/** A circle's quarter arc as a cubic: the distance of a handle from its node, in radii. */
export const KAPPA = 0.5522847498307936;

const COUNTS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };

/** Splits path data into commands with their numbers. Arc flags may run into the next number ("a1 1 0 011 1"). */
function tokenise(d: string): { cmd: string; args: number[] }[] | null {
  const out: { cmd: string; args: number[] }[] = [];
  let i = 0;
  const n = d.length;
  const skip = () => {
    while (i < n && /[\s,]/.test(d[i])) i++;
  };
  const number = (): number | null => {
    skip();
    const m = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(d.slice(i, i + 40));
    if (!m) return null;
    i += m[0].length;
    return Number(m[0]);
  };
  const flag = (): number | null => {
    skip();
    if (d[i] === "0" || d[i] === "1") return Number(d[i++]);
    return null;
  };
  let cmd = "";
  skip();
  while (i < n) {
    skip();
    if (i >= n) break;
    const ch = d[i];
    if (/[a-zA-Z]/.test(ch)) {
      if (!(ch.toLowerCase() in COUNTS)) return null;
      cmd = ch;
      i++;
      if (ch.toLowerCase() === "z") {
        out.push({ cmd, args: [] });
        continue;
      }
    } else if (!cmd || cmd.toLowerCase() === "z") {
      return null;
    }
    const need = COUNTS[cmd.toLowerCase()];
    const args: number[] = [];
    for (let k = 0; k < need; k++) {
      const isFlag = cmd.toLowerCase() === "a" && (k === 3 || k === 4);
      const v = isFlag ? flag() : number();
      if (v === null) return null;
      args.push(v);
    }
    out.push({ cmd, args });
    // further coordinate pairs repeat the command (a moveto's become linetos)
    if (cmd === "M") cmd = "L";
    else if (cmd === "m") cmd = "l";
  }
  return out;
}

/** An SVG arc as cubic beziers (endpoint to centre parameterisation, each piece at most a quarter turn). */
function arcToCubics(p0: Vec, rx: number, ry: number, rotDeg: number, large: number, sweep: number, p1: Vec): [Vec, Vec, Vec][] {
  if ((p0.x === p1.x && p0.y === p1.y) || rx === 0 || ry === 0) return [[p0, p1, p1]];
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const phi = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (p0.x - p1.x) / 2;
  const dy = (p0.y - p1.y) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;
  const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const co = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (co * rx * y1) / ry;
  const cyp = (-co * ry * x1) / rx;
  const cx = cos * cxp - sin * cyp + (p0.x + p1.x) / 2;
  const cy = sin * cxp + cos * cyp + (p0.y + p1.y) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const th1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry);
  let dth = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
  if (!sweep && dth > 0) dth -= 2 * Math.PI;
  if (sweep && dth < 0) dth += 2 * Math.PI;
  const pieces = Math.max(1, Math.ceil(Math.abs(dth) / (Math.PI / 2) - 1e-9));
  const step = dth / pieces;
  const k = (4 / 3) * Math.tan(step / 4);
  const at = (t: number): Vec => ({ x: cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, y: cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos });
  const dv = (t: number): Vec => ({ x: -rx * Math.sin(t) * cos - ry * Math.cos(t) * sin, y: -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos });
  const out: [Vec, Vec, Vec][] = [];
  for (let i = 0; i < pieces; i++) {
    const a = th1 + i * step;
    const b = a + step;
    const pa = at(a);
    const pb = i === pieces - 1 ? p1 : at(b);
    const da = dv(a);
    const db = dv(b);
    out.push([
      { x: pa.x + k * da.x, y: pa.y + k * da.y },
      { x: pb.x - k * db.x, y: pb.y - k * db.y },
      pb,
    ]);
  }
  return out;
}

const same = (a: Vec, b: Vec) => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;

/** Path data to subpaths. Returns null for data that doesn't parse. */
export function parsePathData(d: string): SubPath[] | null {
  const tokens = tokenise(d);
  if (!tokens || tokens.length === 0) return null;
  const subs: SubPath[] = [];
  let cur: PathNode[] = [];
  let at: Vec = { x: 0, y: 0 };
  let start: Vec = { x: 0, y: 0 };
  let lastCubic = null as Vec | null; // the previous cubic's second control point, for S
  let lastQuad = null as Vec | null; // and the quad's control, for T
  const finish = (closed: boolean) => {
    if (cur.length === 0) return;
    if (closed && cur.length > 1 && same(cur[cur.length - 1], cur[0])) {
      const last = cur.pop()!;
      if (last.hin) cur[0] = { ...cur[0], hin: last.hin };
    }
    if (cur.length >= 2 || (cur.length === 1 && false)) subs.push({ nodes: cur, closed: closed && cur.length > 2 });
    cur = [];
  };
  const lineTo = (p: Vec) => {
    cur.push({ x: p.x, y: p.y });
    at = p;
  };
  const cubicTo = (c1: Vec, c2: Vec, p: Vec) => {
    const prev = cur[cur.length - 1];
    if (prev) cur[cur.length - 1] = { ...prev, hout: c1 };
    cur.push({ x: p.x, y: p.y, hin: c2 });
    at = p;
    lastCubic = c2;
  };
  for (const { cmd, args } of tokens) {
    const rel = cmd === cmd.toLowerCase();
    const c = cmd.toLowerCase();
    const ox = rel ? at.x : 0;
    const oy = rel ? at.y : 0;
    if (c !== "c" && c !== "s") lastCubic = null;
    if (c !== "q" && c !== "t") lastQuad = null;
    switch (c) {
      case "m": {
        finish(false);
        const p = { x: args[0] + ox, y: args[1] + oy };
        cur = [{ x: p.x, y: p.y }];
        at = p;
        start = p;
        break;
      }
      case "l":
        if (cur.length === 0) cur = [{ x: at.x, y: at.y }];
        lineTo({ x: args[0] + ox, y: args[1] + oy });
        break;
      case "h":
        if (cur.length === 0) cur = [{ x: at.x, y: at.y }];
        lineTo({ x: args[0] + ox, y: at.y });
        break;
      case "v":
        if (cur.length === 0) cur = [{ x: at.x, y: at.y }];
        lineTo({ x: at.x, y: args[0] + oy });
        break;
      case "c":
        if (cur.length === 0) cur = [{ x: at.x, y: at.y }];
        cubicTo({ x: args[0] + ox, y: args[1] + oy }, { x: args[2] + ox, y: args[3] + oy }, { x: args[4] + ox, y: args[5] + oy });
        break;
      case "s": {
        if (cur.length === 0) cur = [{ x: at.x, y: at.y }];
        const lc = lastCubic as Vec | null;
        const c1: Vec = lc ? { x: 2 * at.x - lc.x, y: 2 * at.y - lc.y } : { x: at.x, y: at.y };
        cubicTo(c1, { x: args[0] + ox, y: args[1] + oy }, { x: args[2] + ox, y: args[3] + oy });
        break;
      }
      case "q":
      case "t": {
        if (cur.length === 0) cur = [{ x: at.x, y: at.y }];
        const p0 = at;
        const q: Vec = c === "q" ? { x: args[0] + ox, y: args[1] + oy } : (lastQuad as Vec | null) ? { x: 2 * at.x - (lastQuad as Vec).x, y: 2 * at.y - (lastQuad as Vec).y } : { x: at.x, y: at.y };
        const p: Vec = c === "q" ? { x: args[2] + ox, y: args[3] + oy } : { x: args[0] + ox, y: args[1] + oy };
        cubicTo({ x: p0.x + (2 / 3) * (q.x - p0.x), y: p0.y + (2 / 3) * (q.y - p0.y) }, { x: p.x + (2 / 3) * (q.x - p.x), y: p.y + (2 / 3) * (q.y - p.y) }, p);
        lastCubic = null;
        lastQuad = q;
        break;
      }
      case "a": {
        if (cur.length === 0) cur = [{ x: at.x, y: at.y }];
        const p = { x: args[5] + ox, y: args[6] + oy };
        for (const [c1, c2, e] of arcToCubics(at, args[0], args[1], args[2], args[3], args[4], p)) cubicTo(c1, c2, e);
        lastCubic = null;
        break;
      }
      case "z":
        finish(true);
        at = start;
        // a drawing command after Z starts a new subpath at the start point
        break;
    }
  }
  finish(false);
  return subs.length > 0 ? subs : null;
}

// --- basic shapes ------------------------------------------------------------

const corner = (x: number, y: number): PathNode => ({ x, y });

export function rectSubPath(x: number, y: number, w: number, h: number, rx = 0, ry = rx): SubPath {
  rx = Math.max(0, Math.min(rx, w / 2));
  ry = Math.max(0, Math.min(ry, h / 2));
  if (rx === 0 || ry === 0) return { nodes: [corner(x, y), corner(x + w, y), corner(x + w, y + h), corner(x, y + h)], closed: true };
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  // eight nodes, each corner an arc between two of them
  return {
    closed: true,
    nodes: [
      { x: x + rx, y, hin: { x: x + rx - kx, y } },
      { x: x + w - rx, y, hout: { x: x + w - rx + kx, y } },
      { x: x + w, y: y + ry, hin: { x: x + w, y: y + ry - ky } },
      { x: x + w, y: y + h - ry, hout: { x: x + w, y: y + h - ry + ky } },
      { x: x + w - rx, y: y + h, hin: { x: x + w - rx + kx, y: y + h } },
      { x: x + rx, y: y + h, hout: { x: x + rx - kx, y: y + h } },
      { x, y: y + h - ry, hin: { x, y: y + h - ry + ky } },
      { x, y: y + ry, hout: { x, y: y + ry - ky } },
    ],
  };
}

export function ellipseSubPath(cx: number, cy: number, rx: number, ry: number): SubPath {
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  return {
    closed: true,
    nodes: [
      { x: cx, y: cy - ry, hin: { x: cx - kx, y: cy - ry }, hout: { x: cx + kx, y: cy - ry } },
      { x: cx + rx, y: cy, hin: { x: cx + rx, y: cy - ky }, hout: { x: cx + rx, y: cy + ky } },
      { x: cx, y: cy + ry, hin: { x: cx + kx, y: cy + ry }, hout: { x: cx - kx, y: cy + ry } },
      { x: cx - rx, y: cy, hin: { x: cx - rx, y: cy + ky }, hout: { x: cx - rx, y: cy - ky } },
    ],
  };
}

export function polySubPath(points: readonly Vec[], closed: boolean): SubPath | null {
  if (points.length < 2) return null;
  return { nodes: points.map((p) => corner(p.x, p.y)), closed: closed && points.length > 2 };
}

/** The numbers of a `points` attribute as pairs. */
export function parsePoints(s: string): Vec[] {
  const nums = (s.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g) ?? []).map(Number);
  const out: Vec[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) out.push({ x: nums[i], y: nums[i + 1] });
  return out;
}

export const nodeCountOf = (subs: readonly SubPath[]): number => subs.reduce((n, s) => n + s.nodes.length, 0);
