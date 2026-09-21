import { test } from "node:test";
import assert from "node:assert/strict";
import { Scene3DEngine, Scene3DNode } from "../Scene3DEngine";

test("Scene3DEngine: Vector3D basic mathematical operations", () => {
  const v1 = Scene3DEngine.createVector3D(1, 2, 3);
  const v2 = Scene3DEngine.createVector3D(4, 5, 6);

  const add = Scene3DEngine.addVectors(v1, v2);
  assert.deepEqual(add, [5, 7, 9]);

  const sub = Scene3DEngine.subtractVectors(v2, v1);
  assert.deepEqual(sub, [3, 3, 3]);

  const scaled = Scene3DEngine.scaleVector(v1, 2);
  assert.deepEqual(scaled, [2, 4, 6]);

  const dot = Scene3DEngine.dotProduct(v1, v2);
  assert.equal(dot, 1 * 4 + 2 * 5 + 3 * 6); // 4 + 10 + 18 = 32

  const cross = Scene3DEngine.crossProduct([1, 0, 0], [0, 1, 0]);
  assert.deepEqual(cross, [0, 0, 1]);

  const normalized = Scene3DEngine.normalizeVector([0, 3, 4]);
  assert.ok(Math.abs(normalized[0] - 0) < 1e-6);
  assert.ok(Math.abs(normalized[1] - 0.6) < 1e-6);
  assert.ok(Math.abs(normalized[2] - 0.8) < 1e-6);
});

test("Scene3DEngine: Quaternion generation and SLERP interpolation", () => {
  // 90 degrees around Z axis
  const qZ90 = Scene3DEngine.quaternionFromAxisAngle([0, 0, 1], Math.PI / 2);
  assert.ok(Math.abs(qZ90[0]) < 1e-6);
  assert.ok(Math.abs(qZ90[1]) < 1e-6);
  assert.ok(Math.abs(qZ90[2] - Math.sin(Math.PI / 4)) < 1e-6);
  assert.ok(Math.abs(qZ90[3] - Math.cos(Math.PI / 4)) < 1e-6);

  // SLERP at t = 0.5 between Identity and 90 degrees should be 45 degrees
  const qIdent = Scene3DEngine.identityQuaternion();
  const qMid = Scene3DEngine.quaternionSlerp(qIdent, qZ90, 0.5);

  const expectedMidZ = Math.sin(Math.PI / 8);
  const expectedMidW = Math.cos(Math.PI / 8);
  assert.ok(Math.abs(qMid[2] - expectedMidZ) < 1e-5);
  assert.ok(Math.abs(qMid[3] - expectedMidW) < 1e-5);

  // Antipodal shortest path test: q and -q represent identical orientation
  const qNegZ90: [number, number, number, number] = [-qZ90[0], -qZ90[1], -qZ90[2], -qZ90[3]];
  const qAntipodalMid = Scene3DEngine.quaternionSlerp(qIdent, qNegZ90, 0.5);
  assert.ok(Math.abs(Math.abs(qAntipodalMid[2]) - expectedMidZ) < 1e-5);
  assert.ok(Math.abs(Math.abs(qAntipodalMid[3]) - expectedMidW) < 1e-5);
});

test("Scene3DEngine: Matrix composition, multiplication and point transformation", () => {
  const pos: [number, number, number] = [10, 20, 30];
  const rot = Scene3DEngine.quaternionFromAxisAngle([0, 1, 0], Math.PI / 2); // 90 deg around Y
  const scale: [number, number, number] = [2, 2, 2];

  const m = Scene3DEngine.composeMatrix(pos, rot, scale);
  const pTransformed = Scene3DEngine.transformPoint(m, [1, 0, 0]);

  // [1, 0, 0] scaled by 2 -> [2, 0, 0]
  // rotated 90 deg around Y -> [0, 0, -2]
  // translated by [10, 20, 30] -> [10, 20, 28]
  assert.ok(Math.abs(pTransformed[0] - 10) < 1e-5);
  assert.ok(Math.abs(pTransformed[1] - 20) < 1e-5);
  assert.ok(Math.abs(pTransformed[2] - 28) < 1e-5);
});

