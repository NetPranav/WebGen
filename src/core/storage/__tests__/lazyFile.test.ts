import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDefaultBlankSnapshot } from "../ProjectDatabase";
import { LazyFileError, lazyFileName, parseLazyFile, serializeLazyFile, LAZY_FILE_FORMAT } from "../lazyFile";
import { SCHEMA_VERSION } from "../../document/schema";

const snapshot = () => {
  const s = createDefaultBlankSnapshot("prj_file", "Launch Hero", { framework: "vite-react" });
  s.document.layers.elem_canvas_root.properties.src = "https://example.com/hero.png";
  return s;
};

describe(".lazy.json files (Phase 3.3)", () => {
  it("round-trips a project unchanged", () => {
    const original = snapshot();
    const parsed = parseLazyFile(serializeLazyFile(original, { framework: "vite-react" }));
    assert.deepEqual(parsed.snapshot, original);
    assert.equal(parsed.project.name, "Launch Hero");
    assert.equal(parsed.schemaVersion, SCHEMA_VERSION);
    assert.deepEqual(parsed.assets.linked, ["https://example.com/hero.png"]);
  });

  it("refuses files from a newer schema or format version with an update hint", () => {
    const file = JSON.parse(serializeLazyFile(snapshot()));
    assert.throws(() => parseLazyFile(JSON.stringify({ ...file, schemaVersion: SCHEMA_VERSION + 1 })), (e: Error) => {
      return e instanceof LazyFileError && /Update LazyLayout/.test(e.message);
    });
    assert.throws(() => parseLazyFile(JSON.stringify({ ...file, formatVersion: 99 })), LazyFileError);
  });

  it("refuses non-projects and damaged documents", () => {
    assert.throws(() => parseLazyFile("not json"), LazyFileError);
    assert.throws(() => parseLazyFile(JSON.stringify({ hello: "world" })), /not a LazyLayout project/);
    const file = JSON.parse(serializeLazyFile(snapshot()));
    // Broken tree links are repaired on load; an unknown archetype can't be.
    file.snapshot.document.layers.elem_canvas_root.archetype = "not-an-archetype";
    assert.throws(() => parseLazyFile(JSON.stringify(file)), LazyFileError);
  });

  it("migrates an older (v1, schema 1) project on import", () => {
    const v1 = {
      format: LAZY_FILE_FORMAT,
      formatVersion: 1,
      schemaVersion: 1,
      project: { name: "Old" },
      snapshot: {
        ...snapshot(),
        document: undefined,
        elements: {
          el_btn: { id: "el_btn", name: "Buy", archetype: "button", parentId: null, children: [], properties: { label: "Buy" } },
        },
      },
    };
    const parsed = parseLazyFile(JSON.stringify(v1));
    assert.equal(parsed.snapshot.document.schemaVersion, SCHEMA_VERSION);
    assert.equal(parsed.snapshot.document.layers.el_btn.properties.label, "Buy");
  });

  it("names files safely", () => {
    assert.equal(lazyFileName('My: "Hero" / v2'), "My- -Hero- - v2.lazy.json");
  });
});
