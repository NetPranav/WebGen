"use client";

/**
 * ============================================================================
 * PROPERTIES & DETAILS INSPECTOR PANEL
 * ============================================================================
 * UI Element: Details Inspector (Unreal Equivalent: Details Panel)
 * Screen / Scope: Screen 03: Details Inspector (`/editor`)
 * Role: Context-aware properties editor for selected components.
 * Styling Source: `@/editor/styles/panels.css` & `@/editor/styles/forms.css`
 * Matches: PANELS.md (Panel 03) & UI.md §4.2
 * ============================================================================
 */

import React, { useState } from "react";
import {
  ChevronRight,
  Sparkles,
  Link,
  Sliders,
  RotateCw,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Minus,
  Layers,
  Feather,
  Globe,
  X,
  Box,
} from "lucide-react";
import { DataBindingEditor } from "./sections/DataBindingEditor";
import { AnimationEditor } from "./sections/AnimationEditor";
import { MediaSection } from "./sections/MediaSection";
import { DividerSection } from "./sections/DividerSection";
import { BackgroundSection } from "./sections/BackgroundSection";
import { SvgVectorSection } from "./sections/SvgVectorSection";
import { MaterialInspectorSection } from "./sections/MaterialInspectorSection";
import { EnvironmentInspector } from "./EnvironmentInspector";
import { VectorBar } from "./VectorBar";
import { AutoLayoutPanel } from "./AutoLayoutPanel";
import { ConstraintsPanel, GridPanel } from "./GridPanel";
import { AlignBar } from "./AlignBar";
import { TextProperties } from "./TextProperties";
import { SimpleFace } from "./simple/SimpleFace";
import { ProFace } from "./pro/ProFace";
import { useInspectorFaceStore } from "@/core/store/useInspectorFaceStore";
import { SectionRail, type SectionRailItem } from "./SectionRail";
import "@/editor/styles/panels.css";
import "@/editor/styles/forms.css";
import { useLayers } from "@/core/store/useDocumentStore";

interface DetailsInspectorProps {
  selectedElementId?: string | null;
  selectedElementName?: string;
  onOpenBlueprint?: () => void;
  onDeselect?: () => void;
}

