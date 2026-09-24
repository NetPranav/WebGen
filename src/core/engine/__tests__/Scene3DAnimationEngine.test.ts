import { test } from "node:test";
import assert from "node:assert/strict";
import { Scene3DAnimationEngine } from "../Scene3DAnimationEngine";
import { AnimationTrack } from "../../types/animations";
import { Scene3DEngine } from "../Scene3DEngine";

test("Scene3DAnimationEngine: Interpolates position3D track smoothly", () => {
  const track: AnimationTrack = {
    trackId: "position3D",
    keyframes: [
      { offset: 0, value: [0, 0, 0] },
      { offset: 50, value: [10, 20, 30] },
      { offset: 100, value: [20, 0, -10] },
    ],
  };

  const pStart = Scene3DAnimationEngine.interpolatePosition3D(track, 0);
  assert.deepEqual(pStart, [0, 0, 0]);

  const pMid = Scene3DAnimationEngine.interpolatePosition3D(track, 0.5);
  assert.deepEqual(pMid, [10, 20, 30]);

  const pQuarter = Scene3DAnimationEngine.interpolatePosition3D(track, 0.25);
  assert.deepEqual(pQuarter, [5, 10, 15]);

  const pEnd = Scene3DAnimationEngine.interpolatePosition3D(track, 1.0);
  assert.deepEqual(pEnd, [20, 0, -10]);
});

test("Scene3DAnimationEngine: Interpolates rotation3D track via SLERP without gimbal lock", () => {
  const q0 = Scene3DEngine.identityQuaternion();
  const q90Y = Scene3DEngine.quaternionFromAxisAngle([0, 1, 0], Math.PI / 2);

  const track: AnimationTrack = {
    trackId: "rotation3D",
    keyframes: [
      { offset: 0, value: q0 },
      { offset: 100, value: q90Y },
    ],
  };

  const qMid = Scene3DAnimationEngine.interpolateRotation3D(track, 0.5);
  const expected45Y = Scene3DEngine.quaternionFromAxisAngle([0, 1, 0], Math.PI / 4);

  assert.ok(Math.abs(qMid[1] - expected45Y[1]) < 1e-4);
  assert.ok(Math.abs(qMid[3] - expected45Y[3]) < 1e-4);
});

test("Sub-Phase 8.4 Verification Gate: 4-keyframe camera path plays back smoothly with no orientation snapping", () => {
  // Setup 4-keyframe camera trajectory orbiting around origin
  const posTrack: AnimationTrack = {
    trackId: "position3D",
    keyframes: [
      { offset: 0, value: [0, 5, 20] },
      { offset: 33.3, value: [15, 8, 15] },
      { offset: 66.6, value: [20, 5, 0] },
      { offset: 100, value: [15, 2, -15] },
    ],
  };

  const lookAtTrack: AnimationTrack = {
    trackId: "position3D",
    keyframes: [
      { offset: 0, value: [0, 0, 0] },
      { offset: 100, value: [0, 0, 0] },
    ],
  };

  const steps = 100;
  let prevQuat = Scene3DAnimationEngine.evaluateCameraPath(posTrack, lookAtTrack, 0).orientation;
  let maxAngularDelta = 0;

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const result = Scene3DAnimationEngine.evaluateCameraPath(posTrack, lookAtTrack, t);
    const currQuat = result.orientation;

    // Dot product between consecutive quaternions
    const dot = Math.abs(
      prevQuat[0] * currQuat[0] +
      prevQuat[1] * currQuat[1] +
      prevQuat[2] * currQuat[2] +
      prevQuat[3] * currQuat[3]
    );

    // Clamp for acos safety
    const clampedDot = Math.min(1.0, Math.max(-1.0, dot));
    const angularDelta = 2 * Math.acos(clampedDot); // in radians

    if (angularDelta > maxAngularDelta) {
      maxAngularDelta = angularDelta;
    }

    // Assert smooth rotation step: angular delta must never spike (no 180 deg flips or snaps)
    assert.ok(
      angularDelta < 0.15,
      `Orientation snap detected at step ${i} (t=${t}): angularDelta=${angularDelta} rad`
    );

    prevQuat = currQuat;
  }

  // Max angular delta across the smooth arc should be small and continuous
  assert.ok(maxAngularDelta < 0.1, `Max angular delta was ${maxAngularDelta}`);
});
