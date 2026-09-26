"use client";

/**
 * ============================================================================
 * 3D MATHEMATICS & SCENE GRAPH HIERARCHICAL ENGINE
 * ============================================================================
 * Mathematical kernel for 3D transforms, quaternions, matrix operations,
 * and hierarchical scene graph world-matrix propagation.
 * Architecture Ref: ROADMAP.md §Phase 8 (Sub-Phase 8.1)
 * ============================================================================
 */

import {
  Vector3D,
  Quaternion,
  Matrix4x4,
  DEFAULT_OBJECT3D_PROPERTIES,
} from "../types/scene3d";
import { readProps } from "../document/props";
import type { LayerProps } from "../document/registry";

export interface Scene3DNode {
  id: string;
  name?: string;
  parentId: string | null;
  children: string[];
  properties?: Record<string, unknown>;
}

export class Scene3DEngine {
  // ==========================================================================
  // 1. VECTOR3D UTILITIES
  // ==========================================================================

  public static createVector3D(x = 0, y = 0, z = 0): Vector3D {
    return [x, y, z];
  }

  public static addVectors(a: Vector3D, b: Vector3D): Vector3D {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  }

  public static subtractVectors(a: Vector3D, b: Vector3D): Vector3D {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  public static scaleVector(v: Vector3D, s: number): Vector3D {
    return [v[0] * s, v[1] * s, v[2] * s];
  }

  public static dotProduct(a: Vector3D, b: Vector3D): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  public static crossProduct(a: Vector3D, b: Vector3D): Vector3D {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }

  public static vectorLength(v: Vector3D): number {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  }

  public static normalizeVector(v: Vector3D): Vector3D {
    const len = this.vectorLength(v);
    if (len === 0 || Math.abs(len) < 1e-12) return [0, 0, 0];
    const inv = 1 / len;
    return [v[0] * inv, v[1] * inv, v[2] * inv];
  }

  // ==========================================================================
  // 2. QUATERNION MATHEMATICS [x, y, z, w]
  // ==========================================================================

  public static identityQuaternion(): Quaternion {
    return [0, 0, 0, 1];
  }

  public static normalizeQuaternion(q: Quaternion): Quaternion {
    const len = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
    if (len === 0 || Math.abs(len) < 1e-12) return [0, 0, 0, 1];
    const inv = 1 / len;
    return [q[0] * inv, q[1] * inv, q[2] * inv, q[3] * inv];
  }

  public static quaternionMultiply(a: Quaternion, b: Quaternion): Quaternion {
    const [ax, ay, az, aw] = a;
    const [bx, by, bz, bw] = b;
    return this.normalizeQuaternion([
      aw * bx + ax * bw + ay * bz - az * by,
      aw * by - ax * bz + ay * bw + az * bx,
      aw * bz + ax * by - ay * bx + az * bw,
      aw * bw - ax * bx - ay * by - az * bz,
    ]);
  }

  public static quaternionFromAxisAngle(axis: Vector3D, angleRad: number): Quaternion {
    const normAxis = this.normalizeVector(axis);
    const halfAngle = angleRad * 0.5;
    const sinHalf = Math.sin(halfAngle);
    return this.normalizeQuaternion([
      normAxis[0] * sinHalf,
      normAxis[1] * sinHalf,
      normAxis[2] * sinHalf,
      Math.cos(halfAngle),
    ]);
  }

  public static quaternionFromEuler(
    xRad: number,
    yRad: number,
    zRad: number,
    order: "XYZ" | "YXZ" | "ZXY" = "XYZ"
  ): Quaternion {
    const c1 = Math.cos(xRad * 0.5);
    const c2 = Math.cos(yRad * 0.5);
    const c3 = Math.cos(zRad * 0.5);
    const s1 = Math.sin(xRad * 0.5);
    const s2 = Math.sin(yRad * 0.5);
    const s3 = Math.sin(zRad * 0.5);

    let x = 0;
    let y = 0;
    let z = 0;
    let w = 1;

    if (order === "XYZ") {
      x = s1 * c2 * c3 + c1 * s2 * s3;
      y = c1 * s2 * c3 - s1 * c2 * s3;
      z = c1 * c2 * s3 + s1 * s2 * c3;
      w = c1 * c2 * c3 - s1 * s2 * s3;
    } else if (order === "YXZ") {
      x = s1 * c2 * c3 + c1 * s2 * s3;
      y = c1 * s2 * c3 - s1 * c2 * s3;
      z = c1 * c2 * s3 - s1 * s2 * c3;
      w = c1 * c2 * c3 + s1 * s2 * s3;
    } else {
      // ZXY
      x = s1 * c2 * c3 - c1 * s2 * s3;
      y = c1 * s2 * c3 + s1 * c2 * s3;
      z = c1 * c2 * s3 + s1 * s2 * c3;
      w = c1 * c2 * c3 - s1 * s2 * s3;
    }

    return this.normalizeQuaternion([x, y, z, w]);
  }

  /**
   * Spherical Linear Interpolation (SLERP) between two quaternions.
   * Includes antipodal shortest-arc inversion (q1 . q2 < 0) to avoid 180° snap glitches.
   */
  public static quaternionSlerp(qa: Quaternion, qb: Quaternion, t: number): Quaternion {
    if (t <= 0) return [...qa] as Quaternion;
    if (t >= 1) return [...qb] as Quaternion;

    let [bx, by, bz, bw] = qb;
    let cosHalfTheta = qa[0] * bx + qa[1] * by + qa[2] * bz + qa[3] * bw;

    // Shortest path antipodal flip
    if (cosHalfTheta < 0) {
      bx = -bx;
      by = -by;
      bz = -bz;
      bw = -bw;
      cosHalfTheta = -cosHalfTheta;
    }

    // If angle is extremely small, fall back to linear interpolation to avoid division by zero
    if (cosHalfTheta >= 0.9995) {
      return this.normalizeQuaternion([
        qa[0] + t * (bx - qa[0]),
        qa[1] + t * (by - qa[1]),
        qa[2] + t * (bz - qa[2]),
        qa[3] + t * (bw - qa[3]),
      ]);
    }

    const halfTheta = Math.acos(cosHalfTheta);
    const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

    if (Math.abs(sinHalfTheta) < 1e-8) {
      return [qa[0], qa[1], qa[2], qa[3]];
    }

    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

    return this.normalizeQuaternion([
      qa[0] * ratioA + bx * ratioB,
      qa[1] * ratioA + by * ratioB,
      qa[2] * ratioA + bz * ratioB,
      qa[3] * ratioA + bw * ratioB,
    ]);
  }

  // ==========================================================================
  // 3. 4x4 COLUMN-MAJOR MATRIX OPERATIONS
  // ==========================================================================

  public static identityMatrix(): Matrix4x4 {
    return [
      1, 0, 0, 0, // col 0
      0, 1, 0, 0, // col 1
      0, 0, 1, 0, // col 2
      0, 0, 0, 1, // col 3
    ];
  }

  /**
   * Composes a 4x4 column-major transformation matrix from Position, Quaternion, and Scale:
   * M = Translation * Rotation * Scale
   */
  public static composeMatrix(
    position: Vector3D,
    rotation: Quaternion,
    scale: Vector3D
  ): Matrix4x4 {
    const normQ = this.normalizeQuaternion(rotation);
    const [x, y, z, w] = normQ;
    const [sx, sy, sz] = scale;
    const [px, py, pz] = position;

    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;

    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;

    return [
      (1 - (yy + zz)) * sx, // col 0
      (xy + wz) * sx,
      (xz - wy) * sx,
      0,

      (xy - wz) * sy, // col 1
      (1 - (xx + zz)) * sy,
      (yz + wx) * sy,
      0,

      (xz + wy) * sz, // col 2
      (yz - wx) * sz,
      (1 - (xx + yy)) * sz,
      0,

      px, // col 3
      py,
      pz,
      1,
    ];
  }

  /**
   * Multiplies two 4x4 column-major matrices: Out = A * B
   */
  public static multiplyMatrices(a: Matrix4x4, b: Matrix4x4): Matrix4x4 {
    const out: number[] = new Array(16);

    for (let col = 0; col < 4; col++) {
      const b0 = b[col * 4 + 0];
      const b1 = b[col * 4 + 1];
      const b2 = b[col * 4 + 2];
      const b3 = b[col * 4 + 3];

      for (let row = 0; row < 4; row++) {
        out[col * 4 + row] =
          a[0 * 4 + row] * b0 +
          a[1 * 4 + row] * b1 +
          a[2 * 4 + row] * b2 +
          a[3 * 4 + row] * b3;
      }
    }

    return out as Matrix4x4;
  }

  /**
   * Transforms a 3D point by a 4x4 transformation matrix: P' = M * [x, y, z, 1]
   */
  public static transformPoint(m: Matrix4x4, p: Vector3D): Vector3D {
    const x = p[0];
    const y = p[1];
    const z = p[2];

    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    const invW = Math.abs(w) > 1e-12 ? 1 / w : 1;

    return [
      (m[0] * x + m[4] * y + m[8] * z + m[12]) * invW,
      (m[1] * x + m[5] * y + m[9] * z + m[13]) * invW,
      (m[2] * x + m[6] * y + m[10] * z + m[14]) * invW,
    ];
  }

  /**
   * Extracts the world-space position from a 4x4 column-major matrix (Col 3: m[12], m[13], m[14])
   */
  public static getPositionFromMatrix(m: Matrix4x4): Vector3D {
    return [m[12], m[13], m[14]];
  }

  // ==========================================================================
  // 4. HIERARCHICAL SCENE GRAPH WORLD TRANSFORM PROPAGATION
  // ==========================================================================

  /**
   * Recursively computes world transformation matrices for all nodes in the scene graph.
   * For each node: WorldTransform = ParentWorldTransform * LocalTransform
   */
  public static computeWorldTransforms(
    nodes: Record<string, Scene3DNode>,
    rootId: string
  ): Record<string, Matrix4x4> {
    const worldTransforms: Record<string, Matrix4x4> = {};

    const traverse = (nodeId: string, parentWorldMatrix: Matrix4x4) => {
      const node = nodes[nodeId];
      if (!node) return;

      const props = readProps({ properties: (node.properties ?? {}) as LayerProps }, "object3D");
      const pos = (props.position as Vector3D | undefined) || DEFAULT_OBJECT3D_PROPERTIES.position3D;
      const rot = (props.rotation as Quaternion | undefined) || DEFAULT_OBJECT3D_PROPERTIES.rotation3D;
      const scl = (props.scale as Vector3D | undefined) || DEFAULT_OBJECT3D_PROPERTIES.scale3D;

      const localMatrix = this.composeMatrix(pos, rot, scl);
      const worldMatrix = this.multiplyMatrices(parentWorldMatrix, localMatrix);

      worldTransforms[nodeId] = worldMatrix;

      if (node.children && Array.isArray(node.children)) {
        for (const childId of node.children) {
          traverse(childId, worldMatrix);
        }
      }
    };

    traverse(rootId, this.identityMatrix());
    return worldTransforms;
  }
}
