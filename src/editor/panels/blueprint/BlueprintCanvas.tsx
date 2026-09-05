"use client";

/**
 * ============================================================================
 * LOGIC BLUEPRINT CANVAS PANEL
 * ============================================================================
 * UI Element: Logic Blueprint Editor (Unreal Equivalent: Blueprint Event Graph)
 * Screen / Scope: Screen 05: Logic Blueprint Editor (`/editor`)
 * Role: Visual node-and-wire scripting canvas for application logic.
 * Styling Source: `@/editor/styles/panels.css` & `@/editor/styles/forms.css`
 * Matches: PANELS.md (Panel 05) & UI.md §4.6
 * ============================================================================
 */

import React, { useState } from "react";
import {
  Cpu,
  Play,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import "@/editor/styles/panels.css";
import "@/editor/styles/forms.css";

export const BlueprintCanvas: React.FC = () => {
  const [isCompiled, setIsCompiled] = useState(true);
  const [isCompiling, setIsCompiling] = useState(false);

  const handleCompile = () => {
    setIsCompiling(true);
    setTimeout(() => {
      setIsCompiling(false);
      setIsCompiled(true);
    }, 600);
  };

  return (
    <div className="bp-shell" role="region" aria-label="Logic Blueprint Editor">
      {/* Blueprint Toolbar */}
      <div className="bp-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <button
            type="button"
            className="cb-pill cb-pill--active"
            style={{ height: 26, padding: "0 10px", fontSize: 11 }}
            onClick={handleCompile}
            disabled={isCompiling}
          >
            {isCompiling ? (
              <span>Compiling AST...</span>
            ) : (
              <>
                <Play size={11} />
                <span>Compile Graph</span>
              </>
            )}
          </button>

          {isCompiled && !isCompiling && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--accent-success)", fontWeight: 500 }}>
              <CheckCircle2 size={12} />
              <span>Good to Go</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <span className="panel-header__badge" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Sparkles size={10} style={{ color: "var(--accent-primary)" }} />
            <span>Tab = Node Palette</span>
          </span>

          <span className="panel-header__badge">100%</span>
        </div>
      </div>

      {/* Blueprint Node Stage (Interactive Visual Scripting Preview) */}
      <div className="bp-node-stage">
        {/* SVG Bezier Wires Layer */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          {/* Wire 1: Node 1 Exec -> Node 2 Exec */}
          <path
            d="M 230 112 C 265 112, 265 112, 300 112"
            fill="none"
            stroke="var(--wire-exec)"
            strokeWidth="2.5"
          />

          {/* Wire 2: Node 2 Exec -> Node 3 Exec */}
          <path
            d="M 500 112 C 535 112, 535 112, 570 112"
            fill="none"
            stroke="var(--wire-exec)"
            strokeWidth="2.5"
          />

          {/* Wire 3: Node 2 IsAuthenticated (Bool) -> Node 3 Condition (Bool) */}
          <path
            d="M 500 162 C 535 162, 535 142, 570 142"
            fill="none"
            stroke="var(--wire-boolean)"
            strokeWidth="2"
          />

          {/* Wire 4: Node 3 True Exec -> Node 4 Exec */}
          <path
            d="M 770 112 C 805 112, 805 112, 840 112"
            fill="none"
            stroke="var(--wire-exec)"
            strokeWidth="2.5"
          />
        </svg>

        {/* Node 1: Event On Component Mount */}
        <div className="bp-node" style={{ left: 30, top: 60, zIndex: 2 }}>
          <div className="bp-node__header bp-node__header--event">
            <span>Event: OnMount</span>
            <span style={{ fontSize: 9, opacity: 0.7 }}>EVENT</span>
          </div>
          <div className="bp-node__body">
            <div className="bp-node__row">
              <span style={{ color: "var(--text-secondary)" }}>Component</span>
              <div className="bp-pin">
                <span>Exec</span>
                <span className="bp-pin__dot bp-pin__dot--exec" />
              </div>
            </div>
          </div>
        </div>

        {/* Node 2: Function Fetch User Session */}
        <div className="bp-node" style={{ left: 300, top: 60, zIndex: 2 }}>
          <div className="bp-node__header bp-node__header--func">
            <span>FetchUserSession</span>
            <span style={{ fontSize: 9, opacity: 0.7 }}>FUNC</span>
          </div>
          <div className="bp-node__body">
            <div className="bp-node__row">
              <div className="bp-pin">
                <span className="bp-pin__dot bp-pin__dot--exec" />
                <span>Exec</span>
              </div>
              <div className="bp-pin">
                <span>Exec</span>
                <span className="bp-pin__dot bp-pin__dot--exec" />
              </div>
            </div>
            <div className="bp-node__row" style={{ marginTop: 8 }}>
              <span />
              <div className="bp-pin">
                <span style={{ color: "var(--wire-boolean)" }}>IsLoggedIn</span>
                <span className="bp-pin__dot bp-pin__dot--bool" />
              </div>
            </div>
            <div className="bp-node__row">
              <span />
              <div className="bp-pin">
                <span style={{ color: "var(--wire-object)" }}>UserSession</span>
                <span className="bp-pin__dot bp-pin__dot--obj" />
              </div>
            </div>
          </div>
        </div>

        {/* Node 3: Flow Control Branch */}
        <div className="bp-node" style={{ left: 570, top: 60, zIndex: 2 }}>
          <div className="bp-node__header bp-node__header--flow">
            <span>Branch</span>
            <span style={{ fontSize: 9, opacity: 0.7 }}>FLOW</span>
          </div>
          <div className="bp-node__body">
            <div className="bp-node__row">
              <div className="bp-pin">
                <span className="bp-pin__dot bp-pin__dot--exec" />
                <span>Exec</span>
              </div>
              <div className="bp-pin">
                <span>True</span>
                <span className="bp-pin__dot bp-pin__dot--exec" />
              </div>
            </div>
            <div className="bp-node__row">
              <div className="bp-pin">
                <span className="bp-pin__dot bp-pin__dot--bool" />
                <span style={{ color: "var(--wire-boolean)" }}>Condition</span>
              </div>
              <div className="bp-pin">
                <span>False</span>
                <span className="bp-pin__dot bp-pin__dot--exec" />
              </div>
            </div>
          </div>
        </div>

        {/* Node 4: Action Set Component State */}
        <div className="bp-node" style={{ left: 840, top: 60, zIndex: 2 }}>
          <div className="bp-node__header bp-node__header--action">
            <span>SetComponentState</span>
            <span style={{ fontSize: 9, opacity: 0.7 }}>ACTION</span>
          </div>
          <div className="bp-node__body">
            <div className="bp-node__row">
              <div className="bp-pin">
                <span className="bp-pin__dot bp-pin__dot--exec" />
                <span>Exec</span>
              </div>
              <div className="bp-pin">
                <span>Exec</span>
                <span className="bp-pin__dot bp-pin__dot--exec" />
              </div>
            </div>
            <div className="bp-node__row" style={{ marginTop: 6 }}>
              <div className="bp-pin">
                <span className="bp-pin__dot bp-pin__dot--data" />
                <span>PropKey: "user"</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
