"use client";

/**
 * ============================================================================
 * TEXT CONTENT & RICH FORMATTING EDITOR (UNREAL ENGINE 5 STYLE)
 * ============================================================================
 * Element-specific Details sub-panel for Text & Typography elements:
 * - Multiline Content textarea with Live Word / Character count
 * - Rich Text Styling Toggles (Bold, Italic, Underline, Strikethrough, Code)
 * - Text Truncation & Clamp (Max lines, Ellipsis vs Clip, Expand on Hover)
 * - Quick Content Presets (Headline, Paragraph, Badge, Code Snippet)
 * ============================================================================
 */

import React, { useState } from "react";
import {
  Type,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  RotateCcw,
  ChevronRight,
  Sparkles,
  Scissors,
  Eye,
  FileText,
} from "lucide-react";
import { TextSpecificConfig } from "@/core/types/element-sections";

export interface TextContentEditorProps {
  config: TextSpecificConfig;
  onChange: React.Dispatch<React.SetStateAction<TextSpecificConfig>>;
  onReset?: () => void;
}

export const TextContentEditor: React.FC<TextContentEditorProps> = ({
  config,
  onChange,
  onReset,
}) => {
  const [openSubgroups, setOpenSubgroups] = useState({
    content: true,
    formatting: true,
    truncation: true,
  });

  const toggleSubgroup = (key: keyof typeof openSubgroups) => {
    setOpenSubgroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateProp = <K extends keyof TextSpecificConfig>(
    key: K,
    val: TextSpecificConfig[K]
  ) => {
    onChange((prev) => ({ ...prev, [key]: val }));
  };

  // Character and word counts
  const charCount = config.content ? config.content.length : 0;
  const wordCount = config.content
    ? config.content.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="element-specific-editor text-content-editor">
      {/* ====================================================================

      {/* ====================================================================
       * SUBGROUP 1: MULTILINE CONTENT & STATS
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("content")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.content ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <FileText size={13} className="appearance-subgroup__icon text-purple-400" />
          <span className="appearance-subgroup__title">Source String</span>
          <span className="element-badge-pill">{charCount} Chars</span>
        </button>

        {openSubgroups.content && (
          <div className="appearance-subgroup__content">
            <div className="detail-form-group">
              <div className="flex justify-between items-center mb-1">
                <label className="detail-label !mb-0">Content String</label>
                <div className="text-[10px] text-gray-400">
                  <span>{wordCount} words</span>
                  <span className="mx-1">•</span>
                  <span>{charCount} characters</span>
                </div>
              </div>
              <textarea
                className="detail-input-textarea font-sans text-xs min-h-[90px]"
                placeholder="Enter display text..."
                value={config.content}
                onChange={(e) => updateProp("content", e.target.value)}
              />
            </div>

            {/* Quick Presets */}
            <div className="detail-preset-chips">
              <button
                type="button"
                className="detail-chip-btn"
                onClick={() =>
                  updateProp(
                    "content",
                    "Next-Generation Visual Web Application Engine"
                  )
                }
              >
                Hero Heading
              </button>
              <button
                type="button"
                className="detail-chip-btn"
                onClick={() =>
                  updateProp(
                    "content",
                    "Empowering designers and engineers to construct full-stack reactive cloud software with node-based logic and real-time visual detailing."
                  )
                }
              >
                Paragraph
              </button>
              <button
                type="button"
                className="detail-chip-btn"
                onClick={() => updateProp("content", "v2.6.0 STABLE")}
              >
                Badge Tag
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUBGROUP 2: RICH TEXT FORMATTING
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("formatting")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.formatting ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Type size={13} className="appearance-subgroup__icon text-pink-400" />
          <span className="appearance-subgroup__title">Rich Text Styling</span>
        </button>

        {openSubgroups.formatting && (
          <div className="appearance-subgroup__content">
            <div className="detail-row-toggle">
              <div className="detail-row-toggle__info">
                <span className="detail-row-toggle__label">Rich Text Parser</span>
                <span className="detail-row-toggle__desc">Enable inline markdown formatting</span>
              </div>
              <input
                type="checkbox"
                className="detail-checkbox"
                checked={config.isRichText}
                onChange={(e) => updateProp("isRichText", e.target.checked)}
              />
            </div>

            {/* Formatting Toolbar */}
            <div className="text-formatting-toolbar">
              <button
                type="button"
                className={`format-toolbar-btn ${config.formatBold ? "format-toolbar-btn--active" : ""}`}
                onClick={() => updateProp("formatBold", !config.formatBold)}
                title="Bold (Cmd+B)"
              >
                <Bold size={13} />
              </button>
              <button
                type="button"
                className={`format-toolbar-btn ${config.formatItalic ? "format-toolbar-btn--active" : ""}`}
                onClick={() => updateProp("formatItalic", !config.formatItalic)}
                title="Italic (Cmd+I)"
              >
                <Italic size={13} />
              </button>
              <button
                type="button"
                className={`format-toolbar-btn ${config.formatUnderline ? "format-toolbar-btn--active" : ""}`}
                onClick={() => updateProp("formatUnderline", !config.formatUnderline)}
                title="Underline (Cmd+U)"
              >
                <Underline size={13} />
              </button>
              <button
                type="button"
                className={`format-toolbar-btn ${config.formatStrike ? "format-toolbar-btn--active" : ""}`}
                onClick={() => updateProp("formatStrike", !config.formatStrike)}
                title="Strikethrough"
              >
                <Strikethrough size={13} />
              </button>
              <button
                type="button"
                className={`format-toolbar-btn ${config.formatCode ? "format-toolbar-btn--active" : ""}`}
                onClick={() => updateProp("formatCode", !config.formatCode)}
                title="Inline Code Monospace"
              >
                <Code size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUBGROUP 3: TRUNCATION & CLAMPING
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("truncation")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.truncation ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Scissors size={13} className="appearance-subgroup__icon text-amber-400" />
          <span className="appearance-subgroup__title">Line Clamping & Truncation</span>
        </button>

        {openSubgroups.truncation && (
          <div className="appearance-subgroup__content">
            <div className="detail-grid-2col">
              <div className="detail-form-group">
                <label className="detail-label">Max Lines Clamp</label>
                <select
                  className="detail-select"
                  value={config.maxLines === "none" ? "none" : String(config.maxLines)}
                  onChange={(e) =>
                    updateProp(
                      "maxLines",
                      e.target.value === "none" ? "none" : Number(e.target.value)
                    )
                  }
                >
                  <option value="none">No Limit (All lines)</option>
                  <option value="1">1 Line (Single-line)</option>
                  <option value="2">2 Lines</option>
                  <option value="3">3 Lines</option>
                  <option value="4">4 Lines</option>
                  <option value="5">5 Lines</option>
                </select>
              </div>

              <div className="detail-form-group">
                <label className="detail-label">Overflow Style</label>
                <select
                  className="detail-select"
                  value={config.textOverflow}
                  onChange={(e) =>
                    updateProp(
                      "textOverflow",
                      e.target.value as TextSpecificConfig["textOverflow"]
                    )
                  }
                >
                  <option value="ellipsis">Ellipsis (...)</option>
                  <option value="clip">Hard Clip</option>
                </select>
              </div>
            </div>

            <div className="detail-row-toggle">
              <div className="detail-row-toggle__info">
                <span className="detail-row-toggle__label">Expand on Hover</span>
                <span className="detail-row-toggle__desc">
                  Temporarily reveals full clamped text when cursor hovers
                </span>
              </div>
              <input
                type="checkbox"
                className="detail-checkbox"
                checked={config.expandOnHover}
                onChange={(e) => updateProp("expandOnHover", e.target.checked)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
