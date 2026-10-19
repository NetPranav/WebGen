"use client";

/**
 * Saved layouts (Phase 15): name the arrangement of docks you have now, and
 * bring it back with one click. Every action goes through the command bus
 * (`workspace.saveLayout`, `.applyLayout`, `.deleteLayout`).
 */
import React, { useEffect, useRef, useState } from "react";
import { Check, LayoutGrid, X } from "lucide-react";
import { invokeCommand, tryRunCommand } from "@/core/commands";
import { useSavedLayouts } from "@/core/workspace/useSavedLayouts";
import { MAX_NAME_LENGTH } from "@/core/workspace/savedLayouts";

const ERRORS: Record<string, string> = {
  "invalid-name": "Give the layout a name (up to 40 characters).",
  "limit-reached": "You can keep 20 layouts. Delete one first.",
};

export const LayoutsMenu: React.FC<{ activeWorkspace: string }> = ({ activeWorkspace }) => {
  const layouts = useSavedLayouts((s) => s.layouts);
  const hydrate = useSavedLayouts((s) => s.hydrate);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => hydrate(), [hydrate]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const outcome = tryRunCommand("workspace.saveLayout", { name });
    const result = outcome.ok ? (outcome.result as { ok: boolean; reason?: string }) : { ok: false, reason: "invalid-name" };
    if (result.ok) {
      setName("");
      setError(null);
    } else {
      setError(ERRORS[result.reason ?? ""] ?? "That layout could not be saved.");
    }
  };

  return (
    <div className="layouts-menu" ref={wrapperRef} onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <button
        type="button"
        className={`studio-header-workspaces__tab ${activeWorkspace.startsWith("custom:") ? "studio-header-workspaces__tab--active" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title="Saved layouts"
      >
        <LayoutGrid size={13} />
        <span className="studio-header-workspaces__label">Layouts</span>
      </button>

      {open && (
        <div className="menu-dropdown layouts-menu__panel" role="menu" aria-label="Saved layouts">
          {layouts.length === 0 && <div className="layouts-menu__empty">No saved layouts yet. Arrange the docks, then name it below.</div>}
          {layouts.map((l) => (
            <div key={l.name} className="layouts-menu__row">
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  invokeCommand("workspace.applyLayout", { name: l.name });
                  setOpen(false);
                }}
              >
                <span className="menu-item__left">
                  <span>{l.name}</span>
                </span>
                {activeWorkspace === `custom:${l.name}` && <Check size={13} className="menu-item__check" />}
              </button>
              <button type="button" className="layouts-menu__delete" aria-label={`Delete layout ${l.name}`} onClick={() => invokeCommand("workspace.deleteLayout", { name: l.name })}>
                <X size={12} />
              </button>
            </div>
          ))}
          <div className="menu-separator" />
          <form className="layouts-menu__form" onSubmit={save}>
            <input
              type="text"
              aria-label="Layout name"
              placeholder="Name this layout"
              maxLength={MAX_NAME_LENGTH}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
            />
            <button type="submit" className="layouts-menu__save">Save current layout</button>
          </form>
          {error && <div className="layouts-menu__error" role="alert">{error}</div>}
        </div>
      )}
    </div>
  );
};
