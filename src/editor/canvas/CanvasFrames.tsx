"use client";

/**
 * ============================================================================
 * CANVAS FRAMES (ROADMAP Phase 21)
 * ============================================================================
 * The document's frames side by side on the canvas, each its own stage host (a
 * frame element of its own, so media queries inside a frame see the frame's
 * width). Each has a title above it (double-click to rename) with its size and
 * a few buttons: duplicate, move left or right, delete. The frame bar adds
 * frames from the device presets or a custom size and picks the backdrop.
 * Everything runs through the `frame.*` commands.
 * ============================================================================
 */

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from "lucide-react";
import { invokeCommand } from "@/core/commands";
import { FRAME_PRESETS } from "@/core/frames/frames";
import { useSnapStore } from "@/core/store/useSnapStore";
import { usePreviewStore } from "@/core/store/usePreviewStore";
import { useCanvasViewStore, BACKDROPS, type Backdrop } from "@/core/store/useCanvasViewStore";
import { StageHost } from "@/editor/stage/StageHost";
import type { CanvasFrame } from "./useFrames";

interface CanvasFramesProps {
  frames: CanvasFrame[];
  /** While a shape or text tool owns the pointer the frames ignore it, so a drag can start anywhere. */
  toolCapturesPointer: boolean;
  /** Called with a clicked layer's id when the frames take clicks themselves (Preview mode passes none). */
  onElementClick?: (layerId: string) => void;
}

function SizeField({ label, value, onCommit }: { label: string; value: number; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value)); // the field is keyed by its value, so a new value remounts it
  const commit = () => {
    const n = Number(draft);
    if (Number.isFinite(n) && n > 0 && n !== value) onCommit(n);
    else setDraft(String(value));
  };
  return (
    <input
      className="canvas-frame__size"
      aria-label={label}
      inputMode="numeric"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation(); // typing a size is not a shortcut
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setDraft(String(value));
      }}
      onMouseDown={(e) => e.stopPropagation()}
    />
  );
}

