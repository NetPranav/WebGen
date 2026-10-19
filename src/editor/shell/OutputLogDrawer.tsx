"use client";

/**
 * The slide-up Output Log drawer (moved out of `EditorShell.tsx`, Phase 14).
 * Dragging its header 24 px tears it off into its own window.
 */
import React from "react";
import { Terminal, X } from "lucide-react";
import { PanelHost } from "./panels/PanelHost";
import type { PanelContext } from "./panels/context";

interface OutputLogDrawerProps {
  context: PanelContext;
  onClose: () => void;
  onTearOff: (originX: number, originY: number) => void;
}

export const OutputLogDrawer: React.FC<OutputLogDrawerProps> = ({ context, onClose, onTearOff }) => (
  <div className="output-log-drawer" role="region" aria-label="Unreal Engine Output Log Console">
    <div
      className="output-log-drawer__header output-log-drawer__header--draggable"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        const originX = e.clientX;
        const originY = e.clientY;
        let activated = false;
        const onMove = (moveEvt: PointerEvent) => {
          if (activated) return;
          const dx = moveEvt.clientX - originX;
          const dy = moveEvt.clientY - originY;
          if (Math.sqrt(dx * dx + dy * dy) >= 24) {
            activated = true;
            onClose();
            onTearOff(originX, originY);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
          }
        };
        const onUp = () => {
          window.removeEventListener("pointermove", onMove);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp, { once: true });
      }}
    >
      <div className="output-log-drawer__title">
        <Terminal size={13} style={{ color: "var(--accent-primary)" }} />
        <span>Output Log</span>
        <span className="panel-header__badge">Drag to detach</span>
      </div>
      <div className="output-log-drawer__actions">
        <button type="button" className="panel-icon-btn" onClick={onClose} title="Close Output Log Drawer">
          <X size={13} />
        </button>
      </div>
    </div>
    <div style={{ flex: 1, minHeight: 0 }}>
      <PanelHost zone="right" panelId="console" context={context} />
    </div>
  </div>
);
