import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { useContextKeysStore, getContextKeys, setFocusScope, setTextEditing } from "../contextKeys";

describe("Sub-Phase 43.3: Context Keys & Focus Model", () => {
  beforeEach(() => {
    useContextKeysStore.setState({
      canvasFocus: false,
      timelineFocus: false,
      blueprintFocus: false,
      textEditing: false,
      "selection.count": 0,
      "transport.playing": false,
    });
  });

  it("setFocusScope enforces exactly one focused region at a time", () => {
    setFocusScope("canvas");
    assert.deepEqual(
      { canvas: getContextKeys().canvasFocus, timeline: getContextKeys().timelineFocus, blueprint: getContextKeys().blueprintFocus },
      { canvas: true, timeline: false, blueprint: false }
    );

    setFocusScope("timeline");
    assert.deepEqual(
      { canvas: getContextKeys().canvasFocus, timeline: getContextKeys().timelineFocus, blueprint: getContextKeys().blueprintFocus },
      { canvas: false, timeline: true, blueprint: false }
    );

    setFocusScope(null);
    assert.deepEqual(
      { canvas: getContextKeys().canvasFocus, timeline: getContextKeys().timelineFocus, blueprint: getContextKeys().blueprintFocus },
      { canvas: false, timeline: false, blueprint: false }
    );
  });

  it("getContextKeys returns a plain snapshot without the setter", () => {
    const ctx = getContextKeys();
    assert.ok(!("setContext" in ctx));
    assert.strictEqual(ctx.textEditing, false);
  });

  it("setTextEditing updates independently of focus scope", () => {
    setFocusScope("canvas");
    setTextEditing(true);
    assert.strictEqual(getContextKeys().canvasFocus, true);
    assert.strictEqual(getContextKeys().textEditing, true);
  });
});
