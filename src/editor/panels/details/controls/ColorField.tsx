"use client";

import React, { useState } from "react";

/** A colour as the swatch needs it: `#rrggbb`, or black for anything else. */
export const swatchValue = (v: string | null | undefined): string => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : typeof v === "string" && /^#[0-9a-fA-F]{3}$/.test(v) ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : "#000000");

export const ColorField: React.FC<{ label: string; value: string | null | undefined; onCommit: (color: string) => void }> = ({ label, value, onCommit }) => (
  <ColorInput key={value === null ? "mixed" : String(value)} label={label} value={value} onCommit={onCommit} />
);

const ColorInput: React.FC<{ label: string; value: string | null | undefined; onCommit: (color: string) => void }> = ({ label, value, onCommit }) => {
  const [text, setText] = useState(value === null || value === undefined ? "" : value);
  const commit = () => {
    const t = text.trim();
    if (t !== "" && t !== value) onCommit(t);
    else setText(value === null || value === undefined ? "" : value);
  };
  return (
    <span className="simple-color">
      <input type="color" aria-label={`${label} colour`} value={swatchValue(value)} onChange={(e) => onCommit(e.target.value)} />
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
    </span>
  );
};

