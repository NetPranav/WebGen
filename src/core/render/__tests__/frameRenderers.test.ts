import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  StageRenderer, getFrameRenderers, getStageRenderer, getStageRendererForFrame, getStageRendererForLayer, registerFrameRenderer, setActiveStageFrame, setStageRenderer,
} from "../StageRenderer";

const layers = {
  a: { parentId: null },
  a1: { parentId: "a" },
  a2: { parentId: "a1" },
  b: { parentId: null },
  b1: { parentId: "b" },
};

describe("Phase 21: one renderer per frame", () => {
  afterEach(() => {
    setActiveStageFrame(null);
    setStageRenderer(null);
    for (const id of [...getFrameRenderers().keys()]) getFrameRenderers().get(id) && registerFrameRenderer(id, getFrameRenderers().get(id)!)();
  });

  it("finds the renderer of the frame that draws a layer, however deep", () => {
    const ra = new StageRenderer();
    const rb = new StageRenderer();
    const offA = registerFrameRenderer("a", ra);
    const offB = registerFrameRenderer("b", rb);
    assert.equal(getStageRendererForLayer("a2", layers), ra);
    assert.equal(getStageRendererForLayer("b1", layers), rb);
    assert.equal(getStageRendererForLayer("b", layers), rb);
    assert.equal(getStageRendererForLayer("nope", layers), null);
    assert.equal(getStageRendererForFrame("b"), rb);
    offA();
    offB();
    assert.equal(getStageRendererForLayer("a2", layers), null);
  });

  it("getStageRenderer answers for the active frame, else the first, else the single stage", () => {
    const single = new StageRenderer();
    setStageRenderer(single);
    assert.equal(getStageRenderer(), single);

    const ra = new StageRenderer();
    const rb = new StageRenderer();
    const offA = registerFrameRenderer("a", ra);
    const offB = registerFrameRenderer("b", rb);
    assert.equal(getStageRenderer(), ra, "the first frame by default");
    setActiveStageFrame("b");
    assert.equal(getStageRenderer(), rb);
    setActiveStageFrame("gone");
    assert.equal(getStageRenderer(), ra, "an unknown active frame falls back to the first");
    offA();
    offB();
    assert.equal(getStageRenderer(), single);
  });

  it("an old registration does not remove a newer one for the same frame", () => {
    const first = new StageRenderer();
    const second = new StageRenderer();
    const offFirst = registerFrameRenderer("a", first);
    const offSecond = registerFrameRenderer("a", second);
    offFirst();
    assert.equal(getStageRendererForFrame("a"), second);
    offSecond();
    assert.equal(getStageRendererForFrame("a"), null);
  });
});