function FrameTitle({ frame, index, count, active }: { frame: CanvasFrame; index: number; count: number; active: boolean }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(frame.name);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const finishRename = () => {
    setEditing(false);
    const next = name.trim();
    if (next && next !== frame.name) invokeCommand("frame.rename", { frameId: frame.id, name: next });
    else setName(frame.name);
  };
  const run = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    invokeCommand(id, { frameId: frame.id });
  };

  return (
    <div className="canvas-frame__title" style={{ width: `max(calc(${frame.width}px * var(--canvas-zoom)), 168px)` }} /* a frame zoomed far out keeps a title you can read and click */ onMouseDown={(e) => e.stopPropagation()}>
      {editing ? (
        <input
          ref={inputRef}
          className="canvas-frame__rename"
          aria-label={`Rename ${frame.name}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={finishRename}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") finishRename();
            if (e.key === "Escape") {
              setName(frame.name);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="canvas-frame__name"
          title="Double-click to rename"
          onClick={(e) => {
            e.stopPropagation();
            invokeCommand("frame.focus", { frameId: frame.id, camera: false }); // select it; clicking a title never moves the view
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setName(frame.name);
            setEditing(true);
          }}
        >
          {frame.name}
        </button>
      )}
      <span className="canvas-frame__dims">
        <SizeField key={`w${frame.width}`} label={`${frame.name} width`} value={frame.width} onCommit={(width) => invokeCommand("frame.resize", { frameId: frame.id, width })} />
        ×
        <SizeField key={`h${frame.height}`} label={`${frame.name} height`} value={frame.height} onCommit={(height) => invokeCommand("frame.resize", { frameId: frame.id, height })} />
      </span>
      <span className="canvas-frame__actions" data-active={active || undefined}>
        <button type="button" aria-label={`Move ${frame.name} left`} title="Move left" disabled={index === 0} onClick={run("frame.moveLeft")}>
          <ChevronLeft size={12} />
        </button>
        <button type="button" aria-label={`Move ${frame.name} right`} title="Move right" disabled={index === count - 1} onClick={run("frame.moveRight")}>
          <ChevronRight size={12} />
        </button>
        <button type="button" aria-label={`Duplicate ${frame.name}`} title="Duplicate" onClick={run("frame.duplicate")}>
          <Copy size={12} />
        </button>
        <button type="button" aria-label={`Delete ${frame.name}`} title="Delete" disabled={count <= 1} onClick={run("frame.delete")}>
          <Trash2 size={12} />
        </button>
      </span>
    </div>
  );
}

/**
 * The frames that are drawn: all of them. (A lone empty frame used to be hidden so a new project looked blank, but
 * then no shape tool could draw anywhere: they need a frame under the pointer.)
 */
export function visibleFrames(frames: CanvasFrame[], previewFrameId: string | null = null): CanvasFrame[] {
  // Preview shows one page at a time, the way a site is seen (Phase 48)
  if (previewFrameId && frames.some((f) => f.id === previewFrameId)) return frames.filter((f) => f.id === previewFrameId);
  return frames;
}

export const CanvasFrames: React.FC<CanvasFramesProps> = ({ frames, toolCapturesPointer, onElementClick }) => {
  const activeFrameId = useCanvasViewStore((s) => s.activeFrameId);
  const mode = useCanvasViewStore((s) => s.mode);
  const previewFrame = usePreviewStore((s) => (mode === "preview" ? (s.entries[s.index]?.frameId ?? null) : null));
  const shown = visibleFrames(frames, previewFrame);
  const active = activeFrameId && frames.some((f) => f.id === activeFrameId) ? activeFrameId : frames[0]?.id;

  return (
    <>
      {shown.map((frame) => (
        <div
          key={frame.id}
          className={`canvas-frame ${frame.id === active ? "canvas-frame--active" : ""}`}
          data-frame-id={frame.id}
          style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height }}
        >
          <FrameTitle frame={frame} index={frames.indexOf(frame)} count={frames.length} active={frame.id === active} />
          <div className="canvas-frame__surface">
            <StageHost
              frameId={frame.id}
              title={frames.length === 1 ? "Stage" : `Stage: ${frame.name}`}
              width="100%"
              height="100%"
              style={{ pointerEvents: toolCapturesPointer ? "none" : undefined }}
              onElementClick={onElementClick}
            />
          </div>
        </div>
      ))}
    </>
  );
};

const BACKDROP_LABEL: Record<Backdrop, string> = { light: "Light", dark: "Dark", checker: "Checkerboard" };

/** Adds frames (device presets or a custom size) and picks the backdrop. */
export const FrameBar: React.FC = () => {
  const mode = useCanvasViewStore((s) => s.mode);
  const snapObjects = useSnapStore((s) => s.objects);
  const snapGuides = useSnapStore((s) => s.guides);
  const snapGrid = useSnapStore((s) => s.grid);
  const snapRulers = useSnapStore((s) => s.rulers);
  const snap = { objects: snapObjects, guides: snapGuides, grid: snapGrid, rulers: snapRulers };
  const backdrop = useCanvasViewStore((s) => s.backdrop);
  const setBackdrop = useCanvasViewStore((s) => s.setBackdrop);
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState({ width: "1024", height: "768" });

  const add = (args: Record<string, unknown>) => {
    invokeCommand("frame.add", args);
    setOpen(false);
  };

  return (
    <div className="frame-bar" role="toolbar" aria-label="Frames" onMouseDown={(e) => e.stopPropagation()}>
      <div className="frame-bar__add">
        <button type="button" className="frame-bar__btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <Plus size={13} /> Frame
        </button>
        {open && (
          <div className="frame-bar__menu" role="menu" aria-label="Add frame">
            {FRAME_PRESETS.map((p) => (
              <button key={p.id} type="button" role="menuitem" className="frame-bar__item" onClick={() => add({ preset: p.id })}>
                <span>{p.label}</span>
                <span className="frame-bar__dim">
                  {p.width} × {p.height}
                </span>
              </button>
            ))}
            <div className="frame-bar__custom">
              <input aria-label="Custom frame width" inputMode="numeric" value={custom.width} onChange={(e) => setCustom((c) => ({ ...c, width: e.target.value }))} onKeyDown={(e) => e.stopPropagation()} />
              ×
              <input aria-label="Custom frame height" inputMode="numeric" value={custom.height} onChange={(e) => setCustom((c) => ({ ...c, height: e.target.value }))} onKeyDown={(e) => e.stopPropagation()} />
              <button type="button" role="menuitem" className="frame-bar__btn" onClick={() => add({ width: Number(custom.width) || 1024, height: Number(custom.height) || 768, name: "Custom" })}>
                Add
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="frame-bar__group" role="group" aria-label="Canvas mode">
        {(["design", "preview"] as const).map((m) => (
          <button key={m} type="button" className="frame-bar__btn" aria-pressed={mode === m} onClick={() => useCanvasViewStore.getState().setMode(m)}>
            {m === "design" ? "Design" : "Preview"}
          </button>
        ))}
      </div>
      <div className="frame-bar__group" role="group" aria-label="Snapping">
        {(["objects", "guides", "grid", "rulers"] as const).map((k) => (
          <button key={k} type="button" className="frame-bar__btn" aria-pressed={snap[k]} onClick={() => useSnapStore.getState().toggle(k)}>
            {k === "objects" ? "Snap objects" : k === "guides" ? "Snap guides" : k === "grid" ? "Pixel grid" : "Rulers"}
          </button>
        ))}
      </div>
      <div className="frame-bar__group" role="group" aria-label="Canvas backdrop">
        {BACKDROPS.map((b) => (
          <button key={b} type="button" className="frame-bar__btn" aria-pressed={backdrop === b} onClick={() => setBackdrop(b)}>
            {BACKDROP_LABEL[b]}
          </button>
        ))}
      </div>
    </div>
  );
};
