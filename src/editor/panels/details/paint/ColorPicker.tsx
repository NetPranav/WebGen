"use client";

/**
 * The colour picker (ROADMAP Phase 35): a saturation and brightness square, hue and alpha sliders, HSB or OKLCH
 * numbers, a hex box, and the browser's eyedropper where it has one. It edits a colour string and reports each
 * change; a drag brackets its changes with `onBegin` / `onEnd` so the caller can make them one undo step.
 */

import React, { useEffect, useRef, useState } from "react";
import { Pipette } from "lucide-react";
import { hsbToRgb, oklchToRgb, parseColor, rgbToHsb, rgbToOklch, toHex, type Hsb, type Rgba } from "@/core/paint/colorMath";
import "@/editor/styles/paint.css";

interface Props {
  value: string;
  onChange: (color: string) => void;
  /** A drag or a typed change is starting / done: group what happens between them. */
  onBegin?: () => void;
  onEnd?: () => void;
}

type Mode = "hsb" | "oklch";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** A box that reports the pointer while it is pressed inside it, as fractions (0-1) of its size. */
const DragArea: React.FC<React.HTMLAttributes<HTMLDivElement> & { onPoint: (x: number, y: number) => void; onBegin?: () => void; onEnd?: () => void }> = ({ onPoint, onBegin, onEnd, children, ...rest }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const active = useRef(false);
  const at = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    onPoint(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1));
  };
  const finish = () => {
    if (!active.current) return;
    active.current = false;
    onEnd?.();
  };
  return (
    <div
      ref={ref}
      {...rest}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        active.current = true;
        onBegin?.();
        at(e);
      }}
      onPointerMove={(e) => active.current && at(e)}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      {children}
    </div>
  );
};


const NumField: React.FC<{ label: string; value: number; min: number; max: number; step: number; set: (n: number) => void; onBegin?: () => void; onEnd?: () => void }> = ({ label, value, min, max, step, set, onBegin, onEnd }) => (
  <label className="cp-num">
    <span>{label}</span>
    <input
      type="number"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={Number(value.toFixed(step < 1 ? 2 : 0))}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isFinite(n)) set(clamp(n, min, max));
      }}
      onFocus={() => onBegin?.()}
      onBlur={() => onEnd?.()}
    />
  </label>
);

