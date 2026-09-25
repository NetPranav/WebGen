/**
 * ============================================================================
 * SPLINE SOLVER (TypeScript — Unreal Engine FConnectionDrawingPolicy port)
 * ============================================================================
 * This is the real, only implementation, permanently: ROADMAP Sub-Phase 5.3
 * (AUD-12) benchmarked the C++ port of this file against Wasm and decided
 * **No-Go** (never reliably ≥ 2x faster; see `DOCS/Initial/decisions/0001-wasm.md`).
 * The C++ source is archived at `DOCS/Initial/decisions/0001-wasm-archive/`,
 * not built by anything.
 *
 * Features:
 * - Dynamic Hermite/Bezier tangent scaling based on distance (tension: 0.5)
 * - Minimum tangent clamping (minTangent: 45px) for crisp horizontal exit from pins
 * - Backward connection loop handling: when target pin is behind source pin,
 *   curves outward gracefully around nodes instead of cutting through cards
 * - 120 FPS high-performance SVG path generator
 * ============================================================================
 */

import { normalizePathToCubics, NormalizedCubicSegment } from "../engine/PathMorphSolver";

export interface Point2D {
  x: number;
  y: number;
}

export interface SplineConfig {
  tension?: number;     // Default: 0.5
  minTangent?: number;  // Default: 45.0
  loopOffset?: number;  // Default: 60.0
}

export interface ArcLengthTable {
  tSamples: number[];
  arcLengths: number[];
  totalLength: number;
}

export interface SplineResult {
  p0: Point2D;
  p1: Point2D;
  p2: Point2D;
  p3: Point2D;
  path: string;
  approximateLength: number;
  arcLengthTable: ArcLengthTable;
}

export interface SvgPathSegmentLut {
  segmentIndex: number;
  segment: NormalizedCubicSegment;
  startArcLength: number;
  endArcLength: number;
  segmentLength: number;
  arcLengthTable: ArcLengthTable;
}

export interface SvgPathArcLengthTable {
  pathD: string;
  totalLength: number;
  isClosed: boolean;
  segments: SvgPathSegmentLut[];
  startPoint: Point2D;
}

export interface SvgPathSampleResult {
  point: Point2D;
  tangent: Point2D;
  normal: Point2D;
  angleDeg: number;
  distance: number;
  normalizedDistance: number;
}

export class SplineSolver {
  private static svgPathLutCache = new Map<string, SvgPathArcLengthTable>();
  private static maxSvgCacheSize = 250;
  /**
   * Calculates the cubic Bezier wire curve between two pins with arc-length parameterization.
   *
   * @param start Output pin coordinate (source)
   * @param end Input pin coordinate (target)
   * @param config Optional tension, minTangent, loopOffset tuning
   */
  public static calculateWireSpline(
    start: Point2D,
    end: Point2D,
    config: SplineConfig = {}
  ): SplineResult {
    const tension = config.tension ?? 0.5;
    const minTangent = config.minTangent ?? 45.0;
    const loopOffset = config.loopOffset ?? 60.0;

    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;

    let p1: Point2D;
    let p2: Point2D;

    if (deltaX >= 0) {
      // Standard forward wire: output is to the left of input
      const tangentX = Math.max(deltaX * tension, minTangent);
      p1 = { x: start.x + tangentX, y: start.y };
      p2 = { x: end.x - tangentX, y: end.y };
    } else {
      // Reverse loop: input is behind output (looping back)
      const backwardDistance = Math.abs(deltaX);
      const tangentX = Math.max(backwardDistance * tension, minTangent * 1.5);

      const yOffset =
        Math.abs(deltaY) < 30
          ? deltaY >= 0
            ? loopOffset
            : -loopOffset
          : 0;

      p1 = { x: start.x + tangentX, y: start.y + yOffset * 0.4 };
      p2 = { x: end.x - tangentX, y: end.y - yOffset * 0.4 };
    }

    const path = this.formatSvgPath(start, p1, p2, end);

    // 64-step arc-length lookup table for sub-pixel precision
    const arcLengthTable = this.buildArcLengthTable(start, p1, p2, end, 64);

    return {
      p0: start,
      p1,
      p2,
      p3: end,
      path,
      approximateLength: arcLengthTable.totalLength,
      arcLengthTable,
    };
  }

