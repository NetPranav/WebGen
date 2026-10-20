import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GOOGLE_FONTS, findCatalogFont } from "../catalog";
import { assetFamily, axesFor, familyCss, fontFaceCss, fontPlan, googleFontsUrl, parseVariations, planKey, primaryFamily, sanitizeFamily, serializeVariations, variationCss, weightsFor } from "../families";
import { createLayer } from "../../document/factories";
import type { AssetEntry, Layer } from "../../document/schema";

const text = (id: string, family: string, extra: Record<string, unknown> = {}): Layer => createLayer({ id, archetype: "text", parentId: null, name: id, properties: { "typography.fontFamily": family, ...extra } as never }) as Layer;
const asset = (name: string, kind: AssetEntry["kind"] = "font", mime = "font/ttf"): AssetEntry => ({ id: name.length.toString(16).padStart(64, "0"), name, kind, mime, bytes: 10, addedAt: 1 });
const byId = (...ls: Layer[]) => Object.fromEntries(ls.map((l) => [l.id, l]));

describe("Phase 38: the catalog", () => {
  it("every family is unique, has weights inside 100-1000, and a variable font spans a range", () => {
    assert.equal(new Set(GOOGLE_FONTS.map((f) => f.family)).size, GOOGLE_FONTS.length);
    for (const f of GOOGLE_FONTS) {
      assert.ok(f.weights.length > 0 && f.weights.every((w) => w >= 100 && w <= 1000), f.family);
      if (f.axes) assert.ok(f.variable, `${f.family} has axes so it is variable`);
      for (const a of f.axes ?? []) assert.ok(a.min < a.max && a.default >= a.min && a.default <= a.max && /^[a-z]{4}$/.test(a.tag), `${f.family} ${a.tag}`);
      assert.ok(sanitizeFamily(f.family), `${f.family} is a safe name`);
    }
    assert.ok(GOOGLE_FONTS.length >= 40);
  });
  it("lookup ignores case and spaces at the ends", () => {
    assert.equal(findCatalogFont("  playfair display ")?.family, "Playfair Display");
    assert.equal(findCatalogFont("Comic Sans"), undefined);
  });
});

describe("Phase 38: family names", () => {
  it("sanitising keeps safe names and refuses anything that could break out of a URL or a stylesheet", () => {
    assert.equal(sanitizeFamily("  Open   Sans "), "Open Sans");
    for (const bad of ["", "a;b", 'x"y', "a{b}", "<b>", "x".repeat(81), "-lead", "a/b", "a&b=c", "../etc"]) assert.equal(sanitizeFamily(bad), null, bad);
  });
  it("the first family of a stack, however it is quoted", () => {
    assert.equal(primaryFamily("'Playfair Display', serif"), "Playfair Display");
    assert.equal(primaryFamily('"Inter", sans-serif'), "Inter");
    assert.equal(primaryFamily("Georgia"), "Georgia");
    assert.equal(primaryFamily("inherit"), null);
    assert.equal(primaryFamily(""), null);
  });
  it("a family as CSS gets a fallback of its kind", () => {
    assert.equal(familyCss("Inter", "sans-serif"), "Inter, sans-serif");
    assert.equal(familyCss("Playfair Display", "serif"), "'Playfair Display', serif");
    assert.equal(familyCss("Pacifico", "handwriting"), "Pacifico, cursive");
    assert.equal(familyCss("A'b", "serif"), "'Ab', serif");
  });
  it("an imported font answers to its file name", () => {
    assert.equal(assetFamily({ name: "My_Brand-Bold.ttf" }), "My Brand-Bold");
    assert.equal(assetFamily({ name: "Fancy.woff2" }), "Fancy");
    assert.equal(assetFamily({ name: "../../x;y.ttf" }), null);
  });
});

