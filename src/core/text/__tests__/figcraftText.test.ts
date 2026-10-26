/**
 * FigCraft port F8: text. The list-numbering cases of FigCraft's `crates/text/src/tail_tests.rs` and the case rules of
 * `crates/doc/src/tests.rs` (commit 6ea44e9), translated to our text module; then the operations (lists, nesting, a
 * list's start, text on a path) and what reaches the markup (paragraphs, markers in their gutter, max lines, the
 * decoration look, features, the text path). MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors.
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
import { alpha, applyCase, featureCss, listGutter, listMarkers, paragraphLists, parseFeatures, parseTextPath, roman, runsByParagraph, serializeParagraphLists, textPathD, type ParaList } from "../textFeatures";
import { attachToPath, detachFromPath, indentList, listsOf, setList, setListStart, setTextPath } from "../textOps";

const pl = (list: ParaList["list"], indent: number): ParaList => ({ list, indent });
const from = (list: ParaList["list"], indent: number, startOffset: number): ParaList => ({ list, indent, startOffset });
const [N, B, P] = ["numbered", "bulleted", "none"] as const;

describe("FigCraft list numbering (tail_tests.rs)", () => {
  it("numbered lists count from their start", () => {
    const cases: [ParaList[], string[], string][] = [
      [[from(N, 0, 1)], ["2."], "a one-item list started at 2"],
      [[from(N, 0, 3), pl(N, 0), pl(N, 0)], ["4.", "5.", "6."], "the items after the first count on from it"],
      [[from(N, 0, 3), from(N, 0, 3), from(N, 0, 3)], ["4.", "5.", "6."], "items that go on counting ignore their own start"],
      [[from(N, 0, 1), pl(P, 0), from(N, 0, 1)], ["2.", "", "2."], "a list after a plain paragraph starts from its own start"],
      [[pl(N, 0), from(N, 1, 1), pl(N, 1)], ["1.", "b.", "c."], "a nested level starts from its first item's start"],
      [[from(B, 0, 4), pl(B, 0)], ["•", "•"], "bullets have no number"],
      [[from(N, 0, 4000), pl(N, 2)], ["4001.", "i."], "big starts"],
    ];
    for (const [lists, want, why] of cases) assert.deepEqual(listMarkers(lists), want, why);
    const max = listMarkers([from(N, 0, 4_294_967_295), pl(N, 0), pl(N, 0)]);
    assert.ok(max.every((m) => m.startsWith("429496729")), JSON.stringify(max));
  });

  it("list numbering by level", () => {
    const cases: [ParaList[], string[], string][] = [
      [[pl(N, 0), pl(N, 0), pl(N, 0)], ["1.", "2.", "3."], "a numbered list counts its items"],
      [[pl(N, 0), pl(N, 1), pl(N, 1), pl(N, 0)], ["1.", "a.", "b.", "2."], "nested items count on their own level; the outer count goes on"],
      [[pl(N, 0), pl(N, 1), pl(N, 2), pl(N, 3)], ["1.", "a.", "i.", "1."], "numbers, letters, roman numerals, round again"],
      [[pl(B, 0), pl(B, 1), pl(B, 2), pl(B, 3)], ["•", "◦", "▪", "•"], "bullets change shape per level"],
      [[pl(N, 0), pl(N, 0), pl(P, 0), pl(N, 0)], ["1.", "2.", "", "1."], "a plain paragraph ends a list"],
      [[pl(N, 0), pl(B, 0), pl(N, 0)], ["1.", "•", "1."], "the other kind of list at the same level starts the count again"],
      [[pl(N, 0), pl(N, 1), pl(N, 0), pl(N, 1)], ["1.", "a.", "2.", "a."], "a shallower item starts the deeper count again"],
      [[pl(N, 2), pl(N, 2), pl(N, 2), pl(N, 2)], ["i.", "ii.", "iii.", "iv."], "roman numerals at the third level"],
    ];
    for (const [lists, want, why] of cases) assert.deepEqual(listMarkers(lists), want, why);
    const many = [pl(N, 0), ...Array.from({ length: 27 }, () => pl(N, 1))];
    assert.equal(listMarkers(many).at(-1), "aa.", "letters go on past z as aa");
    assert.deepEqual([alpha(1), alpha(26), alpha(27), roman(1994), roman(4000)], ["a", "z", "aa", "mcmxciv", "4000"]);
  });

  it("the gutter fits the widest number plus half an em, at least one and a half ems", () => {
    assert.equal(listGutter([pl(B, 0)], ["•"], 20), 30);
    assert.equal(listGutter([pl(P, 0)], [""], 20), 0);
    assert.equal(listGutter([from(N, 0, 999)], ["1000."], 20), 20 * 0.6 * 5 + 10);
  });

  it("stored lists are repaired; uniform lists store nothing", () => {
    assert.deepEqual(paragraphLists(JSON.stringify([{ list: "numbered", indent: 99 }, { list: "sparkle" }, null]), 3, "bulleted"), [
      { list: "numbered", indent: 8 },
      { list: "bulleted", indent: 0 },
      { list: "bulleted", indent: 0 },
    ]);
    assert.deepEqual(paragraphLists("junk", 2, "none"), [pl(P, 0), pl(P, 0)]);
    assert.equal(serializeParagraphLists([pl(B, 0), pl(B, 0)], "bulleted"), "");
    assert.notEqual(serializeParagraphLists([pl(B, 0), pl(B, 1)], "bulleted"), "");
  });
});

describe("FigCraft text case and features", () => {
  it("title case capitalises each word, keeps apostrophes inside words, and goes on across runs", () => {
    assert.equal(applyCase("title", "hello big world"), "Hello Big World");
    assert.equal(applyCase("title", "don't stop"), "Don't Stop");
    assert.equal(applyCase("title", "lo world", "l"), "lo World", "a run inside a word doesn't start one");
    assert.equal(applyCase("upper", "abc"), "ABC");
    assert.equal(applyCase("smallCaps", "Abc"), "Abc", "small caps is drawn, the text stays");
  });

  it("features: four-character tags only, sorted CSS", () => {
    assert.deepEqual(parseFeatures(JSON.stringify({ liga: false, tnum: true, bad: true, "x;y}": true, ss01: "yes" })), { liga: false, tnum: true });
    assert.equal(featureCss({ tnum: true, liga: false }), '"liga" 0, "tnum" 1');
    assert.equal(featureCss({}), undefined);
  });

  it("a text path parses, clamps its start, and flips by running the other way", () => {
    assert.equal(parseTextPath(JSON.stringify({ d: "nonsense" })), null);
    const tp = parseTextPath(JSON.stringify({ d: "M0 0 L100 0", start: 7, flip: true }))!;
    assert.equal(tp.start, 1);
    assert.match(textPathD(tp), /^M100[ ,]0/);
    assert.equal(textPathD({ ...tp, flip: false }), "M0 0 L100 0");
  });

  it("runs split at paragraph breaks", () => {
    assert.deepEqual(runsByParagraph([{ text: "a\nb", bold: true }, { text: "c" }]), [[{ text: "a", bold: true }], [{ text: "b", bold: true }, { text: "c" }]]);
    assert.deepEqual(runsByParagraph([{ text: "a\n" }]), [[{ text: "a" }], []]);
  });
});

describe("FigCraft port F8: on layers", () => {
  const text = (id: string, content: string, props: Record<string, unknown> = {}): Layer =>
    createLayer({ id, archetype: "text", parentId: "pg", name: id, properties: { positioning: "absolute", "frame.x": 10, "frame.y": 10, "frame.width": 200, "frame.height": 100, "content.text": content, "typography.fontSize": 20, ...props } }) as Layer;
  beforeEach(() =>
    setDocument(
      createDocumentFromLayers([
        createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: ["t", "arc"], properties: { "frame.width": 800, "frame.height": 600 } }) as Layer,
        text("t", "one\ntwo\nthree"),
        createLayer({ id: "arc", archetype: "ellipse", parentId: "pg", name: "arc", properties: { positioning: "absolute", "frame.x": 300, "frame.y": 50, "frame.width": 200, "frame.height": 100 } }) as Layer,
      ]),
    ),
  );
  const html = () => renderToStaticMarkup(createElement(RenderLayer, { layerId: "t", layers: getDocument().layers }));

  it("lists: a style for all paragraphs or some, nesting with Tab, a start number; one undo step each", () => {
    assert.equal(setList(["t"], "numbered"), 1);
    assert.equal(getDocument().layers.t.properties["typography.list"], "numbered");
    assert.equal(getDocument().layers.t.properties["typography.listParagraphs"], undefined, "uniform: nothing per paragraph");
    indentList(["t"], 1, [1]);
    assert.deepEqual(listMarkers(listsOf("t")), ["1.", "a.", "2."]);
    setListStart("t", 0, 5);
    assert.deepEqual(listMarkers(listsOf("t")), ["5.", "a.", "6."]);
    setList(["t"], "none", [2]);
    assert.deepEqual(listMarkers(listsOf("t")), ["5.", "a.", ""]);
    const out = html();
    assert.equal(out.match(/data-paragraph=/g)?.length, 3);
    assert.match(out, /data-list-marker=""[^>]*>5\.</);
    // the gutter: "5." is two digits wide (0.6 em each) plus half an em at 20px = 34px; level 1 is two gutters in
    assert.match(out, /data-paragraph="1" style="position:relative;white-space:pre-wrap;padding-left:68px"/);
    assert.match(out, /data-paragraph="2" style="position:relative;white-space:pre-wrap">three/, "a plain paragraph sits at the edge");
    historyCommands.undo();
    assert.deepEqual(listMarkers(listsOf("t")), ["5.", "a.", "6."]);
    assert.equal(indentList(["arc"], 1), 0, "not a text");
  });

  it("paragraph spacing and indent, max lines, vertical alignment, decoration look and features reach the CSS", () => {
    setDocument(createDocumentFromLayers([
      createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: ["t"], properties: { "frame.width": 800, "frame.height": 600 } }) as Layer,
      text("t", "a\nb", { "typography.paragraphSpacing": 12, "typography.paragraphIndent": 16, "typography.maxLines": 2, "typography.decorationStyle": "wavy", "typography.textDecoration": "underline", "typography.decorationThickness": 2, "typography.decorationOffset": 3, "typography.smallCaps": true, "typography.fontFeatures": JSON.stringify({ tnum: true }) }),
    ]));
    const out = html();
    assert.match(out, /data-paragraph="1" style="position:relative;white-space:pre-wrap;margin-top:12px;text-indent:16px"/);
    assert.match(out, /-webkit-line-clamp:2/);
    assert.match(out, /text-decoration-style:wavy/);
    assert.match(out, /text-decoration-thickness:2px/);
    assert.match(out, /text-underline-offset:3px/);
    assert.match(out, /font-variant-caps:small-caps/);
    assert.match(out, /font-feature-settings:&quot;tnum&quot; 1/);
    // text without any of it draws as one block, as before
    setDocument(createDocumentFromLayers([createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: ["t"], properties: {} }) as Layer, text("t", "a\nb")]));
    assert.doesNotMatch(html(), /data-paragraph/);
  });

  it("text on a path takes the shape's place, follows its outline, starts where asked and flips; off again", () => {
    assert.equal(attachToPath("t", "arc", { start: 0.25 }), true);
    const l = getDocument().layers.t;
    assert.deepEqual([l.properties["frame.x"], l.properties["frame.y"], l.properties["frame.width"], l.properties["frame.height"]], [300, 50, 200, 100]);
    const out = html();
    assert.match(out, /data-text-path=""/);
    assert.match(out, /<textPath href="#tp-t" startOffset="25%" text-anchor="start">one two three<\/textPath>/);
    setTextPath(["t"], { flip: true });
    assert.equal(parseTextPath(getDocument().layers.t.properties["typography.textPath"])!.flip, true);
    historyCommands.undo();
    assert.equal(parseTextPath(getDocument().layers.t.properties["typography.textPath"])!.flip, false);
    detachFromPath(["t"]);
    assert.doesNotMatch(html(), /textPath/);
    assert.equal(attachToPath("t", "t"), false);
  });
});
