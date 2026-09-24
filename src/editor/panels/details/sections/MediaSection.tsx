/**
 * ============================================================================
 * MEDIA PROPERTIES & DETAIL INSPECTOR SECTION
 * ============================================================================
 * UI Element: Details Inspector — Media Section
 * Screen / Scope: Screen 03: Properties & Details Inspector (`/editor`)
 * Role: Contextual inspector section for Image archetype elements.
 *       Configures Source, Object Fit, Focal Point, Filters, Clip-Path, and Overlay.
 * Styling Source: "@/editor/styles/panels.css" & "@/editor/styles/forms.css"
 * Matches: PANELS.md (Panel 03: Media Section) & CONVENTIONS.md §4.3
 * ============================================================================
 */

import React, { useState } from "react";
import {
  Image as ImageIcon,
  ChevronRight,
  Crop,
  Sliders,
  Sparkles,
  Layers,
  Crosshair,
  Maximize2,
} from "lucide-react";
import { useProjectStore } from "@/core/store/useProjectStore";

export interface MediaSectionProps {
  elementId: string;
  elementName: string;
}

// TODO(MDM-P2): typed view over the untyped `ProjectElement.properties` bag;
// MDM v2 gives each archetype a real props schema.
interface MediaProps {
  src?: string;
  fallbackSrc?: string;
  alt?: string;
  objectFit?: string;
  aspectRatio?: string;
  focalPoint?: { x: number; y: number };
  filter?: { grayscale: number; blur: number; brightness: number; contrast: number; saturate: number };
  overlay?: { color: string; opacity: number; blendMode: string };
  clipPath?: string;
}

