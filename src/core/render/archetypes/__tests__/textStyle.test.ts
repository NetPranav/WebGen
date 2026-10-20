import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { textTypography } from "../textStyle";
import { resolveProps } from "../../resolve";

const style = (properties: Record<string, string | number | boolean>) => textTypography(resolveProps({ archetype: "text", properties }));

describe("Phase 31: text typography as CSS", () => {
  it("keeps the old look when nothing is set", () => {
    const s = style({});
    assert.equal(s.lineHeight, 1.5);
    assert.equal(s.fontStyle, "normal");
    assert.equal(s.textAlign, "left");
    assert.equal(s.letterSpacing, undefined);
    assert.equal(s.textDecorationLine, undefined);
    assert.equal(s.textTransform, undefined);
  });
  it("reads size, weight, family, colour and alignment", () => {
    const s = style({ "typography.fontSize": 40, "typography.fontWeight": "700", "typography.fontFamily": "Georgia", "typography.color": "#112233", "typography.textAlign": "justify" });
    assert.deepEqual([s.fontSize, s.fontWeight, s.fontFamily, s.color, s.textAlign], ["40px", "700", "Georgia", "#112233", "justify"]);
  });
  it("a bare line height is a multiplier; a unit makes it a length; percent is a multiplier", () => {
    assert.equal(style({ "typography.lineHeight": 2 }).lineHeight, 2);
    assert.equal(style({ "typography.lineHeight": 24, "typography.lineHeightUnit": "px" }).lineHeight, "24px");
    assert.equal(style({ "typography.lineHeight": 150, "typography.lineHeightUnit": "%" }).lineHeight, 1.5);
    assert.equal(style({ "typography.lineHeight": -3 }).lineHeight, 1.5);
    assert.equal(style({ "typography.lineHeight": Number.NaN }).lineHeight, 1.5);
  });
  it("letter spacing, decoration and case", () => {
    const s = style({ "typography.letterSpacing": 1.5, "typography.textDecoration": "underline", "typography.textTransform": "uppercase", "typography.fontStyle": "italic" });
    assert.deepEqual([s.letterSpacing, s.textDecorationLine, s.textTransform, s.fontStyle], ["1.5px", "underline", "uppercase", "italic"]);
  });
  it("ignores values it doesn't know instead of passing them into CSS", () => {
    const s = style({ "typography.textDecoration": "underline; position: fixed", "typography.textTransform": "x", "typography.textAlign": "start" });
    assert.equal(s.textDecorationLine, undefined);
    assert.equal(s.textTransform, undefined);
    assert.equal(s.textAlign, "left");
  });
  it("the whole-layer bold and italic flags apply", () => {
    const s = style({ "typography.format.bold": true, "typography.format.italic": true });
    assert.deepEqual([s.fontWeight, s.fontStyle], [700, "italic"]);
  });
});
