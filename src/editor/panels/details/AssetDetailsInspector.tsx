"use client";

/**
 * ============================================================================
 * ASSET DETAILS INSPECTOR (UNREAL ENGINE STYLE)
 * ============================================================================
 * UI Element: Context-Aware Details Inspector for Opened Assets & Files
 * Screen / Scope: Right Dock Zone when FullPageDock is active (`/editor`)
 * Role: Replaces the scene actor details panel with the specific file/asset
 *       properties (e.g. Blueprint Class Defaults, Sequencer Settings,
 *       Component Props & Metadata, Database Table Schema, Console Filters)
 *       exactly like Unreal Engine's Asset Editor details view.
 * Styling Source: `@/editor/styles/panels.css` & `@/editor/styles/forms.css`
 * ============================================================================
 */

import React, { useState } from "react";
import {
  ChevronRight,
  Sparkles,
  Cpu,
  Film,
  Terminal,
  FileCode2,
  Database,
  ImageIcon,
  Box,
  Sliders,
  Settings,
  ShieldCheck,
  Tag,
  Code2,
  Layers,
  Key,
  Eye,
  Check,
  RotateCw,
  Hash,
  Clock,
  Filter,
} from "lucide-react";

export interface AssetDetailsInspectorProps {
  panelId: string;
  panelTitle: string;
}

