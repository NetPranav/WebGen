import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { flagsInRange, isPlain, normalizeRuns, parseRuns, replaceRange, runsOf, runsText, safeRunColor, serializeRuns, setRunColor, toggleFlag, MAX_RUNS, type TextRun } from "../runs";

const plain = (t: string): TextRun[] => [{ text: t }];
const show = (runs: TextRun[]) => runs.map((r) => `${r.bold ? "B" : ""}${r.italic ? "I" : ""}${r.underline ? "U" : ""}${r.strike ? "S" : ""}${r.color ? `[${r.color}]` : ""}:${r.text}`);

describe("Phase 31: text runs", () => {
  it("normalize joins equal neighbours and drops empty runs", () => {
    assert.deepEqual(normalizeRuns([{ text: "a" }, { text: "" }, { text: "b" }, { text: "c", bold: true }, { text: "d", bold: true }]), [{ text: "ab" }, { text: "cd", bold: true }]);
  });

  it("toggling bold on a range splits the run in three", () => {
    assert.deepEqual(show(toggleFlag(plain("Hello world"), 6, 11, "bold")), [":Hello ", "B:world"]);
    assert.deepEqual(show(toggleFlag(plain("Hello world"), 2, 4, "italic")), [":He", "I:ll", ":o world"]);
  });

  it("toggling again removes the style, and the runs merge back", () => {
    const once = toggleFlag(plain("Hello world"), 0, 5, "bold");
    assert.deepEqual(show(toggleFlag(once, 0, 5, "bold")), [":Hello world"]);
  });

  it("a range that is only partly bold turns bold on for all of it", () => {
    const part = toggleFlag(plain("abcdef"), 0, 3, "bold");
    assert.deepEqual(show(toggleFlag(part, 1, 5, "bold")), ["B:abcde", ":f"]);
  });

  it("the range may be given backwards and is clamped to the text", () => {
    assert.deepEqual(show(toggleFlag(plain("abc"), 99, 1, "underline")), [":a", "U:bc"]);
    assert.deepEqual(show(toggleFlag(plain("abc"), 2, 2, "bold")), [":abc"]);
  });

  it("flagsInRange reports only flags every character has", () => {
    const runs = toggleFlag(toggleFlag(plain("abcdef"), 0, 4, "bold"), 2, 6, "italic");
    assert.deepEqual(flagsInRange(runs, 2, 4), { bold: true, italic: true, underline: false, strike: false });
    assert.deepEqual(flagsInRange(runs, 0, 6), { bold: false, italic: false, underline: false, strike: false });
  });

  it("colours apply to a range, clear with null, and unsafe colours are refused", () => {
    const red = setRunColor(plain("abcdef"), 1, 3, "#ff0000");
    assert.deepEqual(show(red), [":a", "[#ff0000]:bc", ":def"]);
    assert.deepEqual(show(setRunColor(red, 0, 6, null)), [":abcdef"]);
    assert.deepEqual(show(setRunColor(plain("ab"), 0, 2, "red;background:url(x)")), [":ab"]);
    assert.equal(safeRunColor("expression(alert(1))"), undefined);
    assert.equal(safeRunColor("rgb(1, 2, 3)"), "rgb(1, 2, 3)");
  });

  it("replaceRange keeps the style of the character before the edit", () => {
    const runs = toggleFlag(plain("Hello world"), 0, 5, "bold");
    assert.deepEqual(show(replaceRange(runs, 5, 5, "!!")), ["B:Hello!!", ": world"]);
    assert.deepEqual(show(replaceRange(runs, 0, 0, ">>")), ["B:>>Hello", ": world"]);
    assert.deepEqual(show(replaceRange(runs, 3, 8, "")), ["B:Hel", ":rld"]);
    assert.equal(runsText(replaceRange(runs, 3, 8, "XY")), "HelXYrld");
  });

  it("serialises to compact JSON and reads back the same runs", () => {
    const runs = setRunColor(toggleFlag(plain("Hello world"), 0, 5, "bold"), 6, 11, "#00f");
    const json = serializeRuns(runs);
    assert.equal(json, '[{"t":"Hello","b":1},{"t":" "},{"t":"world","c":"#00f"}]');
    assert.deepEqual(parseRuns(json, "Hello world"), runs);
  });

  it("plain text needs no runs at all", () => {
    assert.equal(serializeRuns(plain("just text")), "");
    assert.equal(isPlain(plain("x")), true);
    assert.equal(serializeRuns([]), "");
  });

  it("runs that don't spell the text are ignored", () => {
    const json = serializeRuns(toggleFlag(plain("Hello"), 0, 2, "bold"));
    assert.equal(parseRuns(json, "Hello!"), null);
    assert.deepEqual(runsOf("Hello!", json), plain("Hello!"));
    assert.deepEqual(runsOf("", json), []);
  });

  it("malformed or hostile JSON is ignored, never thrown", () => {
    for (const bad of ["", "not json", "{}", "[]", "[1]", '[{"t":5}]', "null", 42, undefined, '[{"t":"a"}', "x".repeat(300_000)]) assert.equal(parseRuns(bad, "a"), null);
    const many = JSON.stringify(Array.from({ length: MAX_RUNS + 1 }, () => ({ t: "a" })));
    assert.equal(parseRuns(many, "a".repeat(MAX_RUNS + 1)), null);
  });

  it("a hostile colour in stored runs is dropped but the text stays", () => {
    const runs = parseRuns('[{"t":"hi","c":"red;position:fixed"}]', "hi")!;
    assert.deepEqual(runs, [{ text: "hi" }]);
  });
});
