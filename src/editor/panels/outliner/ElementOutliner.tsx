/**
 * ============================================================================
 * ELEMENT & ANIMATION OUTLINER PANEL
 * ============================================================================
 * UI Element: Element & Animation Outliner (Panel 02)
 * Screen / Scope: Screen 02: Application Outliner (`/editor`)
 * Role: Renders the active element, its child nodes (if any), and attached
 *       animation stacks with family icon badges, track mute/solo/lock controls,
 *       and filtered quick-add animation popover.
 * Styling Source: "@/editor/styles/panels.css" & "@/editor/styles/forms.css"
 * Matches: PANELS.md (Panel 02: Element & Animation Outliner) & ROADMAP.md §3.5
 * ============================================================================
 */

import React, { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Sparkles,
  Plus,
  Layers,
  Image as ImageIcon,
  MousePointerClick,
  Minus,
  Type,
  Film,
  Folder,
} from "lucide-react";
import { useProjectStore } from "@/core/store/useProjectStore";
import { getArchetype, type ArchetypeId, type FamilyId } from "@/core/document/registry";
import { QuickAddModal } from "./QuickAddModal";
import { AnimationTrackRow } from "./TreeNode";
import "@/editor/styles/panels.css";
import "@/editor/styles/forms.css";
import type { Layer } from "@/core/document/schema";
import { documentCommands, useLayerClips, useLayers } from "@/core/store/useDocumentStore";
import type { ClipTemplate } from "@/core/document/schema";

export interface ElementOutlinerProps {
  selectedId?: string;
  onSelectElement?: (id: string, name: string) => void;
}

