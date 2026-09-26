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
  Eye,
  EyeOff,
  Lock,
  Unlock,
  PanelLeft,
  PanelRight,
  FolderTree,
  Play,
  Save,
  Trash2,
  Code,
  Sliders,
  Pencil,
  AlertCircle,
  Info,
  Shield,
} from "lucide-react";
import "@/editor/styles/panels.css";
import "@/editor/styles/forms.css";
import { TreeNode, INITIAL_TREE_DATA } from "@/editor/panels/outliner/OutlinerTree";
import { TYPE_REGISTRY } from "@/core/engine/ElementGrammarEngine";
import {
  AnimationBinding,
  AnimationCategory,
  GrammarElementType,
} from "@/core/types/element-grammar";
import {
  resolveGrammarElementType,
  convertTracksToGrammarBindings,
  getPropertyRenderingTier,
  getCategoryPriorityInfo,
} from "@/core/engine/grammarHelpers";
// Phase 8, Sub-Phase 8.4: the "+" menu and every add/block decision below
// come only from `rules.canAdd`-family calls, not from reading
// `TYPE_REGISTRY.allowedCategories`/`blockedCategories` directly (grammar §8;
// decision 0005 §5). `TYPE_REGISTRY` above is still read for pure metadata
// display (max-track counts, the contract's category label) — never for a
// compatibility decision.
import { canAddFromBindings, type CanAddCandidate } from "@/core/rules";
import { createId } from "@/core/ids";

export type AnimationTrigger = "load" | "hover" | "click" | "scroll" | "state";

export interface PropertyDelta {
  property: string;
  from: string;
  to: string;
}

export interface ElementAnimationTrack {
  id: string;
  name: string;
  trigger: AnimationTrigger;
  duration: number;
  delay: number;
  easing: string;
  properties: PropertyDelta[];
  isCustomTuned?: boolean;
}

export interface AnimationPreset {
  id: string;
  name: string;
  description: string;
  trigger: AnimationTrigger;
  duration: number;
  delay: number;
  easing: string;
  properties: PropertyDelta[];
  badge: string;
}

export const ANIMATION_PRESETS: AnimationPreset[] = [
  {
    id: "preset_fade_in_up",
    name: "Fade In Up",
    description: "Smooth vertical slide & opacity reveal for hero headers & cards",
    trigger: "load",
    duration: 0.6,
    delay: 0.1,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    properties: [
      { property: "transform.y", from: "24px", to: "0px" },
      { property: "appearance.opacity", from: "0", to: "1" },
    ],
    badge: "Entrance",
  },
  {
    id: "preset_spring_pop",
    name: "Spring Pop",
    description: "Tactile bouncy hover response for CTA buttons and cards",
    trigger: "hover",
    duration: 0.45,
    delay: 0,
    easing: "elastic.out(1.2, 0.35)",
    properties: [
      { property: "transform.scale", from: "1.0", to: "1.06" },
      { property: "transform.y", from: "0px", to: "-3px" },
    ],
    badge: "Tactile",
  },
  {
    id: "preset_scale_pulse",
    name: "Scale Pulse",
    description: "Subtle rhythmic attention-grabber for badges & notifications",
    trigger: "state",
    duration: 0.8,
    delay: 0,
    easing: "easeInOut",
    properties: [
      { property: "transform.scale", from: "1.0", to: "1.12" },
      { property: "appearance.opacity", from: "0.85", to: "1.0" },
    ],
    badge: "Loopable",
  },
  {
    id: "preset_card_flip",
    name: "Card Flip 3D",
    description: "Cinematic 3D flip card transition on click",
    trigger: "click",
    duration: 0.75,
    delay: 0,
    easing: "back.out(1.4)",
    properties: [
      { property: "transform.rotateY", from: "180deg", to: "0deg" },
      { property: "appearance.opacity", from: "0", to: "1" },
    ],
    badge: "3D Transform",
  },
  {
    id: "preset_scroll_scrub",
    name: "Scroll Parallax Scrub",
    description: "Smooth viewport scrub linked directly to scroll position",
    trigger: "scroll",
    duration: 1.0,
    delay: 0,
    easing: "none",
    properties: [
      { property: "transform.y", from: "48px", to: "-32px" },
      { property: "transform.scale", from: "0.96", to: "1.0" },
    ],
    badge: "ScrollTrigger",
  },
];

export const TRIGGER_CONFIGS: Record<
  AnimationTrigger,
  { label: string; icon: string; bg: string; color: string; border: string }
> = {
  load: {
    label: "On Load",
    icon: "⚡",
    bg: "rgba(99, 102, 241, 0.1)",
    color: "#4F46E5",
    border: "rgba(99, 102, 241, 0.25)",
  },
  hover: {
    label: "Hover",
    icon: "👆",
    bg: "rgba(16, 185, 129, 0.1)",
    color: "#059669",
    border: "rgba(16, 185, 129, 0.25)",
  },
  click: {
    label: "Click",
    icon: "🖱️",
    bg: "rgba(245, 158, 11, 0.1)",
    color: "#D97706",
    border: "rgba(245, 158, 11, 0.25)",
  },
  scroll: {
    label: "Scroll",
    icon: "📜",
    bg: "rgba(59, 130, 246, 0.1)",
    color: "#2563EB",
    border: "rgba(59, 130, 246, 0.25)",
  },
  state: {
    label: "State",
    icon: "⚙️",
    bg: "rgba(168, 85, 247, 0.1)",
    color: "#9333EA",
    border: "rgba(168, 85, 247, 0.25)",
  },
};

const INITIAL_ELEMENT_TRACKS: Record<string, ElementAnimationTrack[]> = {
  untitled: [
    {
      id: "trk_entrance",
      name: "Entrance Reveal",
      trigger: "load",
      duration: 0.6,
      delay: 0.15,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      properties: [
        { property: "transform.y", from: "24px", to: "0px" },
        { property: "appearance.opacity", from: "0", to: "1" },
      ],
      isCustomTuned: true,
    },
    {
      id: "trk_hover",
      name: "Tactile Lift on Hover",
      trigger: "hover",
      duration: 0.4,
      delay: 0,
      easing: "elastic.out(1, 0.4)",
      properties: [
        { property: "transform.y", from: "0px", to: "-4px" },
        { property: "transform.scale", from: "1.0", to: "1.02" },
      ],
      isCustomTuned: false,
    },
  ],
};

export type AssetCategory = "sequence" | "curve" | "scroll" | "trigger" | "loop" | "sequencer";

export interface AssetEntry {
  id: string;
  name: string;
  category: AssetCategory;
  pageId: string;
  folderId: string;
  folderName: string;
  typeLabel: string;
  connectedAgo: string;
  parentClass: string;
  connections: string[];
  description?: string;
  events?: string[];
  boundState?: string[];
}

