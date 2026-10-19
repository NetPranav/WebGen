import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { bindFocusScope } from "../useFocusScope";
import { getContextKeys, setFocusScope } from "../contextKeys";

describe("Phase 19: bindFocusScope (a frame holds its region's focus scope)", () => {
  beforeEach(() => setFocusScope(null));

  it("claims the scope on pointer enter and releases it on leave", () => {
    const el = new EventTarget();
    const off = bindFocusScope(el, "canvas");
    el.dispatchEvent(new Event("pointerenter"));
    assert.equal(getContextKeys().canvasFocus, true);
    el.dispatchEvent(new Event("pointerleave"));
    assert.equal(getContextKeys().canvasFocus, false);
    off();
  });

  it("a stale leave doesn't take the scope from the region that has it now", () => {
    const frame = new EventTarget();
    const off = bindFocusScope(frame, "canvas");
    frame.dispatchEvent(new Event("pointerenter"));
    setFocusScope("timeline"); // the pointer moved on to the timeline
    frame.dispatchEvent(new Event("pointerleave")); // the frame's leave arrives late
    assert.equal(getContextKeys().timelineFocus, true);
    off();
  });

  it("re-claims the scope after the parent's own leave cleared it (the WebKit order: parent leave, then frame enter)", () => {
    const frame = new EventTarget();
    const off = bindFocusScope(frame, "canvas");
    setFocusScope("canvas");
    setFocusScope(null); // the parent element's pointerleave
    frame.dispatchEvent(new Event("pointerenter"));
    assert.equal(getContextKeys().canvasFocus, true);
    off();
  });

  it("stops listening and releases its scope when cleaned up", () => {
    const el = new EventTarget();
    const off = bindFocusScope(el, "canvas");
    el.dispatchEvent(new Event("pointerenter"));
    off();
    assert.equal(getContextKeys().canvasFocus, false, "released on cleanup");
    el.dispatchEvent(new Event("pointerenter"));
    assert.equal(getContextKeys().canvasFocus, false, "no longer listening");
  });
});
