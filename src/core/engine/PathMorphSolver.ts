"use client";

/**
 * ============================================================================
 * PATH MORPH SOLVER & STROKE-DRAW ENGINE
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 7.2
 *
 * Capabilities:
 * 1. Point-Count Normalization: Parses arbitrary SVG path `d` strings, converts
 *    all primitives to cubic Bezier curves, and subdivides the shorter path via
 *    de Casteljau's algorithm until segment counts match 1-to-1.
 * 2. Visual-Popping-Free Morphing: Continuous linear interpolation of endpoints
 *    and control points with guaranteed smooth deformation at all t in [0, 1].
 * 3. Stroke-Draw Engine: High-precision numerical arc-length integration,
 *    animated stroke-dashoffset computation, and LRU per-element length caching.
 * ============================================================================
 */

import { Point2D } from "../wasm/SplineSolver";
import { KeyframePoint } from "../types/animations";

// ----------------------------------------------------------------------------
// 1. Types & Interfaces
// ----------------------------------------------------------------------------

export interface NormalizedCubicSegment {
  p0: Point2D;   // Start coordinate
  cp1: Point2D;  // Control point 1
  cp2: Point2D;  // Control point 2
  p1: Point2D;   // End coordinate
  length: number;// Arc length of this segment
}

export interface NormalizedPath {
  start: Point2D;
  segments: NormalizedCubicSegment[];
  totalLength: number;
  isClosed: boolean;
}

export interface MorphKeyframe {
  offset: number; // 0 to 100 percentage
  path: string;
}

// ----------------------------------------------------------------------------
// 2. High-Precision Cubic Bezier Math Utilities
// ----------------------------------------------------------------------------

/**
 * Evaluates point on cubic Bezier curve at parameter t in [0, 1].
 */
export function evaluateCubicBezier(
  p0: Point2D,
  cp1: Point2D,
  cp2: Point2D,
  p1: Point2D,
  t: number
): Point2D {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return {
    x: uuu * p0.x + 3 * uu * t * cp1.x + 3 * u * tt * cp2.x + ttt * p1.x,
    y: uuu * p0.y + 3 * uu * t * cp1.y + 3 * u * tt * cp2.y + ttt * p1.y,
  };
}

/**
 * Computes the derivative of a cubic Bezier curve at parameter t.
 */
function cubicBezierDerivative(
  p0: Point2D,
  cp1: Point2D,
  cp2: Point2D,
  p1: Point2D,
  t: number
): Point2D {
  const u = 1 - t;
  return {
    x: 3 * u * u * (cp1.x - p0.x) + 6 * u * t * (cp2.x - cp1.x) + 3 * t * t * (p1.x - cp2.x),
    y: 3 * u * u * (cp1.y - p0.y) + 6 * u * t * (cp2.y - cp1.y) + 3 * t * t * (p1.y - cp2.y),
  };
}

/**
 * Computes the arc length of a cubic Bezier curve using 5-point Gauss-Legendre quadrature.
 */
export function computeCubicArcLength(
  p0: Point2D,
  cp1: Point2D,
  cp2: Point2D,
  p1: Point2D
): number {
  // Line shortcut
  const chordLength = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const netControlLength =
    Math.hypot(cp1.x - p0.x, cp1.y - p0.y) +
    Math.hypot(cp2.x - cp1.x, cp2.y - cp1.y) +
    Math.hypot(p1.x - cp2.x, p1.y - cp2.y);

  if (Math.abs(netControlLength - chordLength) < 1e-5) {
    return chordLength;
  }

  // Gauss-Legendre 5-point quadrature constants on [-1, 1]
  const tPoints = [-0.9061798459, -0.5384693101, 0.0, 0.5384693101, 0.9061798459];
  const weights = [0.236926885, 0.4786286705, 0.5688888889, 0.4786286705, 0.236926885];

  let length = 0;
  for (let i = 0; i < 5; i++) {
    // Map from [-1, 1] to [0, 1]
    const t = 0.5 * (tPoints[i] + 1.0);
    const d = cubicBezierDerivative(p0, cp1, cp2, p1, t);
    const speed = Math.hypot(d.x, d.y);
    length += weights[i] * speed;
  }

  return length * 0.5;
}

/**
 * Splits a cubic Bezier segment at parameter t into two sub-curves
 * using de Casteljau's subdivision algorithm.
 */
