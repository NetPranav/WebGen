"use client";

/**
 * ============================================================================
 * PROJECT SETTINGS PANEL
 * ============================================================================
 * UI Element: Project Settings (Unreal Equivalent: Project Settings)
 * Screen / Scope: Screen 09: Project Settings (`/editor`)
 * Role: Global project configuration, framework compiler targets, and secrets.
 * Styling Source: `@/editor/styles/panels.css` & `@/editor/styles/forms.css`
 * Matches: PANELS.md (Panel 09) & UI.md §4.5
 * ============================================================================
 */

import React, { useState } from "react";
import {
  Settings,
  Cpu,
  Palette,
  KeyRound,
  Check,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";
import "@/editor/styles/panels.css";
import "@/editor/styles/forms.css";

export const ProjectSettings: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<"general" | "build" | "theme" | "env">("general");

  // General settings state
  const [appName, setAppName] = useState("MyProject.uweb");
  const [appId, setAppId] = useState("proj_8f92ab41");
  const [appVersion, setAppVersion] = useState("1.0.0-alpha");
  const [baseUrl, setBaseUrl] = useState("https://myproject.local");
  const [appDesc, setAppDesc] = useState("Professional Web Application built with Visual Web Application Engine");

  // Build settings
  const [targetFramework, setTargetFramework] = useState("nextjs15");
  const [turbopackEnabled, setTurbopackEnabled] = useState(true);
  const [wasmOptimization, setWasmOptimization] = useState("aggressive");

  // Theme settings
  const [primaryBrand, setPrimaryBrand] = useState("#206859");
  const [defaultRadius, setDefaultRadius] = useState(8);
  const [defaultFont, setDefaultFont] = useState("Inter");

  // Secrets
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="settings-shell" role="region" aria-label="Project Settings">
      {/* Settings Navigation Sidebar */}
      <div className="settings-sidebar">
        <span className="menu-header-label" style={{ padding: "4px 8px" }}>Configuration</span>

        <button
          type="button"
          className={`settings-nav-item ${activeCategory === "general" ? "settings-nav-item--active" : ""}`}
          onClick={() => setActiveCategory("general")}
        >
          <Settings size={13} />
          <span>General</span>
        </button>

        <button
          type="button"
          className={`settings-nav-item ${activeCategory === "build" ? "settings-nav-item--active" : ""}`}
          onClick={() => setActiveCategory("build")}
        >
          <Cpu size={13} />
          <span>Build & Target</span>
        </button>

        <button
          type="button"
          className={`settings-nav-item ${activeCategory === "theme" ? "settings-nav-item--active" : ""}`}
          onClick={() => setActiveCategory("theme")}
        >
          <Palette size={13} />
          <span>Design Tokens</span>
        </button>

        <button
          type="button"
          className={`settings-nav-item ${activeCategory === "env" ? "settings-nav-item--active" : ""}`}
          onClick={() => setActiveCategory("env")}
        >
          <KeyRound size={13} />
          <span>Environment Keys</span>
        </button>
      </div>

      {/* Main Settings Body */}
      <div className="settings-main">
        {/* ====================================================================
         * CATEGORY 1: GENERAL
         * ==================================================================== */}
        {activeCategory === "general" && (
          <div>
            <h2 className="settings-title">General Application Settings</h2>
            <p className="settings-desc">
              Fundamental project identifiers, title metadata, and target environment descriptors.
            </p>

            <div className="form-group">
              <label className="form-label">Application Project Name</label>
              <input
                type="text"
                className="form-input"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
              />
            </div>

            <div className="form-row--2col">
              <div className="form-group">
                <label className="form-label">Project ID</label>
                <input type="text" className="form-input" value={appId} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Engine Version Target</label>
                <input
                  type="text"
                  className="form-input"
                  value={appVersion}
                  onChange={(e) => setAppVersion(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Base Canonical URL</label>
              <input
                type="text"
                className="form-input"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Meta Description</label>
              <textarea
                className="form-input"
                style={{ height: 64, padding: "6px 8px", resize: "none" }}
                value={appDesc}
                onChange={(e) => setAppDesc(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ====================================================================
         * CATEGORY 2: BUILD & FRAMEWORK
         * ==================================================================== */}
        {activeCategory === "build" && (
          <div>
            <h2 className="settings-title">Build & Framework Compiler</h2>
            <p className="settings-desc">
              AST code generator configuration and target Next.js / WebAssembly compilation settings.
            </p>

            <div className="form-group">
              <label className="form-label">Target Framework Output</label>
              <select
                className="form-select"
                value={targetFramework}
                onChange={(e) => setTargetFramework(e.target.value)}
              >
                <option value="nextjs15">Next.js 15 (App Router + React 19)</option>
                <option value="vite_react">Vite + Standalone React 19 SPA</option>
                <option value="static_html">Static Clean HTML5 / Vanilla CSS</option>
              </select>
            </div>

            <div className="form-group">
              <div className="form-toggle-wrapper">
                <div>
                  <span className="form-label">Turbopack Incremental Bundler</span>
                  <span className="form-label__hint">Enables fast AST hot module updates</span>
                </div>
                <div
                  className={`form-toggle ${turbopackEnabled ? "form-toggle--active" : ""}`}
                  onClick={() => setTurbopackEnabled(!turbopackEnabled)}
                >
                  <div className="form-toggle__thumb" />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">C++ WebAssembly Optimization Level</label>
              <select
                className="form-select"
                value={wasmOptimization}
                onChange={(e) => setWasmOptimization(e.target.value)}
              >
                <option value="aggressive">Aggressive -O3 (Optimal 120 FPS Wire Simulation)</option>
                <option value="balanced">Balanced -O2 (Standard Compilation)</option>
                <option value="debug">Debug -O0 (Full Symbol Inspection)</option>
              </select>
            </div>
          </div>
        )}

        {/* ====================================================================
         * CATEGORY 3: THEME & DESIGN TOKENS
         * ==================================================================== */}
        {activeCategory === "theme" && (
          <div>
            <h2 className="settings-title">Theme & Design System Tokens</h2>
            <p className="settings-desc">
              Global variables referenced across all UI components and layout frames.
            </p>

            <div className="form-group">
              <label className="form-label">Primary Brand Accent</label>
              <div className="form-row">
                <div className="form-color-picker">
                  <div
                    className="form-color-picker__swatch"
                    style={{ backgroundColor: primaryBrand }}
                  />
                  <span className="form-color-picker__label">{primaryBrand}</span>
                </div>
                <input
                  type="text"
                  className="form-input"
                  value={primaryBrand}
                  onChange={(e) => setPrimaryBrand(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Default Corner Radius</label>
              <div className="form-number-scrub">
                <span className="form-number-scrub__badge form-number-scrub__badge--neutral">R</span>
                <input
                  type="number"
                  className="form-number-scrub__input"
                  value={defaultRadius}
                  onChange={(e) => setDefaultRadius(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Default Typography Font</label>
              <select
                className="form-select"
                value={defaultFont}
                onChange={(e) => setDefaultFont(e.target.value)}
              >
                <option value="Inter">Inter (Clean Modern Sans)</option>
                <option value="Roboto">Roboto</option>
                <option value="JetBrains Mono">JetBrains Mono</option>
                <option value="Outfit">Outfit</option>
              </select>
            </div>
          </div>
        )}

        {/* ====================================================================
         * CATEGORY 4: ENVIRONMENT SECRETS
         * ==================================================================== */}
        {activeCategory === "env" && (
          <div>
            <h2 className="settings-title">Environment Variables & Secrets</h2>
            <p className="settings-desc">
              Encrypted environment values automatically injected during Play Sandbox simulation.
            </p>

            <div className="form-group">
              <label className="form-label">NEXT_PUBLIC_API_URL</label>
              <input
                type="text"
                className="form-input"
                defaultValue="https://api.myproject.local/v1"
              />
            </div>

            <div className="form-group">
              <div className="form-label">
                <span>DATABASE_URL</span>
                <button
                  type="button"
                  className="panel-icon-btn"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff size={11} /> : <Eye size={11} />}
                </button>
              </div>
              <input
                type={showKey ? "text" : "password"}
                className="form-input"
                defaultValue="postgresql://postgres:secret_pass@localhost:5432/myproject"
              />
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div style={{ marginTop: "var(--space-2xl)", display: "flex", gap: "var(--space-sm)" }}>
          <button
            type="button"
            className="cb-pill cb-pill--active"
            style={{ height: 30, padding: "0 16px" }}
            onClick={handleSave}
          >
            {savedSuccess ? (
              <>
                <Check size={12} />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <span>Save Project Settings</span>
            )}
          </button>

          <button
            type="button"
            className="cb-pill"
            style={{ height: 30, padding: "0 14px" }}
          >
            <RotateCcw size={11} />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>
    </div>
  );
};