describe("Phase 38: what a document needs", () => {
  it("sorts the families in use into imported files, catalog fonts and system fonts, with the weights asked", () => {
    const own = asset("Fancy.ttf");
    const plan = fontPlan(
      byId(text("a", "Inter, sans-serif", { "typography.fontWeight": "600" }), text("b", "Fancy"), text("c", "Georgia"), text("d", "'Playfair Display', serif", { "typography.fontWeight": 900 }), text("e", "inter")),
      { [own.id]: own },
    );
    assert.deepEqual(plan.uploads.map((u) => u.name), ["Fancy.ttf"]);
    assert.deepEqual(plan.google.map((g) => g.font.family), ["Inter", "Playfair Display"]);
    assert.deepEqual(plan.google[0].weights, [400, 600, 700], "the regular, bold and what the layers use");
    assert.ok(plan.google[1].weights.includes(900));
  });
  it("an imported font wins over a catalog font of the same name, and unused files aren't listed", () => {
    const inter = asset("Inter.woff2", "font", "font/woff2");
    const spare = asset("Spare.ttf");
    const plan = fontPlan(byId(text("a", "Inter")), { [inter.id]: inter, [spare.id]: spare });
    assert.deepEqual(plan.google, []);
    assert.deepEqual(plan.uploads.map((u) => u.name), ["Inter.woff2"]);
  });
  it("a layer without a family, or with a hostile one, needs nothing", () => {
    assert.deepEqual(fontPlan(byId(createLayer({ id: "x", archetype: "text", parentId: null, name: "x", properties: {} }) as Layer, text("y", "x;}body{display:none")), undefined), { google: [], uploads: [] });
  });
  it("the plan key changes exactly when the stylesheets would", () => {
    const a = fontPlan(byId(text("a", "Inter")), undefined);
    assert.equal(planKey(a, "swap"), planKey(fontPlan(byId(text("z", "Inter")), undefined), "swap"));
    assert.notEqual(planKey(a, "swap"), planKey(a, "block"));
    assert.notEqual(planKey(a, "swap"), planKey(fontPlan(byId(text("a", "Inter", { "typography.fontWeight": 300 })), undefined), "swap"));
  });
});

describe("Phase 38: the stylesheets", () => {
  it("the Google URL: a variable font asks for its whole range and axes (sorted), a static one for the weights in use", () => {
    const plan = fontPlan(byId(text("a", "Inter"), text("b", "Roboto", { "typography.fontWeight": 300 }), text("c", "Open Sans")), undefined);
    const url = googleFontsUrl(plan, "swap")!;
    assert.ok(url.startsWith("https://fonts.googleapis.com/css2?"));
    assert.ok(url.includes("family=Inter:opsz,wght@14..32,100..900"));
    assert.ok(url.includes("family=Open+Sans:wdth,wght@75..100,300..800"));
    assert.ok(url.includes("family=Roboto:wght@300;400;700"));
    assert.ok(url.endsWith("&display=swap"));
    assert.equal(googleFontsUrl({ google: [], uploads: [] }, "swap"), null);
    assert.ok(googleFontsUrl(plan, "block")!.endsWith("&display=block"));
  });
  it("@font-face for imported fonts uses the blob URL, the right format and the chosen display, and skips what isn't loaded or isn't a safe URL", () => {
    const a = asset("Fancy.woff2", "font", "font/woff2");
    const b = asset("Plain.otf", "font", "font/otf");
    const c = asset("Evil.ttf");
    const css = fontFaceCss([a, b, c], (id) => (id === a.id ? "blob:http://x/1" : id === b.id ? "blob:http://x/2" : "javascript:alert(1)"), "block");
    assert.match(css, /font-family:"Fancy";src:url\("blob:http:\/\/x\/1"\) format\("woff2"\)/);
    assert.match(css, /font-family:"Plain";src:url\("blob:http:\/\/x\/2"\) format\("opentype"\)/);
    assert.ok(!css.includes("Evil") && !css.includes("javascript"));
    assert.equal((css.match(/font-display:block/g) ?? []).length, 2);
    assert.equal(fontFaceCss([a], () => null, "swap"), "");
  });
});

describe("Phase 38: variable fonts", () => {
  it("variations parse, drop anything that isn't `tag number`, and cap the count", () => {
    assert.deepEqual(parseVariations("wdth 87, opsz 14.5"), [{ tag: "wdth", value: 87 }, { tag: "opsz", value: 14.5 }]);
    assert.deepEqual(parseVariations('"wdth" 80, bad, abcde 4, xx 1; color: red, slnt -8'), [{ tag: "wdth", value: 80 }, { tag: "slnt", value: -8 }]);
    assert.equal(parseVariations(Array.from({ length: 40 }, (_, i) => `a${String(i).padStart(3, "0")} ${i}`).join(",")).length, 16);
  });
  it("round trip and the CSS", () => {
    assert.equal(serializeVariations([{ tag: "wdth", value: 87.123 }, { tag: "opsz", value: 14 }]), "wdth 87.12, opsz 14");
    assert.equal(variationCss("wdth 87, opsz 14"), '"wdth" 87, "opsz" 14');
    assert.equal(variationCss(""), undefined);
    assert.equal(variationCss(5), undefined);
    assert.equal(variationCss("</style>"), undefined);
  });
  it("axes and weights offered for a family", () => {
    assert.deepEqual(axesFor("Roboto Flex").map((a) => a.tag), ["wdth", "opsz", "slnt"]);
    assert.deepEqual(axesFor("Roboto"), []);
    assert.deepEqual(axesFor(null), []);
    assert.deepEqual(weightsFor("Roboto", false), [100, 300, 400, 500, 700, 900]);
    assert.equal(weightsFor("Whatever", true).length, 9, "an imported font may be any weight");
    assert.equal(weightsFor("Roboto", true).length, 9, "an imported font of the same name is not the catalog's");
  });
});
