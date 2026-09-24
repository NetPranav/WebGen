/**
 * ============================================================================
 * CABLE PHYSICS ENGINE (TYPESCRIPT VERLET INTEGRATION ENGINE)
 * ============================================================================
 * Provides dual-mode particle Verlet integration for visual graph wires:
 * - Native JavaScript/TypeScript simulation for instant web interactivity
 * - Exact mathematical parity with C++ CablePhysics kernel
 * - Settling time < 300ms, distance constraint relaxation, and tunable profiles
 * ============================================================================
 */

import { Point2D, SplineResult, SplineSolver } from "./SplineSolver";

export type WireType =
  | "exec"
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "default";

export interface CableParticle {
  position: Point2D;
  oldPosition: Point2D;
  acceleration: Point2D;
  isPinned: boolean;
}

export interface CableConfig {
  particleCount: number;
  gravity: number; // Downward gravity in px/s^2
  damping: number; // Velocity damping factor [0, 1]
  stiffness: number; // Constraint resolution strength [0, 1]
  constraintIterations: number;
  restLengthFactor: number;
}

export class CablePhysics {
  private config: CableConfig;
  private particles: CableParticle[] = [];
  private segmentLength: number = 10.0;
  private startPin: Point2D = { x: 0, y: 0 };
  private endPin: Point2D = { x: 0, y: 0 };

  constructor(type: WireType = "default", particleCount: number = 16) {
    this.config = CablePhysics.getConfigForWireType(type);
    if (particleCount > 2) {
      this.config.particleCount = particleCount;
    }
  }

  public static getConfigForWireType(type: WireType): CableConfig {
    switch (type) {
      case "exec":
        return {
          particleCount: 16,
          gravity: 90.0,
          damping: 0.22,
          stiffness: 0.95,
          constraintIterations: 5,
          restLengthFactor: 1.01,
        };
      case "boolean":
        return {
          particleCount: 16,
          gravity: 160.0,
          damping: 0.14,
          stiffness: 0.88,
          constraintIterations: 4,
          restLengthFactor: 1.04,
        };
      case "number":
      case "string":
      case "object":
      case "array":
      case "default":
      default:
        return {
          particleCount: 16,
          gravity: 200.0,
          damping: 0.12,
          stiffness: 0.82,
          constraintIterations: 4,
          restLengthFactor: 1.06,
        };
    }
  }

