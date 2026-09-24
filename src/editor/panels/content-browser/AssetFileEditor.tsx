"use client";

/**
 * ============================================================================
 * ASSET FILE EDITOR COMPONENT (UNREAL ENGINE STYLE)
 * ============================================================================
 * UI Element: Unreal Engine-Style Asset / File Editor Canvas
 * Screen / Scope: Full-Page Dock Stage for Opened Files (`/editor`)
 * Role: Renders an isolated asset workspace with interactive element state testing
 *       (Default, Hover, Active, Disabled, Loading), responsive boundary sizing,
 *       direct switching between Viewport, Event Graph (Blueprint), and Source Code.
 * Styling Source: `@/editor/styles/panels.css` & `@/editor/styles/dock.css`
 * ============================================================================
 */

import React, { useState } from "react";
import {
  Code2,
  Eye,
  Layers,
  Sparkles,
  RotateCw,
  Copy,
  Check,
  ImageIcon,
  Box,
  Table,
  Workflow,
  ZoomIn,
  ZoomOut,
  Monitor,
  Tablet,
  Smartphone,
  Loader2,
} from "lucide-react";

export interface AssetFileEditorProps {
  assetId: string;
  assetTitle: string;
  isDirty?: boolean;
  onSave?: () => void;
  onSwitchToBlueprint?: () => void;
}

// Sample mock code sources for components
const MOCK_CODES: Record<string, string> = {
  ast_btn: `import React from "react";
import styles from "./Button.module.css";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  children,
  ...props
}) => {
  return (
    <button
      className={\`btn btn--\${variant} btn--\${size}\`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <span className="spinner" /> : children}
    </button>
  );
};`,

  ast_hero: `import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";

export interface HeroSectionProps {
  headline?: string;
  subhead?: string;
  ctaText?: string;
  onCtaClick?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  headline = "Next-Generation Web Applications",
  subhead = "Engineered with Unreal Engine precision and reactive AST compiling.",
  ctaText = "Get Started",
  onCtaClick,
}) => {
  return (
    <section className="hero-container">
      <div className="hero-badge">
        <Sparkles size={13} />
        <span>v2.0 Engine Release</span>
      </div>
      <h1 className="hero-headline">{headline}</h1>
      <p className="hero-subhead">{subhead}</p>
      <div className="hero-actions">
        <button className="hero-cta-btn" onClick={onCtaClick}>
          <span>{ctaText}</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
};`,

  ast_navbar: `import React from "react";
import { Layers } from "lucide-react";

export interface NavbarProps {
  projectName?: string;
  onNavigate?: (route: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  projectName = "Web Engine Studio",
  onNavigate,
}) => {
  return (
    <header className="navbar-header">
      <div className="navbar-logo">
        <Layers size={18} />
        <span className="navbar-title">{projectName}</span>
      </div>
      <nav className="navbar-links">
        <a href="#features">Features</a>
        <a href="#docs">Documentation</a>
        <a href="#pricing">Pricing</a>
      </nav>
      <div className="navbar-actions">
        <button className="navbar-btn">Dashboard</button>
      </div>
    </header>
  );
};`,
};

type ElementState = "default" | "hover" | "active" | "disabled" | "loading";
type DevicePreview = "desktop" | "tablet" | "mobile";

