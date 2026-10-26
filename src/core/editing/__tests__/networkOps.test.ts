/**
 * FigCraft port F4 on layers: a path layer gets a vector network, the paint bucket fills and unfills its faces as one
 * undo step each, points take a radius of their own, a Phase 40 path edit drops the network, and the stage draws it.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { RenderLayer } from "../../render/RenderLayer";
import { makeNetwork, networkOf, paintBucket, setNetworkPoint } from "../networkOps";
import { fillContains, parseNetwork } from "../../paths/vectorNetwork";
import { isPropertyLegalFor } from "../../document/properties";

/** A square path with a diagonal: two triangles once it is a network. */
const doc = () =>
  createDocumentFromLayers([
    createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: ["p"], properties: { "frame.width": 800, "frame.height": 600 } }) as Layer,
    createLayer({ id: "p", archetype: "svgPath", parentId: "pg", name: "Path", properties: { positioning: "absolute", "frame.width": 100, "frame.height": 100, "svg.path": "M0 0 L200 0 L200 200 L0 200 Z", "svg.fill": "none" } }) as Layer,
  ]);

const layer = () => getDocument().layers.p;

describe("FigCraft port F4: vector networks on layers", () => {
  beforeEach(() => setDocument(doc()));

  it("svg.network belongs to path layers only", () => {
    assert.ok(isPropertyLegalFor("svg.network", "svgPath"));
    assert.ok(!isPropertyLegalFor("svg.network", "rectangle"));
  });

  it("a path becomes a network; the bucket unfills and fills its face, one undo step each", () => {
    assert.equal(makeNetwork(["p"]), 1);
    const net = parseNetwork(layer().properties["svg.network"])!;
    assert.equal(net.vertices.length, 4);
    assert.equal(net.regions.length, 1);
    // the square was filled (its closed subpath is a region): the first click unfills it
    assert.equal(paintBucket("p", { x: 100, y: 100 }), false);
    assert.ok(!fillContains(networkOf(layer())!, { x: 100, y: 100 }));
    assert.equal(paintBucket("p", { x: 100, y: 100 }), true);
    assert.ok(fillContains(networkOf(layer())!, { x: 100, y: 100 }));
    assert.equal(layer().properties["svg.fill"], "#d9d9d9", "a filled area on a layer with no fill gets a visible one");
    historyCommands.undo();
    assert.ok(!fillContains(networkOf(layer())!, { x: 100, y: 100 }), "one click is one undo step");
    assert.equal(paintBucket("p", { x: 300, y: 300 }), null, "outside every closed area");
  });

  it("a point takes its own corner radius; clearing it puts it back", () => {
    makeNetwork(["p"]);
    assert.ok(setNetworkPoint("p", 1, { radius: 30, join: "round" }));
    let v = parseNetwork(layer().properties["svg.network"])!.vertices[1];
    assert.equal(v.radius, 30);
    assert.equal(v.join, "round");
    assert.ok(setNetworkPoint("p", 1, { radius: 0, join: null }));
    v = parseNetwork(layer().properties["svg.network"])!.vertices[1];
    assert.equal(v.radius, undefined);
    assert.equal(v.join, undefined);
    assert.ok(!setNetworkPoint("p", 99, { radius: 3 }));
  });

  it("the stage draws a network's fill by regions and its stroke by segments", () => {
    makeNetwork(["p"]);
    setNetworkPoint("p", 2, { radius: 40 });
    const out = renderToStaticMarkup(createElement(RenderLayer, { layerId: "p", layers: getDocument().layers }));
    assert.ok(out.includes("data-network"), out);
    const ds = [...out.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(ds.length, 2, "a fill path and a stroke path");
    assert.ok(ds[0].includes("C"), "the rounded corner is a curve");
  });
});
