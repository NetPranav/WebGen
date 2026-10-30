/**
 * FigCraft port F10: variables import and export. The cases of FigCraft's `crates/engine/src/variables_io_tests.rs`
 * (commit 6ea44e9) translated to our tokens: a round trip into another file, back into the same file (nothing new,
 * edits in place, a new mode, one undo step), CSS custom properties, and junk refused or skipped with warnings.
 * MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { collectionsOf, isAlias, type Variable } from "../tokens";
import { parseCss, toCss } from "../../paint/color";
import { createCollection, createVariable, setAlias, updateVariable } from "../tokenOps";
import { exportVariablesCss, exportVariablesJson, importVariablesJson, isVariablesJson } from "../variablesIO";

const fresh = () => setDocument(createDocumentFromLayers([createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", properties: { "frame.width": 400, "frame.height": 400 } }) as Layer]));
const vars = () => Object.values(getDocument().variables ?? {}) as Variable[];
const byNameV = (name: string) => vars().find((v) => v.name === name)!;

/** A "Theme" collection (Light/Dark) with one variable of each type and an alias. */
function theme() {
  const t = createCollection("Theme", ["Light", "Dark"])!;
  const [light, dark] = collectionsOf(getDocument()).find((c) => c.id === t)!.modes.map((m) => m.id);
  const primary = createVariable("color/primary", "color", { [light]: "rgba(0, 0, 255, 0.5)", [dark]: "#ffffff" }, { collection: t })!;
  const radius = createVariable("radius", "number", { [light]: 4, [dark]: 6.5 }, { collection: t })!;
  createVariable("label", "string", { [light]: 'Say "hi"' }, { collection: t });
  createVariable("on", "boolean", { [light]: false }, { collection: t });
  const accent = createVariable("accent", "color", { [light]: "#000000" }, { collection: t })!;
  setAlias(accent, dark, primary);
  updateVariable(radius, { scopes: ["CORNER_RADIUS"], description: "Corners" });
  return { t, light, dark };
}

/** Collections and variables by name with values by mode name (aliases by target name). */
function byName() {
  const d = getDocument();
  return vars()
    .map((v) => {
      const c = collectionsOf(d).find((x) => x.id === (v.collection ?? "default"))!;
      const values = c.modes.map((m) => {
        const x = v.values[m.id];
        const c = v.type === "color" && typeof x === "string" ? parseCss(x) : null;
        return [m.name, x === undefined ? "-" : isAlias(x) ? `→ ${(d.variables![x.alias] as Variable).name}` : c ? toCss(c) : JSON.stringify(x)];
      });
      return JSON.stringify([c.name, v.name, v.type, values, v.scopes ?? null]);
    })
    .sort();
}

describe("FigCraft port F10: variables import and export", () => {
  beforeEach(fresh);

  it("round-trips into another file, back into the same one, and as CSS", () => {
    const { t, light } = theme();
    const text = JSON.stringify(exportVariablesJson(getDocument()));
    const parsed = JSON.parse(text);
    assert.ok(isVariablesJson(parsed));
    const want = byName();

    // into another file: the same collections, variables, values, aliases and scopes
    const source = getDocument();
    fresh();
    let r = importVariablesJson(text);
    assert.deepEqual([r.collections, r.variables], [1, 5], JSON.stringify(r));
    assert.deepEqual(byName(), want);
    assert.equal(byNameV("radius").description, "Corners");

    // back into the same file: nothing new, nothing changed; edited values update in place
    setDocument(source);
    const before = JSON.stringify(getDocument().variables);
    r = importVariablesJson(parsed);
    assert.deepEqual([r.collections, r.variables, r.updated], [0, 0, 5], JSON.stringify(r));
    assert.equal(JSON.stringify(getDocument().variables), before);
    const rid = byNameV("radius").id;
    const edited = structuredClone(parsed);
    edited.meta.variables[rid].valuesByMode[light] = 12;
    edited.meta.variableCollections[t].modes.push({ modeId: "x", name: "Dim" });
    edited.meta.variables[rid].valuesByMode.x = 1;
    importVariablesJson(edited);
    const radius = byNameV("radius");
    assert.equal(radius.id, rid, "the same variable (bindings keep working)");
    assert.equal(radius.values[light], 12);
    const coll = collectionsOf(getDocument()).find((c) => c.id === t)!;
    assert.equal(coll.modes.length, 3, "the new mode is added");
    assert.equal(radius.values[coll.modes[2].id], 1);
    assert.equal(Object.keys(byNameV("on").values).length, 3, "the others get a value in it too");
    historyCommands.undo();
    assert.equal(JSON.stringify(getDocument().variables), before, "one undo step");

    // CSS: the default mode on :root, the others by attribute; aliases refer to their target
    const css = exportVariablesCss(getDocument(), ["Theme"]);
    for (const w of [":root {\n", "  --radius: 4px;\n", '[data-theme="Dark"] {\n', "  --radius: 6.5px;\n", "  --accent: var(--color-primary);\n", '  --label: "Say  hi ";\n']) assert.ok(css.includes(w), `${JSON.stringify(w)} in\n${css}`);
    assert.equal(exportVariablesCss(getDocument(), ["Nope"]), "");
  });

  it("checks what it reads: junk refused, bad entries skipped with warnings, no type clash or alias loop gets in", () => {
    const t = createCollection("Theme")!;
    createVariable("size", "color", {}, { collection: t, starting: true });
    const before = JSON.stringify(getDocument());
    for (const p of [undefined, 3, "{", { nope: 1 }, { meta: { variables: {} } }]) assert.throws(() => importVariablesJson(p), String(JSON.stringify(p)));
    assert.equal(JSON.stringify(getDocument()), before);

    const mode = [{ modeId: "m", name: "Mode 1" }];
    const alias = (id: string) => ({ type: "VARIABLE_ALIAS", id });
    const junk = {
      meta: {
        variableCollections: { c: { id: "c", name: "Theme", modes: mode }, bad: { name: "x", modes: "no" } },
        variables: {
          size: { id: "size", name: "size", variableCollectionId: "c", resolvedType: "FLOAT", valuesByMode: { m: 3 } },
          a: { id: "a", name: "a", variableCollectionId: "c", resolvedType: "FLOAT", valuesByMode: { m: alias("b") } },
          b: { id: "b", name: "b", variableCollectionId: "c", resolvedType: "FLOAT", valuesByMode: { m: alias("a") } },
          w: { id: "w", name: "w", variableCollectionId: "c", resolvedType: "WEIRD", valuesByMode: { m: 1 } },
          n: { id: "n", name: "n", variableCollectionId: "c", resolvedType: "FLOAT", valuesByMode: { m: "NaN" } },
        },
      },
    };
    const r = importVariablesJson(junk);
    const warnings = r.warnings.join("\n");
    assert.match(warnings, /`size` is a color variable/);
    assert.match(warnings, /refer back to itself/);
    assert.match(warnings, /`w` is malformed/);
    assert.equal(byNameV("size").type, "color", "the clash left it alone");
    assert.equal(collectionsOf(getDocument()).filter((c) => c.name === "Theme").length, 1, "joined by name");
    const [a, b] = [byNameV("a"), byNameV("b")];
    assert.ok(![...Object.values(a.values), ...Object.values(b.values)].every((v) => isAlias(v)), "no loop");
    assert.equal(byNameV("n").values[Object.keys(byNameV("n").values)[0]], 0, "a value that isn't a number takes the starting value");
  });
});
