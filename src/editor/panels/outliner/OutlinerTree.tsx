"use client";

/**
 * ============================================================================
 * APPLICATION OUTLINER TREE PANEL
 * ============================================================================
 * UI Element: Application Outliner (Unreal Equivalent: World Outliner)
 * Screen / Scope: Screen 02: Application Outliner (`/editor`)
 * Role: Hierarchical tree view of all pages, components, blueprints, and schemas.
 * Styling Source: `@/editor/styles/panels.css` & `@/editor/styles/forms.css`
 * Matches: PANELS.md (Panel 02) & UI.md §4.1
 * ============================================================================
 */

import React, { useState, useMemo } from "react";
import {
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Search,
  X,
  FileCode2,
  Box,
  Layers,
  Cpu,
  Database,
  Plus,
  Filter,
} from "lucide-react";
import "@/editor/styles/panels.css";
import "@/editor/styles/forms.css";

interface TreeNode {
  id: string;
  label: string;
  type: "page" | "section" | "component" | "blueprint" | "database";
  tag: string;
  depth: number;
  children?: TreeNode[];
  isOpenDefault?: boolean;
}

const INITIAL_TREE_DATA: TreeNode[] = [
  {
    id: "pages_root",
    label: "Pages",
    type: "page",
    tag: "FOLDER",
    depth: 0,
    isOpenDefault: true,
    children: [
      {
        id: "page_home",
        label: "Home (index.tsx)",
        type: "page",
        tag: "PAGE",
        depth: 1,
        isOpenDefault: true,
        children: [
          {
            id: "comp_navbar",
            label: "Navbar (Sticky Header)",
            type: "section",
            tag: "NAV",
            depth: 2,
            isOpenDefault: false,
            children: [
              { id: "comp_logo", label: "BrandLogo (SVG)", type: "component", tag: "IMG", depth: 3 },
              { id: "comp_nav_links", label: "NavLinks (Cluster)", type: "component", tag: "NAV", depth: 3 },
              { id: "comp_cta_btn", label: "Launch Button", type: "component", tag: "BTN", depth: 3 },
            ],
          },
          {
            id: "comp_hero",
            label: "Hero Section",
            type: "section",
            tag: "HERO",
            depth: 2,
            isOpenDefault: true,
            children: [
              { id: "comp_badge", label: "Release Pill Badge", type: "component", tag: "BADGE", depth: 3 },
              { id: "comp_headline", label: "H1 Engine Headline", type: "component", tag: "TXT", depth: 3 },
              { id: "comp_subtext", label: "Description Paragraph", type: "component", tag: "TXT", depth: 3 },
              { id: "comp_hero_btn", label: "Primary CTA Button", type: "component", tag: "BTN", depth: 3 },
              { id: "comp_preview", label: "Interactive Mockup", type: "component", tag: "FRAME", depth: 3 },
            ],
          },
          {
            id: "comp_grid",
            label: "Feature Grid (3 Cols)",
            type: "section",
            tag: "GRID",
            depth: 2,
            isOpenDefault: false,
            children: [
              { id: "comp_card_1", label: "Wasm Cable Physics", type: "component", tag: "CARD", depth: 3 },
              { id: "comp_card_2", label: "AST Compiler Engine", type: "component", tag: "CARD", depth: 3 },
              { id: "comp_card_3", label: "Confluence Whiteboard", type: "component", tag: "CARD", depth: 3 },
            ],
          },
          {
            id: "comp_footer",
            label: "Studio Footer",
            type: "section",
            tag: "FOOTER",
            depth: 2,
          },
        ],
      },
      {
        id: "page_pricing",
        label: "Pricing (/pricing)",
        type: "page",
        tag: "PAGE",
        depth: 1,
      },
      {
        id: "page_dashboard",
        label: "Dashboard (/dashboard)",
        type: "page",
        tag: "PAGE",
        depth: 1,
      },
    ],
  },
  {
    id: "blueprints_root",
    label: "Logic Blueprints",
    type: "blueprint",
    tag: "FOLDER",
    depth: 0,
    isOpenDefault: true,
    children: [
      { id: "bp_init", label: "AppInitGraph", type: "blueprint", tag: "GRAPH", depth: 1 },
      { id: "bp_auth", label: "AuthFlow", type: "blueprint", tag: "GRAPH", depth: 1 },
      { id: "bp_theme", label: "ThemeController", type: "blueprint", tag: "GRAPH", depth: 1 },
    ],
  },
  {
    id: "database_root",
    label: "Database Models",
    type: "database",
    tag: "FOLDER",
    depth: 0,
    isOpenDefault: true,
    children: [
      { id: "db_users", label: "UsersCollection (Auth)", type: "database", tag: "TABLE", depth: 1 },
      { id: "db_projects", label: "ProjectsCollection", type: "database", tag: "TABLE", depth: 1 },
    ],
  },
];

interface OutlinerTreeProps {
  selectedId?: string;
  onSelectElement?: (id: string, name: string) => void;
  onTearOffItem?: (panelId: string, panelTitle: string, originX: number, originY: number) => void;
  onOpenItem?: (panelId: string, panelTitle: string) => void;
}

