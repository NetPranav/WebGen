/**
 * ============================================================================
 * ARCHETYPE PICKER COMPONENT
 * ============================================================================
 * UI Element: Starting Archetype Selection Grid (Screen 00)
 * Screen / Scope: Screen 00: Project Hub & Design Launcher (`/`)
 * Role: Renders the 4 Element Families (Interactive, Media, Structural, Text)
 *       and allows the user to select the starting root archetype before launch.
 *       Selection sets `project.rootArchetype` and gates the studio launch button.
 * Styling Source: "@/editor/styles/launcher.css"
 * ============================================================================
 */

import React from "react";
import {
  ARCHETYPE_FAMILIES,
  ArchetypeId,
  ArchetypeDefinition,
} from "./archetypeData";
import {
  MousePointerClick,
  ToggleLeft,
  Tag,
  PlusCircle,
  Image as ImageIcon,
  Shapes,
  Minus,
  Palette,
  Box,
  Type,
  CheckCircle2,
} from "lucide-react";

export interface ArchetypePickerProps {
  selectedArchetype: ArchetypeId | null;
  onSelectArchetype: (archetype: ArchetypeId) => void;
}

export const ArchetypePicker: React.FC<ArchetypePickerProps> = ({
  selectedArchetype,
  onSelectArchetype,
}) => {
  const getArchetypeIcon = (id: ArchetypeId) => {
    switch (id) {
      case "button":
        return <MousePointerClick size={18} />;
      case "toggle":
        return <ToggleLeft size={18} />;
      case "badge":
        return <Tag size={18} />;
      case "fab":
        return <PlusCircle size={18} />;
      case "image":
        return <ImageIcon size={18} />;
      case "icon":
        return <Shapes size={18} />;
      case "divider":
        return <Minus size={18} />;
      case "background":
        return <Palette size={18} />;
      case "container":
        return <Box size={18} />;
      case "text":
        return <Type size={18} />;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: ArchetypeId) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelectArchetype(id);
    }
  };

  return (
    <div className="archetype-picker" role="radiogroup" aria-label="Starting Element Archetype">
      {ARCHETYPE_FAMILIES.map((family) => (
        <div key={family.id} className="archetype-family">
          {/* Family Section Header */}
          <div className="archetype-family__header">
            <div className="archetype-family__title-group">
              <span className="archetype-family__badge">{family.badge}</span>
              <h4 className="archetype-family__title">{family.name}</h4>
            </div>
            <span className="archetype-family__count">
              {family.archetypes.length} {family.archetypes.length === 1 ? "archetype" : "archetypes"}
            </span>
          </div>

          {/* Archetypes Grid for this Family */}
          <div className="archetype-family__grid">
            {family.archetypes.map((archetype: ArchetypeDefinition) => {
              const isSelected = selectedArchetype === archetype.id;
              const tileClasses = [
                "archetype-tile",
                isSelected ? "archetype-tile--selected" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div
                  key={archetype.id}
                  className={tileClasses}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => onSelectArchetype(archetype.id)}
                  onKeyDown={(e) => handleKeyDown(e, archetype.id)}
                  data-archetype={archetype.id}
                  data-family={archetype.family}
                >
                  <div className="archetype-tile__top">
                    <div className="archetype-tile__icon-wrapper">
                      {getArchetypeIcon(archetype.id)}
                    </div>
                    <div className="archetype-tile__meta">
                      <span className="archetype-tile__prefix">{archetype.idPrefix}</span>
                      {isSelected && (
                        <CheckCircle2 size={16} className="archetype-tile__check-icon" />
                      )}
                    </div>
                  </div>

                  <div className="archetype-tile__info">
                    <h5 className="archetype-tile__name">{archetype.name}</h5>
                    <p className="archetype-tile__examples">{archetype.examples}</p>
                  </div>

                  <div className="archetype-tile__features">
                    {archetype.animatableFeatures.slice(0, 2).map((feat, idx) => (
                      <span key={idx} className="archetype-tile__feature-tag">
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
