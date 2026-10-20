"use client";

import React, { useState } from "react";

interface Props {
  label: string;
  value: number | null | undefined;
  step?: number;
  min?: number;
  max?: number;
  /** A short mark shown inside the field, like X or W. */
  badge?: string;
  onCommit: (n: number) => void;
}

/** A number field that writes on Enter or blur, so typing "24" is one undo step, not two. It restarts when the value changes under it; `null` reads "Mixed". */
export const NumberField: React.FC<Props> = (props) => <NumberInput key={props.value === null ? "mixed" : String(props.value)} {...props} />;

const NumberInput: React.FC<Props> = ({ label, value, step = 1, min, max, badge, onCommit }) => {
  const [text, setText] = useState(value === null || value === undefined ? "" : String(value));
  const commit = () => {
    const n = Number(text);
    if (text.trim() !== "" && Number.isFinite(n) && n !== value) {
      const lo = min !== undefined ? Math.max(min, n) : n;
      onCommit(max !== undefined ? Math.min(max, lo) : lo);
    } else setText(value === null || value === undefined ? "" : String(value));
  };
  return (
    <label className="simple-field">
      {badge && <span className="simple-field__badge" aria-hidden>{badge}</span>}
      <input
        type="number"
        aria-label={label}
        step={step}
        min={min}
        max={max}
        placeholder={value === null ? "Mixed" : undefined}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
    </label>
  );
};
