import React from "react";
import { layerBoxStyle } from "../geometry";
import { clampText } from "../limits";
import type { ArchetypeRenderProps } from "../types";
import { textTypography } from "./textStyle";
import { runsOf, type TextRun } from "../../text/runs";
import { parseShadows, textShadowCss } from "../../paint/paints";
import { listGutter, listMarkers, paragraphLists, paragraphsOf, parseTextPath, runsByParagraph, textPathD, type TextPath } from "../../text/textFeatures";

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
  // FigCraft port F8: text that follows a path is drawn as SVG
  const textPath = parseTextPath(resolved.get("typography.textPath"));
  if (textPath) return <TextOnPath layer={layer} resolved={resolved} ctx={ctx} nodeRef={nodeRef} path={textPath} text={text} runs={styled ? runs : null} box={box} />;
  const allRuns = runs ?? [{ text }];
  const paragraphs = paragraphSettings(resolved, text);
  const maxLines = Math.floor(resolved.num("typography.maxLines", 0));
  const valign = resolved.get("typography.verticalAlign");
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
        // (paragraph blocks keep their own white space; between them it collapses, so an export's indentation adds no lines)
        whiteSpace: paragraphs ? "normal" : sizing === "autoWidth" ? "pre" : "pre-wrap",
        overflowWrap: sizing === "autoWidth" ? "normal" : "anywhere",
        ...(sizing === "autoWidth" ? { width: "max-content" } : {}),
        // FigCraft port F8: lines past `maxLines` end in an ellipsis; a fixed box places its text top, middle or bottom
        ...(maxLines > 0 ? { display: "-webkit-box", WebkitLineClamp: Math.min(1000, maxLines), WebkitBoxOrient: "vertical", overflow: "hidden" } : {}),
        ...(maxLines <= 0 && (valign === "middle" || valign === "bottom") ? { alignContent: valign === "middle" ? "center" : "end" } : {}),
      }}
    >
      {paragraphs ? paragraphs.render(styled ? allRuns : [{ text }], sizing === "autoWidth" ? "pre" : "pre-wrap") : styled ? runsContent(runs!) : text}
    </div>
  );
};

/** Styled runs as spans (plain ones as text). */
function runsContent(runs: readonly TextRun[]): React.ReactNode {
  return runs.map((run, i) => {
    const style = runStyle(run);
    return style ? (
      <span key={i} style={style}>
        {run.text}
      </span>
    ) : (
      <React.Fragment key={i}>{run.text}</React.Fragment>
    );
  });
}

/**
 * Paragraph spacing, first-line indent and lists (FigCraft port F8): each paragraph its own block, list items moved
 * in by a gutter per level with their marker in it (a hanging list puts the outer gutter outside the box). Null when
 * the text uses none of them: then it draws as one block, as before.
 */
function paragraphSettings(resolved: ArchetypeRenderProps["resolved"], text: string) {
  const spacing = Math.max(0, resolved.num("typography.paragraphSpacing", 0));
  const indent = Math.max(0, resolved.num("typography.paragraphIndent", 0));
  const paras = paragraphsOf(text);
  const lists = paragraphLists(resolved.get("typography.listParagraphs"), paras.length, resolved.get("typography.list"));
  const anyList = lists.some((l) => l.list !== "none");
  if (spacing === 0 && indent === 0 && !anyList) return null;
  const markers = listMarkers(lists);
  const gutter = listGutter(lists, markers, resolved.num("typography.fontSize", 16));
  const listSpacing = Math.max(0, resolved.num("typography.listSpacing", 0));
  const hanging = resolved.bool("typography.hangingList", false);
  return {
    render: (runs: readonly TextRun[], whiteSpace: "pre" | "pre-wrap") =>
      runsByParagraph(runs).map((para, i) => {
        const l = lists[i] ?? { list: "none", indent: 0 };
        const item = l.list !== "none";
        const gap = i === 0 ? 0 : item && lists[i - 1]?.list !== "none" ? listSpacing : spacing;
        const left = item ? (l.indent + (hanging ? 0 : 1)) * gutter : 0;
        return (
          <div key={i} data-paragraph={i} style={{ position: "relative", whiteSpace, marginTop: gap || undefined, paddingLeft: left || undefined, textIndent: !item && indent ? indent : undefined }}>
            {item && (
              <span aria-hidden="true" data-list-marker="" style={{ position: "absolute", left: left - gutter, width: gutter, textIndent: 0, fontVariantNumeric: "tabular-nums" }}>
                {markers[i]}
              </span>
            )}
            {para.length > 0 ? runsContent(para) : "\u200b"}
          </div>
        );
      }),
  };
}

/**
 * Text on a path (FigCraft port F8): the baseline follows the path, the text starting at `start` along it and aligned
 * there by the horizontal alignment (left starts, centre centres, right ends at it); flipped, it runs along the other
 * side. The browser places the glyphs (SVG `<textPath>`); glyphs past an open path's end are hidden.
 */
function TextOnPath({ layer, resolved, nodeRef, path, text, runs, box }: ArchetypeRenderProps & { path: TextPath; text: string; runs: TextRun[] | null; box: React.CSSProperties }) {
  const width = Math.max(1, resolved.num("frame.width", 100));
  const height = Math.max(1, resolved.num("frame.height", 100));
  const id = `tp-${layer.id.replace(/[^A-Za-z0-9_-]/g, "_")}`;
  const align = resolved.str("typography.textAlign", "left");
  const anchor = align === "center" ? "middle" : align === "right" ? "end" : "start";
  const typo = textTypography(resolved);
  return (
    <svg ref={nodeRef as React.Ref<SVGSVGElement>} data-element-id={layer.id} data-archetype="text" data-text-path="" width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ ...box, width, height, display: "block", overflow: "visible", color: typo.color }}>
      <defs>
        <path id={id} d={textPathD(path)} />
      </defs>
      <text
        fill="currentColor"
        style={{ fontSize: typo.fontSize, fontFamily: typo.fontFamily, fontWeight: typo.fontWeight, fontStyle: typo.fontStyle, letterSpacing: typo.letterSpacing, fontFeatureSettings: typo.fontFeatureSettings, fontVariationSettings: typo.fontVariationSettings, fontVariantCaps: typo.fontVariantCaps, textTransform: typo.textTransform, textDecorationLine: typo.textDecorationLine }}
      >
        <textPath href={`#${id}`} startOffset={`${Math.round(path.start * 10000) / 100}%`} textAnchor={anchor}>
          {runs
            ? runs.map((r, i) => (
                <tspan key={i} fontWeight={r.bold ? 700 : undefined} fontStyle={r.italic ? "italic" : undefined} fill={r.color} textDecoration={r.underline || r.strike ? [r.underline ? "underline" : "", r.strike ? "line-through" : ""].join(" ").trim() : undefined}>
                  {r.text.replace(/\n/g, " ")}
                </tspan>
              ))
            : text.replace(/\n/g, " ")}
        </textPath>
      </text>
    </svg>
  );
}