  public initialize(start: Point2D, end: Point2D, customConfig?: Partial<CableConfig>): void {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    this.startPin = { ...start };
    this.endPin = { ...end };

    const count = Math.max(2, this.config.particleCount);
    this.particles = [];

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const chord = Math.sqrt(dx * dx + dy * dy);
    const totalLength = Math.max(chord, chord * this.config.restLengthFactor);
    this.segmentLength = totalLength / (count - 1);

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const sag = 4.0 * t * (1.0 - t) * (this.config.gravity * 0.05);
      const px = start.x + dx * t;
      const py = start.y + dy * t + sag;
      const pinned = i === 0 || i === count - 1;

      this.particles.push({
        position: { x: px, y: py },
        oldPosition: { x: px, y: py },
        acceleration: { x: 0, y: 0 },
        isPinned: pinned,
      });
    }
  }

  public setEndpoints(start: Point2D, end: Point2D): void {
    const count = this.particles.length;
    if (count >= 2) {
      const dStartX = start.x - this.startPin.x;
      const dStartY = start.y - this.startPin.y;
      const dEndX = end.x - this.endPin.x;
      const dEndY = end.y - this.endPin.y;

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const chord = Math.sqrt(dx * dx + dy * dy);
      const totalLength = Math.max(chord, chord * this.config.restLengthFactor);
      this.segmentLength = totalLength / (count - 1);

      for (let i = 1; i < count - 1; i++) {
        const t = i / (count - 1);
        const shiftX = (1.0 - t) * dStartX + t * dEndX;
        const shiftY = (1.0 - t) * dStartY + t * dEndY;
        this.particles[i].position.x += shiftX;
        this.particles[i].position.y += shiftY;
        this.particles[i].oldPosition.x += shiftX;
        this.particles[i].oldPosition.y += shiftY;
      }

      this.particles[0].position = { ...start };
      this.particles[0].oldPosition = { ...start };
      this.particles[0].isPinned = true;

      const lastIdx = count - 1;
      this.particles[lastIdx].position = { ...end };
      this.particles[lastIdx].oldPosition = { ...end };
      this.particles[lastIdx].isPinned = true;
    }
    this.startPin = { ...start };
    this.endPin = { ...end };
  }

  public resetAlongCurve(spline: SplineResult): void {
    const count = this.particles.length;
    if (count < 2) return;

    for (let i = 0; i < count; i++) {
      const normDist = i / (count - 1);
      const t = SplineSolver.getTForNormalizedArcLength(spline.arcLengthTable, normDist);
      const pt = SplineSolver.evaluateBezier(spline.p0, spline.p1, spline.p2, spline.p3, t);

      this.particles[i].position = { ...pt };
      this.particles[i].oldPosition = { ...pt };
      this.particles[i].acceleration = { x: 0, y: 0 };
      this.particles[i].isPinned = i === 0 || i === count - 1;
    }
  }

  public step(dt: number): void {
    if (this.particles.length === 0 || dt <= 0) return;

    const clampedDt = Math.min(dt, 0.033);
    this.applyVerlet(clampedDt);

    for (let iter = 0; iter < this.config.constraintIterations; iter++) {
      this.satisfyConstraints();
    }
  }

  private applyVerlet(dt: number): void {
    const dtSq = dt * dt;
    const dampFactor = Math.max(0, 1.0 - this.config.damping);

    for (const p of this.particles) {
      if (p.isPinned) continue;

      const vx = (p.position.x - p.oldPosition.x) * dampFactor;
      const vy = (p.position.y - p.oldPosition.y) * dampFactor;

      p.oldPosition.x = p.position.x;
      p.oldPosition.y = p.position.y;

      p.position.x += vx + p.acceleration.x * dtSq;
      p.position.y += vy + (p.acceleration.y + this.config.gravity) * dtSq;

      p.acceleration.x = 0;
      p.acceleration.y = 0;
    }
  }

  private satisfyConstraints(): void {
    const count = this.particles.length;
    if (count < 2) return;

    this.particles[0].position.x = this.startPin.x;
    this.particles[0].position.y = this.startPin.y;
    this.particles[count - 1].position.x = this.endPin.x;
    this.particles[count - 1].position.y = this.endPin.y;

    for (let i = 0; i < count - 1; i++) {
      const p1 = this.particles[i];
      const p2 = this.particles[i + 1];

      const dx = p2.position.x - p1.position.x;
      const dy = p2.position.y - p1.position.y;
      const currentDist = Math.sqrt(dx * dx + dy * dy);

      if (currentDist < 0.0001) continue;

      const diff = (currentDist - this.segmentLength) / currentDist;
      const scalar = 0.5 * diff * this.config.stiffness;

      const offsetX = dx * scalar;
      const offsetY = dy * scalar;

      if (!p1.isPinned && !p2.isPinned) {
        p1.position.x += offsetX;
        p1.position.y += offsetY;
        p2.position.x -= offsetX;
        p2.position.y -= offsetY;
      } else if (p1.isPinned && !p2.isPinned) {
        p2.position.x -= offsetX * 2.0;
        p2.position.y -= offsetY * 2.0;
      } else if (!p1.isPinned && p2.isPinned) {
        p1.position.x += offsetX * 2.0;
        p1.position.y += offsetY * 2.0;
      }
    }
  }

  public isSettled(velocityThreshold: number = 0.5): boolean {
    for (const p of this.particles) {
      if (p.isPinned) continue;
      const vx = p.position.x - p.oldPosition.x;
      const vy = p.position.y - p.oldPosition.y;
      if (Math.sqrt(vx * vx + vy * vy) > velocityThreshold) {
        return false;
      }
    }
    return true;
  }

  public getKineticEnergy(): number {
    let total = 0;
    for (const p of this.particles) {
      const vx = p.position.x - p.oldPosition.x;
      const vy = p.position.y - p.oldPosition.y;
      total += vx * vx + vy * vy;
    }
    return total;
  }

  public getParticles(): readonly CableParticle[] {
    return this.particles;
  }

  public generateSvgPath(): string {
    const count = this.particles.length;
    if (count < 2) return "";

    let path = `M ${this.particles[0].position.x.toFixed(1)} ${this.particles[0].position.y.toFixed(1)}`;

    if (count === 2) {
      return `${path} L ${this.particles[1].position.x.toFixed(1)} ${this.particles[1].position.y.toFixed(1)}`;
    }

    for (let i = 0; i < count - 1; i++) {
      const p0 = i === 0 ? this.particles[i].position : this.particles[i - 1].position;
      const p1 = this.particles[i].position;
      const p2 = this.particles[i + 1].position;
      const p3 = i + 2 < count ? this.particles[i + 2].position : p2;

      const cp1x = (p1.x + (p2.x - p0.x) / 6.0).toFixed(1);
      const cp1y = (p1.y + (p2.y - p0.y) / 6.0).toFixed(1);
      const cp2x = (p2.x - (p3.x - p1.x) / 6.0).toFixed(1);
      const cp2y = (p2.y - (p3.y - p1.y) / 6.0).toFixed(1);
      const p2x = p2.x.toFixed(1);
      const p2y = p2.y.toFixed(1);

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2x} ${p2y}`;
    }

    return path;
  }
}
