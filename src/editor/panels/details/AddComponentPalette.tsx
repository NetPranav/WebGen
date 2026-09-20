"use client";

/**
 * ============================================================================
 * ADD COMPONENT & BEHAVIOR PALETTE (UNREAL ENGINE 5 STYLE)
 * ============================================================================
 * UI Element: Searchable Dropdown Action Palette for Attaching Capabilities
 * Screen / Scope: Top of Details Panel Inspector (`/editor`)
 * Role: Provides a fast, keyboard-navigable menu of sub-components,
 *       behaviors, data bindings, and animation presets.
 * Architecture Ref: `DOCS/ROADMAP_2.md` §Phase 2.2
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  X,
  Sparkles,
  Type,
  Box,
  Layers,
  RotateCcw,
  ImageIcon,
  Workflow,
  Eye,
  Cpu,
  ExternalLink,
  Terminal,
  Film,
  Plus,
} from "lucide-react";
import {
  AddPaletteItem,
  AddPaletteCategory,
  ADD_PALETTE_CATALOG,
} from "@/core/types/details";

export interface AddComponentPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: AddPaletteItem) => void;
}

// Icon resolver helper
const renderPaletteIcon = (iconName: AddPaletteItem["iconName"], size = 14) => {
  switch (iconName) {
    case "Sparkles":
      return <Sparkles size={size} />;
    case "Type":
      return <Type size={size} />;
    case "Box":
      return <Box size={size} />;
    case "Layers":
      return <Layers size={size} />;
    case "RotateCcw":
      return <RotateCcw size={size} />;
    case "ImageIcon":
      return <ImageIcon size={size} />;
    case "Workflow":
      return <Workflow size={size} />;
    case "Eye":
      return <Eye size={size} />;
    case "Cpu":
      return <Cpu size={size} />;
    case "ExternalLink":
      return <ExternalLink size={size} />;
    case "Terminal":
      return <Terminal size={size} />;
    case "Film":
      return <Film size={size} />;
    default:
      return <Box size={size} />;
  }
};

// Category badge color metadata
const CATEGORY_META: Record<
  AddPaletteCategory,
  { label: string; color: string; bg: string }
> = {
  component: { label: "Component", color: "#206859", bg: "#EBF5F3" },
  behavior: { label: "Behavior", color: "#7C3AED", bg: "#F5F3FF" },
  data: { label: "Data", color: "#059669", bg: "#ECFDF5" },
  animation: { label: "Animation", color: "#D97706", bg: "#FFFBEB" },
};

export const AddComponentPalette: React.FC<AddComponentPaletteProps> = ({
  isOpen,
  onClose,
  onSelectItem,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | AddPaletteCategory>("all");
  const [focusedIndex, setFocusedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Autofocus search and reset query on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setFocusedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Click outside to dismiss
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, onClose]);

  // Filter items by category and search query
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ADD_PALETTE_CATALOG.filter((item) => {
      const matchCategory =
        activeCategory === "all" || item.category === activeCategory;
      if (!matchCategory) return false;
      if (!q) return true;

      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.badge && item.badge.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, activeCategory]);

  // Reset focus index if filtered items change
  useEffect(() => {
    setFocusedIndex(0);
  }, [filteredItems]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) =>
        filteredItems.length === 0 ? 0 : (prev + 1) % filteredItems.length
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) =>
        filteredItems.length === 0
          ? 0
          : (prev - 1 + filteredItems.length) % filteredItems.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[focusedIndex]) {
        onSelectItem(filteredItems[focusedIndex]);
      }
    }
  };

  // Scroll focused element into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[focusedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [focusedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="add-palette"
      ref={containerRef}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-label="Add Component or Behavior Palette"
    >
      {/* Palette Header with Search */}
      <div className="add-palette__header">
        <div className="add-palette__search-box">
          <Search size={13} className="add-palette__search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="add-palette__search-input"
            placeholder="Search components, behaviors, bindings, animations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button
              type="button"
              className="add-palette__clear-btn"
              onClick={() => setSearchQuery("")}
            >
              <X size={11} />
            </button>
          ) : (
            <span className="add-palette__hint">ESC</span>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="add-palette__tabs">
          <button
            type="button"
            className={`add-palette__tab ${
              activeCategory === "all" ? "add-palette__tab--active" : ""
            }`}
            onClick={() => setActiveCategory("all")}
          >
            All <span className="add-palette__tab-count">{ADD_PALETTE_CATALOG.length}</span>
          </button>
          <button
            type="button"
            className={`add-palette__tab ${
              activeCategory === "component" ? "add-palette__tab--active" : ""
            }`}
            onClick={() => setActiveCategory("component")}
          >
            Components
          </button>
          <button
            type="button"
            className={`add-palette__tab ${
              activeCategory === "behavior" ? "add-palette__tab--active" : ""
            }`}
            onClick={() => setActiveCategory("behavior")}
          >
            Behaviors
          </button>
          <button
            type="button"
            className={`add-palette__tab ${
              activeCategory === "data" ? "add-palette__tab--active" : ""
            }`}
            onClick={() => setActiveCategory("data")}
          >
            Data
          </button>
          <button
            type="button"
            className={`add-palette__tab ${
              activeCategory === "animation" ? "add-palette__tab--active" : ""
            }`}
            onClick={() => setActiveCategory("animation")}
          >
            Animations
          </button>
        </div>
      </div>

      {/* Palette Item List */}
      <div className="add-palette__list" ref={listRef}>
        {filteredItems.length === 0 ? (
          <div className="add-palette__empty">
            <Box size={24} style={{ color: "var(--text-tertiary)", marginBottom: 8 }} />
            <div className="add-palette__empty-title">No matching capabilities found</div>
            <div className="add-palette__empty-sub">
              Try searching for &quot;Hover&quot;, &quot;API&quot;, &quot;Fade&quot;, or &quot;Badge&quot;
            </div>
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const isFocused = idx === focusedIndex;
            const meta = CATEGORY_META[item.category];

            return (
              <div
                key={item.id}
                className={`add-palette__item ${
                  isFocused ? "add-palette__item--focused" : ""
                }`}
                onClick={() => onSelectItem(item)}
                onMouseEnter={() => setFocusedIndex(idx)}
                role="button"
                tabIndex={0}
              >
                {/* Category Icon */}
                <div
                  className="add-palette__item-icon"
                  style={{ color: meta.color, backgroundColor: meta.bg }}
                >
                  {renderPaletteIcon(item.iconName)}
                </div>

                {/* Info */}
                <div className="add-palette__item-info">
                  <div className="add-palette__item-title-row">
                    <span className="add-palette__item-name">{item.name}</span>
                    <span
                      className="add-palette__item-cat-badge"
                      style={{ color: meta.color, backgroundColor: meta.bg }}
                    >
                      {meta.label}
                    </span>
                    {item.badge && (
                      <span className="add-palette__item-spec-badge">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="add-palette__item-desc">
                    {item.description}
                  </div>
                </div>

                {/* Quick Add Action Pill */}
                <div className="add-palette__item-action">
                  <Plus size={12} />
                  <span>Add</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div className="add-palette__footer">
        <div className="add-palette__footer-shortcuts">
          <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Attach</span>
          <span><kbd>ESC</kbd> Close</span>
        </div>
        <div className="add-palette__footer-count">
          Showing {filteredItems.length} capabilities
        </div>
      </div>
    </div>
  );
};
