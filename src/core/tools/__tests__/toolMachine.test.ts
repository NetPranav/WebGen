import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ToolMachine } from "../toolMachine";
import { TOOL_DEFS, TOOL_IDS, dockTools, isToolAvailable } from "../toolDefs";

const machine = () => new ToolMachine("select", isToolAvailable);

describe("Phase 24: tool state machine", () => {
  it("switches tools and reports the active and current tool", () => {
    const m = machine();
    assert.equal(m.current, "select");
    assert.equal(m.setActive("rectangle"), true);
    assert.deepEqual([m.active, m.current], ["rectangle", "rectangle"]);
  });

  it("refuses a tool whose feature doesn't exist yet, and unknown ids", () => {
    const m = machine();
    assert.equal(m.setActive("comment"), false);
    assert.equal(m.setActive("nope"), false);
    assert.equal(m.active, "select");
  });

  it("holding Space gives the Hand and releasing returns to the previous tool", () => {
    const m = machine();
    m.setActive("rectangle");
    assert.equal(m.beginSpring("space", "pan"), true);
    assert.deepEqual([m.active, m.current], ["rectangle", "pan"]);
    m.endSpring("space");
    assert.deepEqual([m.active, m.current], ["rectangle", "rectangle"]);
  });

  it("key repeat doesn't stack springs, and a stray release does nothing", () => {
    const m = machine();
    m.beginSpring("space", "pan");
    assert.equal(m.beginSpring("space", "pan"), false);
    assert.equal(m.springs.length, 1);
    m.endSpring("space");
    m.endSpring("space");
    assert.equal(m.current, "select");
  });

  it("springs stack: the newest wins and each release drops only its own", () => {
    const m = machine();
    m.beginSpring("space", "pan");
    m.beginSpring("mod", "deepSelect");
    assert.equal(m.current, "deepSelect");
    m.endSpring("space"); // released out of order
    assert.equal(m.current, "deepSelect");
    m.endSpring("mod");
    assert.equal(m.current, "select");
  });

  it("choosing a tool during a spring changes what the release returns to", () => {
    const m = machine();
    m.beginSpring("space", "pan");
    m.setActive("text");
    assert.equal(m.current, "pan");
    m.endSpring("space");
    assert.equal(m.current, "text");
  });

  it("losing focus ends every spring", () => {
    const m = machine();
    m.beginSpring("space", "pan");
    m.beginSpring("mod", "deepSelect");
    m.endAllSprings();
    assert.equal(m.current, "select");
  });

  it("notifies subscribers on a change and not on a no-op", () => {
    const m = machine();
    let n = 0;
    const off = m.subscribe(() => n++);
    m.setActive("select"); // already active
    m.endSpring("space"); // nothing held
    assert.equal(n, 0);
    m.setActive("line");
    m.beginSpring("space", "pan");
    m.endSpring("space");
    assert.equal(n, 3);
    off();
    m.setActive("text");
    assert.equal(n, 3);
  });
});

describe("Phase 24: the dock shows only tools that exist", () => {
  it("lists exactly the available, non-spring tools in order", () => {
    assert.deepEqual(dockTools().map((t) => t.id), ["select", "pan", "frame", "rectangle", "ellipse", "line", "arrow", "polygon", "star", "text", "pen", "pencil", "paintBucket", "shapeBuilder"]);
  });

  it("every tool not built yet names its phase and has no dock button", () => {
    for (const id of TOOL_IDS) {
      const def = TOOL_DEFS[id];
      if (!def.available) {
        assert.ok(def.phase && def.phase > 24, `${id} names a later phase`);
        assert.ok(!dockTools().some((t) => t.id === id), `${id} is hidden`);
      }
    }
  });

  it("deep select is spring-only: no dock button, but it can be held", () => {
    assert.equal(TOOL_DEFS.deepSelect.springOnly, true);
    assert.ok(!dockTools().some((t) => t.id === "deepSelect"));
    assert.equal(machine().beginSpring("mod", "deepSelect"), true);
  });
});
