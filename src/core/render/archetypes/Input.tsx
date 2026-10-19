import React from "react";
import { layerBoxStyle, px } from "../geometry";
import { clampText } from "../limits";
import type { ArchetypeRenderProps } from "../types";

const TYPES = new Set(["text", "email", "password", "number", "search", "tel", "url"]);

/** A text field. Read-only on the stage: typing into the canvas edits the document through the inspector, not the DOM. */
export const Input: React.FC<ArchetypeRenderProps> = ({ layer, resolved, ctx, nodeRef }) => {
  const interpolate = ctx.interpolate ?? ((s: string) => s);
  const type = resolved.str("input.type", "text");
  return (
    <input
      ref={nodeRef}
      data-element-id={layer.id}
      data-archetype="input"
      type={TYPES.has(type) ? type : "text"}
      readOnly
      disabled={resolved.bool("interaction.disabled", false)}
      required={resolved.bool("input.required", false)}
      placeholder={clampText(interpolate(resolved.str("input.placeholder", "")))}
      value={clampText(interpolate(resolved.str("input.value", "")))}
      style={{
        ...layerBoxStyle(layer, resolved, ctx),
        paddingBlock: px(9),
        paddingInline: px(12),
        fontSize: 13,
        fontFamily: "inherit",
        color: "#0f172a",
        backgroundColor: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: px(resolved.num("appearance.radius", 6)),
      }}
    />
  );
};
