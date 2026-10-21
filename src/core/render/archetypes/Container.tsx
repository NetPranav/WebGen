import React from "react";
import { layerBoxStyle, px } from "../geometry";
import type { ArchetypeRenderProps } from "../types";
import { useFillStyle } from "../paintStyle";

/** `container` and `form`: a flex box that lays out its children. */
export const Container: React.FC<ArchetypeRenderProps> = ({ layer, resolved, ctx, children, nodeRef }) => {
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
  const border =
    borderWidth > 0 && (borderStyle === "solid" || borderStyle === "dashed" || borderStyle === "dotted")
      ? { borderStyle, borderWidth: px(borderWidth), borderColor: resolved.str("appearance.border.color", "currentColor") }
      : {};
  const fill = useFillStyle(layer, resolved, resolved.str("appearance.background.color", "transparent"));
  return (
    <div
      ref={nodeRef}
      data-element-id={layer.id}
      data-archetype={layer.archetype}
      role={layer.archetype === "form" ? "form" : undefined}
      style={{
        ...layerBoxStyle(layer, resolved, ctx),
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
        alignContent: wrap ? "flex-start" : undefined,
        ...fill.style,
        borderRadius: px(resolved.num("appearance.radius", 0)),
        ...border,
      }}
    >
      {fill.overlay}
      {children}
    </div>
  );
};
