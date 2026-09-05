"use client";

/**
 * ============================================================================
 * CONTENT & ASSET BROWSER PANEL
 * ============================================================================
 * UI Element: Content Browser (Unreal Equivalent: Content Browser)
 * Screen / Scope: Screen 04: Content & Asset Browser (`/editor`)
 * Role: Central repository for all project components, blueprints, assets, and schemas.
 * Styling Source: `@/editor/styles/panels.css` & `@/editor/styles/forms.css`
 * Matches: PANELS.md (Panel 04) & UI.md §4.3
 * ============================================================================
 */

import React, { useState } from "react";
import {
  Folder,
  LayoutGrid,
  List,
  Search,
  Plus,
  Upload,
  ChevronRight,
  Box,
  Cpu,
  Database,
  Image as ImageIcon,
  FileCode2,
  MoreVertical,
  X,
} from "lucide-react";
import "@/editor/styles/panels.css";
import "@/editor/styles/forms.css";

interface AssetEntry {
  id: string;
  name: string;
  category: "component" | "blueprint" | "database" | "asset" | "page";
  typeLabel: string;
  size: string;
  modified: string;
}

const MOCK_ASSETS: AssetEntry[] = [
  { id: "ast_btn", name: "Button.tsx", category: "component", typeLabel: "UI_COMPONENT", size: "2.4 KB", modified: "12m ago" },
  { id: "ast_card", name: "Card.tsx", category: "component", typeLabel: "UI_COMPONENT", size: "3.8 KB", modified: "1h ago" },
  { id: "ast_hero", name: "HeroSection.tsx", category: "component", typeLabel: "UI_CONTAINER", size: "6.2 KB", modified: "2h ago" },
  { id: "ast_modal", name: "ModalDialog.tsx", category: "component", typeLabel: "UI_COMPONENT", size: "4.1 KB", modified: "Yesterday" },
  { id: "ast_navbar", name: "Navbar.tsx", category: "component", typeLabel: "UI_NAVBAR", size: "5.5 KB", modified: "Yesterday" },
  { id: "ast_bp_auth", name: "AuthWorkflow.graph", category: "blueprint", typeLabel: "WASM_GRAPH", size: "14.2 KB", modified: "3h ago" },
  { id: "ast_bp_init", name: "AppInit.graph", category: "blueprint", typeLabel: "WASM_GRAPH", size: "8.9 KB", modified: "1d ago" },
  { id: "ast_db_users", name: "UsersSchema.db", category: "database", typeLabel: "SQLITE_TABLE", size: "1.8 KB", modified: "4d ago" },
  { id: "ast_db_projects", name: "ProjectsSchema.db", category: "database", typeLabel: "SQLITE_TABLE", size: "2.2 KB", modified: "4d ago" },
  { id: "ast_logo", name: "BrandLogo.svg", category: "asset", typeLabel: "VECTOR_SVG", size: "18.4 KB", modified: "2d ago" },
  { id: "ast_banner", name: "HeroMockup.webp", category: "asset", typeLabel: "IMAGE_WEBP", size: "142 KB", modified: "3d ago" },
  { id: "ast_page_home", name: "Home.page", category: "page", typeLabel: "PAGE_ROOT", size: "11.6 KB", modified: "30m ago" },
];

