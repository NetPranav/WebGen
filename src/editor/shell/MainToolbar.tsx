"use client";

/**
 * ============================================================================
 * MAIN TOOLBAR COMPONENT
 * ============================================================================
 * UI Element: Engine Main Action Toolbar
 * Screen / Scope: Screen 01: Master IDE Studio Shell (`/editor`)
 * Role: Hosts primary engine action buttons:
 *       - Save, Undo, Redo
 *       - Viewport device size segmented switcher (Desktop 1440px, Tablet 768px, Mobile 375px)
 *       - AI Studio Copilot launcher
 *       - Build Wasm & AST
 *       - Play / Simulation Mode (Unreal-style green runner)
 *       - 1-Click Production Deploy
 * Styling Source: `@/editor/styles/menus.css` (`.main-toolbar`, `.toolbar-btn`)
 * ============================================================================
 */

import React, { useState } from "react";
import "@/editor/styles/menus.css";
import {
  Save,
  Undo2,
  Redo2,
  Hammer,
  Play,
  Square,
  Rocket,
  Sparkles,
  Monitor,
  Tablet,
  Smartphone,
  CheckCircle2,
} from "lucide-react";

interface MainToolbarProps {
  isDirty?: boolean;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onBuild?: () => void;
  onTogglePlay?: (isPlaying: boolean) => void;
  onDeploy?: () => void;
  onOpenAI?: () => void;
  onSelectDeviceMode?: (mode: "desktop" | "tablet" | "mobile") => void;
  currentDeviceMode?: "desktop" | "tablet" | "mobile";
}

export const MainToolbar: React.FC<MainToolbarProps> = ({
  isDirty = false,
  onSave,
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = true,
  onBuild,
  onTogglePlay,
  onDeploy,
  onOpenAI,
  onSelectDeviceMode,
  currentDeviceMode = "desktop",
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">(currentDeviceMode);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildSuccess, setBuildSuccess] = useState(false);

  const handlePlayClick = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (onTogglePlay) onTogglePlay(nextState);
  };

  const handleBuildClick = () => {
    setIsBuilding(true);
    setBuildSuccess(false);
    if (onBuild) onBuild();
    setTimeout(() => {
      setIsBuilding(false);
      setBuildSuccess(true);
      setTimeout(() => setBuildSuccess(false), 2500);
    }, 600);
  };

  const handleDeviceSelect = (mode: "desktop" | "tablet" | "mobile") => {
    setDeviceMode(mode);
    if (onSelectDeviceMode) onSelectDeviceMode(mode);
  };

  return (
    <div className="main-toolbar" role="toolbar" aria-label="Main Engine Actions">
      {/* Left Group: Save & History */}
      <div className="main-toolbar__group">
        <button
          type="button"
          className="toolbar-btn toolbar-btn--primary"
          onClick={onSave}
          title="Save Project (Ctrl+S)"
        >
          <Save size={13} style={{ color: isDirty ? "var(--accent-warning)" : "inherit" }} />
          <span>Save</span>
          {isDirty && <span className="studio-header__project-dirty" />}
        </button>

        <button
          type="button"
          className="toolbar-btn toolbar-btn--icon-only"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={13} />
        </button>

        <button
          type="button"
          className="toolbar-btn toolbar-btn--icon-only"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={13} />
        </button>

        <div className="toolbar-divider" />

        {/* Viewport Device Mode Segmented Selector */}
        <div className="toolbar-segmented" role="radiogroup" aria-label="Device Preview Target">
          <button
            type="button"
            className={`toolbar-segmented__btn ${deviceMode === "desktop" ? "toolbar-segmented__btn--active" : ""}`}
            onClick={() => handleDeviceSelect("desktop")}
            title="Desktop Canvas (1440px)"
          >
            <Monitor size={12} />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            className={`toolbar-segmented__btn ${deviceMode === "tablet" ? "toolbar-segmented__btn--active" : ""}`}
            onClick={() => handleDeviceSelect("tablet")}
            title="Tablet Canvas (768px)"
          >
            <Tablet size={12} />
            <span>Tablet</span>
          </button>
          <button
            type="button"
            className={`toolbar-segmented__btn ${deviceMode === "mobile" ? "toolbar-segmented__btn--active" : ""}`}
            onClick={() => handleDeviceSelect("mobile")}
            title="Mobile Canvas (375px)"
          >
            <Smartphone size={12} />
            <span>Mobile</span>
          </button>
        </div>
      </div>

      {/* Center Group: AI Studio Co-Pilot */}
      <div className="main-toolbar__group">
        <button
          type="button"
          className="toolbar-btn toolbar-btn--ai"
          onClick={onOpenAI}
          title="Open AI Studio: Generate Nodes, Full UI, and Database Schemas"
        >
          <Sparkles size={13} />
          <span>⚡ AI Studio</span>
        </button>
      </div>

      {/* Right Group: Build, Play Mode, Deploy */}
      <div className="main-toolbar__group">
        {/* Build Wasm / AST */}
        <button
          type="button"
          className="toolbar-btn toolbar-btn--primary"
          onClick={handleBuildClick}
          disabled={isBuilding}
          title="Compile Wasm Kernel & Verify AST (Ctrl+B)"
        >
          {buildSuccess ? (
            <CheckCircle2 size={13} style={{ color: "var(--accent-success)" }} />
          ) : (
            <Hammer size={13} />
          )}
          <span>{isBuilding ? "Building..." : buildSuccess ? "Built" : "Build"}</span>
        </button>

        <div className="toolbar-divider" />

        {/* Play / Stop Simulation Mode */}
        <button
          type="button"
          className={`toolbar-btn toolbar-btn--play ${isPlaying ? "toolbar-btn--play--active" : ""}`}
          onClick={handlePlayClick}
          title={isPlaying ? "Stop Live Simulation (Esc)" : "Play Live Application Preview (F5)"}
        >
          {isPlaying ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
          <span>{isPlaying ? "Stop" : "Play"}</span>
        </button>

        {/* 1-Click Production Deploy */}
        <button
          type="button"
          className="toolbar-btn toolbar-btn--deploy"
          onClick={onDeploy}
          title="One-Click Production Deploy to Vercel / Cloudflare"
        >
          <Rocket size={13} />
          <span>Deploy</span>
        </button>
      </div>
    </div>
  );
};