export const ColorPicker: React.FC<Props> = ({ value, onChange, onBegin, onEnd }) => {
  const parsed = parseColor(value) ?? { r: 0, g: 0, b: 0, a: 1 };
  // The picker keeps its own HSB while you drag: converting through RGB would lose the hue of a grey and the saturation of a black.
  const [hsb, setHsb] = useState<Hsb>(() => rgbToHsb(parsed));
  const [alpha, setAlpha] = useState(parsed.a);
  const [mode, setMode] = useState<Mode>("hsb");
  const [hex, setHex] = useState<string | null>(null);
  const lastEmitted = useRef(toHex({ ...parsed, a: parsed.a }));

  // adopt a colour that changed from outside (undo, another control)
  useEffect(() => {
    const p = parseColor(value);
    if (!p || toHex(p) === lastEmitted.current) return;
    lastEmitted.current = toHex(p);
    setHsb(rgbToHsb(p));
    setAlpha(p.a);
  }, [value]);

  const emit = (next: Hsb, a: number) => {
    setHsb(next);
    setAlpha(a);
    const rgb = hsbToRgb(next, a);
    lastEmitted.current = toHex(rgb);
    onChange(toHex(rgb));
  };
  const emitRgb = (rgb: Rgba) => {
    const h = rgbToHsb(rgb);
    emit({ h: rgb.r === rgb.g && rgb.g === rgb.b ? hsb.h : h.h, s: h.s, b: h.b }, rgb.a);
  };

  const rgb = hsbToRgb(hsb, alpha);
  const oklch = rgbToOklch(rgb);
  const pure = toHex({ ...hsbToRgb({ h: hsb.h, s: 1, b: 1 }), a: 1 });
  const solid = toHex({ ...rgb, a: 1 });

  const eyedropper = typeof window !== "undefined" && "EyeDropper" in window;

  return (
    <div className="color-picker" role="group" aria-label="Colour picker" onPointerDown={(e) => e.stopPropagation()}>
      <DragArea
        onPoint={(x, y) => emit({ ...hsb, s: x, b: 1 - y }, alpha)}
        onBegin={onBegin}
        onEnd={onEnd}
        className="cp-square"
        role="slider"
        aria-label="Saturation and brightness"
        aria-valuenow={Math.round(hsb.s * 100)}
        aria-valuetext={`Saturation ${Math.round(hsb.s * 100)}, brightness ${Math.round(hsb.b * 100)}`}
        tabIndex={0}
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${pure})` }}
        onKeyDown={(e) => {
          const d = e.shiftKey ? 0.1 : 0.01;
          if (e.key === "ArrowLeft") emit({ ...hsb, s: clamp(hsb.s - d, 0, 1) }, alpha);
          else if (e.key === "ArrowRight") emit({ ...hsb, s: clamp(hsb.s + d, 0, 1) }, alpha);
          else if (e.key === "ArrowUp") emit({ ...hsb, b: clamp(hsb.b + d, 0, 1) }, alpha);
          else if (e.key === "ArrowDown") emit({ ...hsb, b: clamp(hsb.b - d, 0, 1) }, alpha);
          else return;
          e.preventDefault();
        }}
      >
        <span className="cp-square__handle" style={{ left: `${hsb.s * 100}%`, top: `${(1 - hsb.b) * 100}%`, background: solid }} />
      </DragArea>
      <div className="cp-row">
        <div className="cp-swatch" style={{ background: `linear-gradient(${toHex(rgb)}, ${toHex(rgb)}), repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 8px 8px` }} aria-hidden />
        <div className="cp-sliders">
          <DragArea onPoint={(x) => emit({ ...hsb, h: x * 360 }, alpha)} onBegin={onBegin} onEnd={onEnd} className="cp-slider cp-slider--hue" role="slider" aria-label="Hue" aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(hsb.h)} tabIndex={0} onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              emit({ ...hsb, h: (hsb.h + (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 10 : 1) + 360) % 360 }, alpha);
              e.preventDefault();
            }
          }}>
            <span className="cp-slider__thumb" style={{ left: `${(hsb.h / 360) * 100}%` }} />
          </DragArea>
          <DragArea onPoint={(x) => emit(hsb, Number(x.toFixed(3)))} onBegin={onBegin} onEnd={onEnd} className="cp-slider cp-slider--alpha" role="slider" aria-label="Opacity" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(alpha * 100)} tabIndex={0} style={{ backgroundImage: `linear-gradient(to right, transparent, ${solid}), repeating-conic-gradient(#ccc 0 25%, #fff 0 50%)`, backgroundSize: "100% 100%, 8px 8px" }} onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              emit(hsb, Number(clamp(alpha + (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 0.1 : 0.01), 0, 1).toFixed(3)));
              e.preventDefault();
            }
          }}>
            <span className="cp-slider__thumb" style={{ left: `${alpha * 100}%` }} />
          </DragArea>
        </div>
        {eyedropper && (
          <button
            type="button"
            className="cp-eyedropper"
            aria-label="Pick a colour from the screen"
            title="Pick a colour from the screen"
            onClick={async () => {
              try {
                const picked = await new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper().open();
                const p = parseColor(picked.sRGBHex);
                if (p) {
                  onBegin?.();
                  emitRgb({ ...p, a: alpha });
                  onEnd?.();
                }
              } catch {
                // cancelled
              }
            }}
          >
            <Pipette size={14} />
          </button>
        )}
      </div>
      <div className="cp-tabs" role="tablist" aria-label="Colour model">
        {(["hsb", "oklch"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}>
            {m === "hsb" ? "HSB" : "OKLCH"}
          </button>
        ))}
      </div>
      <div className="cp-nums">
        {mode === "hsb" ? (
          <>
            <NumField label="H" value={hsb.h} min={0} max={360} step={1} set={(n) => emit({ ...hsb, h: n }, alpha)} onBegin={onBegin} onEnd={onEnd} />
            <NumField label="S" value={hsb.s * 100} min={0} max={100} step={1} set={(n) => emit({ ...hsb, s: n / 100 }, alpha)} onBegin={onBegin} onEnd={onEnd} />
            <NumField label="B" value={hsb.b * 100} min={0} max={100} step={1} set={(n) => emit({ ...hsb, b: n / 100 }, alpha)} onBegin={onBegin} onEnd={onEnd} />
          </>
        ) : (
          <>
            <NumField label="L" value={oklch.l * 100} min={0} max={100} step={1} set={(n) => emitRgb(oklchToRgb({ ...oklch, l: n / 100 }, alpha))} onBegin={onBegin} onEnd={onEnd} />
            <NumField label="C" value={oklch.c} min={0} max={0.4} step={0.01} set={(n) => emitRgb(oklchToRgb({ ...oklch, c: n }, alpha))} onBegin={onBegin} onEnd={onEnd} />
            <NumField label="Hue" value={oklch.h} min={0} max={360} step={1} set={(n) => emitRgb(oklchToRgb({ ...oklch, h: n }, alpha))} onBegin={onBegin} onEnd={onEnd} />
          </>
        )}
        <NumField label="A" value={alpha * 100} min={0} max={100} step={1} set={(n) => emit(hsb, n / 100)} onBegin={onBegin} onEnd={onEnd} />
      </div>
      <label className="cp-hex">
        <span>Hex</span>
        <input
          type="text"
          aria-label="Hex colour"
          spellCheck={false}
          value={hex ?? toHex(rgb)}
          onFocus={() => {
            setHex(toHex(rgb));
            onBegin?.();
          }}
          onChange={(e) => {
            setHex(e.target.value);
            const p = parseColor(e.target.value);
            if (p && /^#?[0-9a-fA-F]{3,8}$/.test(e.target.value.trim())) emitRgb(p);
          }}
          onBlur={() => {
            setHex(null);
            onEnd?.();
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </label>
    </div>
  );
};
