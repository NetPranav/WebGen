import React from "react";
import { layerBoxStyle } from "../geometry";
import { clampText } from "../limits";
import type { ArchetypeRenderProps } from "../types";
import { textTypography } from "./textStyle";
import { runsOf, type TextRun } from "../../text/runs";
import { parseShadows, textShadowCss } from "../../paint/paints";

/** The inline style of one run. */
export function runStyle(run: TextRun): React.CSSProperties | undefined {
  const style: React.CSSProperties = {};
  if (run.bold) style.fontWeight = 700;
  if (run.italic) style.fontStyle = "italic";
  if (run.underline || run.strike) style.textDecoration = [run.underline ? "underline" : "", run.strike ? "line-through" : ""].filter(Boolean).join(" ");
  if (run.color) style.color = run.color;
  return Object.keys(style).length > 0 ? style : undefined;
}

export const Text: React.FC<ArchetypeRenderProps> = ({ layer, resolved, ctx, nodeRef }) => {
  const stored = resolved.get("content.text");
  const raw = typeof stored === "string" ? stored : layer.name; // an empty text is empty, not its layer name
  const interpolated = ctx.interpolate ? ctx.interpolate(raw) : raw;
  const text = clampText(interpolated);
  // Styled runs only apply while they spell the stored text exactly (and no {{variable}} changed it).
  const runs = interpolated === raw && text === raw ? runsOf(raw, resolved.get("content.runs")) : null;
  const styled = runs !== null && runs.some((r) => runStyle(r) !== undefined);
  const sizing = resolved.str("text.sizing", "fixed");
  const box = layerBoxStyle(layer, resolved, ctx, { shadow: "none" }); // text has text-shadow, not a box shadow
  const textShadow = textShadowCss(parseShadows(resolved.get("paint.shadows")));
  if (sizing === "autoWidth") {
    delete box.width;
    delete box.height;
  } else if (sizing === "autoHeight") {
    delete box.height;
  }
  return (
    <div
      ref={nodeRef}
      data-element-id={layer.id}
      data-archetype="text"
      style={{
        ...box,
        margin: 0,
        ...textTypography(resolved),
        ...(textShadow ? { textShadow } : {}),
        whiteSpace: sizing === "autoWidth" ? "pre" : "pre-wrap",
        overflowWrap: sizing === "autoWidth" ? "normal" : "anywhere",
        ...(sizing === "autoWidth" ? { width: "max-content" } : {}),
      }}
    >
      {styled
        ? runs!.map((run, i) => {
            const style = runStyle(run);
            return style ? (
              <span key={i} style={style}>
                {run.text}
              </span>
            ) : (
              <React.Fragment key={i}>{run.text}</React.Fragment>
            );
          })
        : text}
    </div>
  );
};