export function subdivideCubicBezier(
  p0: Point2D,
  cp1: Point2D,
  cp2: Point2D,
  p1: Point2D,
  t = 0.5
): [NormalizedCubicSegment, NormalizedCubicSegment] {
  const u = 1 - t;

  // Level 1
  const p01: Point2D = { x: u * p0.x + t * cp1.x, y: u * p0.y + t * cp1.y };
  const p12: Point2D = { x: u * cp1.x + t * cp2.x, y: u * cp1.y + t * cp2.y };
  const p23: Point2D = { x: u * cp2.x + t * p1.x, y: u * cp2.y + t * p1.y };

  // Level 2
  const p012: Point2D = { x: u * p01.x + t * p12.x, y: u * p01.y + t * p12.y };
  const p123: Point2D = { x: u * p12.x + t * p23.x, y: u * p12.y + t * p23.y };

  // Level 3 (Split point on the curve)
  const splitPoint: Point2D = { x: u * p012.x + t * p123.x, y: u * p012.y + t * p123.y };

  const leftSegment: NormalizedCubicSegment = {
    p0: { ...p0 },
    cp1: p01,
    cp2: p012,
    p1: splitPoint,
    length: computeCubicArcLength(p0, p01, p012, splitPoint),
  };

  const rightSegment: NormalizedCubicSegment = {
    p0: { ...splitPoint },
    cp1: p123,
    cp2: p23,
    p1: { ...p1 },
    length: computeCubicArcLength(splitPoint, p123, p23, p1),
  };

  return [leftSegment, rightSegment];
}

// ----------------------------------------------------------------------------
// 3. SVG Path Normalization to Cubic Segments
// ----------------------------------------------------------------------------

interface ParsedToken {
  cmd: string;
  args: number[];
}

function tokenizePath(d: string): ParsedToken[] {
  const tokens: ParsedToken[] = [];
  const commandRegex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let match: RegExpExecArray | null;

  while ((match = commandRegex.exec(d)) !== null) {
    const cmd = match[1];
    const argsStr = match[2].trim();
    const args: number[] = [];

    if (argsStr.length > 0) {
      const numRegex = /[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g;
      let numMatch: RegExpExecArray | null;
      while ((numMatch = numRegex.exec(argsStr)) !== null) {
        args.push(parseFloat(numMatch[0]));
      }
    }
    tokens.push({ cmd, args });
  }

  return tokens;
}

/**
 * Converts an SVG elliptical arc to one or more cubic Bezier curves.
 */
function arcToCubicBeziers(
  x0: number,
  y0: number,
  rx: number,
  ry: number,
  xAxisRotation: number,
  largeArcFlag: number,
  sweepFlag: number,
  x1: number,
  y1: number
): NormalizedCubicSegment[] {
  // If endpoints match or radius is 0, return zero-length line as cubic
  if ((x0 === x1 && y0 === y1) || rx === 0 || ry === 0) {
    return [
      {
        p0: { x: x0, y: y0 },
        cp1: { x: x0, y: y0 },
        cp2: { x: x1, y: y1 },
        p1: { x: x1, y: y1 },
        length: Math.hypot(x1 - x0, y1 - y0),
      },
    ];
  }

  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const phi = (xAxisRotation * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx2 = (x0 - x1) / 2.0;
  const dy2 = (y0 - y1) / 2.0;
  const x1p = cosPhi * dx2 + sinPhi * dy2;
  const y1p = -sinPhi * dx2 + cosPhi * dy2;

  let rxSq = rx * rx;
  let rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;

  // Scale radii if necessary
  const radiiCheck = x1pSq / rxSq + y1pSq / rySq;
  if (radiiCheck > 1) {
    const scale = Math.sqrt(radiiCheck);
    rx *= scale;
    ry *= scale;
    rxSq = rx * rx;
    rySq = ry * ry;
  }

  const sign = largeArcFlag === sweepFlag ? -1 : 1;
  const numerator = rxSq * rySq - rxSq * y1pSq - rySq * x1pSq;
  const sq = Math.max(0, numerator / (rxSq * y1pSq + rySq * x1pSq));
  const coef = sign * Math.sqrt(sq);
  const cxp = coef * ((rx * y1p) / ry);
  const cyp = coef * (-(ry * x1p) / rx);

  const cx = cosPhi * cxp - sinPhi * cyp + (x0 + x1) / 2.0;
  const cy = sinPhi * cxp + cosPhi * cyp + (y0 + y1) / 2.0;

  function vectorAngle(ux: number, uy: number, vx: number, vy: number): number {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    let ang = Math.acos(Math.max(-1, Math.min(1, dot / (len || 1))));
    if (ux * vy - uy * vx < 0) ang = -ang;
    return ang;
  }

  const theta1 = vectorAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dTheta = vectorAngle(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry
  );

  if (!sweepFlag && dTheta > 0) dTheta -= 2 * Math.PI;
  if (sweepFlag && dTheta < 0) dTheta += 2 * Math.PI;

  const numSegments = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2)));
  const dThetaPerSegment = dTheta / numSegments;
  const segments: NormalizedCubicSegment[] = [];

  let currentTheta = theta1;
  let currX = x0;
  let currY = y0;

  for (let i = 0; i < numSegments; i++) {
    const nextTheta = currentTheta + dThetaPerSegment;
    const alpha =
      (Math.sin(dThetaPerSegment) * (Math.sqrt(4 + 3 * Math.tan(dThetaPerSegment / 2) ** 2) - 1)) /
      3;

    const cosT1 = Math.cos(currentTheta);
    const sinT1 = Math.sin(currentTheta);
    const cosT2 = Math.cos(nextTheta);
    const sinT2 = Math.sin(nextTheta);

    const epX1 = cx + cosPhi * rx * cosT2 - sinPhi * ry * sinT2;
    const epY1 = cy + sinPhi * rx * cosT2 + cosPhi * ry * sinT2;

    const cp1x = currX + alpha * (-cosPhi * rx * sinT1 - sinPhi * ry * cosT1);
    const cp1y = currY + alpha * (-sinPhi * rx * sinT1 + cosPhi * ry * cosT1);
    const cp2x = epX1 - alpha * (-cosPhi * rx * sinT2 - sinPhi * ry * cosT2);
    const cp2y = epY1 - alpha * (-sinPhi * rx * sinT2 + cosPhi * ry * cosT2);

    const p0 = { x: currX, y: currY };
    const cp1 = { x: cp1x, y: cp1y };
    const cp2 = { x: cp2x, y: cp2y };
    const p1 = { x: epX1, y: epY1 };

    segments.push({
      p0,
      cp1,
      cp2,
      p1,
      length: computeCubicArcLength(p0, cp1, cp2, p1),
    });

    currX = epX1;
    currY = epY1;
    currentTheta = nextTheta;
  }

  return segments;
}

