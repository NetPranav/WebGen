"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { invokeCommand } from "@/core/commands";
import { useCanvasViewStore } from "@/core/store/useCanvasViewStore";
import { layerMenu, type LayerMenuEntry } from "@/core/editing/layerMenu";

export interface ContextMenuState {
  x: number;
  y: number;
  entries: LayerMenuEntry[];
}

/** The right-click menu on the canvas (Phase 29). Opens at the pointer; every item runs a command. */
export const CanvasContextMenu: React.FC<{ menu: ContextMenuState | null; onClose: () => void }> = ({ menu, onClose }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  // Keep the menu on screen: a right-click near the bottom or right edge opens it up and to the left instead.
  useLayoutEffect(() => {
    const el = ref.current;
    const host = el?.offsetParent as HTMLElement | null;
    if (!menu || !el || !host) return;
    const left = Math.max(4, Math.min(menu.x, host.clientWidth - el.offsetWidth - 4));
    const top = Math.max(4, Math.min(menu.y, host.clientHeight - el.offsetHeight - 4));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [menu]);
  useEffect(() => {
    if (!menu) return undefined;
    const close = (e: Event) => {
      if (e.target instanceof Node && ref.current?.contains(e.target)) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("pointerdown", close, true);
    window.addEventListener("blur", onClose);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", close, true);
      window.removeEventListener("blur", onClose);
      window.removeEventListener("keydown", key);
    };
  }, [menu, onClose]);
  if (!menu) return null;
  return (
    <div ref={ref} className="canvas-context-menu" role="menu" aria-label="Layer actions" style={{ left: menu.x, top: menu.y }} onContextMenu={(e) => e.preventDefault()}>
      {menu.entries.map((e, i) =>
        e.kind === "separator" ? (
          <div key={i} className="canvas-context-menu__sep" role="separator" />
        ) : (
          <button
            key={e.command}
            type="button"
            role="menuitem"
            className="canvas-context-menu__item"
            disabled={e.disabled}
            onClick={() => {
              onClose();
              invokeCommand(e.command);
            }}
          >
            <span>{e.label}</span>
            {e.shortcut && <kbd>{e.shortcut}</kbd>}
          </button>
        ),
      )}
    </div>
  );
};

/** The rename box (F2 or the menu): Enter renames the layer through `layer.setName`, Escape cancels. */
export const RenameBox: React.FC<{ currentName: (id: string) => string }> = ({ currentName }) => {
  const id = useCanvasViewStore((s) => s.renamingId);
  if (!id) return null;
  return <RenameForm key={id} id={id} initial={currentName(id)} />;
};

const RenameForm: React.FC<{ id: string; initial: string }> = ({ id, initial }) => {
  const [name, setName] = useState(initial);
  const input = useRef<HTMLInputElement | null>(null);
  useEffect(() => input.current?.select(), []);
  const stop = () => useCanvasViewStore.getState().stopRename();
  return (
    <form
      className="canvas-rename"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) invokeCommand("layer.setName", { id, name });
        stop();
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <label>
        Rename layer
        <input
          ref={input}
          value={name}
          aria-label="Layer name"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation(); // typing a name is not a shortcut
            if (e.key === "Escape") stop();
          }}
          onBlur={stop}
        />
      </label>
    </form>
  );
};

export { layerMenu };
