"use client";

import React, { useRef, useState } from "react";
import { documentCommands } from "@/core/store/useDocumentStore";
import { parseColor, toCss } from "@/core/paint/colorMath";
import { ColorPicker } from "../paint/ColorPicker";
import { SwatchPopover } from "../paint/SwatchPopover";

const CHECKER = "repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 8px 8px";

/** The swatch's background for a colour string: the colour over a checkerboard, so transparency shows. */
export const swatchBackground = (v: string | null | undefined): string => {
  const c = typeof v === "string" ? parseColor(v) : null;
  return c ? `linear-gradient(${toCss(c)}, ${toCss(c)}), ${CHECKER}` : CHECKER;
};

interface Props {
  label: string;
  value: string | null | undefined;
  onCommit: (color: string) => void;
  /** What the swatch opens instead of the colour picker (the fills editor). */
  popover?: React.ReactNode;
}

/** A colour: a swatch that opens the picker, and a text box for typing one. The swatch never remounts while you drag, so the picker stays open. */
export const ColorField: React.FC<Props> = ({ label, value, onCommit, popover }) => {
  const tx = useRef<{ commit: () => void } | null>(null);
  return (
    <span className="simple-color">
      <SwatchPopover label={`${label} colour`} swatch={swatchBackground(value)}>
        {popover ?? (
          <ColorPicker
            value={typeof value === "string" ? value : "#000000"}
            onBegin={() => (tx.current ??= documentCommands.begin(`Edit ${label.toLowerCase()}`))}
            onEnd={() => {
              tx.current?.commit();
              tx.current = null;
            }}
            onChange={onCommit}
          />
        )}
      </SwatchPopover>
      <ColorText key={value === null ? "mixed" : String(value)} label={label} value={value} onCommit={onCommit} />
    </span>
  );
};

const ColorText: React.FC<{ label: string; value: string | null | undefined; onCommit: (color: string) => void }> = ({ label, value, onCommit }) => {
  const [text, setText] = useState(value === null || value === undefined ? "" : value);
  const commit = () => {
    const t = text.trim();
    if (t !== "" && t !== value) onCommit(t);
    else setText(value === null || value === undefined ? "" : value);
  };
  return (
    <input
      type="text"
      aria-label={label}
      placeholder={value === null ? "Mixed" : undefined}
      value={text}
      spellCheck={false}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
};