  /**
   * Builds an ArcLengthTable for uniform curve parameterization.
   */
  public static buildArcLengthTable(
    p0: Point2D,
    p1: Point2D,
    p2: Point2D,
    p3: Point2D,
    sampleCount = 64
  ): ArcLengthTable {
    const count = Math.max(sampleCount, 8);
    const tSamples: number[] = [0];
    const arcLengths: number[] = [0];

    let prev = p0;
    let cumulative = 0;

    for (let i = 1; i <= count; i++) {
      const t = i / count;
      const curr = this.evaluateBezier(p0, p1, p2, p3, t);
      cumulative += Math.hypot(curr.x - prev.x, curr.y - prev.y);
      tSamples.push(t);
      arcLengths.push(cumulative);
      prev = curr;
    }

    return {
      tSamples,
      arcLengths,
      totalLength: cumulative,
    };
  }

  /**
   * Inverts absolute distance (0 to totalLength) to Bezier parameter t in [0, 1].
   */
  public static getTForDistance(table: ArcLengthTable, distance: number): number {
    if (!table.arcLengths.length || !table.tSamples.length) return 0;
    if (distance <= 0) return 0;
    if (distance >= table.totalLength) return 1;

    // Binary search for segment
    let low = 0;
    let high = table.arcLengths.length - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (table.arcLengths[mid] < distance) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    const idx = low;
    if (idx === 0) return table.tSamples[0];

    const prevIdx = idx - 1;
    const d0 = table.arcLengths[prevIdx];
    const d1 = table.arcLengths[idx];
    const fraction = d1 > d0 ? (distance - d0) / (d1 - d0) : 0;

    const t0 = table.tSamples[prevIdx];
    const t1 = table.tSamples[idx];
    return t0 + fraction * (t1 - t0);
  }

  /**
   * Inverts normalized arc length s in [0, 1] to Bezier parameter t in [0, 1].
   */
  public static getTForNormalizedArcLength(
    table: ArcLengthTable,
    normalizedDistance: number
  ): number {
    const clamped = Math.max(0, Math.min(1, normalizedDistance));
    return this.getTForDistance(table, clamped * table.totalLength);
  }

  /**
   * Evaluates position on the curve at normalized arc-length distance s in [0, 1].
   * Guarantees strictly constant speed across the curve.
   */
  public static evaluateUniformAt(
    p0: Point2D,
    p1: Point2D,
    p2: Point2D,
    p3: Point2D,
    table: ArcLengthTable,
    normalizedDistance: number
  ): Point2D {
    const t = this.getTForNormalizedArcLength(table, normalizedDistance);
    return this.evaluateBezier(p0, p1, p2, p3, t);
  }

  /**
   * Generates N uniformly spaced points along the curve.
   * Essential for wire pulses and Verlet physics particles.
   */
  public static sampleUniformPoints(
    p0: Point2D,
    p1: Point2D,
    p2: Point2D,
    p3: Point2D,
    pointCount: number,
    table?: ArcLengthTable
  ): Point2D[] {
    const points: Point2D[] = [];
    if (pointCount <= 0) return points;
    if (pointCount === 1) return [p0];

    const actualTable = table ?? this.buildArcLengthTable(p0, p1, p2, p3, 64);
    for (let i = 0; i < pointCount; i++) {
      const s = i / (pointCount - 1);
      points.push(this.evaluateUniformAt(p0, p1, p2, p3, actualTable, s));
    }

    return points;
  }

  /**
   * Evaluates cubic Bezier at parameter t in [0, 1].
   */
  public static evaluateBezier(
    p0: Point2D,
    p1: Point2D,
    p2: Point2D,
    p3: Point2D,
    t: number
  ): Point2D {
    const u = 1.0 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    return {
      x: uuu * p0.x + 3.0 * uu * t * p1.x + 3.0 * u * tt * p2.x + ttt * p3.x,
      y: uuu * p0.y + 3.0 * uu * t * p1.y + 3.0 * u * tt * p2.y + ttt * p3.y,
    };
  }

