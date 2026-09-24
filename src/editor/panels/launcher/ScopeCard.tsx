/**
 * ============================================================================
 * SCOPE SELECTION CARD
 * ============================================================================
 * UI Element: Scope Card Item (Element / Component / Page)
 * Screen / Scope: Screen 00: Project Hub & Design Launcher (`/`)
 * Role: Interactive card for selecting design scope. In the Initial Phase,
 *       Element Design is active & pre-selected, while Component and Page
 *       scopes are visibly disabled with tooltip guidance per PRD.md §6.
 * Styling Source: "@/editor/styles/launcher.css"
 * ============================================================================
 */

import React from "react";
import { Sparkles, Puzzle, FileText, Lock, CheckCircle2 } from "lucide-react";

export type DesignScope = "element" | "component" | "page";

export interface ScopeCardProps {
  scope: DesignScope;
  title: string;
  badge: string;
  description: string;
  selected?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onClick?: () => void;
}

export const ScopeCard: React.FC<ScopeCardProps> = ({
  scope,
  title,
  badge,
  description,
  selected = false,
  disabled = false,
  disabledReason = "Coming in a later phase — see ROADMAP.md",
  onClick,
}) => {
  const getIcon = () => {
    switch (scope) {
      case "element":
        return <Sparkles className="scope-card__icon" size={22} />;
      case "component":
        return <Puzzle className="scope-card__icon" size={22} />;
      case "page":
        return <FileText className="scope-card__icon" size={22} />;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
  };

  const cardClasses = [
    "scope-card",
    selected ? "scope-card--selected" : "",
    disabled ? "scope-card--disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cardClasses}
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-scope={scope}
    >
      {/* Top Header: Icon & Badges */}
      <div className="scope-card__header">
        <div className="scope-card__icon-wrapper">
          {getIcon()}
        </div>

        <div className="scope-card__badges">
          {disabled ? (
            <span className="scope-card__badge scope-card__badge--disabled" title={disabledReason}>
              <Lock size={11} className="scope-card__badge-icon" />
              {badge}
            </span>
          ) : (
            <span className="scope-card__badge scope-card__badge--active">
              {badge}
            </span>
          )}

          {selected && !disabled && (
            <span className="scope-card__selected-indicator">
              <CheckCircle2 size={16} />
            </span>
          )}
        </div>
      </div>

      {/* Title & Description */}
      <div className="scope-card__body">
        <h3 className="scope-card__title">{title}</h3>
        <p className="scope-card__description">{description}</p>
      </div>

      {/* Disabled Overlay Tooltip */}
      {disabled && (
        <div className="scope-card__tooltip" role="tooltip">
          {disabledReason}
        </div>
      )}
    </div>
  );
};
