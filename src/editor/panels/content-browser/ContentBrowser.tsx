"use client";

/**
 * ============================================================================
 * CONTENT & ASSET BROWSER PANEL (BOTTOM DRAWER VELOCITY ENGINE)
 * ============================================================================
 * Unreal Engine 5-style Content Browser & Project Asset Drawer:
 * - Edge-to-edge full width layout (no rigid left sidebar).
 * - Multi-select Checklist Dropdown for asset types:
 *   [x] Blueprints (.bp.json)
 *   [x] Sequencer Animations (.seq)
 *   [x] UI Components (.tsx)
 *   [x] Pages (.page)
 *   [x] Database Models (.db)
 *   [x] Media & Assets (.svg, .webp)
 * - Page & Scope Dropdown: easily switch to view blueprints and animations
 *   specifically for Home, Pricing, Dashboard, or specific component folders.
 * - Outliner 1-Click Sync: clicking any folder/element in the Outliner immediately
 *   scopes this view to that folder's blueprints, animations, and components!
 * - Enhanced Card Surface:
 *   - Preview image/box
 *   - Name + how many minutes ago connected beside it in small text
 *   - Parent class written just below the name
 *   - 2 preview connection pills + remaining count
 * - 1-Second Hover Dwell Inspection Popup:
 *   - Keeping cursor over card for 1 second reveals full rich inspection details
 *     positioned directly below the mouse cursor!
 *   - Vanishes when moving cursor too much (>25px) or leaving the card.
 * - Double-Click to Open in FullPageDock: double-clicking any file opens it as a
 *   tab in the top cross bar with its designated rich editor!
 * ============================================================================
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Folder,
  LayoutGrid,
  List,
  Search,
  Plus,
  Upload,
  ChevronRight,
  ChevronDown,
  Box,
  Cpu,
  Database,
  Image as ImageIcon,
  FileCode2,
  Film,
  Zap,
  Check,
  X,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
  Link,
  SlidersHorizontal,
  FileText,
  Clock,
  Layers as LayersIcon,
  Crosshair,
  Copy,
  Maximize2,
} from "lucide-react";
import "@/editor/styles/panels.css";
import "@/editor/styles/forms.css";

export type AssetCategory = "blueprint" | "sequencer" | "component" | "database" | "page" | "asset";

export interface AssetEntry {
  id: string;
  name: string;
  category: AssetCategory;
  pageId: string; // e.g. "page_home", "page_pricing", "page_dashboard", "global"
  folderId: string; // e.g. "comp_hero", "comp_navbar", "comp_grid", "comp_footer", "blueprints_root", "database_root", "page_home"
  folderName: string;
  typeLabel: string;
  connectedAgo: string; // e.g. "2m ago", "12m ago"
  parentClass: string; // e.g. "UIContainer", "BlueprintGraph", "AnimationTrack"
  connections: string[]; // e.g. ["HeroCTAButton", "HeroEntrance.seq", "HeroHeadline"]
  description?: string;
  events?: string[]; // e.g. ["onClick", "onHover"]
  boundState?: string[]; // e.g. ["auth.user", "theme.mode"]
}

const ALL_CATEGORY_OPTIONS: { id: AssetCategory; label: string; ext: string; icon: React.ReactNode; color: string }[] = [
  { id: "blueprint", label: "Logic Blueprints", ext: ".bp.json", icon: <Cpu size={13} style={{ color: "#818CF8" }} />, color: "#818CF8" },
  { id: "sequencer", label: "Sequencer Animations", ext: ".seq", icon: <Film size={13} style={{ color: "#C084FC" }} />, color: "#C084FC" },
  { id: "component", label: "UI Components", ext: ".tsx", icon: <Box size={13} style={{ color: "#34D399" }} />, color: "#34D399" },
  { id: "page", label: "Page Routes", ext: ".page", icon: <FileCode2 size={13} style={{ color: "#60A5FA" }} />, color: "#60A5FA" },
  { id: "database", label: "Database Models", ext: ".db", icon: <Database size={13} style={{ color: "#2DD4BF" }} />, color: "#2DD4BF" },
  { id: "asset", label: "Media & Assets", ext: ".svg/.webp", icon: <ImageIcon size={13} style={{ color: "#FBBF24" }} />, color: "#FBBF24" },
];

export const getCategoryDisplayName = (category: AssetCategory): string => {
  switch (category) {
    case "blueprint":
      return "Logic Blueprint";
    case "sequencer":
      return "Sequencer Animation";
    case "component":
      return "UI Component";
    case "database":
      return "Database Model";
    case "page":
      return "Page Route";
    case "asset":
      return "Media Asset";
  }
};

export const getCategoryColor = (category: AssetCategory): string => {
  switch (category) {
    case "blueprint":
      return "#818CF8";
    case "sequencer":
      return "#C084FC";
    case "component":
      return "#34D399";
    case "database":
      return "#2DD4BF";
    case "page":
      return "#60A5FA";
    case "asset":
      return "#FBBF24";
  }
};

const PROJECT_ASSETS: AssetEntry[] = [
  // --------------------------------------------------------------------------
  // 1. HOME PAGE ASSETS (`page_home`)
  // --------------------------------------------------------------------------
  {
    id: "ast_page_home",
    name: "Home.page",
    category: "page",
    pageId: "page_home",
    folderId: "page_home",
    folderName: "Home (index.tsx)",
    typeLabel: "PAGE_ROOT",
    connectedAgo: "30m ago",
    parentClass: "PageLayout",
    connections: ["HeroSection.tsx", "Navbar.tsx", "FeatureGrid.tsx", "StudioFooter.tsx"],
    description: "Index landing page route (`/`) layout and metadata",
    events: ["onPageLoad", "onBeforeUnload"],
  },
  {
    id: "ast_hero_comp",
    name: "HeroSection.tsx",
    category: "component",
    pageId: "page_home",
    folderId: "comp_hero",
    folderName: "Hero Section",
    typeLabel: "UI_CONTAINER",
    connectedAgo: "10m ago",
    parentClass: "SectionContainer",
    connections: ["HeroCTAButton", "HeroEntrance.seq", "HeroWorkflow.bp", "HeroMockup"],
    description: "Split SaaS Hero container with reactive headline, subtext, and CTAs",
    events: ["onMount", "onIntersect"],
  },
  {
    id: "ast_hero_bp",
    name: "HeroWorkflow.bp.json",
    category: "blueprint",
    pageId: "page_home",
    folderId: "comp_hero",
    folderName: "Hero Section",
    typeLabel: "WASM_GRAPH (.bp)",
    connectedAgo: "2m ago",
    parentClass: "BlueprintGraph",
    connections: ["HeroCTAButton", "HeroSection.tsx", "AnalyticsBus"],
    description: "Click, hover, and conversion logic wire graph for Hero Section",
    events: ["onClick", "onHover", "onTimer"],
  },
  {
    id: "ast_hero_seq",
    name: "HeroEntrance.seq",
    category: "sequencer",
    pageId: "page_home",
    folderId: "comp_hero",
    folderName: "Hero Section",
    typeLabel: "ANIM_TRACK (.seq)",
    connectedAgo: "15m ago",
    parentClass: "AnimationSequence",
    connections: ["HeroHeadline", "HeroCTAButton", "HeroMockup"],
    description: "GSAP stagger entrance spring animation for headline & CTA buttons",
    events: ["onIntersect"],
  },
  {
    id: "ast_hero_mockup",
    name: "HeroMockup.webp",
    category: "asset",
    pageId: "page_home",
    folderId: "comp_hero",
    folderName: "Hero Section",
    typeLabel: "IMAGE_WEBP",
    connectedAgo: "1h ago",
    parentClass: "ImageElement",
    connections: ["HeroSection.tsx", "HeroEntrance.seq"],
    description: "1440x900 Retina preview container illustration",
  },
  {
    id: "ast_hero_badge",
    name: "ReleasePillBadge.tsx",
    category: "component",
    pageId: "page_home",
    folderId: "comp_hero",
    folderName: "Hero Section",
    typeLabel: "UI_COMPONENT",
    connectedAgo: "4m ago",
    parentClass: "UIBadge",
    connections: ["HeroSection.tsx", "ThemeController.bp"],
    description: "Pill badge with pulsing amber release indicator",
  },
  {
    id: "ast_hero_btn",
    name: "HeroCTAButton.tsx",
    category: "component",
    pageId: "page_home",
    folderId: "comp_hero",
    folderName: "Hero Section",
    typeLabel: "UI_BUTTON",
    connectedAgo: "6m ago",
    parentClass: "UIButton",
    connections: ["HeroWorkflow.bp", "HeroEntrance.seq", "HeroSection.tsx"],
    description: "High-conversion gradient CTA button with hover micro-motion",
    events: ["onClick", "onHover"],
  },
  {
    id: "ast_nav_comp",
    name: "Navbar.tsx",
    category: "component",
    pageId: "page_home",
    folderId: "comp_navbar",
    folderName: "Navbar (Sticky Header)",
    typeLabel: "UI_NAVBAR",
    connectedAgo: "22m ago",
    parentClass: "UIHeader",
    connections: ["BrandLogo.svg", "NavScrollTrigger.seq", "NavWorkflow.bp"],
    description: "Responsive glassmorphic sticky top navigation bar",
    events: ["onScroll"],
  },
  {
    id: "ast_nav_logo",
    name: "BrandLogo.svg",
    category: "asset",
    pageId: "page_home",
    folderId: "comp_navbar",
    folderName: "Navbar (Sticky Header)",
    typeLabel: "VECTOR_SVG",
    connectedAgo: "1d ago",
    parentClass: "VectorGraphic",
    connections: ["Navbar.tsx"],
    description: "Vector brand logo with gradient fill",
  },
  {
    id: "ast_nav_seq",
    name: "NavScrollTrigger.seq",
    category: "sequencer",
    pageId: "page_home",
    folderId: "comp_navbar",
    folderName: "Navbar (Sticky Header)",
    typeLabel: "ANIM_TRACK (.seq)",
    connectedAgo: "18m ago",
    parentClass: "AnimationSequence",
    connections: ["Navbar.tsx"],
    description: "Scroll trigger blur and background opacity transition",
  },
  {
    id: "ast_nav_bp",
    name: "NavWorkflow.bp.json",
    category: "blueprint",
    pageId: "page_home",
    folderId: "comp_navbar",
    folderName: "Navbar (Sticky Header)",
    typeLabel: "WASM_GRAPH (.bp)",
    connectedAgo: "12m ago",
    parentClass: "BlueprintGraph",
    connections: ["Navbar.tsx", "AuthFlow.bp"],
    description: "Mobile drawer toggle, auth login state, and dropdown menu logic",
    events: ["onClick", "onHover"],
  },
  {
    id: "ast_grid_comp",
    name: "FeatureGrid.tsx",
    category: "component",
    pageId: "page_home",
    folderId: "comp_grid",
    folderName: "Feature Grid (3 Cols)",
    typeLabel: "UI_GRID",
    connectedAgo: "45m ago",
    parentClass: "UIGrid",
    connections: ["WasmPhysicsCard", "CardStagger.seq", "GridExpandWorkflow.bp"],
    description: "3-Column responsive Bento grid with glassmorphic cards",
  },
  {
    id: "ast_card_wasm",
    name: "WasmPhysicsCard.tsx",
    category: "component",
    pageId: "page_home",
    folderId: "comp_grid",
    folderName: "Feature Grid (3 Cols)",
    typeLabel: "UI_CARD",
    connectedAgo: "35m ago",
    parentClass: "UICard",
    connections: ["FeatureGrid.tsx", "CardStagger.seq"],
    description: "Interactive physics simulator card",
  },
  {
    id: "ast_grid_seq",
    name: "CardStagger.seq",
    category: "sequencer",
    pageId: "page_home",
    folderId: "comp_grid",
    folderName: "Feature Grid (3 Cols)",
    typeLabel: "ANIM_TRACK (.seq)",
    connectedAgo: "20m ago",
    parentClass: "AnimationSequence",
    connections: ["FeatureGrid.tsx", "WasmPhysicsCard"],
    description: "Staggered reveal sequence on viewport intersect",
  },
  {
    id: "ast_grid_bp",
    name: "GridExpandWorkflow.bp.json",
    category: "blueprint",
    pageId: "page_home",
    folderId: "comp_grid",
    folderName: "Feature Grid (3 Cols)",
    typeLabel: "WASM_GRAPH (.bp)",
    connectedAgo: "8m ago",
    parentClass: "BlueprintGraph",
    connections: ["FeatureGrid.tsx", "ModalDialogAnimation.seq"],
    description: "Card expand dialog and telemetry logging workflow",
    events: ["onClick"],
  },
  {
    id: "ast_footer_comp",
    name: "StudioFooter.tsx",
    category: "component",
    pageId: "page_home",
    folderId: "comp_footer",
    folderName: "Studio Footer",
    typeLabel: "UI_FOOTER",
    connectedAgo: "1h ago",
    parentClass: "UIFooter",
    connections: ["FooterNewsletter.bp", "Home.page"],
    description: "Multi-column sitemap footer with copyright and newsletter",
  },
  {
    id: "ast_footer_bp",
    name: "FooterNewsletter.bp.json",
    category: "blueprint",
    pageId: "page_home",
    folderId: "comp_footer",
    folderName: "Studio Footer",
    typeLabel: "WASM_GRAPH (.bp)",
    connectedAgo: "14m ago",
    parentClass: "BlueprintGraph",
    connections: ["StudioFooter.tsx", "UsersCollection.db"],
    description: "Newsletter subscription submit validation and API call",
    events: ["onSubmit"],
  },

  // --------------------------------------------------------------------------
  // 2. PRICING PAGE ASSETS (`page_pricing`)
  // --------------------------------------------------------------------------
  {
    id: "ast_page_pricing",
    name: "Pricing.page",
    category: "page",
    pageId: "page_pricing",
    folderId: "page_pricing",
    folderName: "Pricing (/pricing)",
    typeLabel: "PAGE_ROOT",
    connectedAgo: "50m ago",
    parentClass: "PageLayout",
    connections: ["PricingTiers.tsx", "PricingCalculator.bp", "PricingCardHover.seq"],
    description: "Tier comparison and annual billing toggle route (`/pricing`)",
  },
  {
    id: "ast_bp_pricing",
    name: "PricingCalculator.bp.json",
    category: "blueprint",
    pageId: "page_pricing",
    folderId: "page_pricing",
    folderName: "Pricing (/pricing)",
    typeLabel: "WASM_GRAPH (.bp)",
    connectedAgo: "5m ago",
    parentClass: "BlueprintGraph",
    connections: ["PricingTiers.tsx", "CheckoutRedirect.bp", "OrdersCollection.db"],
    description: "Dynamic tier price computation based on seat slider count",
    events: ["onValueChange", "onClick"],
  },
  {
    id: "ast_bp_checkout",
    name: "CheckoutRedirect.bp.json",
    category: "blueprint",
    pageId: "page_pricing",
    folderId: "page_pricing",
    folderName: "Pricing (/pricing)",
    typeLabel: "WASM_GRAPH (.bp)",
    connectedAgo: "7m ago",
    parentClass: "BlueprintGraph",
    connections: ["PricingCalculator.bp", "OrdersCollection.db"],
    description: "Stripe checkout session initiation and customer webhook flow",
    events: ["onSubmit"],
  },
  {
    id: "ast_seq_pricing_hover",
    name: "PricingCardHover.seq",
    category: "sequencer",
    pageId: "page_pricing",
    folderId: "page_pricing",
    folderName: "Pricing (/pricing)",
    typeLabel: "ANIM_TRACK (.seq)",
    connectedAgo: "16m ago",
    parentClass: "AnimationSequence",
    connections: ["PricingTiers.tsx"],
    description: "Pro tier card lift, glowing border pulse, and badge bounce",
  },
  {
    id: "ast_seq_toggle_flip",
    name: "BillingToggleFlip.seq",
    category: "sequencer",
    pageId: "page_pricing",
    folderId: "page_pricing",
    folderName: "Pricing (/pricing)",
    typeLabel: "ANIM_TRACK (.seq)",
    connectedAgo: "24m ago",
    parentClass: "AnimationSequence",
    connections: ["PricingTiers.tsx", "PricingCalculator.bp"],
    description: "Annual vs Monthly 20% discount badge flip transition",
  },
  {
    id: "ast_pricing_tiers",
    name: "PricingTiers.tsx",
    category: "component",
    pageId: "page_pricing",
    folderId: "page_pricing",
    folderName: "Pricing (/pricing)",
    typeLabel: "UI_COMPONENT",
    connectedAgo: "30m ago",
    parentClass: "UIContainer",
    connections: ["PricingCalculator.bp", "PricingCardHover.seq", "BillingToggleFlip.seq"],
    description: "3-Tier comparison table (Starter, Pro, Enterprise)",
  },

  // --------------------------------------------------------------------------
  // 3. DASHBOARD PAGE ASSETS (`page_dashboard`)
  // --------------------------------------------------------------------------
  {
    id: "ast_page_dashboard",
    name: "Dashboard.page",
    category: "page",
    pageId: "page_dashboard",
    folderId: "page_dashboard",
    folderName: "Dashboard (/dashboard)",
    typeLabel: "PAGE_ROOT",
    connectedAgo: "1h ago",
    parentClass: "PageLayout",
    connections: ["DashboardMetricsFetch.bp", "RealtimeChartUpdate.bp", "ChartPulse.seq"],
    description: "User telemetry analytics, active projects, and system health",
  },
  {
    id: "ast_bp_dashboard_fetch",
    name: "DashboardMetricsFetch.bp.json",
    category: "blueprint",
    pageId: "page_dashboard",
    folderId: "page_dashboard",
    folderName: "Dashboard (/dashboard)",
    typeLabel: "WASM_GRAPH (.bp)",
    connectedAgo: "3m ago",
    parentClass: "BlueprintGraph",
    connections: ["Dashboard.page", "RealtimeChartUpdate.bp"],
    description: "Real-time metrics polling from telemetry endpoints",
    events: ["onTimer", "onPageLoad"],
  },
  {
    id: "ast_bp_chart_stream",
    name: "RealtimeChartUpdate.bp.json",
    category: "blueprint",
    pageId: "page_dashboard",
    folderId: "page_dashboard",
    folderName: "Dashboard (/dashboard)",
    typeLabel: "WASM_GRAPH (.bp)",
    connectedAgo: "9m ago",
    parentClass: "BlueprintGraph",
    connections: ["DashboardMetricsFetch.bp", "ChartPulse.seq"],
    description: "SVG chart coordinates calculation on data packet receive",
  },
  {
    id: "ast_seq_chart_pulse",
    name: "ChartPulse.seq",
    category: "sequencer",
    pageId: "page_dashboard",
    folderId: "page_dashboard",
    folderName: "Dashboard (/dashboard)",
    typeLabel: "ANIM_TRACK (.seq)",
    connectedAgo: "11m ago",
    parentClass: "AnimationSequence",
    connections: ["RealtimeChartUpdate.bp"],
    description: "Live pulse ripple on the telemetry activity indicator",
  },

  // --------------------------------------------------------------------------
  // 4. GLOBAL BLUEPRINTS & ANIMATIONS (`global` / `blueprints_root` / `database_root`)
  // --------------------------------------------------------------------------
  {
    id: "ast_bp_init",
    name: "AppInitGraph.bp.json",
    category: "blueprint",
    pageId: "global",
    folderId: "blueprints_root",
    folderName: "Logic Blueprints",
    typeLabel: "WASM_GRAPH (.bp)",
    connectedAgo: "1m ago",
    parentClass: "BlueprintGraph",
    connections: ["Home.page", "ThemeController.bp", "UsersCollection.db"],
    description: "Application bootstrap, user auth check, and local storage hydration",
    events: ["onPageLoad"],
  },
  {
    id: "ast_bp_auth",
    name: "AuthFlow.bp.json",
    category: "blueprint",
    pageId: "global",
    folderId: "blueprints_root",
    folderName: "Logic Blueprints",
    typeLabel: "WASM_GRAPH (.bp)",
    connectedAgo: "4m ago",
    parentClass: "BlueprintGraph",
    connections: ["Navbar.tsx", "UsersCollection.db", "Dashboard.page"],
    description: "JWT OAuth token handshake, session renewal, and protected routes",
    events: ["onSubmit", "onClick"],
  },
  {
    id: "ast_bp_theme",
    name: "ThemeController.bp.json",
    category: "blueprint",
    pageId: "global",
    folderId: "blueprints_root",
    folderName: "Logic Blueprints",
    typeLabel: "WASM_GRAPH (.bp)",
    connectedAgo: "12m ago",
    parentClass: "BlueprintGraph",
    connections: ["AppInitGraph.bp", "Navbar.tsx", "HeroSection.tsx"],
    description: "Dynamic HSL dark/light palette switcher and CSS custom property injector",
    events: ["onClick"],
  },
  {
    id: "ast_seq_modal",
    name: "ModalDialogAnimation.seq",
    category: "sequencer",
    pageId: "global",
    folderId: "sequencer_root",
    folderName: "Timeline Sequences",
    typeLabel: "ANIM_TRACK (.seq)",
    connectedAgo: "28m ago",
    parentClass: "AnimationSequence",
    connections: ["GridExpandWorkflow.bp", "HeroSection.tsx"],
    description: "Global modal backdrop blur fade-in and scale spring",
  },
  {
    id: "ast_db_users",
    name: "UsersCollection.db",
    category: "database",
    pageId: "global",
    folderId: "database_root",
    folderName: "Database Models",
    typeLabel: "SQLITE_TABLE",
    connectedAgo: "35m ago",
    parentClass: "SQLiteTable",
    connections: ["AuthFlow.bp", "AppInitGraph.bp", "FooterNewsletter.bp"],
    description: "Users credentials, email, role permissions, and profile metadata",
  },
  {
    id: "ast_db_projects",
    name: "ProjectsCollection.db",
    category: "database",
    pageId: "global",
    folderId: "database_root",
    folderName: "Database Models",
    typeLabel: "SQLITE_TABLE",
    connectedAgo: "42m ago",
    parentClass: "SQLiteTable",
    connections: ["Dashboard.page", "AppInitGraph.bp"],
    description: "Project workspaces, AST trees, and deployed deployment URLs",
  },
  {
    id: "ast_db_orders",
    name: "OrdersCollection.db",
    category: "database",
    pageId: "global",
    folderId: "database_root",
    folderName: "Database Models",
    typeLabel: "SQLITE_TABLE",
    connectedAgo: "1h ago",
    parentClass: "SQLiteTable",
    connections: ["CheckoutRedirect.bp", "PricingCalculator.bp"],
    description: "Stripe checkout session logs, customer IDs, and product SKUs",
  },
];

interface ContentBrowserProps {
  selectedFolderId?: string;
  selectedFolderName?: string;
  onSelectFolder?: (folderId: string, folderName: string) => void;
  onOpenAsset?: (assetId: string, assetName: string) => void;
  onTearOffItem?: (panelId: string, panelTitle: string, originX: number, originY: number) => void;
}

export const ContentBrowser: React.FC<ContentBrowserProps> = ({
  selectedFolderId,
  selectedFolderName,
  onSelectFolder,
  onOpenAsset,
  onTearOffItem,
}) => {
  // Checklist State: which categories are currently checked
  const [selectedCategories, setSelectedCategories] = useState<Set<AssetCategory>>(
    new Set(["blueprint", "sequencer", "component", "page", "database", "asset"])
  );
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);

  // Active Scope Selection: "all", page id ("page_home", "page_pricing", etc.), or folder id
  const [activeScope, setActiveScope] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // 1-Second Hover Dwell Inspection State
  const [hoveredAsset, setHoveredAsset] = useState<AssetEntry | null>(null);
  const [inspectorPos, setInspectorPos] = useState<{ x: number; y: number } | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoverAnchorPosRef = useRef<{ x: number; y: number } | null>(null);

  // Quick Action Utilities State
  const [copiedAssetId, setCopiedAssetId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const pageDropdownRef = useRef<HTMLDivElement>(null);

  // Sync with Outliner selection if user clicked an element in Outliner
  useEffect(() => {
    if (selectedFolderId) {
      setActiveScope(selectedFolderId);
    }
  }, [selectedFolderId]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
      if (pageDropdownRef.current && !pageDropdownRef.current.contains(e.target as Node)) {
        setIsPageDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup hover timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  // Quick Action: generate idiomatic import or binding call
  const getReferenceSnippet = (asset: AssetEntry): string => {
    switch (asset.category) {
      case "blueprint":
        return `useBlueprint("${asset.name.replace(".bp.json", "")}")`;
      case "sequencer":
        return `useSequence("${asset.name.replace(".seq", "")}")`;
      case "component":
        return `<${asset.name.replace(".tsx", "")} />`;
      case "database":
        return `db.collection("${asset.name.replace(".db", "")}")`;
      case "page":
        return `"${asset.name.replace(".page", "")}"`;
      case "asset":
        return `"/assets/${asset.name}"`;
    }
  };

  const handleCopyReference = (asset: AssetEntry) => {
    const snippet = getReferenceSnippet(asset);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(snippet).catch(() => {});
    }
    setCopiedAssetId(asset.id);
    setToastMessage(`Copied: ${snippet}`);
    setTimeout(() => {
      setCopiedAssetId((id) => (id === asset.id ? null : id));
    }, 1800);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleLocateAsset = (asset: AssetEntry) => {
    onSelectFolder?.(asset.folderId, asset.folderName);
    setToastMessage(`Locating: ${asset.folderName}`);
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  // Hover handlers for 1-second dwell inspection card
  const handleCardMouseEnter = (asset: AssetEntry, e: React.MouseEvent) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const clientX = e.clientX;
    const clientY = e.clientY;
    hoverAnchorPosRef.current = { x: clientX, y: clientY };

    // 1-Second Dwell Timer (1000ms)
    hoverTimerRef.current = setTimeout(() => {
      setHoveredAsset(asset);
      setInspectorPos({
        x: Math.min(clientX + 8, window.innerWidth - 310),
        y: Math.min(clientY + 14, window.innerHeight - 300),
      });
    }, 1000);
  };

  const handleCardMouseMove = (asset: AssetEntry, e: React.MouseEvent) => {
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (hoveredAsset) {
      // If inspector is active: vanish if moved > 25px from anchor
      if (hoverAnchorPosRef.current) {
        const dist = Math.hypot(clientX - hoverAnchorPosRef.current.x, clientY - hoverAnchorPosRef.current.y);
        if (dist > 25) {
          if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
          setHoveredAsset(null);
          setInspectorPos(null);
          hoverAnchorPosRef.current = { x: clientX, y: clientY };
          // Start waiting for next 1-second dwell
          hoverTimerRef.current = setTimeout(() => {
            setHoveredAsset(asset);
            setInspectorPos({
              x: Math.min(clientX + 8, window.innerWidth - 310),
              y: Math.min(clientY + 14, window.innerHeight - 300),
            });
          }, 1000);
        }
      }
    } else {
      // Inspector not showing yet: reset dwell timer with current coordinates
      hoverAnchorPosRef.current = { x: clientX, y: clientY };
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        setHoveredAsset(asset);
        setInspectorPos({
          x: Math.min(clientX + 8, window.innerWidth - 310),
          y: Math.min(clientY + 14, window.innerHeight - 300),
        });
      }, 1000);
    }
  };

  const handleCardMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    hoverAnchorPosRef.current = null;
    setHoveredAsset(null);
    setInspectorPos(null);
  };

  // Toggle individual category in checklist
  const toggleCategory = (cat: AssetCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const handleSelectAllCategories = () => {
    setSelectedCategories(new Set(["blueprint", "sequencer", "component", "page", "database", "asset"]));
  };

  const handleClearCategories = () => {
    setSelectedCategories(new Set());
  };

  // Scope Label & Asset Filtering
  const scopeOptions = [
    { id: "all", label: "All Pages & Assets", type: "all" },
    { id: "page_home", label: "Page: Home (index.tsx)", type: "page" },
    { id: "page_pricing", label: "Page: Pricing (/pricing)", type: "page" },
    { id: "page_dashboard", label: "Page: Dashboard (/dashboard)", type: "page" },
    { id: "comp_hero", label: "Section: Hero Section", type: "section" },
    { id: "comp_navbar", label: "Section: Navbar", type: "section" },
    { id: "comp_grid", label: "Section: Feature Grid", type: "section" },
    { id: "comp_footer", label: "Section: Studio Footer", type: "section" },
    { id: "blueprints_root", label: "Logic Blueprints (Global)", type: "blueprints" },
    { id: "sequencer_root", label: "Timeline Sequences (Global)", type: "sequencer" },
    { id: "database_root", label: "Database Models", type: "database" },
  ];

  const currentScopeItem = scopeOptions.find((s) => s.id === activeScope) || {
    id: activeScope,
    label: selectedFolderName || "Custom Folder",
    type: "custom",
  };

  const filteredAssets = useMemo(() => {
    return PROJECT_ASSETS.filter((item) => {
      // 1. Scope filter
      if (activeScope !== "all") {
        const matchesScope =
          item.pageId === activeScope ||
          item.folderId === activeScope ||
          (activeScope === "page_home" && (item.pageId === "page_home" || item.folderId.startsWith("comp_"))) ||
          (activeScope === "blueprints_root" && item.category === "blueprint") ||
          (activeScope === "sequencer_root" && item.category === "sequencer") ||
          (activeScope === "database_root" && item.category === "database");

        if (!matchesScope) return false;
      }

      // 2. Checklist Category filter
      if (!selectedCategories.has(item.category)) {
        return false;
      }

      // 3. Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches =
          item.name.toLowerCase().includes(query) ||
          item.typeLabel.toLowerCase().includes(query) ||
          item.parentClass.toLowerCase().includes(query) ||
          item.folderName.toLowerCase().includes(query) ||
          item.connections.some((c) => c.toLowerCase().includes(query)) ||
          (item.description && item.description.toLowerCase().includes(query));
        if (!matches) return false;
      }

      return true;
    });
  }, [activeScope, selectedCategories, searchQuery]);

  // Counts per category in current scope
  const categoryCounts = useMemo(() => {
    const counts: Record<AssetCategory, number> = {
      blueprint: 0,
      sequencer: 0,
      component: 0,
      page: 0,
      database: 0,
      asset: 0,
    };

    PROJECT_ASSETS.forEach((item) => {
      if (activeScope !== "all") {
        const matchesScope =
          item.pageId === activeScope ||
          item.folderId === activeScope ||
          (activeScope === "page_home" && (item.pageId === "page_home" || item.folderId.startsWith("comp_"))) ||
          (activeScope === "blueprints_root" && item.category === "blueprint") ||
          (activeScope === "sequencer_root" && item.category === "sequencer") ||
          (activeScope === "database_root" && item.category === "database");

        if (!matchesScope) return;
      }

      counts[item.category]++;
    });

    return counts;
  }, [activeScope]);

  const getCategoryIcon = (category: AssetEntry["category"]) => {
    switch (category) {
      case "blueprint":
        return <Cpu size={20} style={{ color: "#818CF8" }} />;
      case "sequencer":
        return <Film size={20} style={{ color: "#C084FC" }} />;
      case "component":
        return <Box size={20} style={{ color: "#34D399" }} />;
      case "database":
        return <Database size={20} style={{ color: "#2DD4BF" }} />;
      case "page":
        return <FileCode2 size={20} style={{ color: "#60A5FA" }} />;
      case "asset":
        return <ImageIcon size={20} style={{ color: "#FBBF24" }} />;
    }
  };

  /** Double click triggers opening in the top cross bar (FullPageDock) */
  const handleDoubleClick = (asset: AssetEntry) => {
    onOpenAsset?.(asset.id, asset.name);
  };

  /** Drag start initiates HTML5 drag with asset metadata */
  const handleCardDragStart = (asset: AssetEntry, e: React.DragEvent) => {
    if ((e.target as HTMLElement).closest("button")) {
      e.preventDefault();
      return;
    }

    const payload = {
      type: "asset",
      id: asset.id,
      name: asset.name,
      category: asset.category,
      parentClass: asset.parentClass,
      typeLabel: asset.typeLabel,
      folderName: asset.folderName,
    };

    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.setData("text/plain", asset.name);
    e.dataTransfer.effectAllowed = "copyMove";
  };

  /** Pointer-down tracking for tear-off gesture towards top menu or floating window */
  const handleCardPointerDown = (asset: AssetEntry, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;

    const originX = e.clientX;
    const originY = e.clientY;
    let activated = false;

    const onPointerMove = (moveEvt: PointerEvent) => {
      if (activated) return;
      const dx = moveEvt.clientX - originX;
      const dy = moveEvt.clientY - originY;
      if (Math.sqrt(dx * dx + dy * dy) >= 20) {
        activated = true;
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        onTearOffItem?.(asset.id, asset.name, originX, originY);
      }
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  };

  return (
    <div className="cb-main-area" role="region" aria-label="Content & Asset Browser">
      {/* ===================================================================
       * TOP TOOLBAR WITH DROPDOWN CHECKLIST & PAGE FILTER
       * =================================================================== */}
      <div className="cb-nav-row" style={{ flexWrap: "wrap", gap: 8, padding: "6px 12px" }}>
        {/* Breadcrumb path */}
        <div className="cb-breadcrumbs" style={{ marginRight: 4 }}>
          <Folder size={13} style={{ color: "var(--accent-primary)" }} />
          <span
            className="cb-breadcrumb-item"
            onClick={() => setActiveScope("all")}
          >
            Content
          </span>
          <ChevronRight size={11} />
        </div>

        {/* 1. Page & Folder Scope Dropdown */}
        <div className="cb-dropdown-container" ref={pageDropdownRef}>
          <button
            type="button"
            className={`cb-dropdown-btn ${activeScope !== "all" ? "cb-dropdown-btn--active" : ""}`}
            onClick={() => {
              setIsPageDropdownOpen((v) => !v);
              setIsFilterDropdownOpen(false);
            }}
            title="Switch Page or Folder Scope"
          >
            <Folder size={12} style={{ color: activeScope !== "all" ? "var(--accent-primary)" : "var(--text-muted)" }} />
            <span>{currentScopeItem.label}</span>
            <ChevronDown size={11} />
          </button>

          {isPageDropdownOpen && (
            <div className="cb-page-menu">
              <button
                type="button"
                className={`cb-page-menu__item ${activeScope === "all" ? "cb-page-menu__item--active" : ""}`}
                onClick={() => {
                  setActiveScope("all");
                  setIsPageDropdownOpen(false);
                  onSelectFolder?.("", "All Pages & Assets");
                }}
              >
                <span>All Pages & Assets</span>
                <span className="cb-dropdown-badge">{PROJECT_ASSETS.length}</span>
              </button>

              <div className="cb-page-menu__group-title">Pages (Blueprints & Anims)</div>
              {scopeOptions
                .filter((s) => s.type === "page")
                .map((page) => (
                  <button
                    key={page.id}
                    type="button"
                    className={`cb-page-menu__item ${activeScope === page.id ? "cb-page-menu__item--active" : ""}`}
                    onClick={() => {
                      setActiveScope(page.id);
                      setIsPageDropdownOpen(false);
                      onSelectFolder?.(page.id, page.label);
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <FileText size={11} style={{ color: "#60A5FA" }} />
                      <span>{page.label}</span>
                    </span>
                  </button>
                ))}

              <div className="cb-page-menu__group-title">Sections & Folders</div>
              {scopeOptions
                .filter((s) => s.type === "section")
                .map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    className={`cb-page-menu__item ${activeScope === sec.id ? "cb-page-menu__item--active" : ""}`}
                    onClick={() => {
                      setActiveScope(sec.id);
                      setIsPageDropdownOpen(false);
                      onSelectFolder?.(sec.id, sec.label);
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Folder size={11} style={{ color: "var(--accent-primary)" }} />
                      <span>{sec.label}</span>
                    </span>
                  </button>
                ))}

              <div className="cb-page-menu__group-title">Global Logic & Data</div>
              {scopeOptions
                .filter((s) => s.type === "blueprints" || s.type === "sequencer" || s.type === "database")
                .map((glob) => (
                  <button
                    key={glob.id}
                    type="button"
                    className={`cb-page-menu__item ${activeScope === glob.id ? "cb-page-menu__item--active" : ""}`}
                    onClick={() => {
                      setActiveScope(glob.id);
                      setIsPageDropdownOpen(false);
                      onSelectFolder?.(glob.id, glob.label);
                    }}
                  >
                    <span>{glob.label}</span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* 2. Asset Types Checklist Dropdown */}
        <div className="cb-dropdown-container" ref={filterDropdownRef}>
          <button
            type="button"
            className={`cb-dropdown-btn ${selectedCategories.size < ALL_CATEGORY_OPTIONS.length ? "cb-dropdown-btn--active" : ""}`}
            onClick={() => {
              setIsFilterDropdownOpen((v) => !v);
              setIsPageDropdownOpen(false);
            }}
            title="Filter by Asset Types"
          >
            <SlidersHorizontal size={12} />
            <span>Filter Types</span>
            <span className="cb-dropdown-badge">
              {selectedCategories.size === ALL_CATEGORY_OPTIONS.length
                ? "All"
                : `${selectedCategories.size}/${ALL_CATEGORY_OPTIONS.length}`}
            </span>
            <ChevronDown size={11} />
          </button>

          {isFilterDropdownOpen && (
            <div className="cb-checklist-dropdown">
              <div className="cb-checklist-header">
                <span>Asset Checklist</span>
                <div className="cb-checklist-header__actions">
                  <button
                    type="button"
                    className="cb-checklist-header__link"
                    onClick={handleSelectAllCategories}
                  >
                    Select All
                  </button>
                  <span style={{ color: "var(--border-strong)" }}>•</span>
                  <button
                    type="button"
                    className="cb-checklist-header__link"
                    onClick={handleClearCategories}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="cb-checklist-list">
                {ALL_CATEGORY_OPTIONS.map((opt) => {
                  const isChecked = selectedCategories.has(opt.id);
                  const count = categoryCounts[opt.id];
                  return (
                    <div
                      key={opt.id}
                      className={`cb-checklist-item ${isChecked ? "cb-checklist-item--checked" : ""}`}
                      onClick={() => toggleCategory(opt.id)}
                    >
                      <div className="cb-checklist-item__left">
                        <div className={`cb-checkbox ${isChecked ? "cb-checkbox--checked" : ""}`}>
                          {isChecked && <Check size={10} />}
                        </div>
                        {opt.icon}
                        <span>{opt.label}</span>
                        <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                          {opt.ext}
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: 10,
                          padding: "1px 5px",
                          borderRadius: 8,
                          background: isChecked ? "rgba(99, 102, 241, 0.2)" : "var(--surface-panel-hover)",
                          color: isChecked ? "#A5B4FC" : "var(--text-tertiary)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="panel-search-bar" style={{ maxWidth: 200, height: 26, marginLeft: "auto" }}>
          <Search size={11} className="panel-search-bar__icon" />
          <input
            type="text"
            className="panel-search-bar__input"
            placeholder="Search blueprints & assets..."
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

        {/* View mode toggle and actions */}
        <div className="panel-header__actions">
          <button
            type="button"
            className={`panel-icon-btn ${viewMode === "grid" ? "panel-icon-btn--active" : ""}`}
            onClick={() => setViewMode("grid")}
            title="Grid View"
            style={{ width: 26, height: 26 }}
          >
            <LayoutGrid size={12} />
          </button>
          <button
            type="button"
            className={`panel-icon-btn ${viewMode === "list" ? "panel-icon-btn--active" : ""}`}
            onClick={() => setViewMode("list")}
            title="List View"
            style={{ width: 26, height: 26 }}
          >
            <List size={12} />
          </button>
          <button type="button" className="panel-icon-btn" title="Import Asset" style={{ width: 26, height: 26 }}>
            <Upload size={12} />
          </button>
          <button type="button" className="panel-icon-btn" title="New Asset" style={{ width: 26, height: 26 }}>
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Outliner Sync Banner (when scoped) */}
      {activeScope !== "all" && (
        <div className="cb-scope-banner">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
            <span>
              Scoped to: <strong>{currentScopeItem.label}</strong> ({filteredAssets.length} items • hover 1s for inspection details • double-click to open in cross bar)
            </span>
          </div>

          <button
            type="button"
            className="cb-scope-banner__btn"
            onClick={() => {
              setActiveScope("all");
              onSelectFolder?.("", "All Pages & Assets");
            }}
          >
            Show All Project Assets
          </button>
        </div>
      )}

      {/* ===================================================================
       * ASSET CARDS STAGE (FULL WIDTH GRID / LIST)
       * =================================================================== */}
      <div className="panel-content" style={{ flex: 1, overflowY: "auto" }}>
        {filteredAssets.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              padding: "32px",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <Folder size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              No items match the active filters
            </div>
            <div style={{ fontSize: 11, marginTop: 4 }}>
              Try adjusting the checklist filters or switching the page scope.
            </div>
            <button
              type="button"
              className="cb-scope-banner__btn"
              style={{ marginTop: 12 }}
              onClick={() => {
                handleSelectAllCategories();
                setActiveScope("all");
                setSearchQuery("");
              }}
            >
              Reset Filters & Show All
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="cb-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="asset-card"
                title={`Drag to viewport/tab bar or double-click to open ${asset.name}`}
                draggable={true}
                onDragStart={(e) => handleCardDragStart(asset, e)}
                onPointerDown={(e) => handleCardPointerDown(asset, e)}
                onDoubleClick={() => handleDoubleClick(asset)}
                onMouseEnter={(e) => handleCardMouseEnter(asset, e)}
                onMouseMove={(e) => handleCardMouseMove(asset, e)}
                onMouseLeave={handleCardMouseLeave}
              >
                {/* Preview Box */}
                <div
                  className="asset-card__preview"
                  style={{
                    background:
                      asset.category === "blueprint"
                        ? "radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(20, 20, 28, 0.9) 100%)"
                        : asset.category === "sequencer"
                        ? "radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, rgba(20, 20, 28, 0.9) 100%)"
                        : asset.category === "database"
                        ? "radial-gradient(circle, rgba(20, 184, 166, 0.18) 0%, rgba(20, 20, 28, 0.9) 100%)"
                        : undefined,
                  }}
                >
                  <span
                    className="asset-card__type-badge"
                    style={{
                      background:
                        asset.category === "blueprint"
                          ? "rgba(67, 56, 202, 0.9)"
                          : asset.category === "sequencer"
                          ? "rgba(124, 58, 237, 0.9)"
                          : undefined,
                      color:
                        asset.category === "blueprint" || asset.category === "sequencer"
                          ? "#FFFFFF"
                          : undefined,
                    }}
                  >
                    {asset.typeLabel}
                  </span>
                  {getCategoryIcon(asset.category)}
                </div>

                <div className="asset-card__info">
                  {/* Element Type label in very small text just above the name */}
                  <div
                    className="asset-card__type-above-name"
                    style={{ color: getCategoryColor(asset.category) }}
                    title={`Type: ${getCategoryDisplayName(asset.category)}`}
                  >
                    <span
                      className="asset-card__type-dot"
                      style={{ background: getCategoryColor(asset.category) }}
                    />
                    <span>{getCategoryDisplayName(asset.category)}</span>
                  </div>

                  {/* Name + small text how many minutes ago connected */}
                  <div className="asset-card__header-row">
                    <span className="asset-card__name" title={asset.name}>
                      {asset.name}
                    </span>
                    <span className="asset-card__connected-time" title={`Connected ${asset.connectedAgo}`}>
                      • {asset.connectedAgo}
                    </span>
                  </div>

                  {/* Parent Class written just below name */}
                  <div className="asset-card__parent-class" title={`Parent Class: ${asset.parentClass}`}>
                    <span className="asset-card__parent-label">Parent:</span>
                    <span>{asset.parentClass}</span>
                  </div>

                  {/* 2 Preview Connections + remainder count */}
                  {asset.connections && asset.connections.length > 0 && (
                    <div className="asset-card__connections-row" title={`Connected to: ${asset.connections.join(", ")}`}>
                      {asset.connections.slice(0, 2).map((conn, idx) => (
                        <span key={idx} className="asset-card__conn-pill" title={conn}>
                          {conn}
                        </span>
                      ))}
                      {asset.connections.length > 2 && (
                        <span className="asset-card__conn-more" title={`+${asset.connections.length - 2} more connections`}>
                          +{asset.connections.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Status indicator + Quick Action Toolbar (Locate, Copy Ref, Pop-out) */}
                  <div className="asset-card__footer-row">
                    <div
                      className="asset-card__status-indicator"
                      title="Synchronized in Active Project AST"
                    >
                      <span className="asset-card__status-dot" />
                      <span>
                        {asset.events && asset.events.length > 0
                          ? `${asset.events.length} Events`
                          : asset.connections && asset.connections.length > 0
                          ? `${asset.connections.length} Refs`
                          : "AST Synced"}
                      </span>
                    </div>

                    <div className="asset-card__toolbar">
                      <button
                        type="button"
                        className="asset-card__tool-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLocateAsset(asset);
                        }}
                        title={`Locate in Outliner & Viewport (${asset.folderName})`}
                      >
                        <Crosshair size={11} />
                      </button>

                      <button
                        type="button"
                        className={`asset-card__tool-btn ${copiedAssetId === asset.id ? "asset-card__tool-btn--copied" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyReference(asset);
                        }}
                        title={`Copy code reference (${getReferenceSnippet(asset)})`}
                      >
                        {copiedAssetId === asset.id ? (
                          <Check size={11} style={{ color: "#10B981" }} />
                        ) : (
                          <Copy size={11} />
                        )}
                      </button>

                      {onTearOffItem && (
                        <button
                          type="button"
                          className="asset-card__tool-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            onTearOffItem(asset.id, asset.name, rect.right + 12, rect.top);
                          }}
                          title="Pop out into floating window"
                        >
                          <Maximize2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
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
                style={{ padding: "6px 10px", height: 42, cursor: "grab" }}
                title={`Drag to viewport/tab bar or double-click to open ${asset.name}`}
                draggable={true}
                onDragStart={(e) => handleCardDragStart(asset, e)}
                onPointerDown={(e) => handleCardPointerDown(asset, e)}
                onDoubleClick={() => handleDoubleClick(asset)}
                onMouseEnter={(e) => handleCardMouseEnter(asset, e)}
                onMouseMove={(e) => handleCardMouseMove(asset, e)}
                onMouseLeave={handleCardMouseLeave}
              >
                <div className="tree-node__icon">{getCategoryIcon(asset.category)}</div>
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, justifyContent: "center" }}>
                  <div
                    className="asset-card__type-above-name"
                    style={{ color: getCategoryColor(asset.category), marginBottom: 1 }}
                  >
                    <span
                      className="asset-card__type-dot"
                      style={{ background: getCategoryColor(asset.category) }}
                    />
                    <span>{getCategoryDisplayName(asset.category)}</span>
                  </div>
                  <span
                    className="tree-node__label"
                    style={{ fontWeight: "var(--font-medium)" }}
                  >
                    {asset.name}
                  </span>
                </div>
                <span className="tree-node__tag">{asset.typeLabel}</span>
                <span className="asset-card__connected-time" style={{ marginRight: 10 }}>
                  {asset.connectedAgo}
                </span>
                <span className="asset-card__parent-class" style={{ margin: 0, marginRight: 10 }}>
                  <span className="asset-card__parent-label">Parent:</span> {asset.parentClass}
                </span>
                <div className="asset-card__status-indicator" style={{ marginRight: 8 }}>
                  <span className="asset-card__status-dot" />
                  <span>{asset.events && asset.events.length > 0 ? `${asset.events.length} Events` : "AST Synced"}</span>
                </div>
                <div className="asset-card__toolbar" style={{ marginRight: 4 }}>
                  <button
                    type="button"
                    className="asset-card__tool-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLocateAsset(asset);
                    }}
                    title={`Locate in Outliner (${asset.folderName})`}
                  >
                    <Crosshair size={11} />
                  </button>
                  <button
                    type="button"
                    className={`asset-card__tool-btn ${copiedAssetId === asset.id ? "asset-card__tool-btn--copied" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyReference(asset);
                    }}
                    title="Copy code reference"
                  >
                    {copiedAssetId === asset.id ? <Check size={11} style={{ color: "#10B981" }} /> : <Copy size={11} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===================================================================
       * 1-SECOND HOVER DWELL INSPECTION POPUP (JUST BELOW MOUSE CURSOR)
       * =================================================================== */}
      {hoveredAsset && inspectorPos && (
        <div
          className="cb-hover-inspector"
          style={{ top: inspectorPos.y, left: inspectorPos.x }}
          role="tooltip"
        >
          <div className="cb-hover-inspector__header">
            <div>
              <div className="cb-hover-inspector__title">{hoveredAsset.name}</div>
              <div className="cb-hover-inspector__connected">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
                <span>Connected {hoveredAsset.connectedAgo} • Active in AST</span>
              </div>
            </div>
            <span
              className="asset-card__type-badge"
              style={{
                position: "static",
                background:
                  hoveredAsset.category === "blueprint"
                    ? "rgba(67, 56, 202, 0.9)"
                    : hoveredAsset.category === "sequencer"
                    ? "rgba(124, 58, 237, 0.9)"
                    : undefined,
                color:
                  hoveredAsset.category === "blueprint" || hoveredAsset.category === "sequencer"
                    ? "#FFFFFF"
                    : undefined,
              }}
            >
              {hoveredAsset.typeLabel}
            </span>
          </div>

          <div className="cb-hover-inspector__section">
            <span className="cb-hover-inspector__label">Parent Class Hierarchy</span>
            <span className="cb-hover-inspector__val" style={{ color: "#A5B4FC", fontWeight: 600 }}>
              {hoveredAsset.parentClass} ➔ HTMLElement
            </span>
          </div>

          <div className="cb-hover-inspector__section">
            <span className="cb-hover-inspector__label">
              All Connected Components ({hoveredAsset.connections.length})
            </span>
            <div className="cb-hover-inspector__badge-list">
              {hoveredAsset.connections.map((conn, idx) => (
                <span key={idx} className="cb-hover-inspector__badge cb-hover-inspector__badge--active">
                  {conn}
                </span>
              ))}
            </div>
          </div>

          {hoveredAsset.events && hoveredAsset.events.length > 0 && (
            <div className="cb-hover-inspector__section">
              <span className="cb-hover-inspector__label">Trigger Events</span>
              <div className="cb-hover-inspector__badge-list">
                {hoveredAsset.events.map((evt, idx) => (
                  <span key={idx} className="cb-hover-inspector__badge">
                    ⚡ {evt}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hoveredAsset.description && (
            <div className="cb-hover-inspector__section">
              <span className="cb-hover-inspector__label">Description</span>
              <span className="cb-hover-inspector__val" style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                {hoveredAsset.description}
              </span>
            </div>
          )}

          <div className="cb-hover-inspector__footer">
            <ExternalLink size={10} />
            <span>Double-click to open in cross-bar editor</span>
          </div>
        </div>
      )}

      {/* Micro-toast feedback for quick actions (copied snippet, locate) */}
      {toastMessage && (
        <div className="cb-toast-feedback" role="status" aria-live="polite">
          <Check size={11} style={{ color: "#10B981" }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