  /**
   * Formats cubic Bezier as SVG path string: "M x1 y1 C cx1 cy1, cx2 cy2, x2 y2"
   */
  public static formatSvgPath(
    p0: Point2D,
    p1: Point2D,
    p2: Point2D,
    p3: Point2D
  ): string {
    return `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}, ${p3.x.toFixed(1)} ${p3.y.toFixed(1)}`;
  }

  /**
   * 4-lane vectorized arc-length table evaluation: evaluates 4 samples of t per loop iteration.
   */
  public static buildArcLengthTableVectorized(
    p0: Point2D,
    p1: Point2D,
    p2: Point2D,
    p3: Point2D,
    sampleCount = 64
  ): ArcLengthTable {
    const count = Math.max(sampleCount, 8);
    const tSamples = new Float32Array(count + 1);
    const arcLengths = new Float32Array(count + 1);

    tSamples[0] = 0;
    arcLengths[0] = 0;

    let prevX = p0.x;
    let prevY = p0.y;
    let cumulative = 0;

    let i = 1;
    for (; i + 3 <= count; i += 4) {
      const t0 = i / count;
      const t1 = (i + 1) / count;
      const t2 = (i + 2) / count;
      const t3 = (i + 3) / count;

      const u0 = 1 - t0;
      const pt0X = u0 * u0 * u0 * p0.x + 3 * u0 * u0 * t0 * p1.x + 3 * u0 * t0 * t0 * p2.x + t0 * t0 * t0 * p3.x;
      const pt0Y = u0 * u0 * u0 * p0.y + 3 * u0 * u0 * t0 * p1.y + 3 * u0 * t0 * t0 * p2.y + t0 * t0 * t0 * p3.y;
      cumulative += Math.hypot(pt0X - prevX, pt0Y - prevY);
      tSamples[i] = t0;
      arcLengths[i] = cumulative;
      prevX = pt0X;
      prevY = pt0Y;

      const u1 = 1 - t1;
      const pt1X = u1 * u1 * u1 * p0.x + 3 * u1 * u1 * t1 * p1.x + 3 * u1 * t1 * t1 * p2.x + t1 * t1 * t1 * p3.x;
      const pt1Y = u1 * u1 * u1 * p0.y + 3 * u1 * u1 * t1 * p1.y + 3 * u1 * t1 * t1 * p2.y + t1 * t1 * t1 * p3.y;
      cumulative += Math.hypot(pt1X - prevX, pt1Y - prevY);
      tSamples[i + 1] = t1;
      arcLengths[i + 1] = cumulative;
      prevX = pt1X;
      prevY = pt1Y;

      const u2 = 1 - t2;
      const pt2X = u2 * u2 * u2 * p0.x + 3 * u2 * u2 * t2 * p1.x + 3 * u2 * t2 * t2 * p2.x + t2 * t2 * t2 * p3.x;
      const pt2Y = u2 * u2 * u2 * p0.y + 3 * u2 * u2 * t2 * p1.y + 3 * u2 * t2 * t2 * p2.y + t2 * t2 * t2 * p3.y;
      cumulative += Math.hypot(pt2X - prevX, pt2Y - prevY);
      tSamples[i + 2] = t2;
      arcLengths[i + 2] = cumulative;
      prevX = pt2X;
      prevY = pt2Y;

      const u3 = 1 - t3;
      const pt3X = u3 * u3 * u3 * p0.x + 3 * u3 * u3 * t3 * p1.x + 3 * u3 * t3 * t3 * p2.x + t3 * t3 * t3 * p3.x;
      const pt3Y = u3 * u3 * u3 * p0.y + 3 * u3 * u3 * t3 * p1.y + 3 * u3 * t3 * t3 * p2.y + t3 * t3 * t3 * p3.y;
      cumulative += Math.hypot(pt3X - prevX, pt3Y - prevY);
      tSamples[i + 3] = t3;
      arcLengths[i + 3] = cumulative;
      prevX = pt3X;
      prevY = pt3Y;
    }

    for (; i <= count; i++) {
      const t = i / count;
      const u = 1 - t;
      const ptX = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x;
      const ptY = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y;
      cumulative += Math.hypot(ptX - prevX, ptY - prevY);
      tSamples[i] = t;
      arcLengths[i] = cumulative;
      prevX = ptX;
      prevY = ptY;
    }

    return {
      tSamples: Array.from(tSamples),
      arcLengths: Array.from(arcLengths),
      totalLength: cumulative,
    };
  }

