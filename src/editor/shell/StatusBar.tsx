"use client";

/**
 * ============================================================================
 * STATUS BAR COMPONENT WITH BOTTOM DRAWER CONTROLLER
 * ============================================================================
 * UI Element: Bottom Status Bar & Bottom Panel Controller
 * Screen / Scope: Entire IDE Studio Shell (`/editor`)
 * Role: Hosts:
 *       - Left: bottom-drawer toggle, save state, active selection, and the
 *         Output Log / Execution Trace toggles (actions)
 *       - Right: environment read-outs — git branch, engine FPS, memory, AST
 *         version (information only; the canvas owns its own zoom controls)
 * Styling Source: `@/editor/styles/dock.css` (`.statusbar`)
 * ============================================================================
 */

import React from "react";
import {
  Activity,
  Cpu,
  GitBranch,
  PanelBottom,
  ChevronUp,
  ChevronDown,
  Terminal,
  Crosshair,
} from "lucide-react";

interface StatusBarProps {
  status?: string;
  isDirty?: boolean;
  activeSelection?: string | null;
  branchName?: string;
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  fps?: number;
  memoryUsage?: string;
  isBottomOpen?: boolean;
  bottomActiveTab?: string;
  onToggleBottom?: () => void;
  isOutputLogOpen?: boolean;
  onToggleOutputLog?: () => void;
  onTearOffLog?: (originX: number, originY: number) => void;
  onToggleExecutionTrace?: () => void;
  isExecutionTraceActive?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  status = "Engine Ready",
  isDirty = false,
  activeSelection = "No selection",
  branchName = "main",
  fps = 120,
  memoryUsage = "38 MB",
  isBottomOpen = true,
  onToggleBottom,
  isOutputLogOpen = false,
  onToggleOutputLog,
  onTearOffLog,
  onToggleExecutionTrace,
  isExecutionTraceActive = false,
}) => {
  return (
    <footer className="statusbar" role="contentinfo" aria-label="Engine Status Bar">
      {/* Left section: drawer toggle, save state, selection, log toggles */}
      <div className="statusbar__left">
        <button
          type="button"
          className={`statusbar__btn statusbar__drawer-trigger ${
            isBottomOpen ? "statusbar__btn--active" : ""
          }`}
          onClick={onToggleBottom}
          title={`${isBottomOpen ? "Hide" : "Show"} bottom panels (Content Browser • Sequencer • Export)`}
          aria-expanded={isBottomOpen}
        >
          <PanelBottom size={13} />
          <span className="statusbar__drawer-label">Panels</span>
          {isBottomOpen ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
        </button>

        <span className="statusbar__sep" aria-hidden="true" />

        <div className="statusbar__item" title={status}>
          <span
            className={`statusbar__indicator ${isDirty ? "statusbar__indicator--dirty" : ""}`}
          />
          <span>{isDirty ? "Unsaved changes" : "All changes saved"}</span>
        </div>

        {activeSelection && (
          <div className="statusbar__item statusbar__item--target" title={`Selected: ${activeSelection}`}>
            <Crosshair size={11} className="statusbar__muted-icon" />
            <span className="statusbar__target-name">{activeSelection}</span>
          </div>
        )}

        <span className="statusbar__sep" aria-hidden="true" />

        {/* Unreal-style Output Log toggle — click to toggle, drag to tear off */}
        <button
          type="button"
          className={`statusbar__btn ${isOutputLogOpen ? "statusbar__btn--active" : ""}`}
          onClick={onToggleOutputLog}
          onPointerDown={(e) => {
            if (!onTearOffLog || e.button !== 0) return;
            const originX = e.clientX;
            const originY = e.clientY;
            let activated = false;

            const onMove = (moveEvt: PointerEvent) => {
              if (activated) return;
              const dx = moveEvt.clientX - originX;
              const dy = moveEvt.clientY - originY;
              if (Math.sqrt(dx * dx + dy * dy) >= 24) {
                activated = true;
                onTearOffLog(originX, originY);
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
          title="Toggle Output Log (drag to tear off)"
        >
          <Terminal size={12} />
          <span className="statusbar__log-label">Output Log</span>
        </button>

        {onToggleExecutionTrace && (
          <button
            type="button"
            className={`statusbar__btn ${isExecutionTraceActive ? "statusbar__btn--active" : ""}`}
            onClick={onToggleExecutionTrace}
            title="Toggle Visual Execution Trace (Blueprint Debugger)"
          >
            <Activity size={12} />
            <span className="statusbar__log-label">Execution Trace</span>
          </button>
        )}
      </div>

      {/* Right section: environment read-outs */}
      <div className="statusbar__right">
        <div className="statusbar__item statusbar__item--branch" title={`Working on branch ${branchName}`}>
          <GitBranch size={11} className="statusbar__muted-icon" />
          <span>{branchName}</span>
        </div>
        <div className="statusbar__item statusbar__item--perf" title="Engine frame rate">
          <span className="statusbar__indicator statusbar__indicator--live" />
          <span>{fps} FPS</span>
        </div>
        <div className="statusbar__item statusbar__item--mem" title="Engine memory">
          <Cpu size={11} className="statusbar__muted-icon" />
          <span>{memoryUsage}</span>
        </div>
        <span className="statusbar__badge statusbar__item--ast" title="Document AST schema version">
          AST v1.0
        </span>
      </div>
    </footer>
  );
};