export const MediaSection: React.FC<MediaSectionProps> = ({
  elementId,
  elementName,
}) => {
  const { elements, setElementProperty } = useProjectStore();
  const currentElement = elements[elementId];
  const props = (currentElement?.properties || {}) as MediaProps;

  // Subgroup open/collapsed states
  const [openSubgroups, setOpenSubgroups] = useState({
    source: true,
    fit: true,
    filters: true,
    overlay: false,
    clipPath: false,
  });

  const toggleSubgroup = (key: keyof typeof openSubgroups) => {
    setOpenSubgroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateProp = (key: string, val: unknown) => {
    setElementProperty(elementId, key, val, `Update image ${key}`);
  };

  const updateNested = (parentKey: "focalPoint" | "filter" | "overlay", childKey: string, val: unknown) => {
    const parentObj: Record<string, unknown> = { ...(props[parentKey] || {}) };
    parentObj[childKey] = val;
    setElementProperty(elementId, parentKey, parentObj, `Update image ${parentKey}.${childKey}`);
  };

  // Extract properties with defaults
  const src = props.src || "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80";
  const fallbackSrc = props.fallbackSrc || "";
  const alt = props.alt || elementName || "Image element";
  const objectFit = props.objectFit || "cover";
  const aspectRatio = props.aspectRatio || "16:9";
  const focalX = props.focalPoint?.x ?? 50;
  const focalY = props.focalPoint?.y ?? 50;

  const filters = props.filter || {
    grayscale: 0,
    blur: 0,
    brightness: 1,
    contrast: 1,
    saturate: 1,
  };

  const overlay = props.overlay || {
    color: "#000000",
    opacity: 0,
    blendMode: "normal",
  };

  const clipPath = props.clipPath || "none";

  return (
    <div className="element-specific-editor media-section" data-testid="media-section">
      {/* 1. SOURCE & ASSET */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("source")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.source ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <ImageIcon size={12} className="appearance-subgroup__icon" />
          <span className="appearance-subgroup__title">Source & Asset</span>
        </button>

        {openSubgroups.source && (
          <div className="appearance-subgroup__content">
            <div className="form-group">
              <label className="form-label" htmlFor="image-src-input">Image Source URL</label>
              <input
                id="image-src-input"
                type="text"
                className="form-input form-input--code"
                placeholder="https://... or /assets/image.png"
                value={src}
                onChange={(e) => updateProp("src", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="image-fallback-input">Fallback URL</label>
              <input
                id="image-fallback-input"
                type="text"
                className="form-input form-input--code"
                placeholder="Fallback on error"
                value={fallbackSrc}
                onChange={(e) => updateProp("fallbackSrc", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="image-alt-input">Alt Text</label>
              <input
                id="image-alt-input"
                type="text"
                className="form-input"
                placeholder="Accessibility label"
                value={alt}
                onChange={(e) => updateProp("alt", e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. FIT, CROP & FOCAL POINT */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("fit")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.fit ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Crop size={12} className="appearance-subgroup__icon" />
          <span className="appearance-subgroup__title">Fit, Aspect & Focal Point</span>
        </button>

        {openSubgroups.fit && (
          <div className="appearance-subgroup__content">
            {/* Object Fit */}
            <div className="form-group-row">
              <label className="form-label" htmlFor="object-fit-select">Object Fit</label>
              <select
                id="object-fit-select"
                className="form-select"
                value={objectFit}
                onChange={(e) => updateProp("objectFit", e.target.value)}
              >
                <option value="cover">cover (Fill & crop)</option>
                <option value="contain">contain (Letterbox)</option>
                <option value="fill">fill (Stretch)</option>
                <option value="scale-down">scale-down</option>
                <option value="none">none (Native)</option>
              </select>
            </div>

            {/* Aspect Ratio */}
            <div className="form-group">
              <label className="form-label">Aspect Ratio</label>
              <div className="form-mode-switch" style={{ flexWrap: "wrap" }}>
                {(["auto", "16:9", "1:1", "4:3", "21:9"] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    className={`form-mode-btn ${aspectRatio === ratio ? "form-mode-btn--active" : ""}`}
                    onClick={() => updateProp("aspectRatio", ratio)}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Focal Point Crosshair */}
            <div className="form-group">
              <div className="form-label">
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Crosshair size={12} />
                  Focal Point Crosshair
                </span>
                <span className="form-label__hint">{focalX}% / {focalY}%</span>
              </div>
              <div className="form-row--2col">
                <div className="form-number-scrub">
                  <span className="form-number-scrub__badge form-number-scrub__badge--x">X</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="form-number-scrub__input"
                    value={focalX}
                    onChange={(e) => updateNested("focalPoint", "x", Number(e.target.value))}
                  />
                </div>
                <div className="form-number-scrub">
                  <span className="form-number-scrub__badge form-number-scrub__badge--y">Y</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="form-number-scrub__input"
                    value={focalY}
                    onChange={(e) => updateNested("focalPoint", "y", Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. FILTERS (Grayscale, Blur, Brightness, Contrast, Saturate) */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("filters")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.filters ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Sliders size={12} className="appearance-subgroup__icon" />
          <span className="appearance-subgroup__title">Visual Filters (CSS / GSAP)</span>
        </button>

        {openSubgroups.filters && (
          <div className="appearance-subgroup__content">
            {/* Grayscale */}
            <div className="form-group">
              <div className="form-label">
                <span>Grayscale</span>
                <span className="form-label__hint">{Math.round((filters.grayscale || 0) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="form-slider"
                value={filters.grayscale || 0}
                onChange={(e) => updateNested("filter", "grayscale", Number(e.target.value))}
              />
            </div>

            {/* Blur */}
            <div className="form-group">
              <div className="form-label">
                <span>Blur</span>
                <span className="form-label__hint">{filters.blur || 0}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                className="form-slider"
                value={filters.blur || 0}
                onChange={(e) => updateNested("filter", "blur", Number(e.target.value))}
              />
            </div>

            {/* Brightness */}
            <div className="form-group">
              <div className="form-label">
                <span>Brightness</span>
                <span className="form-label__hint">{Math.round((filters.brightness ?? 1) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                className="form-slider"
                value={filters.brightness ?? 1}
                onChange={(e) => updateNested("filter", "brightness", Number(e.target.value))}
              />
            </div>

            {/* Contrast */}
            <div className="form-group">
              <div className="form-label">
                <span>Contrast</span>
                <span className="form-label__hint">{Math.round((filters.contrast ?? 1) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                className="form-slider"
                value={filters.contrast ?? 1}
                onChange={(e) => updateNested("filter", "contrast", Number(e.target.value))}
              />
            </div>

            {/* Saturate */}
            <div className="form-group">
              <div className="form-label">
                <span>Saturate</span>
                <span className="form-label__hint">{Math.round((filters.saturate ?? 1) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                className="form-slider"
                value={filters.saturate ?? 1}
                onChange={(e) => updateNested("filter", "saturate", Number(e.target.value))}
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. CLIP-PATH REVEAL SHAPE */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("clipPath")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.clipPath ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Maximize2 size={12} className="appearance-subgroup__icon" />
          <span className="appearance-subgroup__title">Clip-Path Reveal Shape</span>
        </button>

        {openSubgroups.clipPath && (
          <div className="appearance-subgroup__content">
            <div className="form-group">
              <label className="form-label">Preset Shape</label>
              <div className="form-mode-switch" style={{ flexWrap: "wrap" }}>
                {(["none", "circle", "ellipse", "inset(10%)", "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"] as const).map((shape) => (
                  <button
                    key={shape}
                    type="button"
                    className={`form-mode-btn ${clipPath === shape ? "form-mode-btn--active" : ""}`}
                    onClick={() => updateProp("clipPath", shape)}
                  >
                    {shape.startsWith("polygon") ? "diamond" : shape}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="custom-clip-input">Custom clip-path</label>
              <input
                id="custom-clip-input"
                type="text"
                className="form-input form-input--code"
                placeholder="e.g. circle(50% at 50% 50%)"
                value={clipPath}
                onChange={(e) => updateProp("clipPath", e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. TINT OVERLAY & BLEND MODE */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("overlay")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.overlay ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Layers size={12} className="appearance-subgroup__icon" />
          <span className="appearance-subgroup__title">Tint Overlay & Blend Mode</span>
        </button>

        {openSubgroups.overlay && (
          <div className="appearance-subgroup__content">
            <div className="form-group">
              <label className="form-label">Overlay Color</label>
              <div className="form-row">
                <div className="form-color-picker">
                  <div
                    className="form-color-picker__swatch"
                    style={{ backgroundColor: overlay.color }}
                  />
                  <span className="form-color-picker__label">{overlay.color}</span>
                </div>
                <input
                  type="text"
                  className="form-input"
                  value={overlay.color}
                  onChange={(e) => updateNested("overlay", "color", e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <div className="form-label">
                <span>Overlay Opacity</span>
                <span className="form-label__hint">{Math.round((overlay.opacity || 0) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="form-slider"
                value={overlay.opacity || 0}
                onChange={(e) => updateNested("overlay", "opacity", Number(e.target.value))}
              />
            </div>

            <div className="form-group-row">
              <label className="form-label">Blend Mode</label>
              <select
                className="form-select"
                value={overlay.blendMode || "normal"}
                onChange={(e) => updateNested("overlay", "blendMode", e.target.value)}
              >
                <option value="normal">normal</option>
                <option value="multiply">multiply</option>
                <option value="screen">screen</option>
                <option value="overlay">overlay</option>
                <option value="darken">darken</option>
                <option value="lighten">lighten</option>
                <option value="color-dodge">color-dodge</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
