import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AssetStore } from "../AssetStore";
import { MemoryAssetBackend } from "../backend";
import { embedAssets, fromBase64, restoreAssets, toBase64 } from "../embed";
import { sha256Hex } from "../hash";
import { createLazyFile, parseLazyFile, serializeLazyFile } from "../../storage/lazyFile";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import type { ProjectStateSnapshot } from "../../store/useProjectStore";

const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64"));
const store = () => new AssetStore(new MemoryAssetBackend());
const blob = (b: Uint8Array) => new Blob([b as unknown as ArrayBuffer]);

async function docWith(s: AssetStore, files: [Uint8Array, string][]) {
  const entries = [];
  for (const [bytes, name] of files) entries.push((await s.import(blob(bytes), name)).entry);
  const doc = createDocumentFromLayers([createLayer({ id: "pg", archetype: "container", parentId: null, name: "pg", properties: {} }) as Layer]);
  doc.assets = Object.fromEntries(entries.map((e) => [e.id, e]));
  return { doc, entries };
}

describe("Phase 36: assets travel in the project file", () => {
  it("base64 round trips", () => {
    assert.deepEqual(fromBase64(toBase64(PNG)), PNG);
    assert.deepEqual(fromBase64(toBase64(new Uint8Array(0))), new Uint8Array(0));
  });

  it("export embeds every asset in the manifest, and import in another browser brings them back", async () => {
    const a = store();
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
    const { doc, entries } = await docWith(a, [[PNG, "dot.png"], [svg, "box.svg"]]);
    const { embedded, missing } = await embedAssets(doc, a);
    assert.equal(Object.keys(embedded).length, 2);
    assert.deepEqual(missing, []);

    const b = store(); // a fresh browser
    const result = await restoreAssets(embedded, b);
    assert.deepEqual(result, { restored: 2, rejected: [] });
    for (const e of entries) assert.equal((await b.get(e.id))?.bytes, e.bytes);
  });

  it("an asset that isn't in the store, or doesn't fit the budget, is named as missing", async () => {
    const s = store();
    const { doc, entries } = await docWith(s, [[PNG, "dot.png"]]);
    const empty = store();
    assert.deepEqual((await embedAssets(doc, empty)).missing, [entries[0].id]);
    assert.deepEqual((await embedAssets(doc, s, 10)).missing, [entries[0].id], "over the byte budget");
  });

  it("the file keeps its embedded assets through a write and a read, and refuses malformed entries", async () => {
    const s = store();
    const { doc } = await docWith(s, [[PNG, "dot.png"]]);
    const embed = await embedAssets(doc, s);
    const snapshot = { projectName: "p", projectId: "p1", document: doc } as unknown as ProjectStateSnapshot;
    const parsed = parseLazyFile(serializeLazyFile(snapshot, undefined, embed));
    assert.deepEqual(parsed.assets.embedded, embed.embedded);
    assert.equal(parsed.snapshot.document.assets && Object.keys(parsed.snapshot.document.assets).length, 1, "the manifest is in the document");
    const text = JSON.parse(serializeLazyFile(snapshot, undefined, embed));
    text.assets.embedded = { nothex: { name: "x", mime: "image/png", data: "AAAA" }, [Object.keys(embed.embedded)[0]]: { name: 5, data: "x" } };
    assert.equal(parseLazyFile(JSON.stringify(text)).assets.embedded, undefined);
    assert.ok(!("embedded" in createLazyFile(snapshot).assets), "no embedding unless asked");
  });

  it("import never trusts an embedded file: a script, a wrong hash and bad data are rejected", async () => {
    const s = store();
    const good = await sha256Hex(PNG);
    const evil = { name: "evil.png", mime: "image/png", data: toBase64(new TextEncoder().encode("<script>alert(1)</script>")) };
    const wrongHash = { name: "dot.png", mime: "image/png", data: toBase64(PNG) };
    const result = await restoreAssets({ ["a".repeat(64)]: evil, ["b".repeat(64)]: wrongHash, [good]: wrongHash, ["c".repeat(64)]: { name: "x", mime: "image/png", data: "!!!not base64!!!" } }, s);
    assert.equal(result.restored, 1);
    assert.deepEqual(result.rejected.sort(), ["a".repeat(64), "b".repeat(64), "c".repeat(64)]);
    assert.equal((await s.list()).length, 1, "only the genuine one was kept");
  });

  it("an embedded SVG with a script is cleaned on the way in, so its hash no longer matches and it is rejected", async () => {
    const s = store();
    const dirty = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="1" height="1"/></svg>');
    const claimed = await sha256Hex(dirty);
    const result = await restoreAssets({ [claimed]: { name: "x.svg", mime: "image/svg+xml", data: toBase64(dirty) } }, s);
    assert.deepEqual(result, { restored: 0, rejected: [claimed] });
    const kept = await s.list();
    assert.ok(!kept.some((r) => /script/.test(String(r.name))));
  });
});