export const AssetDetailsInspector: React.FC<AssetDetailsInspectorProps> = ({
  panelId,
  panelTitle,
}) => {
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({
    summary: true,
    classSettings: true,
    variables: true,
    props: true,
    sequence: true,
    console: true,
    schema: true,
    dependencies: false,
  });

  const toggleSection = (key: string) => {
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Determine asset type
  const isBlueprint = panelId === "blueprint" || panelId.includes("bp_") || panelTitle.endsWith(".graph");
  const isSequencer = panelId === "sequencer" || panelTitle.toLowerCase().includes("sequencer");
  const isConsole = panelId === "console" || panelTitle.toLowerCase().includes("output log");
  const isDatabase = panelId.includes("db") || panelTitle.endsWith(".db");
  const isImage = panelId.includes("logo") || panelId.includes("banner") || panelTitle.endsWith(".svg") || panelTitle.endsWith(".webp");
  const isComponent = !isBlueprint && !isSequencer && !isConsole && !isDatabase && !isImage;

  // Editable prop states for components
  const [componentHeadline, setComponentHeadline] = useState("Next-Generation Web Applications");
  const [componentVariant, setComponentVariant] = useState("primary");
  const [componentAnimation, setComponentAnimation] = useState(true);

  // Sequencer settings state
  const [frameRate, setFrameRate] = useState("60 fps");
  const [playbackStart, setPlaybackStart] = useState("0");
  const [playbackEnd, setPlaybackEnd] = useState("300");
  const [loopMode, setLoopMode] = useState("loop");

  // Console settings state
  const [engineLogVerbosity, setEngineLogVerbosity] = useState("Verbose");
  const [scriptLogVerbosity, setScriptLogVerbosity] = useState("Log");
  const [autoScroll, setAutoScroll] = useState(true);

  return (
    <div className="panel-shell" role="region" aria-label={`Asset Details: ${panelTitle}`}>
      {/* UE-Style Panel Header */}
      <div className="panel-header">
        <div className="panel-header__title">
          {isBlueprint ? (
            <Cpu size={14} style={{ color: "var(--accent-warning)" }} />
          ) : isSequencer ? (
            <Film size={14} style={{ color: "var(--accent-purple)" }} />
          ) : isConsole ? (
            <Terminal size={14} style={{ color: "var(--accent-primary)" }} />
          ) : isDatabase ? (
            <Database size={14} style={{ color: "#059669" }} />
          ) : isImage ? (
            <ImageIcon size={14} style={{ color: "var(--accent-info)" }} />
          ) : (
            <Box size={14} style={{ color: "var(--accent-primary)" }} />
          )}
          <span>Details: {panelTitle}</span>
        </div>
        <span className="panel-header__badge">
          {isBlueprint
            ? "Blueprint Asset"
            : isSequencer
            ? "Sequencer Asset"
            : isConsole
            ? "Console Config"
            : isDatabase
            ? "Table Schema"
            : isImage
            ? "Static Media"
            : "React Component"}
        </span>
      </div>

      <div className="panel-scroll-content">
        {/* ====================================================================
         * SECTION 1: ASSET SUMMARY & METADATA
         * ==================================================================== */}
        <div className="details-section">
          <button
            type="button"
            className="details-section__header"
            onClick={() => toggleSection("summary")}
          >
            <ChevronRight
              size={12}
              className={`details-section__chevron ${
                sectionsOpen.summary ? "details-section__chevron--open" : ""
              }`}
            />
            <span className="details-section__title">Asset Specification</span>
          </button>

          {sectionsOpen.summary && (
            <div className="details-section__body">
              <div className="form-group-row">
                <span className="form-label">Asset Name</span>
                <span className="form-static-val" style={{ fontWeight: 600 }}>
                  {panelTitle}
                </span>
              </div>
              <div className="form-group-row">
                <span className="form-label">Identifier</span>
                <span className="form-static-val"><code>{panelId}</code></span>
              </div>
              <div className="form-group-row">
                <span className="form-label">Runtime Engine</span>
                <span className="form-static-val" style={{ color: "var(--accent-success)" }}>
                  AST v2.0 • Active
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ====================================================================
         * BLUEPRINT ASSET DETAILS (Unreal Class Defaults & Variables)
         * ==================================================================== */}
        {isBlueprint && (
          <>
            <div className="details-section">
              <button
                type="button"
                className="details-section__header"
                onClick={() => toggleSection("classSettings")}
              >
                <ChevronRight
                  size={12}
                  className={`details-section__chevron ${
                    sectionsOpen.classSettings ? "details-section__chevron--open" : ""
                  }`}
                />
                <span className="details-section__title">Class Settings</span>
              </button>

              {sectionsOpen.classSettings && (
                <div className="details-section__body">
                  <div className="form-group">
                    <label className="form-label">Parent Class</label>
                    <select className="form-select" defaultValue="ActorComponent">
                      <option value="ActorComponent">WebComponent (Default)</option>
                      <option value="Controller">EventController</option>
                      <option value="StateGraph">WASM StateMachine</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Execution Domain</label>
                    <select className="form-select" defaultValue="client-wasm">
                      <option value="client-wasm">Client WebAssembly (High FPS)</option>
                      <option value="serverless-edge">Edge Serverless API</option>
                      <option value="hybrid">Hybrid Reactive Store</option>
                    </select>
                  </div>

                  <div className="form-group-row">
                    <span className="form-label">Auto Activate</span>
                    <input type="checkbox" defaultChecked className="form-checkbox" />
                  </div>
                </div>
              )}
            </div>

            <div className="details-section">
              <button
                type="button"
                className="details-section__header"
                onClick={() => toggleSection("variables")}
              >
                <ChevronRight
                  size={12}
                  className={`details-section__chevron ${
                    sectionsOpen.variables ? "details-section__chevron--open" : ""
                  }`}
                />
                <span className="details-section__title">Graph Variables (4)</span>
              </button>

              {sectionsOpen.variables && (
                <div className="details-section__body">
                  <div className="ue-variable-row">
                    <span className="ue-variable-type ue-variable-type--bool">Boolean</span>
                    <span className="ue-variable-name">isLoaded</span>
                    <span className="ue-variable-val">true</span>
                  </div>
                  <div className="ue-variable-row">
                    <span className="ue-variable-type ue-variable-type--string">String</span>
                    <span className="ue-variable-name">apiEndpoint</span>
                    <span className="ue-variable-val">"/api/v1/auth"</span>
                  </div>
                  <div className="ue-variable-row">
                    <span className="ue-variable-type ue-variable-type--int">Integer</span>
                    <span className="ue-variable-name">retryCount</span>
                    <span className="ue-variable-val">3</span>
                  </div>
                  <div className="ue-variable-row">
                    <span className="ue-variable-type ue-variable-type--struct">Struct</span>
                    <span className="ue-variable-name">userProfile</span>
                    <span className="ue-variable-val">{"{ id, role }"}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ====================================================================
         * SEQUENCER ASSET DETAILS (Timeline Frame Rate, Bounds, Loops)
         * ==================================================================== */}
        {isSequencer && (
          <div className="details-section">
            <button
              type="button"
              className="details-section__header"
              onClick={() => toggleSection("sequence")}
            >
              <ChevronRight
                size={12}
                className={`details-section__chevron ${
                  sectionsOpen.sequence ? "details-section__chevron--open" : ""
                }`}
              />
              <span className="details-section__title">Sequence Configuration</span>
            </button>

            {sectionsOpen.sequence && (
              <div className="details-section__body">
                <div className="form-group">
                  <label className="form-label">Display Rate</label>
                  <select
                    className="form-select"
                    value={frameRate}
                    onChange={(e) => setFrameRate(e.target.value)}
                  >
                    <option value="60 fps">60 FPS (Standard Web)</option>
                    <option value="120 fps">120 FPS (High Refresh / Wasm)</option>
                    <option value="30 fps">30 FPS (Cinematic)</option>
                  </select>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Start Frame</label>
                    <input
                      type="number"
                      className="form-input"
                      value={playbackStart}
                      onChange={(e) => setPlaybackStart(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Frame</label>
                    <input
                      type="number"
                      className="form-input"
                      value={playbackEnd}
                      onChange={(e) => setPlaybackEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Loop Mode</label>
                  <select
                    className="form-select"
                    value={loopMode}
                    onChange={(e) => setLoopMode(e.target.value)}
                  >
                    <option value="loop">Continuous Loop</option>
                    <option value="once">Play Once</option>
                    <option value="ping-pong">Ping-Pong (Forward-Reverse)</option>
                  </select>
                </div>

                <div className="form-group-row">
                  <span className="form-label">Auto-Keyframing</span>
                  <input type="checkbox" defaultChecked className="form-checkbox" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
         * OUTPUT LOG CONSOLE DETAILS (Filters, Stream, Buffer)
         * ==================================================================== */}
        {isConsole && (
          <div className="details-section">
            <button
              type="button"
              className="details-section__header"
              onClick={() => toggleSection("console")}
            >
              <ChevronRight
                size={12}
                className={`details-section__chevron ${
                  sectionsOpen.console ? "details-section__chevron--open" : ""
                }`}
              />
              <span className="details-section__title">Console Stream Filters</span>
            </button>

            {sectionsOpen.console && (
              <div className="details-section__body">
                <div className="form-group">
                  <label className="form-label">Engine Verbosity</label>
                  <select
                    className="form-select"
                    value={engineLogVerbosity}
                    onChange={(e) => setEngineLogVerbosity(e.target.value)}
                  >
                    <option value="Verbose">Verbose (All Trace Events)</option>
                    <option value="Log">Log (Standard)</option>
                    <option value="Warning">Warning & Error Only</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Script Verbosity</label>
                  <select
                    className="form-select"
                    value={scriptLogVerbosity}
                    onChange={(e) => setScriptLogVerbosity(e.target.value)}
                  >
                    <option value="Log">Standard Log</option>
                    <option value="Warning">Warnings Only</option>
                  </select>
                </div>

                <div className="form-group-row">
                  <span className="form-label">Auto-Scroll to Bottom</span>
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="form-checkbox"
                  />
                </div>

                <div className="form-group-row">
                  <span className="form-label">Max Buffer Lines</span>
                  <span className="form-static-val">10,000 Lines</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
         * UI COMPONENT PROPS INSPECTOR (Button.tsx, HeroSection.tsx, etc.)
         * ==================================================================== */}
        {isComponent && (
          <div className="details-section">
            <button
              type="button"
              className="details-section__header"
              onClick={() => toggleSection("props")}
            >
              <ChevronRight
                size={12}
                className={`details-section__chevron ${
                  sectionsOpen.props ? "details-section__chevron--open" : ""
                }`}
              />
              <span className="details-section__title">Component Props (TypeScript)</span>
            </button>

            {sectionsOpen.props && (
              <div className="details-section__body">
                <div className="form-group">
                  <label className="form-label">headline (string)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={componentHeadline}
                    onChange={(e) => setComponentHeadline(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">variant ("primary" | "secondary")</label>
                  <select
                    className="form-select"
                    value={componentVariant}
                    onChange={(e) => setComponentVariant(e.target.value)}
                  >
                    <option value="primary">primary (High Priority)</option>
                    <option value="secondary">secondary (Outline)</option>
                    <option value="ghost">ghost (Minimal)</option>
                  </select>
                </div>

                <div className="form-group-row">
                  <span className="form-label">hasAnimation (boolean)</span>
                  <input
                    type="checkbox"
                    checked={componentAnimation}
                    onChange={(e) => setComponentAnimation(e.target.checked)}
                    className="form-checkbox"
                  />
                </div>

                <div className="form-group-row">
                  <span className="form-label">CSS Module Isolation</span>
                  <span className="form-static-val" style={{ color: "var(--accent-primary)" }}>
                    Scoped (.module.css)
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
         * DATABASE TABLE SCHEMA DETAILS
         * ==================================================================== */}
        {isDatabase && (
          <div className="details-section">
            <button
              type="button"
              className="details-section__header"
              onClick={() => toggleSection("schema")}
            >
              <ChevronRight
                size={12}
                className={`details-section__chevron ${
                  sectionsOpen.schema ? "details-section__chevron--open" : ""
                }`}
              />
              <span className="details-section__title">Table Columns & Indexes</span>
            </button>

            {sectionsOpen.schema && (
              <div className="details-section__body">
                <div className="ue-variable-row">
                  <span className="ue-variable-type ue-variable-type--struct">PK</span>
                  <span className="ue-variable-name">id</span>
                  <span className="ue-variable-val">UUIDv4</span>
                </div>
                <div className="ue-variable-row">
                  <span className="ue-variable-type ue-variable-type--string">TEXT</span>
                  <span className="ue-variable-name">email</span>
                  <span className="ue-variable-val">UNIQUE NOT NULL</span>
                </div>
                <div className="ue-variable-row">
                  <span className="ue-variable-type ue-variable-type--string">TEXT</span>
                  <span className="ue-variable-name">display_name</span>
                  <span className="ue-variable-val">NOT NULL</span>
                </div>
                <div className="ue-variable-row">
                  <span className="ue-variable-type ue-variable-type--int">ENUM</span>
                  <span className="ue-variable-name">role</span>
                  <span className="ue-variable-val">'admin'|'viewer'</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
         * IMAGE / SVG DETAILS
         * ==================================================================== */}
        {isImage && (
          <div className="details-section">
            <button
              type="button"
              className="details-section__header"
              onClick={() => toggleSection("summary")}
            >
              <ChevronRight
                size={12}
                className={`details-section__chevron ${
                  sectionsOpen.summary ? "details-section__chevron--open" : ""
                }`}
              />
              <span className="details-section__title">Vector Geometry</span>
            </button>

            {sectionsOpen.summary && (
              <div className="details-section__body">
                <div className="form-group-row">
                  <span className="form-label">ViewBox Dimensions</span>
                  <span className="form-static-val">0 0 100 100</span>
                </div>
                <div className="form-group-row">
                  <span className="form-label">Color Space</span>
                  <span className="form-static-val">sRGB (Tailwind / Tokens)</span>
                </div>
                <div className="form-group-row">
                  <span className="form-label">SVG Optimization</span>
                  <span className="form-static-val" style={{ color: "var(--accent-success)" }}>
                    SVGO Optimized (84% saved)
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
