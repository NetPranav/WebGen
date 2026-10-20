import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { FULL_CROP, fillLayers, hasImageFilter, imageFilterCss, imageLayout, newPaint, paintCss, parseFills, serializeFills, type ImagePaint, type Paint } from "../paints";
import { changeType } from "../paintEdits";
import { dragHandle, handlesFor, imageOutline } from "../gradientHandles";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { getDocument } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { fillSummary, replaceImage, setFills } from "../paintOps";

const HASH = "a".repeat(64);
const img = (over: Partial<ImagePaint> = {}): ImagePaint => ({ ...(newPaint("image") as ImagePaint), src: `asset:${HASH}`, ...over });
const near = (a: number, b: number, t = 1e-9) => assert.ok(Math.abs(a - b) <= t, `${a} vs ${b}`);

describe("Phase 37: image paints are data", () => {
  it("round trip, with defaults left out and the crop kept only in crop mode", () => {
    const fills: Paint[] = [img({ mode: "crop", crop: { x: 0.1, y: 0.2, w: 0.5, h: 0.4 }, brightness: 1.2, natural: { w: 800, h: 500 } }), img({ mode: "tile", scale: 0.5 })];
    const json = serializeFills(fills);
    assert.ok(!json.includes('"contrast"'), "defaults are left out");
    const back = parseFills(json)!;
    assert.deepEqual(back[0], fills[0]);
    assert.equal(back[1].type === "image" && back[1].scale, 0.5);
    assert.deepEqual(back[1].type === "image" && back[1].crop, FULL_CROP, "no crop stored outside crop mode");
  });

  it("hostile values are cleaned: a bad source is dropped, numbers clamp, a crop stays inside the picture", () => {
    const [p] = parseFills(JSON.stringify([{ type: "image", src: "javascript:alert(1)", mode: "zoom", crop: { x: 5, y: -1, w: 9, h: 0 }, scale: 1e9, brightness: -4, contrast: 99 }])) as ImagePaint[];
    assert.equal(p.src, "");
    assert.equal(p.mode, "fill");
    assert.deepEqual(p.crop, { x: 0, y: 0, w: 1, h: 0.01 });
    assert.deepEqual([p.scale, p.brightness, p.contrast], [20, 0, 3]);
    const [q] = parseFills(JSON.stringify([{ type: "image", src: "data:image/png;base64,AAAA", crop: { x: 0.9, y: 0, w: 0.5, h: 1 } }])) as ImagePaint[];
    assert.equal(q.crop.x, 0.5, "x + w stays within 1");
    assert.ok(q.src.startsWith("data:image/png"));
  });

  it("css url is quoted and escaped, and nothing is drawn without a picture or while hidden", () => {
    assert.equal(paintCss(img({ src: "/samples/a b.svg" }), 10, 10), 'url("/samples/a b.svg")');
    assert.equal(paintCss(img({ src: 'https://x/"y.png' }), 10, 10), 'url("https://x/\\"y.png")');
    assert.equal(paintCss(img({ src: "" }), 10, 10), null);
    assert.equal(paintCss(img({ visible: false }), 10, 10), null);
    assert.equal(paintCss(img(), 10, 10, () => "blob:abc"), 'url("blob:abc")');
    assert.equal(paintCss(img(), 10, 10, () => null), null, "the file isn't loaded yet");
  });
});