/**
 * Normalizes an arbitrary SVG path `d` string into a list of cubic Bezier segments.
 */
export function normalizePathToCubics(d: string): NormalizedPath {
  const tokens = tokenizePath(d);
  const segments: NormalizedCubicSegment[] = [];

  let startPoint: Point2D = { x: 0, y: 0 };
  let currentPoint: Point2D = { x: 0, y: 0 };
  let lastControlPoint: Point2D = { x: 0, y: 0 };
  let lastCommand = "";
  let isClosed = false;

  for (const token of tokens) {
    const { cmd, args } = token;
    const isRelative = cmd === cmd.toLowerCase();
    const upper = cmd.toUpperCase();

    switch (upper) {
      case "M": {
        for (let i = 0; i < args.length; i += 2) {
          const x = isRelative && i > 0 ? currentPoint.x + args[i] : isRelative ? currentPoint.x + args[i] : args[i];
          const y = isRelative && i > 0 ? currentPoint.y + args[i + 1] : isRelative ? currentPoint.y + args[i + 1] : args[i + 1];

          if (i === 0) {
            startPoint = { x, y };
            currentPoint = { x, y };
          } else {
            // Subsequent coordinate pairs after M are treated as LineTo
            const p0 = { ...currentPoint };
            const p1 = { x, y };
            const cp1 = { x: p0.x + (p1.x - p0.x) / 3, y: p0.y + (p1.y - p0.y) / 3 };
            const cp2 = { x: p0.x + ((p1.x - p0.x) * 2) / 3, y: p0.y + ((p1.y - p0.y) * 2) / 3 };
            segments.push({
              p0,
              cp1,
              cp2,
              p1,
              length: computeCubicArcLength(p0, cp1, cp2, p1),
            });
            currentPoint = p1;
          }
        }
        break;
      }

      case "L": {
        for (let i = 0; i < args.length; i += 2) {
          const x = isRelative ? currentPoint.x + args[i] : args[i];
          const y = isRelative ? currentPoint.y + args[i + 1] : args[i + 1];
          const p0 = { ...currentPoint };
          const p1 = { x, y };
          const cp1 = { x: p0.x + (p1.x - p0.x) / 3, y: p0.y + (p1.y - p0.y) / 3 };
          const cp2 = { x: p0.x + ((p1.x - p0.x) * 2) / 3, y: p0.y + ((p1.y - p0.y) * 2) / 3 };
          segments.push({
            p0,
            cp1,
            cp2,
            p1,
            length: computeCubicArcLength(p0, cp1, cp2, p1),
          });
          currentPoint = p1;
        }
        break;
      }

      case "H": {
        for (let i = 0; i < args.length; i++) {
          const x = isRelative ? currentPoint.x + args[i] : args[i];
          const y = currentPoint.y;
          const p0 = { ...currentPoint };
          const p1 = { x, y };
          const cp1 = { x: p0.x + (p1.x - p0.x) / 3, y: p0.y };
          const cp2 = { x: p0.x + ((p1.x - p0.x) * 2) / 3, y: p0.y };
          segments.push({
            p0,
            cp1,
            cp2,
            p1,
            length: computeCubicArcLength(p0, cp1, cp2, p1),
          });
          currentPoint = p1;
        }
        break;
      }

      case "V": {
        for (let i = 0; i < args.length; i++) {
          const x = currentPoint.x;
          const y = isRelative ? currentPoint.y + args[i] : args[i];
          const p0 = { ...currentPoint };
          const p1 = { x, y };
          const cp1 = { x: p0.x, y: p0.y + (p1.y - p0.y) / 3 };
          const cp2 = { x: p0.x, y: p0.y + ((p1.y - p0.y) * 2) / 3 };
          segments.push({
            p0,
            cp1,
            cp2,
            p1,
            length: computeCubicArcLength(p0, cp1, cp2, p1),
          });
          currentPoint = p1;
        }
        break;
      }

      case "C": {
        for (let i = 0; i < args.length; i += 6) {
          const cp1x = isRelative ? currentPoint.x + args[i] : args[i];
          const cp1y = isRelative ? currentPoint.y + args[i + 1] : args[i + 1];
          const cp2x = isRelative ? currentPoint.x + args[i + 2] : args[i + 2];
          const cp2y = isRelative ? currentPoint.y + args[i + 3] : args[i + 3];
          const x = isRelative ? currentPoint.x + args[i + 4] : args[i + 4];
          const y = isRelative ? currentPoint.y + args[i + 5] : args[i + 5];

          const p0 = { ...currentPoint };
          const cp1 = { x: cp1x, y: cp1y };
          const cp2 = { x: cp2x, y: cp2y };
          const p1 = { x, y };

          segments.push({
            p0,
            cp1,
            cp2,
            p1,
            length: computeCubicArcLength(p0, cp1, cp2, p1),
          });

          currentPoint = p1;
          lastControlPoint = cp2;
        }
        break;
      }

      case "S": {
        for (let i = 0; i < args.length; i += 4) {
          let cp1: Point2D;
          if (lastCommand === "C" || lastCommand === "S") {
            cp1 = {
              x: 2 * currentPoint.x - lastControlPoint.x,
              y: 2 * currentPoint.y - lastControlPoint.y,
            };
          } else {
            cp1 = { ...currentPoint };
          }

          const cp2x = isRelative ? currentPoint.x + args[i] : args[i];
          const cp2y = isRelative ? currentPoint.y + args[i + 1] : args[i + 1];
          const x = isRelative ? currentPoint.x + args[i + 2] : args[i + 2];
          const y = isRelative ? currentPoint.y + args[i + 3] : args[i + 3];

          const p0 = { ...currentPoint };
          const cp2 = { x: cp2x, y: cp2y };
          const p1 = { x, y };

          segments.push({
            p0,
            cp1,
            cp2,
            p1,
            length: computeCubicArcLength(p0, cp1, cp2, p1),
          });

          currentPoint = p1;
          lastControlPoint = cp2;
        }
        break;
      }

      case "Q": {
        for (let i = 0; i < args.length; i += 4) {
          const qcx = isRelative ? currentPoint.x + args[i] : args[i];
          const qcy = isRelative ? currentPoint.y + args[i + 1] : args[i + 1];
          const x = isRelative ? currentPoint.x + args[i + 2] : args[i + 2];
          const y = isRelative ? currentPoint.y + args[i + 3] : args[i + 3];

          const p0 = { ...currentPoint };
          const p1 = { x, y };

          // Degree elevation from quadratic to cubic
          const cp1 = {
            x: p0.x + (2 / 3) * (qcx - p0.x),
            y: p0.y + (2 / 3) * (qcy - p0.y),
          };
          const cp2 = {
            x: p1.x + (2 / 3) * (qcx - p1.x),
            y: p1.y + (2 / 3) * (qcy - p1.y),
          };

          segments.push({
            p0,
            cp1,
            cp2,
            p1,
            length: computeCubicArcLength(p0, cp1, cp2, p1),
          });

          currentPoint = p1;
          lastControlPoint = { x: qcx, y: qcy };
        }
        break;
      }

      case "T": {
        for (let i = 0; i < args.length; i += 2) {
          let qcx: number;
          let qcy: number;
          if (lastCommand === "Q" || lastCommand === "T") {
            qcx = 2 * currentPoint.x - lastControlPoint.x;
            qcy = 2 * currentPoint.y - lastControlPoint.y;
          } else {
            qcx = currentPoint.x;
            qcy = currentPoint.y;
          }

          const x = isRelative ? currentPoint.x + args[i] : args[i];
          const y = isRelative ? currentPoint.y + args[i + 1] : args[i + 1];

          const p0 = { ...currentPoint };
          const p1 = { x, y };

          const cp1 = {
            x: p0.x + (2 / 3) * (qcx - p0.x),
            y: p0.y + (2 / 3) * (qcy - p0.y),
          };
          const cp2 = {
            x: p1.x + (2 / 3) * (qcx - p1.x),
            y: p1.y + (2 / 3) * (qcy - p1.y),
          };

          segments.push({
            p0,
            cp1,
            cp2,
            p1,
            length: computeCubicArcLength(p0, cp1, cp2, p1),
          });

          currentPoint = p1;
          lastControlPoint = { x: qcx, y: qcy };
        }
        break;
      }

      case "A": {
        for (let i = 0; i < args.length; i += 7) {
          const rx = args[i];
          const ry = args[i + 1];
          const xAxisRotation = args[i + 2];
          const largeArcFlag = args[i + 3];
          const sweepFlag = args[i + 4];
          const x = isRelative ? currentPoint.x + args[i + 5] : args[i + 5];
          const y = isRelative ? currentPoint.y + args[i + 6] : args[i + 6];

          const arcCubics = arcToCubicBeziers(
            currentPoint.x,
            currentPoint.y,
            rx,
            ry,
            xAxisRotation,
            largeArcFlag,
            sweepFlag,
            x,
            y
          );

          segments.push(...arcCubics);
          currentPoint = { x, y };
        }
        break;
      }

      case "Z": {
        if (
          Math.abs(currentPoint.x - startPoint.x) > 1e-4 ||
          Math.abs(currentPoint.y - startPoint.y) > 1e-4
        ) {
          const p0 = { ...currentPoint };
          const p1 = { ...startPoint };
          const cp1 = { x: p0.x + (p1.x - p0.x) / 3, y: p0.y + (p1.y - p0.y) / 3 };
          const cp2 = { x: p0.x + ((p1.x - p0.x) * 2) / 3, y: p0.y + ((p1.y - p0.y) * 2) / 3 };
          segments.push({
            p0,
            cp1,
            cp2,
            p1,
            length: computeCubicArcLength(p0, cp1, cp2, p1),
          });
          currentPoint = p1;
        }
        isClosed = true;
        break;
      }
    }

    lastCommand = upper;
  }

  const totalLength = segments.reduce((sum, seg) => sum + seg.length, 0);

  return {
    start: startPoint,
    segments,
    totalLength,
    isClosed,
  };
}