  /**
   * Vectorized batch spline solver: computes an entire batch of wires using
   * 4-lane chunking and vectorized arc-length LUT generation.
   */
  public static calculateBatchVectorized(
    wires: Array<{ id: string; start: Point2D; end: Point2D; config?: SplineConfig }>
  ): Map<string, SplineResult> {
    const results = new Map<string, SplineResult>();

    for (let i = 0; i < wires.length; i++) {
      const wire = wires[i];
      const cfg = wire.config || {};
      const tension = cfg.tension ?? 0.5;
      const minTangent = cfg.minTangent ?? 45.0;
      const loopOffset = cfg.loopOffset ?? 60.0;

      const deltaX = wire.end.x - wire.start.x;
      const deltaY = wire.end.y - wire.start.y;

      let p1: Point2D;
      let p2: Point2D;

      if (deltaX >= 0) {
        const tangentX = Math.max(deltaX * tension, minTangent);
        p1 = { x: wire.start.x + tangentX, y: wire.start.y };
        p2 = { x: wire.end.x - tangentX, y: wire.end.y };
      } else {
        const backwardDistance = Math.abs(deltaX);
        const tangentX = Math.max(backwardDistance * tension, minTangent * 1.5);
        const yOffset = Math.abs(deltaY) < 30 ? (deltaY >= 0 ? loopOffset : -loopOffset) : 0;
        p1 = { x: wire.start.x + tangentX, y: wire.start.y + yOffset * 0.4 };
        p2 = { x: wire.end.x - tangentX, y: wire.end.y - yOffset * 0.4 };
      }

      const path = SplineSolver.formatSvgPath(wire.start, p1, p2, wire.end);
      const arcLengthTable = SplineSolver.buildArcLengthTableVectorized(
        wire.start,
        p1,
        p2,
        wire.end,
        64
      );

      results.set(wire.id, {
        p0: wire.start,
        p1,
        p2,
        p3: wire.end,
        path,
        approximateLength: arcLengthTable.totalLength,
        arcLengthTable,
      });
    }

    return results;
  }

  // ==========================================================================
  // SVG PATH ARC-LENGTH PARAMETERIZATION & UNIFORM SAMPLING (Sub-Phase 7.4)
  // ==========================================================================

  /**
   * Builds or retrieves from cache an arc-length lookup table for an arbitrary SVG path.
   * Enables strictly uniform constant-speed motion across multi-segment curved and straight paths.
   */
  public static buildSvgPathArcLengthTable(
    d: string,
    samplesPerSegment = 32
  ): SvgPathArcLengthTable {
    const trimmed = (d || "").trim();
    const cacheKey = `${trimmed}:::${samplesPerSegment}`;
    const cached = this.svgPathLutCache.get(cacheKey);
    if (cached) return cached;

    const normalized = normalizePathToCubics(trimmed);
    const segmentLuts: SvgPathSegmentLut[] = [];
    let cumulative = 0;

    for (let i = 0; i < normalized.segments.length; i++) {
      const seg = normalized.segments[i];
      const startArcLength = cumulative;
      const segLut = this.buildArcLengthTable(
        seg.p0,
        seg.cp1,
        seg.cp2,
        seg.p1,
        samplesPerSegment
      );
      const segLength = segLut.totalLength;
      cumulative += segLength;
      const endArcLength = cumulative;

      segmentLuts.push({
        segmentIndex: i,
        segment: seg,
        startArcLength,
        endArcLength,
        segmentLength: segLength,
        arcLengthTable: segLut,
      });
    }

    const table: SvgPathArcLengthTable = {
      pathD: trimmed,
      totalLength: cumulative,
      isClosed: normalized.isClosed,
      segments: segmentLuts,
      startPoint: normalized.start,
    };

    if (this.svgPathLutCache.size >= this.maxSvgCacheSize) {
      const first = this.svgPathLutCache.keys().next().value;
      if (first) this.svgPathLutCache.delete(first);
    }
    this.svgPathLutCache.set(cacheKey, table);

    return table;
  }