test("Sub-Phase 8.1 Verification Gate: Nested 3-level Object3D hierarchy world transform matches reference matrix", () => {
  // Level 1: Root Node translated by [10, 0, 0]
  const rootId = "node_root";
  // Level 2: Child Node rotated 90 deg around Z
  const childId = "node_child_chassis";
  // Level 3: Grandchild Node translated by [0, 5, 0] in local frame
  const grandchildId = "node_grandchild_wheel";

  const qZ90 = Scene3DEngine.quaternionFromAxisAngle([0, 0, 1], Math.PI / 2);

  const nodes: Record<string, Scene3DNode> = {
    [rootId]: {
      id: rootId,
      name: "World Root",
      parentId: null,
      children: [childId],
      properties: {
        position3D: [10, 0, 0],
        rotation3D: [0, 0, 0, 1],
        scale3D: [1, 1, 1],
      },
    },
    [childId]: {
      id: childId,
      name: "Chassis",
      parentId: rootId,
      children: [grandchildId],
      properties: {
        position3D: [0, 0, 0],
        rotation3D: qZ90,
        scale3D: [1, 1, 1],
      },
    },
    [grandchildId]: {
      id: grandchildId,
      name: "FrontLeftWheel",
      parentId: childId,
      children: [],
      properties: {
        position3D: [0, 5, 0],
        rotation3D: [0, 0, 0, 1],
        scale3D: [1, 1, 1],
      },
    },
  };

  const worldTransforms = Scene3DEngine.computeWorldTransforms(nodes, rootId);

  // 1. Verify Root world position
  const rootPos = Scene3DEngine.getPositionFromMatrix(worldTransforms[rootId]);
  assert.deepEqual(rootPos, [10, 0, 0]);

  // 2. Verify Child world position (at root position)
  const childPos = Scene3DEngine.getPositionFromMatrix(worldTransforms[childId]);
  assert.deepEqual(childPos, [10, 0, 0]);

  // 3. Verify Grandchild world position
  // Hand-calculated reference:
  // Grandchild local position: [0, 5, 0]
  // Rotated by Chassis (90 deg around Z):
  //   x' = 0 * cos(90) - 5 * sin(90) = -5
  //   y' = 0 * sin(90) + 5 * cos(90) = 0
  //   z' = 0
  // Translated by Root ([10, 0, 0]):
  //   x_world = 10 + (-5) = 5
  //   y_world = 0 + 0 = 0
  //   z_world = 0 + 0 = 0
  const grandchildWorldPos = Scene3DEngine.getPositionFromMatrix(worldTransforms[grandchildId]);

  assert.ok(
    Math.abs(grandchildWorldPos[0] - 5) < 1e-5,
    `Expected x=5, got ${grandchildWorldPos[0]}`
  );
  assert.ok(
    Math.abs(grandchildWorldPos[1] - 0) < 1e-5,
    `Expected y=0, got ${grandchildWorldPos[1]}`
  );
  assert.ok(
    Math.abs(grandchildWorldPos[2] - 0) < 1e-5,
    `Expected z=0, got ${grandchildWorldPos[2]}`
  );

  // Also verify transforming a point in Grandchild's local space to World space
  const localOrigin: [number, number, number] = [0, 0, 0];
  const transformedOrigin = Scene3DEngine.transformPoint(
    worldTransforms[grandchildId],
    localOrigin
  );
  assert.ok(Math.abs(transformedOrigin[0] - 5) < 1e-5);
  assert.ok(Math.abs(transformedOrigin[1] - 0) < 1e-5);
  assert.ok(Math.abs(transformedOrigin[2] - 0) < 1e-5);
});
