// Stub CSS imports for the node test environment
if (typeof require !== "undefined" && require.extensions) {
  require.extensions[".css"] = () => ({});
}

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createDocumentFromLayers, createLayer } from "@/core/document/factories";
import type { Layer } from "@/core/document/schema";
import { setDocument } from "@/core/store/documentState";
import { readSimple } from "@/core/inspector/simpleOps";

/**
 * ROADMAP Law 17 (Visual First, No Maths) as a test: the Simple face of the Design inspector is written in plain
 * words. It is rendered for every kind of layer it supports and everything a person can read (text, labels,
 * placeholders, tooltips) is scanned for technical terms: units, CSS and property names, colour notations.
 */
const TECHNICAL = /\b(px|rem|em|vw|vh|pt|css|svg|dom|hex|rgba?|hsla?|oklch|flex|grid|z-?index|padding|margin|hug|breakpoint|json|regex|boolean|enum|string|float|integer|px|attribute|property|prop|stroke-?width|border-?radius|box-?shadow)\b/i;
const PROPERTY_PATH = /\b[a-z]+[A-Za-z]*\.[a-z][A-Za-z]*\b/; // frame.x, svg.fill, appearance.opacity

const layer = (id: string, archetype: string): Layer =>
  createLayer({ id, archetype: archetype as never, parentId: "pg", name: id, properties: { "frame.x": 1, "frame.y": 2, "frame.width": 3, "frame.height": 4 } as never }) as Layer;

const ARCHETYPES = ["rectangle", "ellipse", "polygon", "star", "line", "arrow", "svgPath", "container", "form", "text", "button", "badge", "image"];

/** Every string in the markup a person could read. */
function readable(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/>([^<>]+)</g)) out.push(m[1]);
  for (const m of html.matchAll(/\b(?:aria-label|placeholder|title|alt)="([^"]*)"/g)) out.push(m[1]);
  return out.map((t) => t.replace(/&amp;/g, "&").trim()).filter(Boolean);
}

describe("Law 17: the Simple face is written in plain words", () => {
  beforeEach(() => {
    setDocument(createDocumentFromLayers([
      createLayer({ id: "pg", archetype: "container", parentId: null, name: "pg", children: ARCHETYPES.map((a) => `l_${a}`), properties: {} }) as Layer,
      ...ARCHETYPES.map((a) => layer(`l_${a}`, a)),
    ]));
  });

  it("no technical term or property name reads on the face, for any kind of layer or for a mixed selection", async () => {
    const { SimpleFaceView } = await import("../simple/SimpleFace");
    const selections: string[][] = [...ARCHETYPES.map((a) => [`l_${a}`]), ARCHETYPES.map((a) => `l_${a}`), ["l_rectangle", "l_text"]];
    let checked = 0;
    for (const ids of selections) {
      const strings = readable(renderToStaticMarkup(React.createElement(SimpleFaceView, { readout: readSimple(ids) })));
      assert.ok(strings.length > 0, `nothing rendered for ${ids.join(", ")}`);
      for (const text of strings) {
        assert.ok(!TECHNICAL.test(text), `technical term in "${text}" (${ids.join(", ")})`);
        assert.ok(!PROPERTY_PATH.test(text), `property name in "${text}" (${ids.join(", ")})`);
        checked++;
      }
    }
    assert.ok(checked > 100, `only ${checked} strings were checked`);
  });

  it("the face has seven groups at most, whatever is selected", async () => {
    const { SimpleFaceView } = await import("../simple/SimpleFace");
    const html = renderToStaticMarkup(React.createElement(SimpleFaceView, { readout: readSimple(ARCHETYPES.map((a) => `l_${a}`)) }));
    const groups = [...html.matchAll(/class="simple-group"/g)].length;
    assert.ok(groups > 0 && groups <= 7, `${groups} groups`);
  });

  it("the scan catches what it should", () => {
    for (const bad of ["Width (px)", "frame.width", "Border-radius", "Set the CSS colour", "SVG fill", "z-index", "padding"]) {
      assert.ok(TECHNICAL.test(bad) || PROPERTY_PATH.test(bad), `${bad} should have been caught`);
    }
    for (const good of ["Position", "Size", "Fill", "Stroke", "Corner radius", "Opacity", "Text", "X", "Y", "Mixed", "Select a layer to change it."]) {
      assert.ok(!TECHNICAL.test(good) && !PROPERTY_PATH.test(good), `${good} should be allowed`);
    }
  });
});