describe("Phase 37: how a picture sits in its box", () => {
  it("fill covers, fit contains", () => {
    assert.deepEqual(imageLayout(img({ mode: "fill" })), { size: "cover", position: "center", repeat: "no-repeat" });
    assert.deepEqual(imageLayout(img({ mode: "fit" })), { size: "contain", position: "center", repeat: "no-repeat" });
  });
  it("crop: the box shows the named part, so the picture is scaled up by the crop and shifted to it", () => {
    // the middle quarter (x 0.25..0.75): the picture is twice the box, offset so its 25% point is at the left edge
    assert.deepEqual(imageLayout(img({ mode: "crop", crop: { x: 0.25, y: 0.25, w: 0.5, h: 0.5 } })), { size: "200% 200%", position: "50% 50%", repeat: "no-repeat" });
    assert.deepEqual(imageLayout(img({ mode: "crop", crop: { x: 0, y: 0, w: 0.5, h: 1 } })), { size: "200% 100%", position: "0% 0%", repeat: "no-repeat" });
    assert.equal(imageLayout(img({ mode: "crop", crop: { x: 0.5, y: 0, w: 0.5, h: 1 } })).position, "100% 0%", "the right half is at the right");
    assert.equal(imageLayout(img({ mode: "crop", crop: FULL_CROP })).position, "0% 0%", "a full crop has nothing to shift");
  });
  it("tile repeats at a multiple of the picture's size, or 128 px when it isn't known", () => {
    assert.deepEqual(imageLayout(img({ mode: "tile", scale: 0.5, natural: { w: 200, h: 100 } })), { size: "100px 50px", position: "0 0", repeat: "repeat" });
    assert.equal(imageLayout(img({ mode: "tile" })).size, "128px 128px");
  });
  it("fill layers: gradients and pictures share the background lists, filtered pictures get a layer of their own", () => {
    const solid: Paint = { type: "solid", color: "#f00", opacity: 1, visible: true };
    const { layers, filtered } = fillLayers([img({ mode: "tile", natural: { w: 10, h: 10 } }), solid, img({ brightness: 1.5 })], 100, 100, (s) => s);
    assert.equal(layers!.size.split(", ").length, 2);
    assert.ok(layers!.image.startsWith('url("10")'.slice(0, 0) + "url(") && layers!.image.includes("linear-gradient"));
    assert.equal(layers!.size, "10px 10px, auto");
    assert.equal(layers!.repeat, "repeat, no-repeat");
    assert.equal(filtered.length, 1);
    assert.equal(fillLayers([img({ src: "" })], 10, 10).layers, undefined);
  });
  it("colour changes: unchanged is no filter, changed is brightness, contrast and saturate", () => {
    assert.equal(hasImageFilter(img()), false);
    assert.equal(imageFilterCss(img()), "");
    assert.equal(imageFilterCss(img({ brightness: 1.2, contrast: 0.8, saturation: 0 })), "brightness(1.2) contrast(0.8) saturate(0)");
    assert.equal(hasImageFilter(newPaint("solid")), false);
  });
});

describe("Phase 37: crop handles on the canvas", () => {
  const box = { w: 200, h: 100 };
  it("the picture's outline reaches outside the box by the crop", () => {
    assert.deepEqual(imageOutline({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 }), { x0: -0.5, y0: -0.5, x1: 1.5, y1: 1.5 });
    assert.deepEqual(imageOutline(FULL_CROP), { x0: 0, y0: 0, x1: 1, y1: 1 });
  });
  it("crop mode has a move handle and four corners; other modes have none", () => {
    const h = handlesFor(img({ mode: "crop", crop: { x: 0.25, y: 0.25, w: 0.5, h: 0.5 } }), box);
    assert.deepEqual(h.map((x) => x.kind), ["imgMove", "imgNW", "imgNE", "imgSE", "imgSW"]);
    assert.deepEqual(h[0].at, { x: 0.5, y: 0.5 });
    assert.deepEqual(h[3].at, { x: 1.5, y: 1.5 });
    assert.deepEqual(handlesFor(img({ mode: "fill" }), box), []);
  });
  it("dragging the south-east corner out makes the crop smaller (the picture bigger)", () => {
    const p = img({ mode: "crop" });
    const out = dragHandle(p, { kind: "imgSE" }, { x: 2, y: 2 }, box) as ImagePaint;
    near(out.crop.w, 0.5);
    near(out.crop.h, 0.5);
    near(out.crop.x, 0);
    near(out.crop.y, 0);
  });
  it("a corner can't come inside the box: the picture always covers it", () => {
    const out = dragHandle(img({ mode: "crop" }), { kind: "imgSE" }, { x: 0.3, y: 0.3 }, box) as ImagePaint;
    assert.deepEqual(out.crop, FULL_CROP);
    const nw = dragHandle(img({ mode: "crop" }), { kind: "imgNW" }, { x: 0.4, y: 0.4 }, box) as ImagePaint;
    assert.deepEqual(nw.crop, FULL_CROP);
  });
  it("the north-west corner keeps the south-east one where it is", () => {
    const p = img({ mode: "crop", crop: { x: 0.25, y: 0.25, w: 0.5, h: 0.5 } }); // outline -0.5..1.5
    const out = dragHandle(p, { kind: "imgNW" }, { x: -1.5, y: -1.5 }, box) as ImagePaint; // outline -1.5..1.5, 3 wide
    near(out.crop.w, 1 / 3);
    near(out.crop.x, 0.5);
    near(imageOutline(out.crop).x1, 1.5);
  });
  it("the move handle pans the picture and stops at its edges", () => {
    const p = img({ mode: "crop", crop: { x: 0.25, y: 0.25, w: 0.5, h: 0.5 } });
    const left = dragHandle(p, { kind: "imgMove" }, { x: 0, y: 0.5 }, box) as ImagePaint; // centre to x 0: outline -1..1
    near(left.crop.x, 0.5);
    near(left.crop.w, 0.5);
    const far = dragHandle(p, { kind: "imgMove" }, { x: 9, y: 9 }, box) as ImagePaint;
    near(far.crop.x, 0);
    near(far.crop.y, 0);
    assert.deepEqual((dragHandle(img({ mode: "fill" }), { kind: "imgMove" }, { x: 1, y: 1 }, box) as ImagePaint).crop, FULL_CROP, "no effect outside crop mode");
  });
});

