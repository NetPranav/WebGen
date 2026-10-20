"use client";

import React, { useRef, useState } from "react";
import { documentCommands } from "@/core/store/useDocumentStore";
import { scrubValue, stepValue } from "@/core/inspector/proModel";
import type { PropertyDefinition } from "@/core/document/properties";

interface Props {
  path: string;
  label: string;
  def: PropertyDefinition;
  /** The shared value, or null when the selected layers differ. */
  value: number | null;
  /** Writes the value (live while scrubbing, once for a typed or stepped value). */
  write: (n: number) => void;
}

/**
 * A number with the Pro face's three ways to change it: type and press Enter, the arrow keys (Shift ten times, Alt a
 * tenth of a step), and drag the label sideways to scrub (Escape cancels). A scrub is one undo step.
 */
export const ScrubNumber: React.FC<Props> = ({ path, label, def, value, write }) => {
  // While the field is focused it shows what is being typed (`draft`); otherwise it shows the document's value.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === null ? "" : String(value));
  const scrub = useRef<{ x: number; start: number; tx: { commit: () => void; cancel: () => void } } | null>(null);

  const commitText = () => {
    const n = Number(shown);
    setDraft(null);
    if (shown.trim() !== "" && Number.isFinite(n) && n !== value) write(n);
  };

  return (
    <span className="pro-number">
      <span
        className="pro-number__label"
        role="presentation"
        tabIndex={-1}
        title="Drag to change (Shift: faster, Alt: finer)"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.focus({ preventScroll: true }); // so Escape reaches the label while the drag is going
          e.currentTarget.setPointerCapture(e.pointerId);
          scrub.current = { x: e.clientX, start: value ?? Number(def.default) ?? 0, tx: documentCommands.begin(`Scrub ${label}`) };
        }}
        onPointerMove={(e) => {
          const s = scrub.current;
          if (!s) return;
          write(scrubValue(def, s.start, e.clientX - s.x, { shift: e.shiftKey, alt: e.altKey }));
        }}
        onPointerUp={() => {
          scrub.current?.tx.commit();
          scrub.current = null;
        }}
        onPointerCancel={() => {
          scrub.current?.tx.cancel();
          scrub.current = null;
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && scrub.current) {
            e.stopPropagation();
            scrub.current.tx.cancel();
            scrub.current = null;
          }
        }}
      >
        {label}
      </span>
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        data-prop-input={path}
        placeholder={value === null ? "Mixed" : undefined}
        value={shown}
        onFocus={() => setDraft(shown)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitText}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          else if (e.key === "Escape") {
            setDraft(null);
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            const current = Number(shown);
            const base = Number.isFinite(current) && shown.trim() !== "" ? current : (value ?? Number(def.default) ?? 0);
            const direction = e.key === "ArrowUp" ? 1 : -1;
            const mult = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
            const next = mult === 0.1 ? scrubValue(def, base, direction * 4, { alt: true }) : stepValue(def, base, direction * mult);
            setDraft(String(next));
            write(next);
          }
        }}
      />
    </span>
  );
};