export const ElementOutliner: React.FC<ElementOutlinerProps> = ({
  selectedId,
  onSelectElement,
}) => {
  const elements = useLayers();
  const { pages, activePageId } = useProjectStore();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isAnimStackOpen, setIsAnimStackOpen] = useState(true);

  // Determine root element from active page or first available element
  const activePage = pages[activePageId];
  const rootElementId = activePage?.rootElementId || Object.keys(elements)[0];
  const rootElement: Layer | undefined = elements[rootElementId];
  const animStack = useLayerClips(rootElement?.id);

  if (!rootElement) {
    return (
      <div className="panel-shell" role="region" aria-label="Element & Animation Outliner">
        <div className="panel-header">
          <div className="panel-header__title">
            <Layers size={13} style={{ color: "var(--accent-primary)" }} />
            <span>Element Outliner</span>
          </div>
        </div>
        <div className="panel-content" style={{ padding: "16px", color: "var(--text-muted)", fontSize: "12px" }}>
          No element on stage.
        </div>
      </div>
    );
  }

  const archetype: ArchetypeId = rootElement.archetype;
  const family: FamilyId = getArchetype(archetype).family ?? "interactive";
  const isSelected = selectedId === rootElement.id;

  const handleAddAnimation = (anim: ClipTemplate) => {
    documentCommands.addClip(rootElement.id, anim, "Add animation");
  };

  const handleToggleMute = (animId: string) => {
    const clip = animStack.find((a) => a.id === animId);
    if (clip) documentCommands.updateClip(animId, { enabled: !clip.enabled }, "Toggle animation");
  };

  const handleToggleLock = (animId: string) => {
    const clip = animStack.find((a) => a.id === animId);
    if (clip) documentCommands.updateClip(animId, { locked: !clip.locked }, "Lock animation");
  };

  const handleDeleteAnimation = (animId: string) => {
    documentCommands.removeClip(animId, "Remove animation");
  };

  const getFamilyIcon = (fam: FamilyId) => {
    switch (fam) {
      case "interactive":
        return <MousePointerClick size={12} style={{ color: "var(--accent-primary, #206859)" }} />;
      case "media":
        return <ImageIcon size={12} style={{ color: "var(--accent-info, #2563eb)" }} />;
      case "structural":
        return <Minus size={12} style={{ color: "var(--accent-warning, #d97706)" }} />;
      case "text":
        return <Type size={12} style={{ color: "var(--accent-danger, #dc2626)" }} />;
      default:
        return <Sparkles size={12} />;
    }
  };

  return (
    <div className="panel-shell element-outliner" role="region" aria-label="Element & Animation Outliner" data-testid="element-outliner">
      {/* Panel Top Header Bar */}
      <div className="panel-header">
        <div className="panel-header__title">
          <Layers size={13} style={{ color: "var(--accent-primary)" }} />
          <span>Element Outliner</span>
        </div>
        <div className="panel-header__actions">
          <button
            type="button"
            className="panel-icon-btn"
            title="Attach Animation Preset"
            onClick={() => setIsQuickAddOpen(true)}
            data-testid="outliner-quick-add-btn"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Outliner Tree Body */}
      <div className="panel-content" style={{ padding: "8px 6px" }}>
        {/* Root Element Row */}
        <div
          className={`outliner-node ${isSelected ? "outliner-node--selected" : ""}`}
          onClick={() => onSelectElement?.(rootElement.id, rootElement.name)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 8px",
            borderRadius: "var(--radius-sm, 6px)",
            cursor: "pointer",
            background: isSelected ? "var(--surface-panel-active, rgba(32, 104, 89, 0.1))" : "transparent",
            border: isSelected ? "1px solid rgba(32, 104, 89, 0.3)" : "1px solid transparent",
            fontWeight: 600,
            fontSize: "13px",
            marginBottom: "4px",
          }}
          data-testid="outliner-root-element"
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {getFamilyIcon(family)}
            <span>{rootElement.name}</span>
            <span
              style={{
                fontSize: "10px",
                padding: "1px 5px",
                borderRadius: "4px",
                background: "var(--surface-panel-hover, #f1f5f9)",
                color: "var(--text-muted, #64748b)",
                fontFamily: "monospace",
              }}
            >
              {rootElement.id}
            </span>
          </div>
          <span
            style={{
              fontSize: "10px",
              padding: "1px 6px",
              borderRadius: "10px",
              background: "var(--accent-primary-light, #e6f4f1)",
              color: "var(--accent-primary, #206859)",
              fontWeight: 600,
              textTransform: "capitalize",
            }}
          >
            {archetype}
          </span>
        </div>

        {/* Animation Stack Sub-Branch */}
        <div style={{ marginLeft: "12px", borderLeft: "1px solid var(--border-subtle, #f1f5f9)", paddingLeft: "4px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 6px",
              fontSize: "11px",
              color: "var(--text-muted, #64748b)",
              cursor: "pointer",
            }}
            onClick={() => setIsAnimStackOpen(!isAnimStackOpen)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {isAnimStackOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Film size={12} style={{ color: "var(--accent-primary, #206859)" }} />
              <span style={{ fontWeight: 600, color: "var(--text-secondary, #334155)" }}>Animation Stack</span>
              <span
                style={{
                  fontSize: "9px",
                  padding: "0 4px",
                  borderRadius: "8px",
                  background: "var(--surface-panel-hover, #e2e8f0)",
                }}
              >
                {animStack.length}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsQuickAddOpen(true);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "2px",
                fontSize: "10px",
                color: "var(--accent-primary, #206859)",
                fontWeight: 600,
                padding: "2px 4px",
                borderRadius: "4px",
              }}
            >
              <Plus size={10} />
              Add
            </button>
          </div>

          {isAnimStackOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "2px" }}>
              {animStack.length === 0 ? (
                <div style={{ padding: "6px 28px", fontSize: "11px", color: "var(--text-disabled, #94a3b8)", fontStyle: "italic" }}>
                  No animations attached. Click &apos;+ Add&apos; to attach.
                </div>
              ) : (
                animStack.map((anim) => (
                  <AnimationTrackRow
                    key={anim.id}
                    animation={anim}
                    onToggleMute={handleToggleMute}
                    onToggleLock={handleToggleLock}
                    onDelete={handleDeleteAnimation}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Popover */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        archetype={archetype}
        family={family}
        onClose={() => setIsQuickAddOpen(false)}
        onAddAnimation={handleAddAnimation}
      />
    </div>
  );
};
