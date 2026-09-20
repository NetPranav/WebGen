"use client";

/**
 * ============================================================================
 * PANEL 25: GLOBAL SEARCH (FIND IN BLUEPRINTS)
 * ============================================================================
 * Master IDE global search panel providing inverted index fuzzy search across
 * canvas visual elements, Blueprint nodes, database collections, routes,
 * and state variables with 1-click deep jump navigation.
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.2 & PANELS.md §Panel 25
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  SearchCategory,
  SearchResultItem,
  CATEGORY_DEFINITIONS,
  SearchEntityType,
} from "@/core/types/search";
import { GlobalSearchEngine } from "@/runtime/GlobalSearchEngine";
import {
  Search,
  X,
  Compass,
  Layers,
  Cpu,
  Film,
  Variable,
  Globe,
  ArrowRight,
  Clock,
  CornerDownLeft,
  Sparkles,
  Filter,
  Check,
  Tag,
} from "lucide-react";

export interface GlobalSearchPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  onNavigate?: (panelId: string, panelTitle?: string) => void;
  isModal?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const GlobalSearchPanel: React.FC<GlobalSearchPanelProps> = ({
  isOpen = true,
  onClose,
  onNavigate,
  isModal = false,
  className,
  style,
}) => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<SearchCategory>("all");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [exactMatch, setExactMatch] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(GlobalSearchEngine.getRecentSearches());
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Execute search query
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const res = GlobalSearchEngine.search({
      query,
      category: activeCategory,
      caseSensitive,
      exactMatch,
      maxResults: 60,
    });

    setResults(res);
    setSelectedIndex(0);
  }, [query, activeCategory, caseSensitive, exactMatch]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (results.length > 0) {
          setSelectedIndex((prev) => (prev + 1) % results.length);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (results.length > 0) {
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results.length > 0 && results[selectedIndex]) {
          handleSelectResult(results[selectedIndex]);
        }
      }
    },
    [results, selectedIndex, onClose]
  );

  const handleSelectResult = (item: SearchResultItem) => {
    GlobalSearchEngine.addRecentSearch(query);
    setRecentSearches(GlobalSearchEngine.getRecentSearches());
    GlobalSearchEngine.navigateTo(item, onNavigate);
    onClose?.();
  };

  const handleSelectRecent = (q: string) => {
    setQuery(q);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleClearRecent = () => {
    GlobalSearchEngine.clearRecentSearches();
    setRecentSearches([]);
  };

  const getEntityIcon = (type: SearchEntityType) => {
    switch (type) {
      case "page":
        return <Compass size={15} style={{ color: "#38BDF8" }} />;
      case "element":
        return <Layers size={15} style={{ color: "#818CF8" }} />;
      case "blueprint_node":
        return <Cpu size={15} style={{ color: "#F59E0B" }} />;
      case "blueprint_variable":
      case "state_variable":
        return <Variable size={15} style={{ color: "#34D399" }} />;
      case "animation_sequence":
      case "animation_track":
        return <Film size={15} style={{ color: "#EC4899" }} />;
      case "api_endpoint":
        return <Globe size={15} style={{ color: "#A78BFA" }} />;
      default:
        return <Search size={15} style={{ color: "#9CA3AF" }} />;
    }
  };

  if (!isOpen) return null;

  const content = (
    <div
      className={`global-search-panel ${className || ""}`}
      onKeyDown={handleKeyDown}
      style={{
        display: "flex",
        flexDirection: "column",
        height: isModal ? "580px" : "100%",
        width: isModal ? "720px" : "100%",
        background: "#12131A",
        color: "#FFFFFF",
        borderRadius: isModal ? 12 : 0,
        boxShadow: isModal ? "0 20px 50px rgba(0, 0, 0, 0.75), 0 0 0 1px #232430" : "none",
        overflow: "hidden",
        fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
        ...style,
      }}
    >
      {/* Search Input Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 20px",
          borderBottom: "1px solid #232430",
          background: "#161722",
        }}
      >
        <Search size={20} style={{ color: "#6366F1", flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find across Blueprints, Visual Elements, Pages, Sequences, & Variables..."
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: 500,
          }}
        />

        {query && (
          <button
            onClick={() => setQuery("")}
            style={{
              background: "transparent",
              border: "none",
              color: "#9CA3AF",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
            title="Clear search"
          >
            <X size={16} />
          </button>
        )}

        {/* Toggles */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => setCaseSensitive(!caseSensitive)}
            style={{
              padding: "4px 8px",
              background: caseSensitive ? "rgba(99, 102, 241, 0.2)" : "#232430",
              color: caseSensitive ? "#818CF8" : "#9CA3AF",
              border: caseSensitive ? "1px solid #6366F1" : "1px solid transparent",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
            title="Match Case"
          >
            Aa
          </button>
          <button
            onClick={() => setExactMatch(!exactMatch)}
            style={{
              padding: "4px 8px",
              background: exactMatch ? "rgba(99, 102, 241, 0.2)" : "#232430",
              color: exactMatch ? "#818CF8" : "#9CA3AF",
              border: exactMatch ? "1px solid #6366F1" : "1px solid transparent",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
            title="Match Exact Word"
          >
            [W]
          </button>

          {isModal && (
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#9CA3AF",
                cursor: "pointer",
                padding: 4,
                marginLeft: 4,
              }}
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Chips */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 20px",
          borderBottom: "1px solid #1E202B",
          background: "#13141C",
          overflowX: "auto",
        }}
      >
        {CATEGORY_DEFINITIONS.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: "4px 10px",
                background: isActive ? "#6366F1" : "#1E202B",
                color: isActive ? "#FFFFFF" : "#9CA3AF",
                border: "none",
                borderRadius: 4,
                fontSize: 11.5,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Results or Empty State */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {query ? (
          results.length > 0 ? (
            results.map((item, index) => {
              const isSelected = selectedIndex === index;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectResult(item)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: 6,
                    background: isSelected ? "rgba(99, 102, 241, 0.15)" : "transparent",
                    border: isSelected ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid transparent",
                    cursor: "pointer",
                    gap: 12,
                    transition: "all 0.1s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: "#1E202B",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {getEntityIcon(item.entityType)}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>
                          {item.title}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "1px 6px",
                            borderRadius: 4,
                            background: "#232430",
                            color: "#9CA3AF",
                            textTransform: "uppercase",
                          }}
                        >
                          {item.entityType.replace("_", " ")}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "#9CA3AF",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: 10.5,
                        color: "#6366F1",
                        fontWeight: 600,
                      }}
                    >
                      {item.matchedField}
                    </span>
                    <ArrowRight size={14} style={{ color: isSelected ? "#818CF8" : "#6B7280" }} />
                  </div>
                </div>
              );
            })
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 20px",
                gap: 10,
                color: "#6B7280",
                textAlign: "center",
              }}
            >
              <Search size={32} style={{ opacity: 0.4 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: "#9CA3AF" }}>
                No entities found for &quot;{query}&quot;
              </div>
              <div style={{ fontSize: 12, maxWidth: 360 }}>
                Try searching for element names, routes (e.g. <code>/</code>), blueprint functions, or animation sequences.
              </div>
            </div>
          )
        ) : (
          /* Recent Searches & Search Tips */
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "12px 6px" }}>
            {recentSearches.length > 0 && (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" }}>
                    Recent Searches
                  </span>
                  <button
                    onClick={handleClearRecent}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#6B7280",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {recentSearches.map((rec, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectRecent(rec)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        borderRadius: 6,
                        background: "#1E202B",
                        border: "1px solid #2A2B36",
                        color: "#D1D5DB",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      <Clock size={12} style={{ color: "#6B7280" }} />
                      {rec}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Tips */}
            <div
              style={{
                background: "#161722",
                border: "1px solid #232430",
                borderRadius: 8,
                padding: 16,
                marginTop: 8,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#FFFFFF", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={14} style={{ color: "#6366F1" }} />
                Global Search Index Tips
              </div>
              <ul style={{ fontSize: 11.5, color: "#9CA3AF", margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                <li>Type <strong>Home</strong> or <strong>/</strong> to locate App Router pages.</li>
                <li>Type <strong>Button</strong>, <strong>Card</strong>, or <strong>Hero</strong> to jump directly to visual canvas elements.</li>
                <li>Type <strong>Fetch</strong>, <strong>Branch</strong>, or <strong>State</strong> to navigate Blueprint nodes and logic graphs.</li>
                <li>Type <strong>Sequence</strong> or <strong>Fade</strong> to navigate animation tracks and curves.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Hints */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          background: "#161722",
          borderTop: "1px solid #232430",
          fontSize: 11,
          color: "#9CA3AF",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>
            <kbd style={{ background: "#232430", padding: "2px 5px", borderRadius: 3 }}>↑↓</kbd> Navigate
          </span>
          <span>
            <kbd style={{ background: "#232430", padding: "2px 5px", borderRadius: 3 }}>↵</kbd> Jump to Entity
          </span>
          <span>
            <kbd style={{ background: "#232430", padding: "2px 5px", borderRadius: 3 }}>Esc</kbd> Close
          </span>
        </div>

        {results.length > 0 && (
          <div>
            Showing {results.length} matched {results.length === 1 ? "entity" : "entities"}
          </div>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: "100px",
          zIndex: 9999,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        {content}
      </div>
    );
  }

  return content;
};