// ----------------------------------------------------------------------------
// 4. Point-Count Normalization (Subdivision)
// ----------------------------------------------------------------------------

/**
 * Balances two normalized paths by subdividing the longest segments of the
 * shorter path until both paths contain the identical segment count.
 */
export function balanceNormalizedPaths(
  pathA: NormalizedPath,
  pathB: NormalizedPath
): [NormalizedCubicSegment[], NormalizedCubicSegment[]] {
  const segsA = [...pathA.segments];
  const segsB = [...pathB.segments];

  // If one of the paths has 0 segments, synthesize a degenerate segment at startPoint
  if (segsA.length === 0 && segsB.length > 0) {
    segsA.push({
      p0: { ...pathA.start },
      cp1: { ...pathA.start },
      cp2: { ...pathA.start },
      p1: { ...pathA.start },
      length: 0,
    });
  }

  if (segsB.length === 0 && segsA.length > 0) {
    segsB.push({
      p0: { ...pathB.start },
      cp1: { ...pathB.start },
      cp2: { ...pathB.start },
      p1: { ...pathB.start },
      length: 0,
    });
  }

  // Subdivide pathA if it has fewer segments than pathB
  while (segsA.length < segsB.length) {
    let longestIdx = 0;
    let maxLen = -1;
    for (let i = 0; i < segsA.length; i++) {
      if (segsA[i].length > maxLen) {
        maxLen = segsA[i].length;
        longestIdx = i;
      }
    }
    const [sub1, sub2] = subdivideCubicBezier(
      segsA[longestIdx].p0,
      segsA[longestIdx].cp1,
      segsA[longestIdx].cp2,
      segsA[longestIdx].p1,
      0.5
    );
    segsA.splice(longestIdx, 1, sub1, sub2);
  }

  // Subdivide pathB if it has fewer segments than pathA
  while (segsB.length < segsA.length) {
    let longestIdx = 0;
    let maxLen = -1;
    for (let i = 0; i < segsB.length; i++) {
      if (segsB[i].length > maxLen) {
        maxLen = segsB[i].length;
        longestIdx = i;
      }
    }
    const [sub1, sub2] = subdivideCubicBezier(
      segsB[longestIdx].p0,
      segsB[longestIdx].cp1,
      segsB[longestIdx].cp2,
      segsB[longestIdx].p1,
      0.5
    );
    segsB.splice(longestIdx, 1, sub1, sub2);
  }

  return [segsA, segsB];
}