export const AssetFileEditor: React.FC<AssetFileEditorProps> = ({
  assetId,
  assetTitle,
  isDirty = false,
  onSave,
  onSwitchToBlueprint,
}) => {
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "schema">("preview");
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(100);

  // Element state simulation (Unreal Widget preview)
  const [elementState, setElementState] = useState<ElementState>("default");
  // Responsive boundary preview
  const [devicePreview, setDevicePreview] = useState<DevicePreview>("desktop");

  const isImage = assetTitle.endsWith(".svg") || assetTitle.endsWith(".webp") || assetTitle.endsWith(".png");

  // Database is strictly disallowed in studio: block render if encountered
  if (assetId.includes("db") || assetTitle.endsWith(".db") || assetTitle.toLowerCase().includes("database")) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
        Asset preview not supported in studio.
      </div>
    );
  }

  const codeSource =
    MOCK_CODES[assetId] ||
    `// ${assetTitle}\n// Component asset registered in WebAPPBuilder AST\nexport default function Asset() {\n  return <div>${assetTitle}</div>;\n}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeSource);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const getDeviceWidth = () => {
    if (devicePreview === "mobile") return 375;
    if (devicePreview === "tablet") return 768;
    return "100%";
  };

  return (
    <div className="asset-file-editor" role="region" aria-label={`Asset Editor: ${assetTitle}`}>
      {/* Top Asset Sub-Toolbar */}
      <div className="asset-file-editor__toolbar">
        <div className="asset-file-editor__modes">
          <button
            type="button"
            className={`asset-file-editor__mode-btn ${activeTab === "preview" ? "asset-file-editor__mode-btn--active" : ""}`}
            onClick={() => setActiveTab("preview")}
          >
            <Eye size={13} />
            <span>Interactive Viewport</span>
          </button>

          {/* Direct link to Event Graph (Logic Blueprint) */}
          {onSwitchToBlueprint && (
            <button
              type="button"
              className="asset-file-editor__mode-btn"
              onClick={onSwitchToBlueprint}
              title="Open Logic Blueprint Event Graph"
            >
              <Workflow size={13} style={{ color: "var(--accent-primary)" }} />
              <span>Event Graph</span>
            </button>
          )}

          <button
            type="button"
            className={`asset-file-editor__mode-btn ${activeTab === "code" ? "asset-file-editor__mode-btn--active" : ""}`}
            onClick={() => setActiveTab("code")}
          >
            <Code2 size={13} />
            <span>Source Code (TSX)</span>
          </button>
        </div>

        <div className="asset-file-editor__actions">
          <div className="asset-file-editor__zoom-ctrl">
            <button
              type="button"
              className="panel-icon-btn"
              onClick={() => setZoom((z) => Math.max(z - 10, 50))}
              title="Zoom Out"
            >
              <ZoomOut size={12} />
            </button>
            <span className="asset-file-editor__zoom-val">{zoom}%</span>
            <button
              type="button"
              className="panel-icon-btn"
              onClick={() => setZoom((z) => Math.min(z + 10, 200))}
              title="Zoom In"
            >
              <ZoomIn size={12} />
            </button>
          </div>

          <div className="asset-file-editor__divider" />

          <button
            type="button"
            className="asset-file-editor__action-btn"
            onClick={handleCopyCode}
            title="Copy Source Code"
          >
            {copied ? <Check size={12} style={{ color: "var(--accent-success)" }} /> : <Copy size={12} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            type="button"
            className="asset-file-editor__action-btn"
            onClick={onSave}
            title="Recompile Asset AST"
          >
            <RotateCw size={12} />
            <span>Hot Reload</span>
          </button>
        </div>
      </div>

      {/* Quick Interactive State Controls Bar (only for component preview) */}
      {activeTab === "preview" && !isImage && (
        <div className="asset-viewport-header">
          {/* Element State Tester (Default, Hover, Active, Disabled, Loading) */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>
              State Preview:
            </span>
            <div className="asset-state-toggles">
              {(["default", "hover", "active", "disabled", "loading"] as ElementState[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`asset-state-btn ${elementState === st ? "asset-state-btn--active" : ""}`}
                  onClick={() => setElementState(st)}
                >
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Device Boundary Pills (Desktop, Tablet, Mobile) */}
          <div className="asset-device-pills">
            <button
              type="button"
              className={`asset-device-pill ${devicePreview === "desktop" ? "asset-device-pill--active" : ""}`}
              onClick={() => setDevicePreview("desktop")}
              title="Desktop 1440px"
            >
              <Monitor size={11} />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              className={`asset-device-pill ${devicePreview === "tablet" ? "asset-device-pill--active" : ""}`}
              onClick={() => setDevicePreview("tablet")}
              title="Tablet 768px"
            >
              <Tablet size={11} />
              <span>Tablet (768px)</span>
            </button>
            <button
              type="button"
              className={`asset-device-pill ${devicePreview === "mobile" ? "asset-device-pill--active" : ""}`}
              onClick={() => setDevicePreview("mobile")}
              title="Mobile 375px"
            >
              <Smartphone size={11} />
              <span>Mobile (375px)</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Asset Canvas Body */}
      <div className="asset-file-editor__viewport">
        {activeTab === "preview" ? (
          <div
            className="asset-file-editor__canvas-stage confluence-grid"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "center center",
              transition: "transform 0.1s ease-out",
            }}
          >
            {isImage ? (
              <div className="asset-preview-image-card">
                <div className="asset-preview-checkerboard">
                  {assetTitle.endsWith(".svg") ? (
                    <div className="asset-svg-demo">
                      <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
                        <circle cx="50" cy="50" r="45" stroke="var(--accent-primary)" strokeWidth="6" />
                        <polygon points="50,25 75,70 25,70" fill="var(--accent-primary)" opacity="0.85" />
                      </svg>
                    </div>
                  ) : (
                    <div className="asset-webp-demo">
                      <ImageIcon size={64} style={{ color: "var(--accent-info)" }} />
                      <span>{assetTitle} (1440 × 900 @ 2x WebP)</span>
                    </div>
                  )}
                </div>
                <div className="asset-preview-meta">
                  <span>{assetTitle}</span>
                  <span className="asset-badge">SVG / WebP Vector</span>
                </div>
              </div>
            ) : (
              /* Component Visual Preview Card with device frame */
              <div
                className="asset-component-preview-card"
                style={{
                  width: getDeviceWidth(),
                  maxWidth: "100%",
                  transition: "width 0.25s var(--ease-out-expo)",
                }}
              >
                <div className="asset-preview-tag">
                  <Box size={13} />
                  <span>Live Sandbox: {assetTitle}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 10,
                      textTransform: "uppercase",
                      fontWeight: 600,
                      color:
                        elementState === "loading"
                          ? "#facc15"
                          : elementState === "disabled"
                          ? "#f87171"
                          : "var(--accent-primary)",
                    }}
                  >
                    State: {elementState}
                  </span>
                </div>

                <div className={`asset-live-component asset-live-component--${elementState}`}>
                  {assetId === "ast_btn" ? (
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <button
                        className={`preview-btn preview-btn--primary ${
                          elementState === "hover"
                            ? "preview-btn--hover"
                            : elementState === "active"
                            ? "preview-btn--active"
                            : ""
                        }`}
                        disabled={elementState === "disabled" || elementState === "loading"}
                      >
                        {elementState === "loading" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Processing...</span>
                          </div>
                        ) : (
                          <span>Primary Action</span>
                        )}
                      </button>
                      <button
                        className={`preview-btn preview-btn--secondary ${
                          elementState === "hover" ? "preview-btn--hover" : ""
                        }`}
                        disabled={elementState === "disabled"}
                      >
                        Secondary
                      </button>
                      <button className="preview-btn preview-btn--ghost" disabled={elementState === "disabled"}>
                        Ghost
                      </button>
                    </div>
                  ) : assetId === "ast_navbar" ? (
                    <div className="preview-navbar">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Layers size={16} style={{ color: "var(--accent-primary)" }} />
                        <strong>Brand Studio</strong>
                      </div>
                      <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                        <span>Overview</span>
                        <span>Components</span>
                        <span>API Docs</span>
                      </div>
                      <button
                        className="preview-btn preview-btn--primary"
                        style={{ padding: "4px 10px" }}
                        disabled={elementState === "disabled"}
                      >
                        {elementState === "loading" ? "Loading..." : "Login"}
                      </button>
                    </div>
                  ) : (
                    <div className="preview-hero">
                      <div className="preview-hero__badge">
                        <Sparkles size={12} />
                        <span>Interactive Asset Preview</span>
                      </div>
                      <h2 style={{ fontSize: 24, fontWeight: 700, margin: "8px 0" }}>
                        {assetTitle.replace(/\.[^/.]+$/, "")}
                      </h2>
                      <p style={{ color: "var(--text-secondary)", fontSize: 14, maxWidth: 440, textAlign: "center" }}>
                        Visual component rendered directly from the AST runtime engine with real-time prop reflection.
                      </p>
                      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                        <button
                          className={`preview-btn preview-btn--primary ${
                            elementState === "hover" ? "preview-btn--hover" : ""
                          }`}
                          disabled={elementState === "disabled" || elementState === "loading"}
                        >
                          {elementState === "loading" ? "Loading..." : "Primary Action"}
                        </button>
                        <button className="preview-btn preview-btn--secondary" disabled={elementState === "disabled"}>
                          Inspect Props
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Code View Tab */
          <div className="asset-file-editor__code-container">
            <div className="asset-code-header">
              <span className="asset-code-path">src/components/{assetTitle}</span>
              <span className="asset-code-lang">TypeScript JSX</span>
            </div>
            <pre className="asset-code-pre">
              <code>{codeSource}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