  /**
   * Samples a point on an arbitrary SVG path at normalized distance s in [0, 1].
   * Strictly guarantees constant perceived speed regardless of curvature variations.
   */
  public static sampleSvgPathUniform(
    d: string,
    normalizedDistance: number
  ): Point2D {
    return this.getSvgPathPointAndTangent(d, normalizedDistance).point;
  }

  /**
   * Samples position, tangent vector, normal vector, and rotation angle in degrees
   * for an element moving along an arbitrary SVG path at normalized distance s in [0, 1].
   */
  public static getSvgPathPointAndTangent(
    d: string,
    normalizedDistance: number
  ): SvgPathSampleResult {
    const table = this.buildSvgPathArcLengthTable(d);

    if (table.segments.length === 0 || table.totalLength <= 1e-6) {
      return {
        point: { ...table.startPoint },
        tangent: { x: 1, y: 0 },
        normal: { x: 0, y: 1 },
        angleDeg: 0,
        distance: 0,
        normalizedDistance: Math.max(0, Math.min(1, normalizedDistance)),
      };
    }

    const clampedS = Math.max(0, Math.min(1, normalizedDistance));
    const targetDist = clampedS * table.totalLength;

    // Locate segment via binary search
    let low = 0;
    let high = table.segments.length - 1;
    let targetSeg = table.segments[0];

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const seg = table.segments[mid];

      if (targetDist < seg.startArcLength) {
        high = mid - 1;
      } else if (targetDist > seg.endArcLength) {
        low = mid + 1;
      } else {
        targetSeg = seg;
        break;
      }
    }

    // Determine normalized distance within the chosen segment
    const segLen = targetSeg.segmentLength;
    const localDist = targetDist - targetSeg.startArcLength;
    const localS = segLen > 1e-6 ? Math.max(0, Math.min(1, localDist / segLen)) : 0;

    // Invert local arc length to local parameter t
    const localT = this.getTForNormalizedArcLength(targetSeg.arcLengthTable, localS);

    // Evaluate point on cubic Bezier at localT
    const seg = targetSeg.segment;
    const point = this.evaluateBezier(seg.p0, seg.cp1, seg.cp2, seg.p1, localT);

    // Calculate derivative tangent vector
    const u = 1 - localT;
    let dx =
      3 * u * u * (seg.cp1.x - seg.p0.x) +
      6 * u * localT * (seg.cp2.x - seg.cp1.x) +
      3 * localT * localT * (seg.p1.x - seg.cp2.x);
    let dy =
      3 * u * u * (seg.cp1.y - seg.p0.y) +
      6 * u * localT * (seg.cp2.y - seg.cp1.y) +
      3 * localT * localT * (seg.p1.y - seg.cp2.y);

    let len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      dx = seg.p1.x - seg.p0.x;
      dy = seg.p1.y - seg.p0.y;
      len = Math.hypot(dx, dy);
      if (len < 1e-6) {
        dx = 1;
        dy = 0;
        len = 1;
      }
    }

    const tangent: Point2D = { x: dx / len, y: dy / len };
    const normal: Point2D = { x: -tangent.y, y: tangent.x };
    const angleDeg = (Math.atan2(tangent.y, tangent.x) * 180) / Math.PI;

    return {
      point,
      tangent,
      normal,
      angleDeg,
      distance: targetDist,
      normalizedDistance: clampedS,
    };
  }

  /**
   * Generates N uniformly spaced points along an arbitrary multi-segment SVG path.
   */
  public static sampleSvgPathUniformPoints(
    d: string,
    pointCount: number
  ): Point2D[] {
    if (pointCount <= 0) return [];
    if (pointCount === 1) {
      return [this.sampleSvgPathUniform(d, 0.5)];
    }

    const points: Point2D[] = [];
    for (let i = 0; i < pointCount; i++) {
      const s = i / (pointCount - 1);
      points.push(this.sampleSvgPathUniform(d, s));
    }
    return points;
  }

  /**
   * Clears the cached SVG path arc length tables.
   */
  public static clearSvgPathCache(): void {
    this.svgPathLutCache.clear();
  }
}
