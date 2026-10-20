import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AssetError, AssetStore, assetName, toEntry } from "../AssetStore";
import { MemoryAssetBackend } from "../backend";
import { rasterSize, sniffAsset, svgSize } from "../sniff";
import { sha256Hex } from "../hash";

const b64 = (s: string) => Uint8Array.from(Buffer.from(s, "base64"));
/** A 1 x 1 PNG, a 2 x 3 GIF, a 1 x 1 JPEG (smallest valid headers). */
const PNG = b64("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");
const GIF = b64("R0lGODlhAgADAIAAAP///wAAACH5BAEAAAAALAAAAAACAAMAAAIDhI9YADs=");
const JPEG = b64("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=");
const svg = (s: string) => new TextEncoder().encode(s);
const blob = (bytes: Uint8Array) => new Blob([bytes as unknown as ArrayBuffer]);

const store = (max?: number) => new AssetStore(new MemoryAssetBackend(), max);

describe("Phase 36: telling files apart by their bytes", () => {
  it("images, fonts and SVG", () => {
    assert.deepEqual(sniffAsset(PNG), { kind: "image", mime: "image/png" });
    assert.deepEqual(sniffAsset(GIF), { kind: "image", mime: "image/gif" });
    assert.deepEqual(sniffAsset(JPEG), { kind: "image", mime: "image/jpeg" });
    assert.deepEqual(sniffAsset(svg('<?xml version="1.0"?>\n<!-- hi -->\n<svg xmlns="http://www.w3.org/2000/svg"/>')), { kind: "svg", mime: "image/svg+xml" });
    assert.deepEqual(sniffAsset(svg("\ufeff  <svg>")), { kind: "svg", mime: "image/svg+xml" });
    assert.equal(sniffAsset(Uint8Array.from([0x77, 0x4f, 0x46, 0x32, 0, 0, 0, 0]))?.mime, "font/woff2");
    assert.equal(sniffAsset(Uint8Array.from([0x4f, 0x54, 0x54, 0x4f, 0, 0]))?.mime, "font/otf");
  });
  it("everything else is refused, whatever it is called", () => {
    for (const bad of [svg("<html><svg></svg></html>"), svg("#!/bin/sh\nrm -rf /"), svg("<script>alert(1)</script>"), svg("hello world"), Uint8Array.from([1, 2]), new Uint8Array(0), Uint8Array.from([0x4d, 0x5a, 0x90, 0x00, 3, 0, 0, 0])]) assert.equal(sniffAsset(bad), null);
  });
  it("sizes come from headers", () => {
    assert.deepEqual(rasterSize(PNG, "image/png"), { width: 1, height: 1 });
    assert.deepEqual(rasterSize(GIF, "image/gif"), { width: 2, height: 3 });
    assert.deepEqual(rasterSize(JPEG, "image/jpeg"), { width: 1, height: 1 });
    assert.equal(rasterSize(PNG.slice(0, 10), "image/png"), null);
    assert.deepEqual(svgSize('<svg width="120px" height="80" viewBox="0 0 10 10">'), { width: 120, height: 80 });
    assert.deepEqual(svgSize('<svg viewBox="0 0 300 150">'), { width: 300, height: 150 });
    assert.equal(svgSize("<svg>"), null);
  });
  it("names are shown without a path or control characters", () => {
    assert.equal(assetName("C:\\Users\\me\\photo.png"), "photo.png");
    assert.equal(assetName("../../etc/passwd"), "passwd");
    assert.equal(assetName("a\u0000b\nc.png"), "abc.png");
    assert.equal(assetName("  "), "Untitled");
    assert.equal(assetName("x".repeat(500)).length, 200);
  });
});

describe("Phase 36: importing", () => {
  it("keeps a PNG under the hash of its bytes, with its size", async () => {
    const s = store();
    const { entry, created } = await s.import(blob(PNG), "dot.png");
    assert.equal(created, true);
    assert.equal(entry.id, await sha256Hex(PNG));
    assert.deepEqual([entry.kind, entry.mime, entry.width, entry.height, entry.bytes, entry.name], ["image", "image/png", 1, 1, PNG.length, "dot.png"]);
    assert.equal((await s.get(entry.id))?.blob.size, PNG.length);
  });

  it("the same bytes are one asset, whatever they were called", async () => {
    const s = store();
    const a = await s.import(blob(PNG), "a.png");
    const b = await s.import(blob(PNG), "renamed.jpg");
    assert.equal(b.created, false);
    assert.equal(a.entry.id, b.entry.id);
    assert.equal((await s.list()).length, 1);
  });

  it("trusts the bytes, not the name: a script called .png is refused", async () => {
    await assert.rejects(store().import(blob(svg("<script>alert(1)</script>")), "evil.png"), (e: unknown) => e instanceof AssetError && e.code === "unsupported");
    await assert.rejects(store().import(blob(svg("MZ\u0090\u0000")), "x.png"), AssetError);
  });

  it("an SVG is cleaned, and the stored bytes (and so the hash) are the cleaned ones", async () => {
    const s = store();
    const dirty = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" onload="alert(1)"><script>alert(2)</script><rect width="40" height="20" fill="#336699"/></svg>';
    const { entry } = await s.import(blob(svg(dirty)), "logo.svg");
    const record = (await s.get(entry.id))!;
    const text = await record.blob.text();
    assert.ok(!/script|onload/.test(text));
    assert.ok(text.includes('<rect width="40" height="20" fill="#336699"/>'));
    assert.equal(entry.id, await sha256Hex(new TextEncoder().encode(text)));
    assert.deepEqual([entry.width, entry.height, entry.kind], [40, 20, "svg"]);
    // two different attacks that clean to the same drawing are one asset
    const other = await s.import(blob(svg('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="#336699" onclick="x()"/></svg>')), "other.svg");
    assert.equal(other.entry.id, entry.id);
  });

  it("an SVG with nothing left is refused with the reason", async () => {
    await assert.rejects(store().import(blob(svg("<svg " + "<g>".repeat(70) + "</svg>")), "deep.svg"), (e: unknown) => e instanceof AssetError && e.code === "bad-svg" && /64 levels/.test(e.message));
  });

  it("empty and oversized files are refused before anything is read", async () => {
    await assert.rejects(store().import(new Blob([]), "e.png"), (e: unknown) => e instanceof AssetError && e.code === "empty");
    await assert.rejects(store(10).import(blob(PNG), "big.png"), (e: unknown) => e instanceof AssetError && e.code === "too-big" && /MB/.test(e.message));
  });

  it("manifest entries describe the record without its bytes", async () => {
    const s = store();
    const { entry } = await s.import(blob(GIF), "g.gif");
    const record = (await s.get(entry.id))!;
    assert.deepEqual(toEntry(record), entry);
    assert.ok(!("blob" in entry));
  });

  it("removing an asset forgets it", async () => {
    const s = store();
    const { entry } = await s.import(blob(PNG), "a.png");
    await s.remove(entry.id);
    assert.equal(await s.get(entry.id), null);
    assert.equal(await s.totalBytes(), 0);
  });

  it("totals the bytes held", async () => {
    const s = store();
    await s.import(blob(PNG), "a.png");
    await s.import(blob(GIF), "b.gif");
    assert.equal(await s.totalBytes(), PNG.length + GIF.length);
  });
});
