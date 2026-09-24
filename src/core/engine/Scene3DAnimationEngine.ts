"use client";

/**
 * ============================================================================
 * 3D ANIMATION & CAMERA DOLLY ENGINE
 * ============================================================================
 * High-performance 3D keyframe interpolator with Quaternion SLERP,
 * continuous camera dolly path tracking, and gimbal-lock-free orientation.
 * Architecture Ref: ROADMAP.md §Phase 8 (Sub-Phase 8.4)
 * ============================================================================
 */

import { Vector3D, Quaternion } from "../types/scene3d";
import { AnimationTrack, KeyframePoint } from "../types/animations";
import { Scene3DEngine } from "./Scene3DEngine";

export interface CameraEvaluationResult {
  position: Vector3D;
  lookAt: Vector3D;
  orientation: Quaternion;
}

export class Scene3DAnimationEngine {
  /**
   * Evaluates a local progress factor t in [0, 1] between two keyframes.
   */
  private static findKeyframeSpan(
    keyframes: KeyframePoint[],
    normalizedTime: number // 0 to 1
  ): { k0: KeyframePoint; k1: KeyframePoint; localT: number } {
    if (keyframes.length === 0) {
      const dummy: KeyframePoint = { offset: 0, value: [0, 0, 0] };
      return { k0: dummy, k1: dummy, localT: 0 };
    }

    if (keyframes.length === 1 || normalizedTime <= keyframes[0].offset / 100) {
      return { k0: keyframes[0], k1: keyframes[0], localT: 0 };
    }

    const lastIdx = keyframes.length - 1;
    if (normalizedTime >= keyframes[lastIdx].offset / 100) {
      return { k0: keyframes[lastIdx], k1: keyframes[lastIdx], localT: 1 };
    }

    const timePercent = normalizedTime * 100;
    for (let i = 0; i < lastIdx; i++) {
      const k0 = keyframes[i];
      const k1 = keyframes[i + 1];
      if (timePercent >= k0.offset && timePercent <= k1.offset) {
        const span = k1.offset - k0.offset;
        const localT = span > 0 ? (timePercent - k0.offset) / span : 0;
        return { k0, k1, localT };
      }
    }

    return { k0: keyframes[lastIdx], k1: keyframes[lastIdx], localT: 1 };
  }

  /**
   * Interpolates a 3D position track at normalized time (0..1).
   */
  public static interpolatePosition3D(
    track: AnimationTrack,
    normalizedTime: number
  ): Vector3D {
    const { k0, k1, localT } = this.findKeyframeSpan(track.keyframes, normalizedTime);
    const p0 = Array.isArray(k0.value) ? (k0.value as Vector3D) : [0, 0, 0];
    const p1 = Array.isArray(k1.value) ? (k1.value as Vector3D) : [0, 0, 0];

    return [
      p0[0] + (p1[0] - p0[0]) * localT,
      p0[1] + (p1[1] - p0[1]) * localT,
      p0[2] + (p1[2] - p0[2]) * localT,
    ];
  }

  /**
   * Interpolates a 3D rotation track using Quaternion SLERP.
   * Guarantees shortest-path spherical linear interpolation with antipodal flip,
   * completely eliminating 180° flips, gimbal lock, and orientation snapping.
   */
  public static interpolateRotation3D(
    track: AnimationTrack,
    normalizedTime: number
  ): Quaternion {
    const { k0, k1, localT } = this.findKeyframeSpan(track.keyframes, normalizedTime);
    const q0 = Array.isArray(k0.value)
      ? (k0.value as Quaternion)
      : Scene3DEngine.identityQuaternion();
    const q1 = Array.isArray(k1.value)
      ? (k1.value as Quaternion)
      : Scene3DEngine.identityQuaternion();

    return Scene3DEngine.quaternionSlerp(q0, q1, localT);
  }

  /**
   * Interpolates a 3D volumetric scale track at normalized time (0..1).
   */
  public static interpolateScale3D(
    track: AnimationTrack,
    normalizedTime: number
  ): Vector3D {
    const { k0, k1, localT } = this.findKeyframeSpan(track.keyframes, normalizedTime);
    const s0 = Array.isArray(k0.value) ? (k0.value as Vector3D) : [1, 1, 1];
    const s1 = Array.isArray(k1.value) ? (k1.value as Vector3D) : [1, 1, 1];

    return [
      s0[0] + (s1[0] - s0[0]) * localT,
      s0[1] + (s1[1] - s0[1]) * localT,
      s0[2] + (s1[2] - s0[2]) * localT,
    ];
  }

  /**
   * Derives a camera orientation quaternion looking from eye position towards target with world Up = [0, 1, 0].
   */
  public static lookAtToQuaternion(eye: Vector3D, target: Vector3D, up: Vector3D = [0, 1, 0]): Quaternion {
    const forward = Scene3DEngine.normalizeVector(Scene3DEngine.subtractVectors(eye, target));
    let right = Scene3DEngine.crossProduct(up, forward);
    if (Scene3DEngine.vectorLength(right) < 1e-6) {
      right = [1, 0, 0];
    } else {
      right = Scene3DEngine.normalizeVector(right);
    }
    const realUp = Scene3DEngine.crossProduct(forward, right);

    // Matrix to quaternion
    const m00 = right[0], m01 = realUp[0], m02 = forward[0];
    const m10 = right[1], m11 = realUp[1], m12 = forward[1];
    const m20 = right[2], m21 = realUp[2], m22 = forward[2];

    const trace = m00 + m11 + m22;
    let q: Quaternion;

    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0);
      q = [(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s];
    } else if (m00 > m11 && m00 > m22) {
      const s = 2.0 * Math.sqrt(1.0 + m00 - m11 - m22);
      q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
    } else if (m11 > m22) {
      const s = 2.0 * Math.sqrt(1.0 + m11 - m00 - m22);
      q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
    } else {
      const s = 2.0 * Math.sqrt(1.0 + m22 - m00 - m11);
      q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
    }

    return Scene3DEngine.normalizeQuaternion(q);
  }

  /**
   * Evaluates a continuous camera dolly path with 4+ keyframes,
   * tracking eye position, lookAt target, and smooth SLERP quaternion orientation.
   */
  public static evaluateCameraPath(
    positionTrack: AnimationTrack,
    lookAtTrack: AnimationTrack,
    normalizedTime: number
  ): CameraEvaluationResult {
    const position = this.interpolatePosition3D(positionTrack, normalizedTime);
    const lookAt = this.interpolatePosition3D(lookAtTrack, normalizedTime);
    const orientation = this.lookAtToQuaternion(position, lookAt);

    return {
      position,
      lookAt,
      orientation,
    };
  }
}
