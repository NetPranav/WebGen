import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeSvg, SvgRejected, MAX_SVG_CHARS } from "../svgSanitize";

const wrap = (body: string, attrs = "") => `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;
/** What must never survive in any output. */
const DANGEROUS = /<script|onload|onclick|onerror|onmouseover|javascript:|vbscript:|foreignObject|<iframe|<style|@import|expression\(|data:text|<animate|<set\b|<a\b|http:\/\/evil|https:\/\/evil/i;

describe("Phase 36: the SVG sanitiser keeps drawings", () => {
  it("keeps shapes, gradients, filters and text, with their attributes", () => {
    const svg = wrap('<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#00f"/></linearGradient></defs><rect x="1" y="2" width="30" height="40" rx="3" fill="url(#g)" stroke="#000" stroke-width="2"/><path d="M0 0L10 10Z" transform="rotate(5)"/><text x="5" y="5" font-size="12">Hello &amp; goodbye</text><filter id="f"><feGaussianBlur stdDeviation="2"/></filter>', 'viewBox="0 0 100 100" width="100" height="100"');
    const out = sanitizeSvg(svg);
    assert.match(out, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 100 100" width="100" height="100">/);
    for (const part of ['<linearGradient id="g" x1="0" x2="1">', '<stop offset="0" stop-color="#f00"/>', 'fill="url(#g)"', 'rx="3"', '<path d="M0 0L10 10Z" transform="rotate(5)"/>', "Hello &amp; goodbye", '<feGaussianBlur stdDeviation="2"/>']) assert.ok(out.includes(part), part);
    assert.ok(out.endsWith("</svg>"));
  });

  it("adds the namespace when it is missing, and keeps same-document references", () => {
    const out = sanitizeSvg('<svg viewBox="0 0 10 10"><defs><circle id="c" r="3"/></defs><use href="#c" x="1"/><use xlink:href="#c"/></svg>');
    assert.match(out, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 10 10">/);
    assert.equal((out.match(/<use href="#c"/g) ?? []).length, 2);
  });

  it("an image keeps a PNG data URL but nothing else", () => {
    const png = "data:image/png;base64,iVBORw0KGgo=";
    assert.ok(sanitizeSvg(wrap(`<image href="${png}" width="1" height="1"/>`)).includes(png));
    assert.ok(!sanitizeSvg(wrap('<image href="https://evil.example/x.png"/>')).includes("evil"));
    assert.ok(!sanitizeSvg(wrap('<image href="data:image/svg+xml;base64,PHN2Zz48c2NyaXB0Pg=="/>')).includes("data:"));
  });

  it("is idempotent: cleaning clean output changes nothing", () => {
    const once = sanitizeSvg(wrap('<g fill="red"><rect width="5" height="5" style="fill: blue; stroke: #000"/></g><text>a &lt; b</text>'));
    assert.equal(sanitizeSvg(once), once);
  });
});

describe("Phase 36: the SVG sanitiser removes what runs or reaches out", () => {
  const attacks: Record<string, string> = {
    "a script element": wrap('<script>alert(1)</script><rect width="1" height="1"/>'),
    "a script in CDATA": wrap("<script><![CDATA[alert(1)]]></script>"),
    "an onload handler": '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="1" height="1"/></svg>',
    "an onclick handler": wrap('<rect width="1" height="1" onclick="alert(1)"/>'),
    "a javascript: href": wrap('<a href="javascript:alert(1)"><rect width="1" height="1"/></a>'),
    "a javascript: href with entities": wrap('<a xlink:href="&#106;avascript&#58;alert(1)"><text>x</text></a>'),
    "a javascript: href with tabs": wrap('<a href="java\tscript:alert(1)"><text>x</text></a>'),
    "a javascript: use": wrap('<use href="javascript:alert(1)"/>'),
    "an external use": wrap('<use href="https://evil.example/x.svg#a"/>'),
    "an external image": wrap('<image href="https://evil.example/track.png"/>'),
    "foreignObject with HTML": wrap('<foreignObject width="10" height="10"><div xmlns="http://www.w3.org/1999/xhtml"><iframe src="javascript:alert(1)"></iframe></div></foreignObject>'),
    "a style element": wrap("<style>@import url(https://evil.example/x.css); rect { fill: red }</style><rect width=\"1\" height=\"1\"/>"),
    "an external url() in a style attribute": wrap('<rect style="fill: url(https://evil.example/x)" width="1" height="1"/>'),
    "an external url() in an attribute": wrap('<rect fill="url(https://evil.example/x#a)" width="1" height="1"/>'),
    "a CSS expression": wrap('<rect style="width: expression(alert(1))" width="1" height="1"/>'),
    "an animate that sets href": wrap('<a><animate attributeName="href" values="javascript:alert(1)"/><text>x</text></a>'),
    "a set element": wrap('<set attributeName="onmouseover" to="alert(1)"/>'),
    "an embedded iframe": wrap('<iframe src="https://evil.example"></iframe>'),
    "an object": wrap('<object data="https://evil.example/x.swf"></object>'),
    "a data: text/html": wrap('<use href="data:text/html,<script>alert(1)</script>"/>'),
    "a doctype with entities": '<!DOCTYPE svg [<!ENTITY x "javascript:alert(1)">]><svg xmlns="http://www.w3.org/2000/svg"><a href="&x;"><text>x</text></a></svg>',
    "a processing instruction": '<?xml-stylesheet href="https://evil.example/x.css"?><svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>',
    "a comment hiding a tag": wrap('<!-- <script>alert(1)</script> --><rect width="1" height="1"/>'),
    "mixed-case tags and attributes": wrap('<SCRIPT>alert(1)</SCRIPT><rect WIDTH="1" height="1" OnClick="alert(1)"/>'),
    "an attribute with an unquoted handler": wrap('<rect width=1 onclick=alert(1) height="1"/>'),
    "a quote that tries to break out": wrap('<rect fill="red&quot; onclick=&quot;alert(1)" width="1" height="1"/>'),
    "text with markup characters": wrap("<text>&lt;script&gt;alert(1)&lt;/script&gt;</text>"),
    "an unknown element wrapping a script": wrap('<mystery><script>alert(1)</script><rect width="1" height="1"/></mystery>'),
    "a nested svg with a handler": wrap('<svg onload="alert(1)"><rect width="1" height="1"/></svg>'),
    "a vbscript href": wrap('<use href="vbscript:msgbox(1)"/>'),
    "a binding": wrap('<rect style="-moz-binding: url(https://evil.example/b.xml#x)" width="1" height="1"/>'),
  };
  for (const [name, svg] of Object.entries(attacks)) {
    it(`cleans ${name}`, () => {
      const out = sanitizeSvg(svg);
      assert.ok(!DANGEROUS.test(out), `${name} survived: ${out}`);
      assert.ok(!/\son[a-z]+\s*=/i.test(out), `an event handler survived: ${out}`);
      assert.equal(sanitizeSvg(out), out, "and cleaning the result changes nothing");
    });
  }

  it("what is left of a hostile drawing is still the drawing", () => {
    const out = sanitizeSvg(wrap('<script>alert(1)</script><rect width="10" height="20" fill="#336699" onclick="x()"/><a href="javascript:x"><circle r="4"/></a>'));
    assert.ok(out.includes('<rect width="10" height="20" fill="#336699"/>'));
    assert.ok(!out.includes("circle"), "the link and what is inside it go together");
  });
});

describe("Phase 36: limits and rejections", () => {
  it("refuses what isn't an SVG", () => {
    for (const bad of ["", "hello", "<html><body>hi</body></html>", "<div><rect/></div>", "<script>alert(1)</script>"]) assert.throws(() => sanitizeSvg(bad), SvgRejected, bad);
  });
  it("refuses a file over 5 MB, too many elements, and nesting too deep", () => {
    assert.throws(() => sanitizeSvg(wrap("x".repeat(MAX_SVG_CHARS))), /5 MB/);
    assert.throws(() => sanitizeSvg(wrap("<g/>".repeat(20_001))), /20,000 elements/);
    assert.throws(() => sanitizeSvg(wrap("<g>".repeat(70))), /64 levels/);
  });
  it("an unterminated tag ends the input instead of looping or leaking", () => {
    const out = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/><rect fill="red');
    assert.ok(out.endsWith("</svg>"));
    assert.ok(!out.includes('fill="red'));
  });
  it("closes what was left open and ignores content after the root", () => {
    assert.equal(sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><g><rect width="1" height="1"/>'), '<svg xmlns="http://www.w3.org/2000/svg"><g><rect width="1" height="1"/></g></svg>');
    assert.ok(!sanitizeSvg(wrap("") + "<script>alert(1)</script><rect/>").includes("rect"));
  });
  it("a very long attribute is dropped, not copied", () => {
    const out = sanitizeSvg(wrap(`<path d="${"M0 0 ".repeat(60_000)}"/>`));
    assert.ok(!out.includes(" d="));
  });
});
