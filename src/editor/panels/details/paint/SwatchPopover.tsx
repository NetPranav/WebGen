"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  label: string;
  /** CSS background for the swatch button. */
  swatch: string;
  children: React.ReactNode;
  /** Called when the popover opens or closes. */
  onToggle?: (open: boolean) => void;
}

/** A colour swatch that opens a panel below it (in the page, so the inspector's scrolling doesn't clip it). Closes on a press outside or Escape. */
export const SwatchPopover: React.FC<Props> = ({ label, swatch, children, onToggle }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const button = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);

  const toggle = (next: boolean) => {
    setOpen(next);
    onToggle?.(next);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const b = button.current?.getBoundingClientRect();
    const p = panel.current;
    if (!b || !p) return;
    const left = Math.max(8, Math.min(b.left, window.innerWidth - p.offsetWidth - 8));
    const below = b.bottom + 6;
    const top = below + p.offsetHeight > window.innerHeight - 8 ? Math.max(8, b.top - p.offsetHeight - 6) : below;
    setPos({ left, top });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const outside = (e: PointerEvent) => {
      const t = e.target as Element;
      // a press inside this panel, its button, or any other swatch panel (the picker opened from inside the fills editor) is not "outside"
      if (panel.current?.contains(t) || button.current?.contains(t) || t.closest?.(".swatch-popover")) return;
      setOpen(false);
      onToggle?.(false);
    };
    window.addEventListener("pointerdown", outside, true);
    return () => window.removeEventListener("pointerdown", outside, true);
  }, [open, onToggle]);

  return (
    <>
      <button ref={button} type="button" className="swatch-button" aria-label={label} aria-expanded={open} style={{ background: swatch }} onClick={() => toggle(!open)} />
      {open &&
        createPortal(
          <div
            ref={panel}
            className="swatch-popover"
            role="dialog"
            aria-label={label}
            style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                toggle(false);
                button.current?.focus();
              }
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
};