export const DetailsInspector: React.FC<DetailsInspectorProps> = ({
  selectedElementId,
  selectedElementName = "Element Details",
  onOpenBlueprint,
  onDeselect,
}) => {
  const elements = useLayers();
  const face = useInspectorFaceStore((st) => st.face);
  const isElementSelected = Boolean(
    selectedElementId &&
    selectedElementId !== "" &&
    selectedElementId !== "world_root" &&
    selectedElementId !== "world"
  );

  const currentElement = isElementSelected && selectedElementId ? elements[selectedElementId] : undefined;
  const archetype = currentElement?.archetype || "button";

  // Collapsible accordion state
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({
    media: true,
    divider: true,
    background: true,
    svgVector: true,
    material: true,
    transform: true,
    layout: true,
    appearance: true,
    typography: true,
    bindings: true,
    motion: true,
  });

  const toggleSection = (key: string) => {
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /** Rail click: expand the section (if collapsed) and scroll it into view. */
  const jumpToSection = (key: string) => {
    setSectionsOpen((prev) => ({ ...prev, [key]: true }));
    document.getElementById(`details-section-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const railItems: SectionRailItem[] = [
    { id: "properties", icon: <Sliders size={14} />, label: "Properties" },
    ...(archetype === "image" ? [{ id: "media", icon: <ImageIcon size={14} />, label: "Media" }] : []),
    ...(archetype === "divider" ? [{ id: "divider", icon: <Minus size={14} />, label: "Divider" }] : []),
    ...(archetype === "background" ? [{ id: "background", icon: <Globe size={14} />, label: "Background" }] : []),
    ...(archetype === "icon" ? [{ id: "svgVector", icon: <Box size={14} />, label: "SVG / Vector" }] : []),
    ...(archetype === "object3D" ? [{ id: "material", icon: <RotateCw size={14} />, label: "Material" }] : []),
    { id: "bindings", icon: <Link size={14} />, label: "Data Bindings" },
    { id: "motion", icon: <Sparkles size={14} />, label: "Motion & Animation" },
  ];

  // If no element is selected on canvas or outliner, render World Environment settings directly
  if (!isElementSelected || !selectedElementId) {
    return <EnvironmentInspector />;
  }

  return (
    <div className="panel-shell details-inspector" role="region" aria-label="Properties & Details Inspector">
      {/* Panel Top Header Bar */}
      <div className="panel-header">
        <div className="panel-header__title">
          <Sliders size={13} style={{ color: "var(--accent-primary)" }} />
          <span>{selectedElementName}</span>
        </div>

        <div className="panel-header__actions">
          <span className="panel-header__badge">{selectedElementId}</span>
          <button type="button" className="panel-icon-btn" title="Inspect Source Blueprint" onClick={onOpenBlueprint}>
            <ExternalLink size={12} />
          </button>
          <button type="button" className="panel-icon-btn" title="Delete Component">
            <Trash2 size={12} />
          </button>
          {onDeselect && (
            <button
              type="button"
              id="details-deselect-btn"
              className="panel-icon-btn"
              title="Deselect (Return to World Settings)"
              onClick={onDeselect}
              aria-label="Deselect Element"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Section Rail + Scrollable Inspector Body */}
      <div className="panel-body">
        {face === "pro" && <SectionRail items={railItems} onSelect={jumpToSection} />}
        <div className="panel-content">
        <AlignBar />
        <VectorBar />
        <AutoLayoutPanel />
        <GridPanel />
        <ConstraintsPanel />
        <div className="inspector-face-switch" role="tablist" aria-label="Inspector face">
          <button type="button" role="tab" aria-selected={face === "simple"} onClick={() => useInspectorFaceStore.getState().setFace("simple")}>Simple</button>
          <button type="button" role="tab" aria-selected={face === "pro"} onClick={() => useInspectorFaceStore.getState().setFace("pro")}>Pro</button>
        </div>
        {face === "simple" ? (
          <SimpleFace />
        ) : (
        <>
        <TextProperties />
        <div id="details-section-properties">
          <ProFace />
        </div>

        {/* ====================================================================
         * ARCHETYPE-SPECIFIC SECTION: MEDIA (Image)
         * ==================================================================== */}
        {archetype === "image" && (
          <div id="details-section-media" className={`panel-section ${sectionsOpen.media ? "panel-section--open" : ""}`} data-testid="section-media">
            <button
              type="button"
              className="panel-section__header"
              onClick={() => toggleSection("media")}
            >
              <div className="panel-section__title-group">
                <ChevronRight size={13} className="panel-section__chevron" />
                <span>Media Details</span>
              </div>
              <ImageIcon size={12} style={{ color: "var(--accent-primary)" }} />
            </button>

            {sectionsOpen.media && (
              <div className="panel-section__content">
                <MediaSection
                  elementId={selectedElementId}
                  elementName={selectedElementName}
                />
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
         * ARCHETYPE-SPECIFIC SECTION: DIVIDER
         * ==================================================================== */}
        {archetype === "divider" && (
          <div id="details-section-divider" className={`panel-section ${sectionsOpen.divider ? "panel-section--open" : ""}`} data-testid="section-divider">
            <button
              type="button"
              className="panel-section__header"
              onClick={() => toggleSection("divider")}
            >
              <div className="panel-section__title-group">
                <ChevronRight size={13} className="panel-section__chevron" />
                <span>Divider Properties</span>
              </div>
              <Minus size={12} style={{ color: "var(--accent-primary)" }} />
            </button>

            {sectionsOpen.divider && (
              <div className="panel-section__content">
                <DividerSection
                  elementId={selectedElementId}
                  elementName={selectedElementName}
                />
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
         * ARCHETYPE-SPECIFIC SECTION: BACKGROUND
         * ==================================================================== */}
        {archetype === "background" && (
          <div id="details-section-background" className={`panel-section ${sectionsOpen.background ? "panel-section--open" : ""}`} data-testid="section-background">
            <button
              type="button"
              className="panel-section__header"
              onClick={() => toggleSection("background")}
            >
              <div className="panel-section__title-group">
                <ChevronRight size={13} className="panel-section__chevron" />
                <span>Background Properties</span>
              </div>
              <Layers size={12} style={{ color: "var(--accent-primary)" }} />
            </button>

            {sectionsOpen.background && (
              <div className="panel-section__content">
                <BackgroundSection
                  elementId={selectedElementId}
                  elementName={selectedElementName}
                />
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
         * ARCHETYPE-SPECIFIC SECTION: SVG VECTOR (Icon)
         * ==================================================================== */}
        {archetype === "icon" && (
          <div id="details-section-svgVector" className={`panel-section ${sectionsOpen.svgVector ? "panel-section--open" : ""}`} data-testid="section-svg-vector">
            <button
              type="button"
              className="panel-section__header"
              onClick={() => toggleSection("svgVector")}
            >
              <div className="panel-section__title-group">
                <ChevronRight size={13} className="panel-section__chevron" />
                <span>SVG Vector</span>
              </div>
              <Feather size={12} style={{ color: "var(--accent-primary)" }} />
            </button>

            {sectionsOpen.svgVector && (
              <div className="panel-section__content">
                <SvgVectorSection
                  elementId={selectedElementId}
                  elementName={selectedElementName}
                />
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
         * SECTION 3.5: PBR MATERIAL (Object3D)
         * ==================================================================== */}
        {archetype === "object3D" && (
          <div
            id="details-section-material"
            className={`panel-section ${sectionsOpen.material ? "panel-section--open" : ""}`}
            data-testid="pbr-material-accordion"
          >
            <button
              type="button"
              className="panel-section__header"
              onClick={() => toggleSection("material")}
            >
              <div className="panel-section__title-group">
                <ChevronRight size={13} className="panel-section__chevron" />
                <span>PBR Material & 3D Geometry</span>
              </div>
              <Box size={12} style={{ color: "var(--accent-primary)" }} />
            </button>

            {sectionsOpen.material && (
              <div className="panel-section__content">
                <MaterialInspectorSection
                  elementId={selectedElementId}
                  elementName={selectedElementName}
                />
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
         * SECTION 5: DATA BINDINGS & BLUEPRINTS
         * ==================================================================== */}
        <div id="details-section-bindings" className={`panel-section ${sectionsOpen.bindings ? "panel-section--open" : ""}`}>
          <button
            type="button"
            className="panel-section__header"
            onClick={() => toggleSection("bindings")}
          >
            <div className="panel-section__title-group">
              <ChevronRight size={13} className="panel-section__chevron" />
              <span>Data Bindings</span>
            </div>
            <Link size={12} style={{ color: "var(--accent-info)" }} />
          </button>

          {sectionsOpen.bindings && (
            <div className="panel-section__content">
              <DataBindingEditor
                elementId={selectedElementId}
                elementName={selectedElementName}
                archetype={archetype}
              />
            </div>
          )}
        </div>

        {/* ====================================================================
         * SECTION 6: MOTION & ANIMATION
         * ==================================================================== */}
        <div id="details-section-motion" className={`panel-section ${sectionsOpen.motion ? "panel-section--open" : ""}`}>
          <button
            type="button"
            className="panel-section__header"
            onClick={() => toggleSection("motion")}
          >
            <div className="panel-section__title-group">
              <ChevronRight size={13} className="panel-section__chevron" />
              <span>Motion & Animation</span>
            </div>
            <Sparkles size={12} style={{ color: "var(--accent-primary)" }} />
          </button>

          {sectionsOpen.motion && (
            <div className="panel-section__content">
              <AnimationEditor
                elementId={selectedElementId}
                elementName={selectedElementName}
                archetype={archetype}
              />
            </div>
          )}
        </div>
        </>
        )}
        </div>
      </div>
    </div>
  );
};
