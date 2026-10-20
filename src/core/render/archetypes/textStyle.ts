import type { CSSProperties } from "react";
import { px } from "../geometry";
import type { ResolvedProps } from "../types";

/**
 * The typography of a text layer as CSS: family, size, weight, style, line height, letter spacing, alignment,
 * decoration and case. The renderer and the in-place editor both use it, so what you type looks like what you get.
 */
export function textTypography(resolved: ResolvedProps): CSSProperties {
  const align = resolved.str("typography.textAlign", "left");
  const decoration = resolved.str("typography.textDecoration", "none");
  const transform = resolved.str("typography.textTransform", "none");
  const italic = resolved.str("typography.fontStyle", "normal") === "italic" || resolved.bool("typography.format.italic", false);
  const lh = resolved.get("typography.lineHeight");
  const lhUnit = resolved.str("typography.lineHeightUnit", "");
  let lineHeight: CSSProperties["lineHeight"] = 1.5;
  if (typeof lh === "number" && Number.isFinite(lh) && lh > 0) {
    // a bare number is a multiplier; with a unit it's that length (percent is a multiplier too)
    lineHeight = lhUnit === "" || lhUnit === "auto" ? lh : lhUnit === "%" ? lh / 100 : `${lh}${lhUnit === "px" || lhUnit === "rem" || lhUnit === "em" ? lhUnit : "px"}`;
  }
  const ls = resolved.get("typography.letterSpacing");
  const lsUnit = resolved.str("typography.letterSpacingUnit", "px");
  return {
    fontSize: px(resolved.num("typography.fontSize", 16)),
    fontWeight: resolved.bool("typography.format.bold", false) ? 700 : resolved.str("typography.fontWeight", "400"),
    fontStyle: italic ? "italic" : "normal",
    fontFamily: resolved.str("typography.fontFamily", "inherit"),
    color: resolved.str("typography.color", "#0f172a"),
    textAlign: align === "center" || align === "right" || align === "justify" ? align : "left",
    lineHeight,
    ...(typeof ls === "number" && Number.isFinite(ls) && ls !== 0 ? { letterSpacing: `${ls}${lsUnit === "em" || lsUnit === "rem" ? lsUnit : "px"}` } : {}),
    ...(decoration === "underline" || decoration === "line-through" || decoration === "overline" ? { textDecorationLine: decoration } : {}),
    ...(transform === "uppercase" || transform === "lowercase" || transform === "capitalize" ? { textTransform: transform } : {}),
  };
}
