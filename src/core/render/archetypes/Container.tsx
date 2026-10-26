import React from "react";
import { layerBoxStyle, px } from "../geometry";
import type { ArchetypeRenderProps } from "../types";
import { useFillStyle } from "../paintStyle";
import { parseSides } from "../../paths/strokes";
import { booleanGroupD, isBooleanOp } from "../../editing/layerOutline";
import { useDocument } from "../../store/useDocumentStore";
import { ShapePaint } from "../shapePaint";
import { BlurBands } from "../effectsRender";

/** `container` and `form`: a flex box that lays out its children. */
export const Container: React.FC<ArchetypeRenderProps> = (props) => {
  const { layer, resolved, ctx } = props;
  const isBoolean = isBooleanOp(resolved.get("boolean.operation"));
  // a boolean group redraws when an operand changes: on the stage through the store (cached by the layers it reads), elsewhere from the map
  const storeD = useDocument((d) => (isBoolean && !ctx.layers ? booleanGroupD(layer.id, d.layers) : ""));
  if (isBoolean) return <BooleanGroup {...props} d={ctx.layers ? booleanGroupD(layer.id, ctx.layers) : storeD} />;
  return <FlexContainer {...props} />;
};

/**
 * A live boolean group (FigCraft port F5): one shape, the combination of its operands' outlines, painted with the
 * group's fills, border and shadows. The operands stay in the tree (hidden) so the canvas can still measure and pick
 * them; only the combined shape is seen.
 */
function BooleanGroup({ layer, resolved, ctx, children, nodeRef, d }: ArchetypeRenderProps & { d: string }) {
  const width = Math.max(1, resolved.num("frame.width", 100));
  const height = Math.max(1, resolved.num("frame.height", 100));
  const borderWidth = Math.min(200, resolved.num("appearance.border.width", 0));
  const borderStyle = resolved.str("appearance.border.style", "none");
  const stroked = borderWidth > 0 && borderStyle !== "none";
  return (
    <div
      ref={nodeRef}
      data-element-id={layer.id}
      data-archetype={layer.archetype}
      data-boolean={resolved.str("boolean.operation", "")}
      // the group is the size of its frame (its operands are hidden and absolutely placed, so they size nothing)
      style={{ position: "relative", ...layerBoxStyle(layer, resolved, ctx, { shadow: "none" }), width, height, flexShrink: 0 }}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }} aria-hidden="true">
        {d && (
          <ShapePaint
            layer={layer}
            resolved={resolved}
            width={width}
            height={height}
            defaultFill={resolved.str("appearance.background.color", "#d9d9d9")}
            defaultStroke={stroked ? resolved.str("appearance.border.color", "#000000") : "none"}
            defaultStrokeWidth={stroked ? borderWidth : 0}
            geometry={(a) => <path {...a} d={d} fillRule="evenodd" />}
          />
        )}
      </svg>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, visibility: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

