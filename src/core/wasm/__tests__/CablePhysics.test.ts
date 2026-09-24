import { describe, it } from "node:test";
import assert from "node:assert";
import { CablePhysics } from "../CablePhysics";
import { SpatialIndex } from "../SpatialIndex";
import { SplineSolver } from "../SplineSolver";

describe("Sub-Phase 4.2: Verlet Cable Physics & Spatial Index", () => {
  it("initializes cable particles and pins endpoints", () => {
    const cable = new CablePhysics("exec", 16);
    cable.initialize({ x: 50, y: 50 }, { x: 350, y: 50 });

    const particles = cable.getParticles();
    assert.strictEqual(particles.length, 16);
    assert.strictEqual(particles[0].isPinned, true);
    assert.strictEqual(particles[15].isPinned, true);
    assert.strictEqual(particles[0].position.x, 50);
    assert.strictEqual(particles[15].position.x, 350);
  });

  it("settles 200 simultaneous wires within 300ms of a node drag without visible jitter", () => {
    const WIRE_COUNT = 200;
    const wires: CablePhysics[] = [];

    for (let i = 0; i < WIRE_COUNT; i++) {
      const type = i % 2 === 0 ? "exec" : "number";
      const wire = new CablePhysics(type, 16);
      wire.initialize({ x: 0, y: i * 10 }, { x: 300, y: i * 10 + 40 });
      wires.push(wire);
    }

    // Simulate node drag moving endpoint
    for (const wire of wires) {
      wire.setEndpoints({ x: 0, y: 0 }, { x: 450, y: -30 });
    }

    // Step for 300ms at 60 FPS (18 frames)
    const dt = 1 / 60;
    const steps = 18;
    const t0 = Date.now();

    for (let step = 0; step < steps; step++) {
      for (const wire of wires) {
        wire.step(dt);
      }
    }

    const elapsedMs = Date.now() - t0;
    let settledCount = 0;
    for (const wire of wires) {
      if (wire.isSettled(1.5)) {
        settledCount++;
      }
    }

    // At least 95% of cables settle within 300ms
    assert.ok(settledCount >= 190, `Expected >= 190 settled wires, got ${settledCount}`);
    assert.ok(elapsedMs < 1000, `Simulation too slow: ${elapsedMs}ms`);
  });

  it("enforces tunable stiffness profiles (exec wires stiffer than data wires)", () => {
    const execWire = new CablePhysics("exec", 16);
    execWire.initialize({ x: 0, y: 100 }, { x: 400, y: 100 });

    const dataWire = new CablePhysics("string", 16);
    dataWire.initialize({ x: 0, y: 100 }, { x: 400, y: 100 });

    // Step 60 frames
    for (let i = 0; i < 60; i++) {
      execWire.step(1 / 60);
      dataWire.step(1 / 60);
    }

    const execMidY = execWire.getParticles()[8].position.y;
    const dataMidY = dataWire.getParticles()[8].position.y;

    // Exec mid-point should sag less (lower y value)
    assert.ok(
      execMidY < dataMidY,
      `Exec wire mid (${execMidY}) should have less sag than data wire mid (${dataMidY})`
    );
  });

  it("generates smooth SVG Catmull-Rom path from simulated particles", () => {
    const cable = new CablePhysics("default", 16);
    cable.initialize({ x: 100, y: 100 }, { x: 300, y: 200 });

    cable.step(1 / 60);
    cable.step(1 / 60);

    const svgPath = cable.generateSvgPath();
    assert.ok(svgPath.startsWith("M 100.0 100.0"));
    assert.ok(svgPath.includes(" C "));
  });

  it("snaps particles along Hermite spline on resetAlongCurve", () => {
    const cable = new CablePhysics("exec", 16);
    cable.initialize({ x: 0, y: 0 }, { x: 200, y: 100 });

    const spline = SplineSolver.calculateWireSpline({ x: 0, y: 0 }, { x: 200, y: 100 });
    cable.resetAlongCurve(spline);

    const particles = cable.getParticles();
    assert.strictEqual(particles[0].position.x, 0);
    assert.strictEqual(particles[0].position.y, 0);
    assert.strictEqual(particles[15].position.x, 200);
    assert.strictEqual(particles[15].position.y, 100);
  });

  it("SpatialIndex: Quadtree indexes nodes with O(log N) point and range queries", () => {
    const index = new SpatialIndex({ minX: 0, minY: 0, maxX: 4000, maxY: 4000 });

    // Insert 100 nodes
    for (let i = 0; i < 100; i++) {
      const x = (i % 10) * 350 + 50;
      const y = Math.floor(i / 10) * 350 + 50;
      index.insert(`node_${i}`, "node", { minX: x, minY: y, maxX: x + 240, maxY: y + 160 }, i);
    }

    assert.strictEqual(index.size(), 100);

    // Hit-test at (60, 60)
    const hit = index.hitTestTopmost(60, 60);
    assert.ok(hit !== null);
    assert.strictEqual(hit.id, "node_0");

    // Marquee range query
    const inRange = index.queryRange({ minX: 0, minY: 0, maxX: 800, maxY: 800 });
    assert.ok(inRange.length >= 4);

    // Incremental drag update
    index.update("node_0", { minX: 2000, minY: 2000, maxX: 2240, maxY: 2160 });
    assert.strictEqual(index.hitTestTopmost(60, 60), null);
    const movedHit = index.hitTestTopmost(2010, 2010);
    assert.ok(movedHit !== null);
    assert.strictEqual(movedHit.id, "node_0");

    // Remove
    const removed = index.remove("node_0");
    assert.strictEqual(removed, true);
    assert.strictEqual(index.size(), 99);
    assert.strictEqual(index.hitTestTopmost(2010, 2010), null);
  });
});
