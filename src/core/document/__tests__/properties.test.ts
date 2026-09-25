import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_ROOT_FRAME,
  canonicalizeProps,
  getLayerGeometry,
  isPropertyLegalFor,
  normalizeGeometryProps,
  validateGeometryValues,
  LEGACY_ALIASES,
  PROPERTY_PATHS,
  PROPERTY_REGISTRY,
  isCanonicalPath,
  resolvePropertyPath,
  suggestPropertyPath,
  validateLayerProps,
} from "../properties";
import { ARCHETYPE_IDS, getDefaultProps, type ArchetypeId, type PropValue } from "../registry";
import { ALL_PRESETS } from "../../motion/presets";
import { createShowcaseSnapshot } from "../../storage/DemoProjectSnapshot";

describe("property registry (Phase 42.1)", () => {
  it("gives every canonical path at least one owning archetype", () => {
    for (const path of PROPERTY_PATHS) {
      assert.ok(PROPERTY_REGISTRY[path].archetypes.length > 0, `${path} has no archetypes`);
    }
  });

  it("marks transform and opacity as GPU-composited and animatable", () => {
    for (const path of ["transform.x", "transform.y", "transform.scale", "transform.rotate", "appearance.opacity"]) {
      assert.equal(PROPERTY_REGISTRY[path].compositing, "gpu", path);
      assert.equal(PROPERTY_REGISTRY[path].animatable, true, path);
    }
  });

  it("keeps every enum default inside its own option list", () => {
    for (const def of Object.values(PROPERTY_REGISTRY)) {
      if (def.valueType === "enum" && def.options) {
        assert.ok(def.options.includes(def.default as string), `${def.path} default "${String(def.default)}" not in options`);
      }
    }
  });

  it("points every legacy alias at a canonical path owned by that archetype", () => {
    for (const [key, alias] of Object.entries(LEGACY_ALIASES)) {
      if (alias.split) continue; // split targets are prefixes; checked through their sub-paths below
      if (alias.to) assert.ok(isCanonicalPath(alias.to), `${key} → ${alias.to} is not canonical`);
      for (const [archetype, target] of Object.entries(alias.byArchetype ?? {})) {
        assert.ok(isCanonicalPath(target!), `${key}@${archetype} → ${target} is not canonical`);
        assert.ok(
          PROPERTY_REGISTRY[target!].archetypes.includes(archetype as ArchetypeId),
          `${key}@${archetype} → ${target} is not a property of ${archetype}`
        );
      }
    }
  });

  it("covers every CONVENTIONS §4 animation path", () => {
    const doc = readFileSync(join(process.cwd(), "DOCS/Initial/CONVENTIONS.md"), "utf8");
    const section = doc.slice(doc.indexOf("## 4. Standard Animation Property Paths"), doc.indexOf("## 5."));
    const paths = [...section.matchAll(/^([a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+)\s+#/gm)].map((m) => m[1]);
    assert.ok(paths.length >= 40, `expected the §4 catalogue, found ${paths.length} paths`);
    for (const path of paths) assert.ok(isCanonicalPath(path), `CONVENTIONS path ${path} is not in the registry`);
  });
});

describe("legacy resolution", () => {
  it("maps the preset translate dialect onto transform.x / transform.y (§4.1 row 4)", () => {
    const y = resolvePropertyPath("transform.translateY");
    const x = resolvePropertyPath("transform.translateX");
    assert.ok(y.ok && y.path === "transform.y");
    assert.ok(x.ok && x.path === "transform.x");
  });

  it("resolves archetype-dependent keys per archetype", () => {
    const cases: [string, ArchetypeId, string][] = [
      ["color", "button", "typography.color"],
      ["color", "divider", "divider.color"],
      ["color", "background", "background.color"],
      ["color", "light3D", "scene3d.light.color"],
      ["size", "fab", "button.size"],
      ["size", "toggle", "toggle.size"],
      ["placeholder", "image", "media.placeholder"],
      ["placeholder", "input", "input.placeholder"],
      ["castShadow", "light3D", "scene3d.light.castShadow"],
      ["castShadow", "object3D", "scene3d.castShadow"],
    ];
    for (const [key, archetype, expected] of cases) {
      const res = resolvePropertyPath(key, archetype);
      assert.ok(res.ok, `${key}@${archetype} did not resolve`);
      assert.equal(res.path, expected, `${key}@${archetype}`);
    }
  });

  it("scales image opacity from 0–100 to 0–1", () => {
    const res = resolvePropertyPath("opacity", "image");
    assert.ok(res.ok && res.path === "appearance.opacity" && res.scale === 0.01);
    const other = resolvePropertyPath("opacity", "button");
    assert.ok(other.ok && other.scale === undefined);
  });

  it("resolves sub-paths of split legacy objects", () => {
    const res = resolvePropertyPath("filter.grayscale", "image");
    assert.ok(res.ok && res.path === "media.filter.grayscale");
    const mat = resolvePropertyPath("material.roughness", "object3D");
    assert.ok(mat.ok && mat.path === "scene3d.material.roughness");
  });

  it("rejects unknown paths with the closest valid path", () => {
    const res = resolvePropertyPath("transfrom.y");
    assert.equal(res.ok, false);
    assert.ok(!res.ok && res.suggestion === "transform.y", JSON.stringify(res));
    assert.equal(suggestPropertyPath("appearance.opacty"), "appearance.opacity");
    assert.equal(suggestPropertyPath("zzzzzzzzzzzz"), undefined);
  });

  it("does not treat prototype keys as aliases", () => {
    assert.equal(resolvePropertyPath("constructor").ok, false);
    assert.equal(resolvePropertyPath("toString").ok, false);
  });
});

describe("registry coverage of existing data", () => {
  it("resolves every preset track path for every archetype the preset targets", () => {
    for (const preset of ALL_PRESETS) {
      for (const track of preset.animation.tracks ?? []) {
        for (const archetype of preset.compatibleArchetypes) {
          const res = resolvePropertyPath(track.property, archetype);
          assert.ok(res.ok, `${preset.id}: ${track.property} → ${!res.ok ? res.reason : ""}`);
          assert.ok(
            res.definition.archetypes.includes(archetype),
            `${preset.id}: ${res.path} is not a property of ${archetype}`
          );
        }
      }
    }
  });

  it("resolves every archetype default prop (factories)", () => {
    for (const archetype of ARCHETYPE_IDS) {
      assert.deepEqual(validateLayerProps(archetype, getDefaultProps(archetype)), [], archetype);
    }
  });

  it("resolves every prop in the showcase demo project", () => {
    const { document } = createShowcaseSnapshot();
    for (const layer of Object.values(document.layers)) {
      assert.deepEqual(validateLayerProps(layer.archetype, layer.properties), [], `${layer.id} (${layer.archetype})`);
    }
    for (const clip of Object.values(document.clips)) {
      const archetype = document.layers[clip.layerId].archetype;
      for (const track of clip.tracks) {
        assert.ok(resolvePropertyPath(track.property, archetype).ok, `${clip.id}: ${track.property}`);
      }
    }
  });

  it("flags props that are not legal for the archetype", () => {
    const issues = validateLayerProps("divider", { checked: true, colour: "#fff" });
    assert.equal(issues.length, 2);
    assert.match(issues[0].message, /not a property of divider/);
    assert.match(issues[1].message, /Unknown property "colour"/);
  });
});

describe("geometry (Phase 42.3)", () => {
  it("defaults: a root is an absolute frame at the default size; a child flows and hugs", () => {
    const root = getLayerGeometry({ parentId: null, properties: {} });
    assert.deepEqual(root.frame, { x: 0, y: 0, width: DEFAULT_ROOT_FRAME.width, height: DEFAULT_ROOT_FRAME.height, rotation: 0 });
    assert.equal(root.positioning, "absolute");
    assert.deepEqual(root.sizing, { horizontal: "fill", vertical: "hug" });

    const child = getLayerGeometry({ parentId: "root", properties: {} });
    assert.equal(child.positioning, "flow");
    assert.deepEqual(child.sizing, { horizontal: "hug", vertical: "hug" });
    assert.equal(child.frame.width, 0);
  });

  it("an explicit size implies fixed sizing on that axis; stored sizing wins", () => {
    const g = getLayerGeometry({ parentId: "p", properties: { "frame.width": 320, "sizing.vertical": "fill" } });
    assert.deepEqual(g.sizing, { horizontal: "fixed", vertical: "fill" });
    assert.equal(g.frame.width, 320);
  });

  it("normalizes CSS length strings into a number plus a unit; auto hugs", () => {
    const props: Record<string, PropValue> = { "frame.width": "100%", "frame.height": "auto" };
    assert.deepEqual(normalizeGeometryProps(props), []);
    assert.deepEqual(props, { "frame.width": 100, "frame.widthUnit": "%", "sizing.vertical": "hug" });
    const px: Record<string, PropValue> = { "frame.width": "240px" };
    normalizeGeometryProps(px);
    assert.deepEqual(px, { "frame.width": 240 });
    const bad: Record<string, PropValue> = { "frame.width": "wide" };
    assert.equal(normalizeGeometryProps(bad).length, 1);
    assert.deepEqual(bad, {});
  });

  it("rejects geometry values of the wrong type", () => {
    const issues = validateGeometryValues({ "frame.x": "10", "sizing.horizontal": "stretch", positioning: "flow" });
    assert.deepEqual(issues.map((i) => i.key), ["frame.x", "sizing.horizontal"]);
  });

  it("canonicalization routes legacy width/height onto the frame", () => {
    const { props, dropped } = canonicalizeProps("container", { width: "100%", height: 64 });
    assert.deepEqual(dropped, []);
    assert.deepEqual(props, { "frame.width": 100, "frame.widthUnit": "%", "frame.height": 64 });
  });

  it("geometry is only for visual layers", () => {
    assert.equal(isPropertyLegalFor("frame.x", "object3D"), false);
    assert.equal(isPropertyLegalFor("frame.x", "button"), true);
    assert.equal(isPropertyLegalFor("positioning", "svgPath"), true);
  });
});