const FlexContainer: React.FC<ArchetypeRenderProps> = ({ layer, resolved, ctx, children, nodeRef }) => {
  const display = resolved.str("layout.display", "flex") === "grid" ? "grid" : "flex";
  const direction = resolved.str("layout.flexDirection", "column") === "row" ? "row" : "column";
  const padding = resolved.num("layout.padding", 0);
  // The four sides, when any is set (an auto-layout frame sets all four); else the single value and the horizontal one.
  const side = (path: string) => (resolved.get(path) !== undefined ? px(resolved.num(path, padding)) : undefined);
  const sides = ["layout.paddingTop", "layout.paddingRight", "layout.paddingBottom", "layout.paddingLeft"].some((p) => resolved.get(p) !== undefined);
  const justify = resolved.str("layout.justifyContent", "");
  const align = resolved.str("layout.alignItems", "");
  const wrap = resolved.str("layout.flexWrap", "nowrap") === "wrap" ? "wrap" : undefined;
  // A grid container's tracks: the template when one is written, else equal columns; rows only when written.
  const trackList = (value: string) => (/^[\w\s.,()%-]+$/.test(value) && value.length <= 200 ? value : "");
  const columnsTemplate = trackList(resolved.str("layout.gridTemplateColumns", ""));
  const rowsTemplate = trackList(resolved.str("layout.gridTemplateRows", ""));
  const columnCount = Math.max(1, Math.min(200, Math.round(resolved.num("layout.gridColumns", 2))));
  const rowGap = resolved.get("layout.rowGap") !== undefined ? px(resolved.num("layout.rowGap", 0)) : undefined;
  const columnGap = resolved.get("layout.columnGap") !== undefined ? px(resolved.num("layout.columnGap", 0)) : undefined;
  // A border is drawn only with a width and a style (the inspector's Stroke writes both).
  const borderWidth = Math.min(200, resolved.num("appearance.border.width", 0));
  const borderStyle = resolved.str("appearance.border.style", "none");
  const border = boxStroke(resolved, borderWidth, borderStyle);
  const fill = useFillStyle(layer, resolved, resolved.str("appearance.background.color", "transparent"));
  return (
    <div
      ref={nodeRef}
      data-element-id={layer.id}
      data-archetype={layer.archetype}
      role={layer.archetype === "form" ? "form" : undefined}
      style={{
        ...layerBoxStyle(layer, resolved, ctx, { bands: true }),
        display,
        flexDirection: direction,
        gap: px(resolved.num("layout.gap", 0)),
        padding: px(padding),
        paddingInline: !sides && resolved.get("layout.paddingX") !== undefined ? px(resolved.num("layout.paddingX", padding)) : undefined,
        ...(sides ? { paddingTop: side("layout.paddingTop"), paddingRight: side("layout.paddingRight"), paddingBottom: side("layout.paddingBottom"), paddingLeft: side("layout.paddingLeft") } : {}),
        ...(display === "grid"
          ? { gridTemplateColumns: columnsTemplate || `repeat(${columnCount}, minmax(0, 1fr))`, gridTemplateRows: rowsTemplate || undefined, rowGap, columnGap, alignItems: align || undefined }
          : {}),
        justifyContent: justify || undefined,
        ...(display === "grid" ? {} : { alignItems: align || undefined }),
        flexWrap: wrap,
        // FigCraft port F6: wrapped lines sit where the cross alignment says (stretched for stretch), or spread out
        alignContent: wrap ? (resolved.str("layout.alignContent", "auto") === "space-between" ? "space-between" : align === "center" || align === "flex-end" || align === "stretch" ? align : "flex-start") : undefined,
        ...fill.style,
        borderRadius: px(resolved.num("appearance.radius", 0)),
        ...border,
      }}
    >
      {fill.overlay}
      {/* FigCraft port F7: a progressive background blur under the content, a progressive layer blur over it */}
      <BlurBands effects={effectsOf(resolved)} kind="backgroundBlur" />
      {children}
      <BlurBands effects={effectsOf(resolved)} kind="layerBlur" />
    </div>
  );
};

const effectsOf = (resolved: ArchetypeRenderProps["resolved"]) => {
  const v = resolved.get("paint.effects");
  return typeof v === "string" && v ? v : undefined;
};

/**
 * A frame's stroke as CSS (FigCraft port F3). Inside (and unset) is a border, which takes space in the layout as an
 * inside stroke does; centred and outside are an outline (which follows the corner radius and takes no space),
 * offset by half its width or not at all. Per-side weights are border widths (inside only: an outline has one width).
 */
export function boxStroke(resolved: ArchetypeRenderProps["resolved"], width: number, style: string): React.CSSProperties {
  if (!(width > 0 && (style === "solid" || style === "dashed" || style === "dotted"))) return {};
  const color = resolved.str("appearance.border.color", "currentColor");
  const align = resolved.get("stroke.align");
  const sides = parseSides(resolved.get("stroke.sides"));
  if (!sides && (align === "center" || align === "outside")) {
    return { outlineStyle: style, outlineWidth: px(width), outlineColor: color, outlineOffset: px(align === "center" ? -width / 2 : 0) };
  }
  // an auto-layout frame whose inside stroke stays out of its layout (FigCraft port F6): drawn inside, taking no room
  if (!sides && resolved.get("layout.auto") === true && resolved.get("layout.strokesIncluded") === false) {
    return { outlineStyle: style, outlineWidth: px(width), outlineColor: color, outlineOffset: px(-width) };
  }
  if (sides) {
    const [t, r, b, l] = sides.map((v) => px(Math.min(200, v)));
    return { borderStyle: style, borderColor: color, borderTopWidth: t, borderRightWidth: r, borderBottomWidth: b, borderLeftWidth: l };
  }
  return { borderStyle: style, borderWidth: px(width), borderColor: color };
}