export const OutlinerTree: React.FC<OutlinerTreeProps> = ({
  selectedId = "comp_hero",
  onSelectElement,
  onTearOffItem,
  onOpenItem,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({
    pages_root: true,
    page_home: true,
    comp_hero: true,
    blueprints_root: true,
    database_root: true,
  });

  const [hiddenNodes, setHiddenNodes] = useState<Record<string, boolean>>({});
  const [lockedNodes, setLockedNodes] = useState<Record<string, boolean>>({});
  const [activeSelected, setActiveSelected] = useState(selectedId);

  const toggleOpen = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleHidden = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHiddenNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleLocked = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLockedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelect = (node: TreeNode) => {
    setActiveSelected(node.id);
    if (onSelectElement) {
      onSelectElement(node.id, node.label);
    }
  };

  const getNodeIcon = (type: TreeNode["type"]) => {
    switch (type) {
      case "page":
        return <FileCode2 size={13} className="tree-node__icon--page" />;
      case "section":
        return <Layers size={13} className="tree-node__icon--section" />;
      case "component":
        return <Box size={13} className="tree-node__icon--component" />;
      case "blueprint":
        return <Cpu size={13} className="tree-node__icon--blueprint" />;
      case "database":
        return <Database size={13} className="tree-node__icon--database" />;
    }
  };

  // Flattened rendering with depth indentation
  const renderTree = (nodes: TreeNode[]): React.ReactNode => {
    return nodes.map((node) => {
      const isVisible =
        !searchQuery ||
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.children &&
          node.children.some((c) =>
            c.label.toLowerCase().includes(searchQuery.toLowerCase())
          ));

      if (!isVisible) return null;

      const hasChildren = node.children && node.children.length > 0;
      const isOpen = openNodes[node.id] || Boolean(searchQuery);
      const isHidden = hiddenNodes[node.id];
      const isLocked = lockedNodes[node.id];
      const isSelected = activeSelected === node.id;

      return (
        <React.Fragment key={node.id}>
          <div
            className={`tree-node ${isSelected ? "tree-node--selected" : ""}`}
            style={{ paddingLeft: `${node.depth * 14 + 6}px`, cursor: onTearOffItem ? "grab" : undefined }}
            onClick={() => handleSelect(node)}
            onDoubleClick={() => {
              const panelId = node.type === "blueprint" ? "blueprint" : node.id;
              onOpenItem?.(panelId, node.label);
            }}
            onPointerDown={(e) => {
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
                  const panelId = node.type === "blueprint" ? "blueprint" : node.id;
                  onTearOffItem(panelId, node.label, originX, originY);
                  window.removeEventListener("pointermove", onMove);
                  window.removeEventListener("pointerup", onUp);
                }
              };

              const onUp = () => {
                window.removeEventListener("pointermove", onMove);
              };

              window.addEventListener("pointermove", onMove);
              window.addEventListener("pointerup", onUp, { once: true });
            }}
            role="treeitem"
            aria-selected={isSelected}
          >
            {hasChildren ? (
              <button
                type="button"
                className={`tree-node__toggle ${isOpen ? "tree-node__toggle--open" : ""}`}
                onClick={(e) => toggleOpen(node.id, e)}
                title={isOpen ? "Collapse" : "Expand"}
              >
                <ChevronRight size={12} />
              </button>
            ) : (
              <span style={{ width: 18, height: 18, display: "inline-block" }} />
            )}

            <div className="tree-node__icon">{getNodeIcon(node.type)}</div>

            <span className="tree-node__label">{node.label}</span>

            <span className="tree-node__tag">{node.tag}</span>

            <div className="tree-node__actions">
              <button
                type="button"
                className={`tree-action-btn ${isHidden ? "tree-action-btn--hidden" : ""}`}
                onClick={(e) => toggleHidden(node.id, e)}
                title={isHidden ? "Unhide Element" : "Hide Element"}
              >
                {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>

              <button
                type="button"
                className={`tree-action-btn ${isLocked ? "tree-action-btn--locked" : ""}`}
                onClick={(e) => toggleLocked(node.id, e)}
                title={isLocked ? "Unlock Element" : "Lock Element"}
              >
                {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
              </button>
            </div>
          </div>

          {hasChildren && isOpen && renderTree(node.children!)}
        </React.Fragment>
      );
    });
  };

  // Count total nodes
  const totalCount = useMemo(() => {
    let count = 0;
    const countNodes = (items: TreeNode[]) => {
      items.forEach((item) => {
        count++;
        if (item.children) countNodes(item.children);
      });
    };
    countNodes(INITIAL_TREE_DATA);
    return count;
  }, []);

  return (
    <div className="panel-shell" role="region" aria-label="Application Outliner">
      {/* Panel Top Header Bar */}
      <div className="panel-header">
        <div className="panel-header__title">
          <span>Hierarchy</span>
          <span className="panel-header__badge">{totalCount}</span>
        </div>

        <div className="panel-search-bar">
          <Search size={12} className="panel-search-bar__icon" />
          <input
            type="text"
            className="panel-search-bar__input"
            placeholder="Filter components..."
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
          <button type="button" className="panel-icon-btn" title="Add Element">
            <Plus size={13} />
          </button>
          <button type="button" className="panel-icon-btn" title="Filter by Type">
            <Filter size={13} />
          </button>
        </div>
      </div>

      {/* Outliner Tree Scrollable View */}
      <div className="panel-content" role="tree">
        <div className="outliner-tree">{renderTree(INITIAL_TREE_DATA)}</div>
      </div>
    </div>
  );
};
