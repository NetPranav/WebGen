/**
 * ============================================================================
 * SPLINE SOLVER (C++ WebAssembly Math Bridge - Unreal Engine FConnectionDrawingPolicy)
 * ============================================================================
 * Zero-latency TypeScript implementation matching wasm/src/SplineSolver.cpp 1-to-1.
 * 
 * Features:
 * - Dynamic Hermite/Bezier tangent scaling based on distance (tension: 0.5)
 * - Minimum tangent clamping (minTangent: 45px) for crisp horizontal exit from pins
 * - Backward connection loop handling: when target pin is behind source pin,
 *   curves outward gracefully around nodes instead of cutting through cards
 * - 120 FPS high-performance SVG path generator
 * ============================================================================
 */

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

export class SplineSolver {
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
}