describe("Phase 37: changing a fill to and from a picture", () => {
  it("solid to picture starts empty; picture to a gradient takes a neutral colour; the opacity carries", () => {
    const toImage = changeType({ type: "solid", color: "#f00", opacity: 0.4, visible: false }, "image") as ImagePaint;
    assert.deepEqual([toImage.type, toImage.src, toImage.opacity, toImage.visible], ["image", "", 0.4, false]);
    const toLinear = changeType(img({ opacity: 0.7 }), "linear");
    assert.deepEqual([toLinear.type, toLinear.opacity], ["linear", 0.7]);
    assert.ok("stops" in toLinear && toLinear.stops.length === 2);
    assert.equal(changeType(changeType(img({ src: "x" }), "solid"), "image").type, "image");
  });
});

const layer = (id: string, archetype: string, props: Record<string, unknown> = {}): Layer =>
  ({ ...(createLayer({ id, archetype: archetype as never, parentId: "pg", name: id, properties: { positioning: "absolute", "frame.width": 100, "frame.height": 50, ...props } as never }) as Layer) });

describe("Phase 37: replacing the picture", () => {
  beforeEach(() => {
    setDocument(createDocumentFromLayers([
      createLayer({ id: "pg", archetype: "container", parentId: null, name: "pg", children: ["i", "r", "e", "t"], properties: {} }) as Layer,
      layer("i", "image", { "media.src": "/samples/landscape.svg" }),
      layer("r", "rectangle"),
      layer("e", "ellipse"),
      layer("t", "text", { "content.text": "x" }),
    ]));
  });
  it("an image layer's source changes", () => {
    assert.equal(replaceImage(["i"], `asset:${HASH}`), 1);
    assert.equal(getDocument().layers.i.properties["media.src"], `asset:${HASH}`);
  });
  it("a shape's picture fills change source and keep their mode and colours", () => {
    setFills(["r"], [img({ src: "", mode: "crop", crop: { x: 0.1, y: 0.1, w: 0.5, h: 0.5 }, brightness: 1.3 }), newPaint("solid") as Paint]);
    assert.equal(replaceImage(["r"], `asset:${"b".repeat(64)}`, { w: 40, h: 20 }), 1);
    const [p, q] = parseFills(String(getDocument().layers.r.properties["paint.fills"]))!;
    assert.deepEqual([p.type === "image" && p.src, p.type === "image" && p.mode, p.type === "image" && p.brightness, p.type === "image" && p.natural], [`asset:${"b".repeat(64)}`, "crop", 1.3, { w: 40, h: 20 }]);
    assert.equal(q.type, "solid");
  });
  it("only the named fill, when one is named", () => {
    setFills(["r"], [img({ src: "/samples/a.svg" }), img({ src: "/samples/b.svg" })]);
    replaceImage(["r"], "/samples/c.svg", undefined, 1);
    const [a, b] = parseFills(String(getDocument().layers.r.properties["paint.fills"])) as ImagePaint[];
    assert.deepEqual([a.src, b.src], ["/samples/a.svg", "/samples/c.svg"]);
  });
  it("layers with no picture to replace, text, and unsafe sources do nothing", () => {
    assert.equal(replaceImage(["e", "t"], `asset:${HASH}`), 0);
    assert.equal(replaceImage(["i"], "javascript:alert(1)"), 0);
    assert.equal(getDocument().layers.i.properties["media.src"], "/samples/landscape.svg");
  });
  it("the summary says Picture", () => {
    setFills(["r"], [img()]);
    assert.equal(fillSummary("r"), "Picture");
  });
});
