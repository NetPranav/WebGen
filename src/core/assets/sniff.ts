/**
 * What a file really is, from its first bytes (ROADMAP Phase 36). The name and the MIME type a browser reports
 * come from the person or the page that supplied the file, so neither is trusted: a `.png` that is a script is
 * refused, an SVG called `photo.jpg` is treated as an SVG (and cleaned). Pure: no DOM.
 */

export type AssetKind = "image" | "svg" | "font";

export interface Sniffed {
  kind: AssetKind;
  mime: string;
}

const eq = (b: Uint8Array, at: number, sig: readonly number[]) => sig.every((v, i) => b[at + i] === v);
const ascii = (b: Uint8Array, at: number, len: number) => String.fromCharCode(...b.slice(at, at + len));

/** The kind of file these bytes are, or null when it isn't one the editor takes. */
export function sniffAsset(bytes: Uint8Array): Sniffed | null {
  if (bytes.length < 4) return null;
  if (eq(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { kind: "image", mime: "image/png" };
  if (eq(bytes, 0, [0xff, 0xd8, 0xff])) return { kind: "image", mime: "image/jpeg" };
  if (ascii(bytes, 0, 4) === "GIF8") return { kind: "image", mime: "image/gif" };
  if (ascii(bytes, 0, 4) === "RIFF" && bytes.length >= 12 && ascii(bytes, 8, 4) === "WEBP") return { kind: "image", mime: "image/webp" };
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp" && /^avi[fs]/.test(ascii(bytes, 8, 4))) return { kind: "image", mime: "image/avif" };
  if (ascii(bytes, 0, 4) === "wOF2") return { kind: "font", mime: "font/woff2" };
  if (ascii(bytes, 0, 4) === "wOFF") return { kind: "font", mime: "font/woff" };
  if (eq(bytes, 0, [0x00, 0x01, 0x00, 0x00]) || ascii(bytes, 0, 4) === "true") return { kind: "font", mime: "font/ttf" };
  if (ascii(bytes, 0, 4) === "OTTO") return { kind: "font", mime: "font/otf" };
  // SVG is text: after a BOM, whitespace and an XML declaration or comments, the first element must be <svg
  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 4096)).replace(/^﻿/, "");
  if (/^\s*(?:<\?xml[^>]*\?>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE[^>]*(?:\[[\s\S]*?\])?[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>/]/i.test(head)) return { kind: "svg", mime: "image/svg+xml" };
  return null;
}

export interface ImageSize {
  width: number;
  height: number;
}

const u16be = (b: Uint8Array, at: number) => (b[at] << 8) | b[at + 1];
const u32be = (b: Uint8Array, at: number) => ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;
const u16le = (b: Uint8Array, at: number) => b[at] | (b[at + 1] << 8);
const u24le = (b: Uint8Array, at: number) => b[at] | (b[at + 1] << 8) | (b[at + 2] << 16);

/** The size of a raster image from its header, without decoding it (so a 100-megapixel file costs nothing to measure). */
export function rasterSize(bytes: Uint8Array, mime: string): ImageSize | null {
  const ok = (w: number, h: number) => (w > 0 && h > 0 && w <= 100_000 && h <= 100_000 ? { width: w, height: h } : null);
  switch (mime) {
    case "image/png":
      return bytes.length >= 24 ? ok(u32be(bytes, 16), u32be(bytes, 20)) : null;
    case "image/gif":
      return bytes.length >= 10 ? ok(u16le(bytes, 6), u16le(bytes, 8)) : null;
    case "image/jpeg": {
      let i = 2;
      while (i + 9 < bytes.length) {
        if (bytes[i] !== 0xff) return null;
        const marker = bytes[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return ok(u16be(bytes, i + 7), u16be(bytes, i + 5));
        i += 2 + u16be(bytes, i + 2);
      }
      return null;
    }
    case "image/webp": {
      if (bytes.length < 30) return null;
      const chunk = ascii(bytes, 12, 4);
      if (chunk === "VP8X") return ok(u24le(bytes, 24) + 1, u24le(bytes, 27) + 1);
      if (chunk === "VP8 ") return ok(u16le(bytes, 26) & 0x3fff, u16le(bytes, 28) & 0x3fff);
      if (chunk === "VP8L") {
        const b = u32be(new Uint8Array([bytes[24], bytes[23], bytes[22], bytes[21]]), 0);
        return ok((b & 0x3fff) + 1 || 0, ((b >>> 14) & 0x3fff) + 1);
      }
      return null;
    }
    default:
      return null;
  }
}

/** The size an SVG declares: its `width` and `height`, else its `viewBox`. */
export function svgSize(svg: string): ImageSize | null {
  const root = /<svg\b([^>]*)>/i.exec(svg)?.[1] ?? "";
  const attr = (n: string) => new RegExp(`\\b${n}\\s*=\\s*"([^"]*)"`, "i").exec(root)?.[1];
  const num = (v: string | undefined) => {
    const m = v ? /^\s*([0-9.]+)\s*(px)?\s*$/.exec(v) : null;
    return m ? Number(m[1]) : null;
  };
  const w = num(attr("width"));
  const h = num(attr("height"));
  if (w && h) return { width: w, height: h };
  const vb = attr("viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (vb && vb.length === 4 && vb[2] > 0 && vb[3] > 0 && vb.every(Number.isFinite)) return { width: vb[2], height: vb[3] };
  return null;
}