export const ContentBrowser: React.FC<{
  onTearOffItem?: (panelId: string, panelTitle: string, originX: number, originY: number) => void;
  onOpenAsset?: (panelId: string, panelTitle: string) => void;
}> = ({ onTearOffItem, onOpenAsset }) => {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAssets = MOCK_ASSETS.filter((item) => {
    const matchesCategory =
      activeCategory === "all" || item.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.typeLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category: AssetEntry["category"]) => {
    switch (category) {
      case "component":
        return <Box size={22} style={{ color: "var(--accent-success)" }} />;
      case "blueprint":
        return <Cpu size={22} style={{ color: "var(--accent-warning)" }} />;
      case "database":
        return <Database size={22} style={{ color: "#059669" }} />;
      case "asset":
        return <ImageIcon size={22} style={{ color: "var(--accent-info)" }} />;
      case "page":
        return <FileCode2 size={22} style={{ color: "var(--accent-primary)" }} />;
    }
  };

  /** Handle pointerdown on asset cards for drag-to-tear-off */
  const handleAssetPointerDown = (asset: AssetEntry, e: React.PointerEvent) => {
    if (!onTearOffItem || e.button !== 0) return;
    const originX = e.clientX;
    const originY = e.clientY;
    let activated = false;

    const onMove = (moveEvt: PointerEvent) => {
      if (activated) return;
      const dx = moveEvt.clientX - originX;
      const dy = moveEvt.clientY - originY;
      if (Math.sqrt(dx * dx + dy * dy) >= 40) {
        activated = true;
        // Map asset category to a panel-like ID for the tear-off system
        const panelId = asset.category === "blueprint" ? "blueprint" : asset.id;
        onTearOffItem(panelId, asset.name, originX, originY);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  return (
    <div className="panel-shell" role="region" aria-label="Content & Asset Browser">
      {/* Navigation Breadcrumb Bar */}
      <div className="cb-nav-row">
        <div className="cb-breadcrumbs">
          <Folder size={13} style={{ color: "var(--accent-primary)" }} />
          <span className="cb-breadcrumb-item">Content</span>
          <ChevronRight size={11} />
          <span className="cb-breadcrumb-item">
            {activeCategory === "all"
              ? "All Assets"
              : activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)}
          </span>
        </div>

        <div className="panel-search-bar" style={{ maxWidth: 200 }}>
          <Search size={12} className="panel-search-bar__icon" />
          <input
            type="text"
            className="panel-search-bar__input"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="panel-search-bar__clear"
              onClick={() => setSearchQuery("")}
            >
              <X size={10} />
            </button>
          )}
        </div>

        <div className="panel-header__actions">
          <button
            type="button"
            className={`panel-icon-btn ${viewMode === "grid" ? "panel-icon-btn--active" : ""}`}
            onClick={() => setViewMode("grid")}
            title="Grid View"
          >
            <LayoutGrid size={13} />
          </button>
          <button
            type="button"
            className={`panel-icon-btn ${viewMode === "list" ? "panel-icon-btn--active" : ""}`}
            onClick={() => setViewMode("list")}
            title="List View"
          >
            <List size={13} />
          </button>
          <button type="button" className="panel-icon-btn" title="Import File">
            <Upload size={13} />
          </button>
          <button type="button" className="panel-icon-btn" title="New Asset">
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="cb-filter-pills">
        {[
          { id: "all", label: "All Assets", count: MOCK_ASSETS.length },
          { id: "component", label: "Components", count: 5 },
          { id: "blueprint", label: "Blueprints", count: 2 },
          { id: "database", label: "Database", count: 2 },
          { id: "asset", label: "Assets", count: 2 },
          { id: "page", label: "Pages", count: 1 },
        ].map((pill) => (
          <button
            key={pill.id}
            type="button"
            className={`cb-pill ${activeCategory === pill.id ? "cb-pill--active" : ""}`}
            onClick={() => setActiveCategory(pill.id)}
          >
            <span>{pill.label}</span>
            <span className="cb-pill__count">({pill.count})</span>
          </button>
        ))}
      </div>

      {/* Asset Content Stage */}
      <div className="panel-content">
        {viewMode === "grid" ? (
          <div className="cb-grid">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="asset-card"
                title={`Double-click to open, or drag ${asset.name} to detach`}
                onPointerDown={(e) => handleAssetPointerDown(asset, e)}
                onDoubleClick={() => onOpenAsset?.(asset.id, asset.name)}
                style={{ cursor: onTearOffItem ? "grab" : undefined }}
              >
                <div className="asset-card__preview">
                  <span className="asset-card__type-badge">{asset.typeLabel}</span>
                  {getCategoryIcon(asset.category)}
                </div>
                <div className="asset-card__info">
                  <span className="asset-card__name">{asset.name}</span>
                  <span className="asset-card__meta">
                    {asset.size} • {asset.modified}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="cb-list">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="tree-node"
                style={{ padding: "4px 8px", height: 32 }}
              >
                <div className="tree-node__icon">{getCategoryIcon(asset.category)}</div>
                <span className="tree-node__label" style={{ fontWeight: "var(--font-medium)" }}>
                  {asset.name}
                </span>
                <span className="tree-node__tag">{asset.typeLabel}</span>
                <span style={{ fontSize: 10, color: "var(--text-tertiary)", marginRight: 12 }}>
                  {asset.size}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                  {asset.modified}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