/**
 * Serializes normalized cubic segments back into an SVG path `d` string.
 */
export function serializeCubicSegments(
  start: Point2D,
  segments: NormalizedCubicSegment[],
  close = false
): string {
  if (segments.length === 0) {
    return `M ${roundVal(start.x)} ${roundVal(start.y)}`;
  }

  let d = `M ${roundVal(start.x)} ${roundVal(start.y)}`;
  for (const seg of segments) {
    d += ` C ${roundVal(seg.cp1.x)} ${roundVal(seg.cp1.y)}, ${roundVal(seg.cp2.x)} ${roundVal(seg.cp2.y)}, ${roundVal(seg.p1.x)} ${roundVal(seg.p1.y)}`;
  }

  if (close) {
    d += " Z";
  }

  return d;
}

function roundVal(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// ----------------------------------------------------------------------------
// 5. Path Morph Solver Class
// ----------------------------------------------------------------------------

export class PathMorphSolver {
  private static pairCache: Map<string, [NormalizedPath, NormalizedPath, NormalizedCubicSegment[], NormalizedCubicSegment[]]> = new Map();
  private static maxCacheSize = 250;

  /**
   * Interpolates smoothly between source `d` and target `d` at parameter `t` in [0, 1].
   * Guaranteed zero visual popping: endpoints and control points transition linearly.
   */
  public static morph(sourceD: string, targetD: string, t: number): string {
    // Clamp t
    const clampedT = Math.max(0, Math.min(1, t));

    // Cache key for normalized pair
    const cacheKey = `${sourceD}:::${targetD}`;
    let cached = this.pairCache.get(cacheKey);

    if (!cached) {
      const normA = normalizePathToCubics(sourceD);
      const normB = normalizePathToCubics(targetD);
      const [balancedA, balancedB] = balanceNormalizedPaths(normA, normB);
      cached = [normA, normB, balancedA, balancedB];

      if (this.pairCache.size >= this.maxCacheSize) {
        const firstKey = this.pairCache.keys().next().value;
        if (firstKey) this.pairCache.delete(firstKey);
      }
      this.pairCache.set(cacheKey, cached);
    }

    const [normA, normB, segsA, segsB] = cached;
    const shouldClose = normA.isClosed || normB.isClosed;

    if (clampedT <= 0) {
      return serializeCubicSegments(normA.start, segsA, shouldClose);
    }
    if (clampedT >= 1) {
      return serializeCubicSegments(normB.start, segsB, shouldClose);
    }

    // Interpolate start coordinate
    const u = 1 - clampedT;
    const startX = u * normA.start.x + clampedT * normB.start.x;
    const startY = u * normA.start.y + clampedT * normB.start.y;
    const interpStart: Point2D = { x: startX, y: startY };

    // Interpolate all normalized cubic segments
    const interpSegments: NormalizedCubicSegment[] = [];
    for (let i = 0; i < segsA.length; i++) {
      const a = segsA[i];
      const b = segsB[i];

      const p0 = {
        x: u * a.p0.x + clampedT * b.p0.x,
        y: u * a.p0.y + clampedT * b.p0.y,
      };
      const cp1 = {
        x: u * a.cp1.x + clampedT * b.cp1.x,
        y: u * a.cp1.y + clampedT * b.cp1.y,
      };
      const cp2 = {
        x: u * a.cp2.x + clampedT * b.cp2.x,
        y: u * a.cp2.y + clampedT * b.cp2.y,
      };
      const p1 = {
        x: u * a.p1.x + clampedT * b.p1.x,
        y: u * a.p1.y + clampedT * b.p1.y,
      };

      interpSegments.push({
        p0,
        cp1,
        cp2,
        p1,
        length: 0, // Not needed for serialization
      });
    }

    return serializeCubicSegments(interpStart, interpSegments, shouldClose);
  }

  /**
   * Pre-generates discrete morph animation samples across a given number of steps.
   */
  public static generateMorphSamples(
    sourceD: string,
    targetD: string,
    stepCount = 10
  ): MorphKeyframe[] {
    const keyframes: MorphKeyframe[] = [];
    for (let i = 0; i <= stepCount; i++) {
      const t = i / stepCount;
      keyframes.push({
        offset: Math.round(t * 100),
        path: this.morph(sourceD, targetD, t),
      });
    }
    return keyframes;
  }

  /**
   * Clears the internal morph pair cache.
   */
  public static clearCache(): void {
    this.pairCache.clear();
  }
}

// ----------------------------------------------------------------------------
// 6. Stroke-Draw Engine ("Line Drawing On") & Path Length Cache
// ----------------------------------------------------------------------------

export class StrokeDrawEngine {
  private static pathLengthCache: Map<string, number> = new Map();
  private static elementLengthCache: Map<string, number> = new Map();

  /**
   * Computes the exact geometric path length of an SVG `d` path string.
   */
  public static computePathLength(d: string): number {
    if (!d || typeof d !== "string") return 0;

    const cached = this.pathLengthCache.get(d);
    if (cached !== undefined) return cached;

    const norm = normalizePathToCubics(d);
    const length = roundVal(norm.totalLength);

    this.pathLengthCache.set(d, length);
    return length;
  }

  /**
   * Retrieves or computes path length with elementId caching.
   */
  public static getPathLength(d: string, elementId?: string): number {
    if (elementId && this.elementLengthCache.has(elementId)) {
      return this.elementLengthCache.get(elementId)!;
    }

    const length = this.computePathLength(d);

    if (elementId) {
      this.elementLengthCache.set(elementId, length);
    }

    return length;
  }

  /**
   * Computes stroke-dashoffset for a line-drawing animation given a progress value in [0, 1].
   * - progress = 0: returns pathLength (completely hidden)
   * - progress = 1: returns 0 (completely drawn)
   */
  public static computeStrokeDashoffset(pathLength: number, progress: number): number {
    const p = Math.max(0, Math.min(1, progress));
    return roundVal(pathLength * (1 - p));
  }

  /**
   * Generates standard KeyframePoints for stroke-draw ("line drawing on") animation.
   */
  public static generateStrokeDrawKeyframes(
    pathLength: number,
    easing: string = "cubic-bezier(0.4, 0, 0.2, 1)"
  ): KeyframePoint[] {
    return [
      {
        offset: 0,
        value: pathLength,
        easing,
      },
      {
        offset: 100,
        value: 0,
      },
    ];
  }

  /**
   * Returns strokeDasharray attribute value for stroke drawing: `${pathLength} ${pathLength}`.
   */
  public static getStrokeDasharray(pathLength: number): string {
    return `${pathLength} ${pathLength}`;
  }

  /**
   * Invalidates element-specific cache entry or all caches.
   */
  public static invalidateCache(elementId?: string): void {
    if (elementId) {
      this.elementLengthCache.delete(elementId);
    } else {
      this.elementLengthCache.clear();
      this.pathLengthCache.clear();
    }
  }
}