export const ANIMATION_CATEGORY_OPTIONS: { id: AssetCategory; label: string; ext: string; icon: React.ReactNode; color: string }[] = [
  { id: "sequence", label: "Timeline Sequences", ext: ".seq", icon: <Film size={13} style={{ color: "#8B5CF6" }} />, color: "#8B5CF6" },
  { id: "curve", label: "Easing & Curves", ext: ".curve", icon: <Sliders size={13} style={{ color: "#3B82F6" }} />, color: "#3B82F6" },
  { id: "scroll", label: "ScrollTrigger Scrubs", ext: ".scroll", icon: <Layers size={13} style={{ color: "#10B981" }} />, color: "#10B981" },
  { id: "trigger", label: "Interactive Triggers", ext: ".trigger", icon: <Zap size={13} style={{ color: "#F59E0B" }} />, color: "#F59E0B" },
  { id: "loop", label: "State & Ambient Loops", ext: ".loop", icon: <Sparkles size={13} style={{ color: "#EC4899" }} />, color: "#EC4899" },
];

export const getCategoryDisplayName = (category: AssetCategory): string => {
  switch (category) {
    case "sequence":
    case "sequencer":
      return "Timeline Sequence";
    case "curve":
      return "Easing Curve";
    case "scroll":
      return "ScrollTrigger Scrub";
    case "trigger":
      return "Interactive Trigger";
    case "loop":
      return "State & Ambient Loop";
    default:
      return "Animation Asset";
  }
};

export const getCategoryColor = (category: AssetCategory): string => {
  switch (category) {
    case "sequence":
    case "sequencer":
      return "#8B5CF6";
    case "curve":
      return "#3B82F6";
    case "scroll":
      return "#10B981";
    case "trigger":
      return "#F59E0B";
    case "loop":
      return "#EC4899";
    default:
      return "#206859";
  }
};

const PROJECT_ASSETS: AssetEntry[] = [];

export interface ContentBrowserProps {
  selectedFolderId?: string;
  selectedFolderName?: string;
  onSelectFolder?: (folderId: string, folderName: string) => void;
  onOpenAsset?: (assetId: string, assetName: string) => void;
  onTearOffItem?: (panelId: string, panelTitle: string, originX: number, originY: number) => void;
  onSelectElement?: (element: { id: string; name: string } | null) => void;
  onOpenCurveEditor?: (property?: string) => void;
  onOpenExportPreview?: () => void;
}

const NO_TRACKS: ElementAnimationTrack[] = [];

export const ContentBrowser: React.FC<ContentBrowserProps> = ({
  selectedFolderId,
  selectedFolderName,
  onSelectFolder,
  onOpenAsset,
  onTearOffItem,
  onSelectElement,
  onOpenCurveEditor,
  onOpenExportPreview,
}) => {
  // Project Assets state (starts empty as requested)
  const [projectAssets, setProjectAssets] = useState<AssetEntry[]>(PROJECT_ASSETS);

  // Stack name and renaming capability (defaults to "Untitled")
  const [stackName, setStackName] = useState<string>("Untitled");
  const [isEditingStackName, setIsEditingStackName] = useState<boolean>(false);
  const [tempStackName, setTempStackName] = useState<string>("Untitled");
  const stackNameInputRef = useRef<HTMLInputElement>(null);

  // Element Animation Stack state
  const [elementTracks, setElementTracks] = useState<Record<string, ElementAnimationTrack[]>>(INITIAL_ELEMENT_TRACKS);
  const [isAddPresetOpen, setIsAddPresetOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<"candidates" | "presets">("candidates");
  const [activeTriggerDropdownTrackId, setActiveTriggerDropdownTrackId] = useState<string | null>(null);
  const [expandedTrackIds, setExpandedTrackIds] = useState<Record<string, boolean>>({ trk_entrance: true });
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
  const [savingTrackPreset, setSavingTrackPreset] = useState<ElementAnimationTrack | null>(null);
  const [customPresetName, setCustomPresetName] = useState<string>("");

  // Outliner Drawer State (Unreal Engine Sources Tree)
  const [isOutlinerOpen, setIsOutlinerOpen] = useState(true);
  const [outlinerPosition, setOutlinerPosition] = useState<"left" | "right">("left");
  const [outlinerWidth, setOutlinerWidth] = useState(315);
  const [isResizingOutliner, setIsResizingOutliner] = useState(false);
  const [outlinerSearch, setOutlinerSearch] = useState("");
  const [openTreeNodes, setOpenTreeNodes] = useState<Record<string, boolean>>({
    pages_root: true,
    page_home: true,
    blueprints_root: true,
    sequencer_root: true,
  });
  const [hiddenTreeNodes, setHiddenTreeNodes] = useState<Record<string, boolean>>({});
  const [lockedTreeNodes, setLockedTreeNodes] = useState<Record<string, boolean>>({});
  const [selectedTreeNodeId, setSelectedTreeNodeId] = useState<string>("untitled");

  const splitContainerRef = useRef<HTMLDivElement>(null);

  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingOutliner(true);
    const startX = e.clientX;
    const startWidth = outlinerWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = outlinerPosition === "left" ? startWidth + delta : startWidth - delta;
      setOutlinerWidth(Math.max(180, Math.min(480, nextWidth)));
    };

    const handleMouseUp = () => {
      setIsResizingOutliner(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleSelectTreeNode = (node: TreeNode) => {
    setSelectedTreeNodeId(node.id);
    setActiveScope(node.id);
    setStackName(node.label);
    setTempStackName(node.label);
    onSelectFolder?.(node.id, node.label);
    if (onSelectElement) {
      onSelectElement({ id: node.id, name: node.label });
    }
  };

  const totalTreeCount = useMemo(() => {
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
    }
  };

  const renderOutlinerTree = (nodes: TreeNode[]): React.ReactNode => {
    return nodes.map((node) => {
      const isVisible =
        !outlinerSearch ||
        node.label.toLowerCase().includes(outlinerSearch.toLowerCase()) ||
        node.tag.toLowerCase().includes(outlinerSearch.toLowerCase()) ||
        (node.children &&
          node.children.some(
            (c) =>
              c.label.toLowerCase().includes(outlinerSearch.toLowerCase()) ||
              c.tag.toLowerCase().includes(outlinerSearch.toLowerCase())
          ));

      if (!isVisible) return null;

      const hasChildren = node.children && node.children.length > 0;
      const isOpen = openTreeNodes[node.id] || Boolean(outlinerSearch);
      const isHidden = hiddenTreeNodes[node.id];
      const isLocked = lockedTreeNodes[node.id];
      const isSelected = selectedTreeNodeId === node.id || activeScope === node.id;

      return (
        <React.Fragment key={node.id}>
          <div
            id={`outliner-node-${node.id}`}
            className={`tree-node ${isSelected ? "tree-node--selected" : ""}`}
            style={{ paddingLeft: `${node.depth * 12 + 6}px` }}
            onClick={() => handleSelectTreeNode(node)}
            onDoubleClick={() => {
              if (node.type === "blueprint") {
                onOpenAsset?.(node.id, node.label);
              } else {
                onSelectFolder?.(node.id, node.label);
              }
            }}
            role="treeitem"
            aria-selected={isSelected}
            title={`${node.label} (${node.tag}) - Click to inspect and scope`}
          >
            {hasChildren ? (
              <button
                type="button"
                className={`tree-node__toggle ${isOpen ? "tree-node__toggle--open" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenTreeNodes((prev) => ({ ...prev, [node.id]: !prev[node.id] }));
                }}
                title={isOpen ? "Collapse" : "Expand"}
              >
                <ChevronRight size={11} />
              </button>
            ) : (
              <span style={{ width: 18, height: 18, display: "inline-block" }} />
            )}

            <div className="tree-node__icon">{getNodeIcon(node.type)}</div>

            <span className="tree-node__label" title={node.label}>
              {node.label}
            </span>

            <span className="tree-node__tag">{node.tag}</span>

            <div className="tree-node__actions">
              <button
                type="button"
                className={`tree-action-btn ${isHidden ? "tree-action-btn--hidden" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setHiddenTreeNodes((prev) => ({ ...prev, [node.id]: !prev[node.id] }));
                }}
                title={isHidden ? "Unhide Element" : "Hide Element"}
              >
                {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>

              <button
                type="button"
                className={`tree-action-btn ${isLocked ? "tree-action-btn--locked" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setLockedTreeNodes((prev) => ({ ...prev, [node.id]: !prev[node.id] }));
                }}
                title={isLocked ? "Unlock Element" : "Lock Element"}
              >
                {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
              </button>
            </div>
          </div>

          {hasChildren && isOpen && renderOutlinerTree(node.children!)}
        </React.Fragment>
      );
    });
  };

  // Checklist State: which animation categories are currently checked
  const [selectedCategories, setSelectedCategories] = useState<Set<AssetCategory>>(
    new Set(["sequence", "sequencer", "curve", "scroll", "trigger", "loop"])
  );
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Active Scope Selection: "all" or folder id
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

  // Sync with Outliner selection if user clicked an element in Outliner
  useEffect(() => {
    if (selectedFolderId) {
      setActiveScope(selectedFolderId);
    }
  }, [selectedFolderId]);

  // Click outside listener for filter dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setIsFilterDropdownOpen(false);
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
      case "sequence":
      case "sequencer":
        return `useSequence("${asset.name.replace(".seq", "")}")`;
      case "curve":
        return `useCurve("${asset.name.replace(".curve", "")}")`;
      case "scroll":
        return `useScrollTrigger("${asset.name.replace(".scroll", "")}")`;
      case "trigger":
        return `useInteraction("${asset.name.replace(".trigger", "")}")`;
      case "loop":
        return `useAmbientLoop("${asset.name.replace(".loop", "")}")`;
      default:
        return `"${asset.name}"`;
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
        if (cat === "sequence") next.delete("sequencer");
      } else {
        next.add(cat);
        if (cat === "sequence") next.add("sequencer");
      }
      return next;
    });
  };

  const handleSelectAllCategories = () => {
    setSelectedCategories(new Set(["sequence", "sequencer", "curve", "scroll", "trigger", "loop"]));
  };

  const handleClearCategories = () => {
    setSelectedCategories(new Set());
  };

  const filteredAssets = useMemo(() => {
    return projectAssets.filter((item) => {
      // 1. Checklist Category filter
      const itemCat = item.category === "sequencer" ? "sequence" : item.category;
      if (!selectedCategories.has(item.category) && !selectedCategories.has(itemCat as AssetCategory)) {
        return false;
      }

      // 2. Search query filter
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
  }, [projectAssets, selectedCategories, searchQuery]);

  // Counts per animation category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      sequence: 0,
      curve: 0,
      scroll: 0,
      trigger: 0,
      loop: 0,
    };

    projectAssets.forEach((item) => {
      const cat = item.category === "sequencer" ? "sequence" : item.category;
      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
    });

    return counts;
  }, [projectAssets]);

  const getCategoryIcon = (category: AssetEntry["category"]) => {
    switch (category) {
      case "sequence":
      case "sequencer":
        return <Film size={20} style={{ color: "#8B5CF6" }} />;
      case "curve":
        return <Sliders size={20} style={{ color: "#3B82F6" }} />;
      case "scroll":
        return <Layers size={20} style={{ color: "#10B981" }} />;
      case "trigger":
        return <Zap size={20} style={{ color: "#F59E0B" }} />;
      case "loop":
        return <Sparkles size={20} style={{ color: "#EC4899" }} />;
      default:
        return <Film size={20} style={{ color: "#206859" }} />;
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

  // --------------------------------------------------------------------------
  // ELEMENT ANIMATION STACK LOGIC
  // --------------------------------------------------------------------------
  const activeTargetName = stackName;
  const activeTargetId = stackName.toLowerCase().replace(/[^a-z0-9]/g, "_") || "untitled";
  const activeTracks = elementTracks[activeTargetId] ?? NO_TRACKS;

  // Determine active element grammar type
  const activeElementType: GrammarElementType = useMemo(() => {
    const findTag = (nodes: TreeNode[]): string | undefined => {
      for (const n of nodes) {
        if (n.id === selectedTreeNodeId) return n.tag;
        if (n.children) {
          const found = findTag(n.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    const tag = findTag(INITIAL_TREE_DATA);
    return resolveGrammarElementType(selectedTreeNodeId, stackName, tag);
  }, [selectedTreeNodeId, stackName]);

  const activeContract = TYPE_REGISTRY[activeElementType];

  // Convert current tracks to AnimationBinding tuples for the grammar engine
  const activeGrammarBindings = useMemo(() => {
    return convertTracksToGrammarBindings(activeTargetId, activeTracks);
  }, [activeTargetId, activeTracks]);

  // Evaluate "+" Plus Icon decision per Grammar §8, through the Phase 8 rules engine (8.4).
  const plusDecision = useMemo(() => {
    return canAddFromBindings(activeElementType, activeGrammarBindings, undefined, {}, { id: activeTargetId });
  }, [activeTargetId, activeElementType, activeGrammarBindings]);

  const handleCommitStackName = () => {
    const trimmed = tempStackName.trim();
    const nextName = trimmed || "Untitled";
    if (nextName !== stackName) {
      const oldKey = stackName.toLowerCase().replace(/[^a-z0-9]/g, "_") || "untitled";
      const newKey = nextName.toLowerCase().replace(/[^a-z0-9]/g, "_") || "untitled";
      setElementTracks((prev) => {
        const copy = { ...prev };
        const existing = copy[oldKey] || [];
        delete copy[oldKey];
        copy[newKey] = existing;
        return copy;
      });
      setStackName(nextName);
      if (onSelectElement) {
        onSelectElement({ id: newKey, name: nextName });
      }
    }
    setIsEditingStackName(false);
  };

  const handleAddPreset = (preset: AnimationPreset) => {
    const newTrack: ElementAnimationTrack = {
      id: createId("trk"),
      name: preset.name,
      trigger: preset.trigger,
      duration: preset.duration,
      delay: preset.delay,
      easing: preset.easing,
      properties: JSON.parse(JSON.stringify(preset.properties)),
      isCustomTuned: false,
    };

    setElementTracks((prev) => ({
      ...prev,
      [activeTargetId]: [...(prev[activeTargetId] || []), newTrack],
    }));

    setIsAddPresetOpen(false);
    setExpandedTrackIds((prev) => ({ ...prev, [newTrack.id]: true }));
    setToastMessage(`Added preset ${preset.name} to ${activeElementType}`);
  };

  const handleAddCandidateOffer = (candidate: CanAddCandidate) => {
    let trigger: AnimationTrigger = "load";
    if (candidate.trigger === "OnHoverEnter" || candidate.trigger === "OnHoverExit") {
      trigger = "hover";
    } else if (candidate.trigger === "OnPress" || candidate.trigger === "OnRelease") {
      trigger = "click";
    } else if (
      candidate.trigger === "OnScrollEnter" ||
      candidate.trigger === "OnScrollExit" ||
      candidate.trigger === "OnScrollScrub"
    ) {
      trigger = "scroll";
    } else if (candidate.trigger === "OnStateChange") {
      trigger = "state";
    }

    const properties: PropertyDelta[] = candidate.properties.map((p) => {
      if (p === "transform.y") return { property: "transform.y", from: "20px", to: "0px" };
      if (p === "transform.x") return { property: "transform.x", from: "-20px", to: "0px" };
      if (p === "transform.scale") return { property: "transform.scale", from: "0.95", to: "1.05" };
      if (p === "transform.rotate") return { property: "transform.rotate", from: "-5deg", to: "0deg" };
      if (p === "opacity" || p === "appearance.opacity") return { property: "appearance.opacity", from: "0", to: "1" };
      if (p === "filter.blur") return { property: "filter.blur", from: "8px", to: "0px" };
      if (p.includes("background")) return { property: "appearance.background.color", from: "transparent", to: "#206859" };
      return { property: p, from: "0", to: "1" };
    });

    const newTrack: ElementAnimationTrack = {
      id: createId("trk"),
      name: `${candidate.category} Motion`,
      trigger,
      duration: candidate.category === "ScrollLinked" ? 1.0 : candidate.category === "Press" ? 0.2 : 0.5,
      delay: 0,
      easing: candidate.category === "Press" ? "back.out(2)" : "cubic-bezier(0.16, 1, 0.3, 1)",
      properties,
      isCustomTuned: false,
    };

    setElementTracks((prev) => ({
      ...prev,
      [activeTargetId]: [...(prev[activeTargetId] || []), newTrack],
    }));

    setIsAddPresetOpen(false);
    setExpandedTrackIds((prev) => ({ ...prev, [newTrack.id]: true }));
    setToastMessage(`Added ${candidate.category} motion to ${activeElementType}`);
  };

  const handleChangeTrigger = (trackId: string, trigger: AnimationTrigger) => {
    setElementTracks((prev) => ({
      ...prev,
      [activeTargetId]: (prev[activeTargetId] || []).map((t) =>
        t.id === trackId ? { ...t, trigger, isCustomTuned: true } : t
      ),
    }));
    setActiveTriggerDropdownTrackId(null);
  };

  const handleToggleExpand = (trackId: string) => {
    setExpandedTrackIds((prev) => ({
      ...prev,
      [trackId]: !prev[trackId],
    }));
  };

  const handleUpdatePropertyValue = (
    trackId: string,
    propIndex: number,
    field: "from" | "to",
    val: string
  ) => {
    setElementTracks((prev) => ({
      ...prev,
      [activeTargetId]: (prev[activeTargetId] || []).map((t) => {
        if (t.id !== trackId) return t;
        const updatedProps = [...t.properties];
        updatedProps[propIndex] = { ...updatedProps[propIndex], [field]: val };
        return { ...t, properties: updatedProps, isCustomTuned: true };
      }),
    }));
  };

  const handleUpdateTrackField = <K extends keyof ElementAnimationTrack>(
    trackId: string,
    field: K,
    val: ElementAnimationTrack[K]
  ) => {
    setElementTracks((prev) => ({
      ...prev,
      [activeTargetId]: (prev[activeTargetId] || []).map((t) =>
        t.id === trackId ? { ...t, [field]: val, isCustomTuned: true } : t
      ),
    }));
  };

  const handlePlayPreview = (trackId: string) => {
    setPreviewingTrackId(trackId);
    setTimeout(() => {
      setPreviewingTrackId(null);
    }, 900);
  };

  const handleJumpToCurve = (track: ElementAnimationTrack) => {
    const targetProp = track.properties[0]?.property || "transform.y";
    if (onOpenCurveEditor) {
      onOpenCurveEditor(targetProp);
    }
  };

  const handleStartSavePreset = (track: ElementAnimationTrack) => {
    const sanitizedTarget = activeTargetName.replace(/[^a-zA-Z0-9]/g, "");
    const sanitizedTrack = track.name.replace(/[^a-zA-Z0-9]/g, "");
    const defaultName = `${sanitizedTarget}_${sanitizedTrack}.seq`;
    setCustomPresetName(defaultName);
    setSavingTrackPreset(track);
  };

  const handleConfirmSavePreset = () => {
    if (!savingTrackPreset) return;
    const rawName = customPresetName.trim();
    const fileName = rawName.endsWith(".seq") ? rawName : `${rawName}.seq`;

    const newAsset: AssetEntry = {
      id: `ast_seq_${Date.now()}`,
      name: fileName,
      category: "sequence",
      pageId: "global",
      folderId: activeTargetId,
      folderName: activeTargetName,
      typeLabel: "ANIM_SEQUENCE (.seq)",
      connectedAgo: "Just now",
      parentClass: "AnimationTrack",
      connections: [activeTargetName, "GSAPTimeline", savingTrackPreset.trigger],
      description: `Hand-tuned reusable preset (${savingTrackPreset.properties.map((p) => `${p.property.split(".").pop()}: ${p.from}➔${p.to}`).join(", ")}, ${savingTrackPreset.easing})`,
      events: [savingTrackPreset.trigger],
    };

    setProjectAssets((prev) => [newAsset, ...prev]);
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      next.add("sequence");
      return next;
    });

    setToastMessage(`Saved "${fileName}" as reusable preset in Animation Library!`);
    setSavingTrackPreset(null);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeleteTrack = (trackId: string) => {
    setElementTracks((prev) => ({
      ...prev,
      [activeTargetId]: (prev[activeTargetId] || []).filter((t) => t.id !== trackId),
    }));
  };

  /** "Add Animation" picker — renders as the left half of a split `.cb-cards-pane`
   * (Animation Library) instead of a global modal, so the right half keeps showing
   * whatever the Content Browser was already displaying there. */
  const addPresetPickerContent = isAddPresetOpen && (
    <div className="cb-cards-pane__picker-half anim-fade-in">
      <div
        style={{
          padding: "8px 10px",
          background: "var(--surface-panel-hover)",
          borderBottom: "1px solid var(--border-default)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-primary)" }}>
          <Sparkles size={12} style={{ color: "var(--accent-primary)" }} />
          <span>Add Animation to {activeElementType}</span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "var(--text-muted)",
              background: "var(--surface-panel-active)",
              padding: "1px 5px",
              borderRadius: 4,
            }}
          >
            {activeTracks.length}/{activeContract?.maxSimultaneousTracks || 4} slots
          </span>
        </div>
        <button
          type="button"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
          onClick={() => setIsAddPresetOpen(false)}
        >
          <X size={12} />
        </button>
      </div>

      {/* Tab switch between Grammar Offers and Curated Presets */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid var(--border-default)",
          background: "var(--surface-panel-solid)",
          padding: "2px 8px 0",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setPickerTab("candidates")}
          style={{
            padding: "6px 10px",
            fontSize: 10,
            fontWeight: pickerTab === "candidates" ? 700 : 500,
            color: pickerTab === "candidates" ? "var(--accent-primary)" : "var(--text-muted)",
            borderBottom: pickerTab === "candidates" ? "2px solid var(--accent-primary)" : "2px solid transparent",
            background: "transparent",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
          }}
        >
          Grammar Offers ({plusDecision.candidates?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setPickerTab("presets")}
          style={{
            padding: "6px 10px",
            fontSize: 10,
            fontWeight: pickerTab === "presets" ? 700 : 500,
            color: pickerTab === "presets" ? "var(--accent-primary)" : "var(--text-muted)",
            borderBottom: pickerTab === "presets" ? "2px solid var(--accent-primary)" : "2px solid transparent",
            background: "transparent",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
          }}
        >
          Curated Presets ({ANIMATION_PRESETS.length})
        </button>
      </div>

      <div className="eas-preset-grid" style={{ flex: 1, overflowY: "auto" }}>
        {pickerTab === "candidates" ? (
          plusDecision.candidates && plusDecision.candidates.length > 0 ? (
            plusDecision.candidates.map((offer, idx) => {
              const pInfo = getCategoryPriorityInfo(offer.category);
              return (
                <div
                  key={`${offer.category}_${offer.trigger}_${idx}`}
                  className="eas-preset-item"
                  onClick={() => handleAddCandidateOffer(offer)}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#0F172A" }}>
                        {offer.category} Motion
                      </span>
                      <span
                        style={{
                          fontSize: 8,
                          fontWeight: 700,
                          padding: "1px 4px",
                          borderRadius: 3,
                          background: pInfo.bg,
                          color: pInfo.color,
                        }}
                        title={`Priority rank ${pInfo.priority}`}
                      >
                        {pInfo.badge}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 8.5,
                        fontWeight: 600,
                        padding: "1px 5px",
                        borderRadius: 3,
                        background: "rgba(32, 104, 89, 0.1)",
                        color: "var(--accent-primary, #206859)",
                      }}
                    >
                      {offer.trigger}
                    </span>
                  </div>
                  <div style={{ fontSize: 9.5, color: "#64748B", lineHeight: 1.3 }}>
                    {offer.description}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2, flexWrap: "wrap" }}>
                    {offer.properties.map((prop) => {
                      const tier = getPropertyRenderingTier(prop);
                      return (
                        <span
                          key={prop}
                          style={{
                            fontSize: 8,
                            fontWeight: 600,
                            padding: "1px 4px",
                            borderRadius: 3,
                            background: tier.bg,
                            color: tier.color,
                            border: `1px solid ${tier.border}`,
                          }}
                          title={`${prop} — ${tier.label} (${tier.badge})`}
                        >
                          {prop}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ gridColumn: "1 / -1", padding: "18px 12px", textAlign: "center", color: "#64748B", fontSize: 10 }}>
              <AlertCircle size={16} style={{ margin: "0 auto 6px", color: "#DC2626" }} />
              <div style={{ fontWeight: 600, color: "#0F172A", marginBottom: 2 }}>No Available Offers</div>
              <div>{plusDecision.reason || "All allowed animation slots are occupied."}</div>
            </div>
          )
        ) : (
          ANIMATION_PRESETS.map((preset) => {
            let cat: AnimationCategory = "Entrance";
            if (preset.trigger === "hover") cat = "Hover";
            else if (preset.trigger === "click") cat = "Press";
            else if (preset.trigger === "scroll") cat = "ScrollLinked";
            else if (preset.trigger === "state") cat = "StateTransition";

            // Phase 8, Sub-Phase 8.4: the only compatibility check here is `rules.canAdd`
            // (via `canAddFromBindings`) — no direct read of allowed/blockedCategories.
            const hasSlot = activeTracks.length < (activeContract?.maxSimultaneousTracks || 4);
            const presetCheck = canAddFromBindings(activeElementType, activeGrammarBindings, { category: cat }, {}, { id: activeTargetId });
            const canAdd = presetCheck.visible;

            return (
              <div
                key={preset.id}
                className={`eas-preset-item ${!canAdd ? "eas-preset-item--disabled" : ""}`}
                onClick={() => {
                  if (!canAdd) {
                    if (!hasSlot) {
                      setToastMessage(`Max tracks reached (${activeTracks.length}/${activeContract?.maxSimultaneousTracks})`);
                    } else {
                      setToastMessage(`${cat} animations aren't allowed on ${activeElementType}`);
                    }
                    return;
                  }
                  handleAddPreset(preset);
                }}
                style={{
                  opacity: canAdd ? 1 : 0.45,
                  cursor: canAdd ? "pointer" : "not-allowed",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#0F172A" }}>{preset.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {!canAdd && (
                      <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 4px", borderRadius: 3, background: "rgba(220, 38, 38, 0.1)", color: "#DC2626" }}>
                        {!hasSlot ? "Full" : "Blocked"}
                      </span>
                    )}
                    <span style={{ fontSize: 8.5, fontWeight: 600, padding: "1px 4px", borderRadius: 3, background: "rgba(32, 104, 89, 0.1)", color: "var(--accent-primary, #206859)" }}>
                      {preset.badge}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 9.5, color: "#64748B", lineHeight: 1.3 }}>
                  {preset.description}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      padding: "1px 5px",
                      borderRadius: 10,
                      background: TRIGGER_CONFIGS[preset.trigger].bg,
                      color: TRIGGER_CONFIGS[preset.trigger].color,
                    }}
                  >
                    {TRIGGER_CONFIGS[preset.trigger].icon} {TRIGGER_CONFIGS[preset.trigger].label}
                  </span>
                  <span style={{ fontSize: 9, color: "#94A3B8" }}>
                    {preset.duration}s • {preset.easing.split("(")[0]}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="cb-main-area" role="region" aria-label="Content & Asset Browser">
      {/* ===================================================================
       * TOP TOOLBAR WITH DROPDOWN CHECKLIST & PAGE FILTER
       * =================================================================== */}
      <div className="cb-nav-row" style={{ flexWrap: "wrap", gap: 8, padding: "6px 12px" }}>
        {/* Breadcrumb path */}
        <div className="cb-breadcrumbs" style={{ marginRight: 4 }}>
          <Folder size={13} style={{ color: "var(--accent-primary)" }} />
          <span className="cb-breadcrumb-item">Content</span>
          <ChevronRight size={11} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>Animation</span>
        </div>

        {/* Toggle Animation Pane */}
        <button
          type="button"
          id="cb-toggle-outliner-btn"
          className={`cb-scope-pill ${isOutlinerOpen ? "cb-scope-pill--active" : ""}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            height: 26,
            padding: "0 9px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            borderRadius: "var(--radius-sm)",
            border: isOutlinerOpen ? "1px solid var(--accent-primary)" : "1px solid var(--border-default)",
            background: isOutlinerOpen ? "var(--surface-panel-selected)" : "transparent",
            color: isOutlinerOpen ? "var(--accent-primary)" : "var(--text-secondary)",
          }}
          onClick={() => setIsOutlinerOpen((v) => !v)}
          title={isOutlinerOpen ? "Collapse Animation Pane" : "Show Animation Pane"}
        >
          <Film size={12} />
          <span>Animation</span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 5px",
              borderRadius: 4,
              background: isOutlinerOpen ? "rgba(32, 104, 89, 0.16)" : "var(--border-subtle)",
              color: isOutlinerOpen ? "var(--accent-primary)" : "var(--text-tertiary)",
            }}
          >
            {outlinerPosition === "left" ? "Left" : "Right"}
          </span>
        </button>

        {/* Animation Types Checklist Dropdown */}
        <div className="cb-dropdown-container" ref={filterDropdownRef}>
          <button
            type="button"
            id="cb-filter-types-btn"
            className={`cb-dropdown-btn ${selectedCategories.size < ANIMATION_CATEGORY_OPTIONS.length ? "cb-dropdown-btn--active" : ""}`}
            onClick={() => setIsFilterDropdownOpen((v) => !v)}
            title="Filter by Animation Types"
          >
            <SlidersHorizontal size={12} />
            <span>Filter Types</span>
            <span className="cb-dropdown-badge">
              {selectedCategories.size >= ANIMATION_CATEGORY_OPTIONS.length
                ? "All"
                : `${selectedCategories.size}/${ANIMATION_CATEGORY_OPTIONS.length}`}
            </span>
            <ChevronDown size={11} />
          </button>

          {isFilterDropdownOpen && (
            <div className="cb-checklist-dropdown">
              <div className="cb-checklist-header">
                <span>Animation Types</span>
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
                {ANIMATION_CATEGORY_OPTIONS.map((opt) => {
                  const isChecked = selectedCategories.has(opt.id);
                  const count = categoryCounts[opt.id] || 0;
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
                          background: isChecked ? "rgba(32, 104, 89, 0.12)" : "var(--surface-panel-hover)",
                          color: isChecked ? "var(--accent-primary, #206859)" : "var(--text-tertiary)",
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
        <div className="panel-search-bar" style={{ maxWidth: 220, height: 26, marginLeft: "auto" }}>
          <Search size={11} className="panel-search-bar__icon" />
          <input
            type="text"
            className="panel-search-bar__input"
            placeholder="Search animations & presets..."
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

      {/* ===================================================================
       * DUAL PANE: OUTLINER DIRECTORY HIERARCHY + CONTENT CARDS (SPLIT)
       * =================================================================== */}
      <div
        ref={splitContainerRef}
        className="cb-split-container"
        style={{
          flexDirection: outlinerPosition === "right" ? "row-reverse" : "row",
        }}
      >
        {isOutlinerOpen && (
          <>
            <div
              className={`cb-outliner-pane ${
                outlinerPosition === "right" ? "cb-outliner-pane--right" : "cb-outliner-pane--left"
              }`}
              style={{ width: outlinerWidth }}
            >
              {/* Element Header & Actions */}
              <div className="eas-header-bar">
                <div
                  id="eas-element-pill-btn"
                  className="eas-element-pill"
                  title={isEditingStackName ? undefined : "Click to rename (press Enter to save)"}
                  onClick={() => {
                    if (!isEditingStackName) {
                      setIsEditingStackName(true);
                      setTempStackName(stackName);
                    }
                  }}
                >
                  <span className="eas-element-dot" />
                  {isEditingStackName ? (
                    <input
                      ref={stackNameInputRef}
                      type="text"
                      id="eas-stack-name-input"
                      className="eas-stack-name-input"
                      value={tempStackName}
                      onChange={(e) => setTempStackName(e.target.value)}
                      onBlur={handleCommitStackName}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCommitStackName();
                        if (e.key === "Escape") {
                          setIsEditingStackName(false);
                          setTempStackName(stackName);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <>
                      <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {stackName}
                      </span>
                      <span
                        style={{
                          fontSize: 8.5,
                          fontWeight: 700,
                          padding: "1px 4px",
                          borderRadius: 3,
                          background: "rgba(32, 104, 89, 0.12)",
                          color: "var(--accent-primary, #206859)",
                          marginLeft: 3,
                        }}
                        title={`Authoritative Element Contract: ${activeElementType} (${activeContract?.category || "Element"})`}
                      >
                        {activeElementType}
                      </span>
                      <Pencil size={10} style={{ opacity: 0.55, marginLeft: 2, flexShrink: 0 }} />
                    </>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <button
                    type="button"
                    id="eas-add-anim-btn"
                    className={`eas-add-btn ${!plusDecision.visible ? "eas-add-btn--disabled" : ""}`}
                    onClick={() => {
                      if (!plusDecision.visible) {
                        setToastMessage(`Grammar Block: ${plusDecision.reason}`);
                        return;
                      }
                      setIsAddPresetOpen((prev) => !prev);
                    }}
                    title={
                      plusDecision.visible
                        ? `Add animation (${activeTracks.length}/${activeContract?.maxSimultaneousTracks || 4} slots) - Grammar Verified`
                        : `Blocked by Grammar: ${plusDecision.reason}`
                    }
                    style={{
                      opacity: plusDecision.visible ? 1 : 0.55,
                      cursor: plusDecision.visible ? "pointer" : "not-allowed",
                    }}
                  >
                    <Plus size={11} />
                    <span>Add Animation</span>
                    {!plusDecision.visible && (
                      <span style={{ fontSize: 8.5, opacity: 0.85, marginLeft: 2 }}>[Locked]</span>
                    )}
                  </button>

                  <button
                    type="button"
                    id="cb-outliner-pos-btn"
                    className="panel-icon-btn"
                    style={{
                      width: 22,
                      height: 22,
                      padding: "0 3px",
                    }}
                    onClick={() => setOutlinerPosition((p) => (p === "left" ? "right" : "left"))}
                    title={`Dock Animation on ${outlinerPosition === "left" ? "Right side" : "Left side"}`}
                  >
                    {outlinerPosition === "left" ? (
                      <PanelRight size={11} style={{ color: "var(--accent-primary)" }} />
                    ) : (
                      <PanelLeft size={11} style={{ color: "var(--accent-primary)" }} />
                    )}
                  </button>

                  <button
                    type="button"
                    className="panel-icon-btn"
                    style={{ width: 22, height: 22 }}
                    onClick={() => setIsOutlinerOpen(false)}
                    title="Close Animation Panel"
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>

              {/* Content Area: Tracks List */}
              <div className="eas-content-area">
                {/* Save Preset Dialog Modal */}
                {savingTrackPreset && (
                  <div className="eas-preset-picker-overlay anim-fade-in" onClick={() => setSavingTrackPreset(null)}>
                    <div
                      className="eas-preset-picker-card anim-scale-in"
                      onClick={(e) => e.stopPropagation()}
                      style={{ padding: 12, gap: 10, width: "min(360px, 92vw)" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#0F172A" }}>
                        <Save size={13} style={{ color: "var(--accent-primary, #206859)" }} />
                        <span>Save as Reusable Preset</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#64748B", lineHeight: 1.4 }}>
                        Creates a standalone <strong>.seq</strong> asset in your Content Browser that can be attached to any element.
                      </div>
                      <div>
                        <label style={{ fontSize: 9.5, fontWeight: 600, color: "#334155", display: "block", marginBottom: 3 }}>
                          Preset Asset Filename
                        </label>
                        <input
                          type="text"
                          id="eas-save-preset-input"
                          className="eas-field-input"
                          style={{ width: "100%", padding: "4px 8px", fontSize: 11 }}
                          value={customPresetName}
                          onChange={(e) => setCustomPresetName(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                        <button
                          type="button"
                          style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            border: "1px solid #CBD5E1",
                            background: "#FFFFFF",
                            fontSize: 10,
                            cursor: "pointer",
                          }}
                          onClick={() => setSavingTrackPreset(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          id="eas-confirm-save-btn"
                          style={{
                            padding: "4px 10px",
                            borderRadius: 4,
                            border: "none",
                            background: "var(--accent-primary, #206859)",
                            color: "#FFFFFF",
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                          onClick={handleConfirmSavePreset}
                        >
                          Save Preset (.seq)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty state when element has 0 tracks */}
                {activeTracks.length === 0 ? (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "24px 12px",
                      textAlign: "center",
                      gap: 8,
                      border: "1px dashed var(--border-default, #E2E8F0)",
                      borderRadius: "var(--radius-md, 8px)",
                      background: "rgba(248, 250, 252, 0.7)",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "rgba(32, 104, 89, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--accent-primary, #206859)",
                      }}
                    >
                      <Film size={18} />
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-primary)" }}>
                      No Tracks on {activeTargetName}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)", lineHeight: 1.4, maxWidth: 190 }}>
                      Add an animation track or apply a motion preset like Fade In Up or Spring Pop.
                    </div>
                    <button
                      type="button"
                      className="eas-add-btn"
                      style={{ marginTop: 4 }}
                      onClick={() => setIsAddPresetOpen(true)}
                    >
                      <Plus size={10} />
                      <span>Add First Animation</span>
                    </button>
                  </div>
                ) : (
                  activeTracks.map((track) => {
                    const isExpanded = !!expandedTrackIds[track.id];
                    const isPreviewing = previewingTrackId === track.id;
                    const triggerCfg = TRIGGER_CONFIGS[track.trigger] || TRIGGER_CONFIGS.load;

                    return (
                      <div
                        key={track.id}
                        className={`eas-track-card ${isPreviewing ? "eas-track-card--active" : ""}`}
                      >
                        {/* Track Row Header */}
                        <div className="eas-track-top">
                          <div className="eas-track-title-wrap">
                            <button
                              type="button"
                              style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", color: "#64748B", display: "flex" }}
                              onClick={() => handleToggleExpand(track.id)}
                              title={isExpanded ? "Collapse track details" : "Expand track details"}
                            >
                              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </button>
                            <span className="eas-track-name" title={track.name}>{track.name}</span>
                            {track.isCustomTuned && (
                              <span className="eas-badge-tuned" title="Hand-tuned curve & property deltas">Tuned</span>
                            )}
                          </div>

                          {/* Inline Trigger Chip Dropdown */}
                          <div style={{ position: "relative" }}>
                            <button
                              type="button"
                              className="eas-trigger-chip"
                              style={{
                                background: triggerCfg.bg,
                                color: triggerCfg.color,
                                borderColor: triggerCfg.border,
                              }}
                              onClick={() =>
                                setActiveTriggerDropdownTrackId((prev) =>
                                  prev === track.id ? null : track.id
                                )
                              }
                              title="Change animation trigger inline"
                            >
                              <span>{triggerCfg.icon}</span>
                              <span>{triggerCfg.label}</span>
                              <ChevronDown size={9} />
                            </button>

                            {activeTriggerDropdownTrackId === track.id && (
                              <div
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  top: "100%",
                                  marginTop: 3,
                                  background: "#FFFFFF",
                                  border: "1px solid rgba(15, 23, 42, 0.12)",
                                  borderRadius: 6,
                                  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.12)",
                                  zIndex: 40,
                                  minWidth: 110,
                                  overflow: "hidden",
                                  padding: 2,
                                }}
                              >
                                {(Object.keys(TRIGGER_CONFIGS) as AnimationTrigger[]).map((trig) => (
                                  <button
                                    key={trig}
                                    type="button"
                                    style={{
                                      width: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 5,
                                      padding: "4px 6px",
                                      border: "none",
                                      background: track.trigger === trig ? "rgba(32, 104, 89, 0.1)" : "transparent",
                                      color: track.trigger === trig ? "var(--accent-primary, #206859)" : "#0F172A",
                                      fontSize: 10,
                                      fontWeight: track.trigger === trig ? 700 : 500,
                                      cursor: "pointer",
                                      borderRadius: 4,
                                      textAlign: "left",
                                    }}
                                    onClick={() => handleChangeTrigger(track.id, trig)}
                                  >
                                    <span>{TRIGGER_CONFIGS[trig].icon}</span>
                                    <span>{TRIGGER_CONFIGS[trig].label}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Quick Action Icons */}
                          <div className="eas-track-actions">
                            {/* Live Preview Button */}
                            <button
                              type="button"
                              className="eas-action-btn eas-action-btn--play"
                              onClick={() => handlePlayPreview(track.id)}
                              title="Preview animation"
                            >
                              {isPreviewing ? <Check size={11} style={{ color: "#10B981" }} /> : <Play size={11} />}
                            </button>

                            {/* Curve Editor Jump Button */}
                            <button
                              type="button"
                              className="eas-action-btn eas-action-btn--curve"
                              onClick={() => handleJumpToCurve(track)}
                              title="Jump to Curve Editor / Graph View scoped to this track"
                            >
                              <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>∿</span>
                            </button>

                            {/* Save as Reusable Preset Button */}
                            <button
                              type="button"
                              className="eas-action-btn eas-action-btn--save"
                              onClick={() => handleStartSavePreset(track)}
                              title="Save as reusable preset (.seq) in Content Browser"
                            >
                              <Save size={11} />
                            </button>

                            {/* Delete Track Button */}
                            <button
                              type="button"
                              className="eas-action-btn eas-action-btn--delete"
                              onClick={() => handleDeleteTrack(track.id)}
                              title="Remove track"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        {/* Property Deltas Row (Track Name + Live Property Values in one view) */}
                        <div className="eas-property-tags">
                          {track.properties.map((prop, idx) => (
                            <span key={idx} className="eas-property-tag">
                              <strong>{prop.property.split(".").pop()}</strong>: {prop.from} ➔ {prop.to}
                            </span>
                          ))}
                          <span className="eas-meta-tag">
                            {track.duration}s • {track.easing.split("(")[0]}
                          </span>
                        </div>

                        {/* Expandable Hand-Tuning Drawer */}
                        {isExpanded && (
                          <div className="eas-expanded-box">
                            {/* Duration & Delay */}
                            <div className="eas-field-row">
                              <span className="eas-field-label">Duration / Delay</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <input
                                  type="number"
                                  step="0.05"
                                  min="0.1"
                                  max="10"
                                  className="eas-field-input"
                                  style={{ width: 44 }}
                                  value={track.duration}
                                  onChange={(e) => handleUpdateTrackField(track.id, "duration", parseFloat(e.target.value) || 0.1)}
                                />
                                <span style={{ fontSize: 9, color: "#94A3B8" }}>s /</span>
                                <input
                                  type="number"
                                  step="0.05"
                                  min="0"
                                  max="5"
                                  className="eas-field-input"
                                  style={{ width: 40 }}
                                  value={track.delay}
                                  onChange={(e) => handleUpdateTrackField(track.id, "delay", parseFloat(e.target.value) || 0)}
                                />
                                <span style={{ fontSize: 9, color: "#94A3B8" }}>s</span>
                              </div>
                            </div>

                            {/* Easing Curve selector */}
                            <div className="eas-field-row">
                              <span className="eas-field-label">Easing Curve</span>
                              <select
                                className="eas-field-input"
                                style={{ width: 120, cursor: "pointer" }}
                                value={track.easing}
                                onChange={(e) => handleUpdateTrackField(track.id, "easing", e.target.value)}
                              >
                                <option value="cubic-bezier(0.16, 1, 0.3, 1)">Expo Out (0.16, 1, 0.3, 1)</option>
                                <option value="power2.out">Power2 Out (Smooth)</option>
                                <option value="elastic.out(1.2, 0.35)">Elastic Spring (Tactile)</option>
                                <option value="back.out(1.4)">Back Out (Overshoot)</option>
                                <option value="easeInOut">Ease In Out (Smooth Loop)</option>
                                <option value="none">Linear (Scrub)</option>
                              </select>
                            </div>

                            {/* Live Property Value Sliders/Inputs */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 2 }}>
                              <span className="eas-field-label" style={{ fontSize: 9, color: "#64748B" }}>Property Deltas (From ➔ To)</span>
                              {track.properties.map((prop, pIdx) => (
                                <div key={pIdx} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <span style={{ fontSize: 9.5, fontWeight: 600, width: 48, color: "#334155" }}>
                                    {prop.property.split(".").pop()}
                                  </span>
                                  <input
                                    type="text"
                                    className="eas-field-input"
                                    style={{ width: 45 }}
                                    value={prop.from}
                                    onChange={(e) => handleUpdatePropertyValue(track.id, pIdx, "from", e.target.value)}
                                  />
                                  <span style={{ fontSize: 9, color: "#94A3B8" }}>➔</span>
                                  <input
                                    type="text"
                                    className="eas-field-input"
                                    style={{ width: 45 }}
                                    value={prop.to}
                                    onChange={(e) => handleUpdatePropertyValue(track.id, pIdx, "to", e.target.value)}
                                  />
                                </div>
                              ))}
                            </div>

                            {/* Save as Reusable Preset Action Button */}
                            <button
                              type="button"
                              id="eas-save-preset-action-btn"
                              className="eas-save-preset-btn"
                              onClick={() => handleStartSavePreset(track)}
                              title="Turn this hand-tuned track into a reusable .seq asset"
                            >
                              <Save size={11} />
                              <span>Save as Reusable Preset (.seq)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Toast confirmation banner */}
                {toastMessage && (
                  <div className="eas-toast">
                    <Check size={13} style={{ color: "#34D399", flexShrink: 0 }} />
                    <span>{toastMessage}</span>
                  </div>
                )}
              </div>

              {/* Live Export Code Link footer */}
              <div className="eas-export-footer">
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9.5, color: "#64748B" }}>
                  <Zap size={10} style={{ color: "#F59E0B" }} />
                  <span>Production Ready</span>
                </div>
                <button
                  type="button"
                  className="eas-export-link-btn"
                  onClick={() => onOpenExportPreview?.()}
                  title="Open live code compiler preview for GSAP, Framer Motion & CSS"
                >
                  <span>Live Export Preview</span>
                  <ArrowRight size={10} />
                </button>
              </div>
            </div>

            <div
              className={`cb-outliner-splitter ${isResizingOutliner ? "cb-outliner-splitter--active" : ""}`}
              onMouseDown={handleSplitterMouseDown}
              title="Drag to resize Outliner pane"
            />
          </>
        )}

        {/* Content Cards Area — splits in half while the Add Animation picker is open */}
        <div className={`cb-cards-pane ${isAddPresetOpen ? "cb-cards-pane--split" : ""}`}>
          {addPresetPickerContent}
          <div className="panel-content" style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        {projectAssets.length === 0 ? (
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
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(32, 104, 89, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Film size={20} style={{ color: "var(--accent-primary, #206859)" }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              Animation Library Empty
            </div>
            <div style={{ fontSize: 11, maxWidth: 360, marginTop: 4, lineHeight: 1.4, color: "var(--text-secondary)" }}>
              Save a hand-tuned track as a reusable preset (<strong>.seq</strong>) from the Animation Stack or create new animations to build your reusable motion library.
            </div>
          </div>
        ) : filteredAssets.length === 0 ? (
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
              No animations match the active filters
            </div>
            <div style={{ fontSize: 11, marginTop: 4 }}>
              Try adjusting the animation type checklist or clearing search.
            </div>
            <button
              type="button"
              className="cb-scope-banner__btn"
              style={{ marginTop: 12 }}
              onClick={() => {
                handleSelectAllCategories();
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
                      asset.category === "sequencer"
                        ? "radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, rgba(20, 20, 28, 0.9) 100%)"
                        : undefined,
                  }}
                >
                  <span
                    className="asset-card__type-badge"
                    style={{
                      background:
                        asset.category === "sequencer"
                          ? "rgba(124, 58, 237, 0.9)"
                          : undefined,
                      color:
                        asset.category === "sequencer"
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
        </div>
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
                  hoveredAsset.category === "sequencer"
                    ? "rgba(124, 58, 237, 0.9)"
                    : undefined,
                color:
                  hoveredAsset.category === "sequencer"
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
