"use client";

/**
 * ============================================================================
 * ASSET DETAILS INSPECTOR (UNREAL ENGINE 5 STYLE)
 * ============================================================================
 * UI Element: Context-Aware Details Inspector for Opened Assets & Files
 * Screen / Scope: Right Dock Zone when FullPageDock is active (`/editor`)
 * Role: Unreal Engine-grade inspector displaying categorized properties,
 *       component slot hierarchy & attachments, typed variables with
 *       yellow reset-to-default indicators, and event-to-function dispatchers.
 * Architecture Ref: `DOCS/UNREAL_FILE_DETAILS_SYSTEM.md` & `DOCS/ROADMAP.md` §1.7
 * Styling Source: `@/editor/styles/panels.css` & `@/editor/styles/forms.css`
 * ============================================================================
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronRight,
  Cpu,
  Film,
  Terminal,
  ImageIcon,
  Box,
  RotateCcw,
  Eye,
  Search,
  X,
  ExternalLink,
  Plus,
  Layers,
  Sparkles,
  Type,
  Palette,
  Check,
  Workflow,
  GripVertical,
  Sliders,
  ChevronDown,
} from "lucide-react";
import {
  ComponentVariable,
  ComponentEventBinding,
  ComponentAttachment,
  SAMPLE_ASSET_SCHEMAS,
  AVAILABLE_BLUEPRINT_FUNCTIONS,
  BlueprintFunctionOption,
  AddPaletteItem,
} from "@/core/types/details";
import {
  ElementType,
  DetailSectionId,
  ELEMENT_SECTION_REGISTRY,
  ButtonSpecificConfig,
  ImageSpecificConfig,
  TextSpecificConfig,
  ContainerSpecificConfig,
  InputSpecificConfig,
} from "@/core/types/element-sections";
import { AddComponentPalette } from "./AddComponentPalette";
import { AppearanceEditor } from "./sections/AppearanceEditor";
import { TypographyEditor } from "./sections/TypographyEditor";
import { LayoutSpacingEditor } from "./sections/LayoutSpacingEditor";
import { ButtonStateEditor } from "./sections/ButtonStateEditor";
import { ImagePropertiesEditor } from "./sections/ImagePropertiesEditor";
import { ContainerLayoutEditor } from "./sections/ContainerLayoutEditor";
import { InputValidationEditor } from "./sections/InputValidationEditor";
import { TextContentEditor } from "./sections/TextContentEditor";
import { ScrubNumberInput } from "./controls/ScrubNumberInput";
import { JsonObjectEditor } from "./controls/JsonObjectEditor";
import { AssetReferencePicker } from "./controls/AssetReferencePicker";
import { AssetLayoutSchema, AssetTypographySchema } from "@/core/types/details";
import { createId } from "@/core/ids";

export interface AssetDetailsInspectorProps {
  panelId: string;
  panelTitle: string;
  onOpenBlueprint?: (functionId?: string) => void;
}

export const AssetDetailsInspector: React.FC<AssetDetailsInspectorProps> = ({
  panelId,
  panelTitle,
  onOpenBlueprint,
}) => {
  // Search filter query across all details categories
  const [searchQuery, setSearchQuery] = useState("");

  // Category collapse states
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({
    identity: true,
    attachments: true,
    button_states: true,
    image_props: true,
    text_content: true,
    container_layout: true,
    input_validation: true,
    appearance: true,
    typography: true,
    layout: true,
    variables: true,
    events: true,
    sequence: true,
    console: true,
    schema: true,
  });

  const toggleSection = (key: string) => {
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Asset type detection
  const isBlueprint = panelId === "blueprint" || panelId.includes("bp_") || panelTitle.endsWith(".graph");
  const isSequencer = panelId === "sequencer" || panelTitle.toLowerCase().includes("sequencer");
  const isConsole = panelId === "console" || panelTitle.toLowerCase().includes("output log");
  const isImage = panelId.includes("logo") || panelId.includes("banner") || panelTitle.endsWith(".svg") || panelTitle.endsWith(".webp");
  const isComponent = !isBlueprint && !isSequencer && !isConsole && !isImage;

  // Retrieve base schema or create fallback for component
  const defaultSchema = SAMPLE_ASSET_SCHEMAS[panelId] || {
    assetId: panelId,
    assetTitle: panelTitle,
    assetType: "component",
    path: `src/components/${panelTitle}`,
    parentClass: "BasePageElement",
    classChain: ["UObject", "PageElement", "BasePageElement", panelTitle.replace(/\.[^/.]+$/, "")],
    executionDomain: "client-wasm",
    attachment: {
      parentId: "comp_root",
      parentName: "Page Container",
      slotType: "flex",
      slotProperties: {
        alignSelf: "stretch",
        flexGrow: 1,
        flexShrink: 0,
        order: 0,
        zIndex: 1,
      },
      attachedSocket: "main-slot",
    },
    variables: [
      {
        id: "var_title",
        name: "title",
        type: "string",
        category: "General",
        defaultValue: panelTitle.replace(/\.[^/.]+$/, ""),
        currentValue: panelTitle.replace(/\.[^/.]+$/, ""),
        isModified: false,
        isInstanceEditable: true,
        tooltip: "Primary label or title of the element.",
      },
      {
        id: "var_visible",
        name: "isVisible",
        type: "boolean",
        category: "General",
        defaultValue: true,
        currentValue: true,
        isModified: false,
        isInstanceEditable: true,
        tooltip: "Controls whether the component is rendered in the DOM.",
      },
      {
        id: "var_variant",
        name: "variant",
        type: "enum",
        category: "Styling",
        defaultValue: "default",
        currentValue: "default",
        isModified: false,
        isInstanceEditable: true,
        enumOptions: ["default", "compact", "prominent"],
        tooltip: "Visual layout style variant.",
      },
      {
        id: "var_bg",
        name: "backgroundColor",
        type: "color",
        category: "Styling",
        defaultValue: "#1a1d29",
        currentValue: "#1a1d29",
        isModified: false,
        isInstanceEditable: true,
        tooltip: "Background surface fill color.",
      },
    ],
    events: [
      {
        eventId: "evt_click",
        eventName: "onClick",
        eventLabel: "On Clicked",
        attachedFunctionId: null,
        attachedFunctionName: null,
      },
      {
        eventId: "evt_hover",
        eventName: "onMouseEnter",
        eventLabel: "On Hovered",
        attachedFunctionId: null,
        attachedFunctionName: null,
      },
      {
        eventId: "evt_change",
        eventName: "onChange",
        eventLabel: "On Value Changed",
        attachedFunctionId: null,
        attachedFunctionName: null,
      },
    ],
    appearance: {
      backgroundColor: "#111420",
      defaultBgColor: "#111420",
      borderColor: "#23283b",
      borderWidth: 1,
      borderRadius: 8,
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      opacity: 1,
    },
    typography: {
      fontFamily: "Inter, sans-serif",
      fontSize: 16,
      fontSizeUnit: "px",
      fontWeight: "500",
      lineHeight: 1.4,
      lineHeightUnit: "",
      textAlign: "left",
      color: "#ffffff",
      letterSpacing: 0,
      letterSpacingUnit: "px",
      wordSpacing: 0,
      wordSpacingUnit: "px",
      whiteSpace: "normal",
      textOverflow: "clip",
      textTransform: "none",
      textDecoration: "none",
      fontStyle: "normal",
    },
    layout: {
      margin: { top: 0, right: 0, bottom: 0, left: 0, linked: true, unit: "px" },
      padding: { top: 8, right: 16, bottom: 8, left: 16, linked: false, unit: "px" },
      width: "auto",
      widthUnit: "auto",
      height: "auto",
      heightUnit: "auto",
      boxSizing: "border-box",
      display: "block",
      position: "static",
      zIndex: 1,
      overflowX: "visible",
      overflowY: "visible",
      cursor: "default",
      pointerEvents: "auto",
      userSelect: "auto",
    },
  };

  // State management for variables, attachment, appearance, typography, layout, events
  const [variables, setVariables] = useState<ComponentVariable[]>(defaultSchema.variables);
  const [attachment, setAttachment] = useState<ComponentAttachment>(defaultSchema.attachment);
  const [appearance, setAppearance] = useState(defaultSchema.appearance);
  const [typography, setTypography] = useState<AssetTypographySchema>(defaultSchema.typography);
  const [layout, setLayout] = useState<AssetLayoutSchema>(
    defaultSchema.layout || {
      margin: { top: 0, right: 0, bottom: 0, left: 0, linked: true, unit: "px" },
      padding: { top: 8, right: 16, bottom: 8, left: 16, linked: false, unit: "px" },
      width: "auto",
      widthUnit: "auto",
      height: "auto",
      heightUnit: "auto",
      boxSizing: "border-box",
      display: "block",
      position: "static",
      zIndex: 1,
      overflowX: "visible",
      overflowY: "visible",
      cursor: "default",
      pointerEvents: "auto",
      userSelect: "auto",
    }
  );
  const [events, setEvents] = useState<ComponentEventBinding[]>(defaultSchema.events);

  // Element Type Detection & Context Switching
  const initialElementType = useMemo<ElementType>(() => {
    if (defaultSchema.elementType) return defaultSchema.elementType;
    const lowerTitle = panelTitle.toLowerCase();
    const lowerId = panelId.toLowerCase();
    if (lowerTitle.includes("button") || lowerId.includes("btn")) return "button";
    if (
      isImage ||
      lowerTitle.includes("image") ||
      lowerTitle.includes("img") ||
      lowerTitle.includes("banner") ||
      lowerTitle.includes("logo")
    )
      return "image";
    if (
      lowerTitle.includes("text") ||
      lowerTitle.includes("heading") ||
      lowerTitle.includes("paragraph") ||
      lowerTitle.includes("title")
    )
      return "text";
    if (lowerTitle.includes("input") || lowerTitle.includes("field")) return "input";
    if (lowerTitle.includes("form")) return "form";
    if (
      lowerTitle.includes("hero") ||
      lowerTitle.includes("card") ||
      lowerTitle.includes("modal") ||
      lowerTitle.includes("container") ||
      lowerTitle.includes("section")
    )
      return "container";
    return "generic";
  }, [defaultSchema.elementType, panelTitle, panelId, isImage]);

  const [activeElementType, setActiveElementType] = useState<ElementType>(initialElementType);
  const [prevInitialElementType, setPrevInitialElementType] = useState(initialElementType);
  if (initialElementType !== prevInitialElementType) {
    setPrevInitialElementType(initialElementType);
    setActiveElementType(initialElementType);
  }

  // Specific Configurations per Element Archetype
  const [buttonConfig, setButtonConfig] = useState<ButtonSpecificConfig>(
    defaultSchema.buttonConfig || {
      hoverBgColor: "#206859",
      activeBgColor: "#174f43",
      focusRingColor: "rgba(32, 104, 89, 0.4)",
      focusRingWidth: 2,
      disabledOpacity: 50,
      isLoading: false,
      spinnerType: "circular",
      spinnerColor: "#FFFFFF",
      disableWhileLoading: true,
      loadingLabel: "Loading...",
      rippleEnabled: true,
      rippleColor: "rgba(255, 255, 255, 0.35)",
      rippleDuration: 400,
      rippleOrigin: "pointer",
    }
  );

  const [imageConfig, setImageConfig] = useState<ImageSpecificConfig>(
    defaultSchema.imageConfig || {
      src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
      fallbackSrc: "/placeholder.svg",
      alt: "Abstract 3D holographic rendering",
      objectFit: "cover",
      objectPosition: "center",
      aspectRatio: "16:9",
      lazyLoad: true,
      loadingMode: "lazy",
      placeholder: "blur",
    }
  );

  const [textConfig, setTextConfig] = useState<TextSpecificConfig>(
    defaultSchema.textConfig || {
      content:
        "Next-Generation Visual Web Application Engine — Empowering visual design and node-based logic in a single unified workbench.",
      isRichText: true,
      maxLines: "none",
      textOverflow: "ellipsis",
      expandOnHover: false,
      formatBold: true,
      formatItalic: false,
      formatUnderline: false,
      formatStrike: false,
      formatCode: false,
    }
  );

  const [containerConfig, setContainerConfig] = useState<ContainerSpecificConfig>(
    defaultSchema.containerConfig || {
      layoutMode: "flex",
      flexDirection: "column",
      flexWrap: "nowrap",
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
      gridColumns: "repeat(auto-fit, minmax(240px, 1fr))",
      gridRows: "auto",
      gridAutoFlow: "row",
      childrenSlots: [
        { id: "slot_badge", name: "AnnouncementBadge", visible: true },
        { id: "slot_heading", name: "HeroHeadline", visible: true },
        { id: "slot_cta", name: "ActionButtonsGroup", visible: true },
        { id: "slot_preview", name: "ProductPreviewCanvas", visible: true },
      ],
    }
  );

  const [inputConfig, setInputConfig] = useState<InputSpecificConfig>(
    defaultSchema.inputConfig || {
      inputType: "text",
      placeholder: "Enter user credentials or search query...",
      required: true,
      minLength: 3,
      maxLength: 64,
      pattern: "",
      errorMessage: "Please provide a valid input value.",
      autocomplete: "on",
      readOnly: false,
      disabled: false,
    }
  );

  // Active Details Sections based on Element Archetype Registry
  const activeSections = useMemo<DetailSectionId[]>(() => {
    if (isBlueprint || isSequencer || isConsole) {
      return ["identity", "sequence", "console"];
    }
    return ELEMENT_SECTION_REGISTRY[activeElementType] || ELEMENT_SECTION_REGISTRY.generic;
  }, [activeElementType, isBlueprint, isSequencer, isConsole]);

  // Variable category collapse states
  const [openVarCategories, setOpenVarCategories] = useState<Record<string, boolean>>({
    General: true,
    Styling: true,
    Data: true,
    Advanced: false,
  });

  const toggleVarCategory = (cat: string) => {
    setOpenVarCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Advanced properties reveal toggle
  const [showAdvancedVariables, setShowAdvancedVariables] = useState(false);

  // Active floating tooltip variable
  const [hoveredVarTooltip, setHoveredVarTooltip] = useState<ComponentVariable | null>(null);

  // Add Variable inline form state
  const [isAddVariableOpen, setIsAddVariableOpen] = useState(false);
  const [newVarDraft, setNewVarDraft] = useState<{
    name: string;
    type: ComponentVariable["type"];
    category: string;
    defaultValue: string;
    isInstanceEditable: boolean;
    isAdvanced: boolean;
    tooltip: string;
  }>({
    name: "",
    type: "string",
    category: "General",
    defaultValue: "",
    isInstanceEditable: true,
    isAdvanced: false,
    tooltip: "",
  });

  // Drag and drop reordering
  const [draggedVarId, setDraggedVarId] = useState<string | null>(null);

  const handleReorderVariables = (targetId: string) => {
    if (!draggedVarId || draggedVarId === targetId) return;
    setVariables((prev) => {
      const fromIndex = prev.findIndex((v) => v.id === draggedVarId);
      const toIndex = prev.findIndex((v) => v.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
    setDraggedVarId(null);
  };

  const handleCreateVariable = () => {
    const trimmed = newVarDraft.name.trim();
    if (!trimmed) return;
    const safeName = trimmed.replace(/\s+/g, "_");

    let parsedDefault: unknown = newVarDraft.defaultValue;
    if (newVarDraft.type === "number") {
      parsedDefault = Number(newVarDraft.defaultValue) || 0;
    } else if (newVarDraft.type === "boolean") {
      parsedDefault = newVarDraft.defaultValue === "true";
    } else if (newVarDraft.type === "json") {
      try {
        parsedDefault = JSON.parse(newVarDraft.defaultValue || "{}");
      } catch {
        parsedDefault = {};
      }
    } else if (newVarDraft.type === "color") {
      parsedDefault = newVarDraft.defaultValue || "#206859";
    }

    const createdVar: ComponentVariable = {
      id: createId("var"),
      name: safeName,
      type: newVarDraft.type,
      category: newVarDraft.isAdvanced ? "Advanced" : newVarDraft.category || "General",
      defaultValue: parsedDefault,
      currentValue: parsedDefault,
      isModified: false,
      isInstanceEditable: newVarDraft.isInstanceEditable,
      isAdvanced: newVarDraft.isAdvanced,
      tooltip: newVarDraft.tooltip || `Custom property ${safeName}`,
    };

    setVariables((prev) => [...prev, createdVar]);
    setIsAddVariableOpen(false);
    setNewVarDraft({
      name: "",
      type: "string",
      category: "General",
      defaultValue: "",
      isInstanceEditable: true,
      isAdvanced: false,
      tooltip: "",
    });

    setActionNotification({
      message: `Created variable '${safeName}' (${createdVar.type})`,
      type: "success",
    });
    setTimeout(() => setActionNotification(null), 3000);
  };

  // Active dropdown for function attachment
  const [activePickerEventId, setActivePickerEventId] = useState<string | null>(null);

  // +Add Palette state
  const [isAddPaletteOpen, setIsAddPaletteOpen] = useState(false);

  // Active selected class in inheritance chain
  const [selectedClassInChain, setSelectedClassInChain] = useState<string | null>(null);

  // Dynamic notification toast
  const [actionNotification, setActionNotification] = useState<{
    message: string;
    type: "success" | "info";
  } | null>(null);

  // Parent class inheritance chain
  const classChain: string[] = defaultSchema.classChain || [
    "UObject",
    "PageElement",
    defaultSchema.parentClass || "BaseInteractiveWidget",
    panelTitle.replace(/\.[^/.]+$/, ""),
  ];

  // Global keyboard shortcut to open +Add Palette (Cmd+A / Ctrl+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
          setIsAddPaletteOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Palette item selection handler
  const handlePaletteSelectItem = (item: AddPaletteItem) => {
    setIsAddPaletteOpen(false);

    if (item.category === "component") {
      const newVarId = createId(`var_${item.id}`);
      const newVar: ComponentVariable = {
        id: newVarId,
        name: `has${item.name.replace(/\s+/g, "")}`,
        type: "boolean",
        category: "General",
        defaultValue: true,
        currentValue: true,
        isModified: true,
        isInstanceEditable: true,
        tooltip: `Enables or configures the attached ${item.name} sub-component.`,
      };
      setVariables((prev) => [newVar, ...prev]);
      setSectionsOpen((prev) => ({ ...prev, variables: true }));
    } else if (item.category === "behavior") {
      const newEventId = createId(`evt_${item.id}`);
      const newEvent: ComponentEventBinding = {
        eventId: newEventId,
        eventName: `on${item.name.replace(/\s+/g, "")}`,
        eventLabel: `On ${item.name}`,
        attachedFunctionId: null,
        attachedFunctionName: null,
        isCustomEvent: true,
      };
      setEvents((prev) => [...prev, newEvent]);
      setSectionsOpen((prev) => ({ ...prev, events: true }));
    } else if (item.category === "data") {
      const newVarId = createId(`data_${item.id}`);
      const newVar: ComponentVariable = {
        id: newVarId,
        name: `${item.name.toLowerCase().replace(/\s+/g, "_")}_source`,
        type: "string",
        category: "Data",
        defaultValue: "https://api.internal/v1/resource",
        currentValue: "https://api.internal/v1/resource",
        isModified: true,
        isInstanceEditable: true,
        tooltip: `Data source binding for ${item.name}.`,
      };
      setVariables((prev) => [...prev, newVar]);
      setSectionsOpen((prev) => ({ ...prev, variables: true }));
    } else if (item.category === "animation") {
      const newVarId = createId(`anim_${item.id}`);
      const newVar: ComponentVariable = {
        id: newVarId,
        name: `anim_${item.name.toLowerCase().replace(/\s+/g, "")}_active`,
        type: "boolean",
        category: "Styling",
        defaultValue: true,
        currentValue: true,
        isModified: true,
        isInstanceEditable: true,
        tooltip: `Activates the ${item.name} CSS transition animation preset.`,
      };
      setVariables((prev) => [...prev, newVar]);
      setSectionsOpen((prev) => ({ ...prev, appearance: true, variables: true }));
    }

    setActionNotification({
      message: `Attached ${item.name} (${item.badge || item.category}) to ${panelTitle}`,
      type: "success",
    });
    setTimeout(() => {
      setActionNotification(null);
    }, 3500);
  };

  // Parent class inheritance click handler
  const handleClassClick = (cls: string, isCurrent: boolean) => {
    if (isCurrent || selectedClassInChain === cls) {
      setSelectedClassInChain(null);
      setActionNotification({
        message: `Viewing all properties of ${panelTitle}`,
        type: "info",
      });
    } else {
      setSelectedClassInChain(cls);
      setActionNotification({
        message: `Filtered properties introduced by parent class ${cls}`,
        type: "info",
      });
    }
    setTimeout(() => {
      setActionNotification(null);
    }, 3000);
  };

  // Variable change handler
  const handleVariableChange = (id: string, newVal: unknown) => {
    setVariables((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        const isModified = String(newVal) !== String(v.defaultValue);
        return { ...v, currentValue: newVal, isModified };
      })
    );
  };

  // Reset variable to default (Unreal Engine yellow arrow action)
  const handleResetVariable = (id: string) => {
    setVariables((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        return { ...v, currentValue: v.defaultValue, isModified: false };
      })
    );
  };

  // Toggle instance editable (eye icon)
  const handleToggleEye = (id: string) => {
    setVariables((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        return { ...v, isInstanceEditable: !v.isInstanceEditable };
      })
    );
  };

  // Attach function to event
  const handleAttachFunction = (eventId: string, fn: BlueprintFunctionOption) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.eventId !== eventId) return e;
        return {
          ...e,
          attachedFunctionId: fn.id,
          attachedFunctionName: fn.name,
          graphId: fn.graph,
        };
      })
    );
    setActivePickerEventId(null);
  };

  // Create new Blueprint node for event
  const handleCreateNewBlueprintNode = (eventId: string, eventLabel: string) => {
    const generatedFnName = `${eventLabel.replace(/\s+/g, "")}_${panelTitle.replace(/\.[^/.]+$/, "")}()`;
    setEvents((prev) =>
      prev.map((e) => {
        if (e.eventId !== eventId) return e;
        return {
          ...e,
          attachedFunctionId: `fn_${eventId}`,
          attachedFunctionName: generatedFnName,
          graphId: "bp_main",
          isCustomEvent: true,
        };
      })
    );
    setActivePickerEventId(null);
    onOpenBlueprint?.(generatedFnName);
  };

  // Detach function from event
  const handleDetachFunction = (eventId: string) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.eventId !== eventId) return e;
        return {
          ...e,
          attachedFunctionId: null,
          attachedFunctionName: null,
          graphId: undefined,
        };
      })
    );
  };

  // Filtered lists based on search
  const q = searchQuery.toLowerCase().trim();
  const filteredVariables = useMemo(() => {
    if (!q) return variables;
    return variables.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q)
    );
  }, [variables, q]);

  const filteredEvents = useMemo(() => {
    if (!q) return events;
    return events.filter(
      (e) =>
        e.eventLabel.toLowerCase().includes(q) ||
        e.eventName.toLowerCase().includes(q) ||
        (e.attachedFunctionName && e.attachedFunctionName.toLowerCase().includes(q))
    );
  }, [events, q]);

  return (
    <div className="panel-shell" role="region" aria-label={`Asset Details: ${panelTitle}`}>
      {/* UE-Style Panel Header */}
      <div className="panel-header">
        <div className="panel-header__title">
          {isBlueprint ? (
            <Cpu size={14} style={{ color: "var(--accent-warning)" }} />
          ) : isSequencer ? (
            <Film size={14} style={{ color: "var(--accent-purple)" }} />
          ) : isConsole ? (
            <Terminal size={14} style={{ color: "var(--accent-primary)" }} />
          ) : isImage ? (
            <ImageIcon size={14} style={{ color: "var(--accent-info)" }} />
          ) : (
            <Box size={14} style={{ color: "var(--accent-primary)" }} />
          )}
          <span>Details: {panelTitle}</span>
        </div>
        <span className="panel-header__badge">
          {isBlueprint
            ? "Blueprint Class"
            : isSequencer
            ? "Sequencer Asset"
            : isConsole
            ? "Console Config"
            : isImage
            ? "Media Vector"
            : "React Component"}
        </span>
      </div>

      {/* +Add Component / Behavior Action Bar (Unreal Engine 5 Style) */}
      <div className="details-add-action-bar">
        <button
          type="button"
          className="details-add-button"
          onClick={() => setIsAddPaletteOpen((prev) => !prev)}
          title="Add Component, Behavior, Data Binding, or Animation (Ctrl+A / ⌘A)"
        >
          <Plus size={13} className="details-add-button__icon" />
          <span>Add</span>
          <span className="details-add-button__kbrd">⌘A</span>
        </button>
        <span className="details-add-action-bar__hint">
          Attach components, behaviors, bindings & presets
        </span>

        {/* Floating Dropdown Palette */}
        <AddComponentPalette
          isOpen={isAddPaletteOpen}
          onClose={() => setIsAddPaletteOpen(false)}
          onSelectItem={handlePaletteSelectItem}
        />
      </div>

      {/* Global Details Search Filter Bar (Unreal Style) */}
      <div className="details-search-bar">
        <Search size={12} className="details-search-bar__icon" />
        <input
          type="text"
          className="details-search-bar__input"
          placeholder="Search Details & Properties..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            className="details-search-bar__clear"
            onClick={() => setSearchQuery("")}
            title="Clear Filter"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* Parent Class Inheritance Breadcrumb Chain (Unreal Engine Style) */}
      <div className="details-class-chain" role="navigation" aria-label="Class Inheritance Chain">
        <div className="details-class-chain__label" title="Parent Class Inheritance Chain">
          <Layers size={11} />
        </div>
        <div className="details-class-chain__items">
          {classChain.map((cls, idx) => {
            const isCurrent = idx === classChain.length - 1;
            const isSelected =
              selectedClassInChain === cls || (!selectedClassInChain && isCurrent);
            return (
              <React.Fragment key={cls}>
                <button
                  type="button"
                  className={`details-class-chain__item ${
                    isCurrent ? "details-class-chain__item--current" : ""
                  } ${isSelected ? "details-class-chain__item--selected" : ""}`}
                  onClick={() => handleClassClick(cls, isCurrent)}
                  title={
                    isCurrent
                      ? `Current Class: ${cls}`
                      : `Inherited from parent class ${cls} (click to inspect)`
                  }
                >
                  {cls}
                </button>
                {!isCurrent && (
                  <ChevronRight size={10} className="details-class-chain__sep" />
                )}
              </React.Fragment>
            );
          })}
        </div>
        {selectedClassInChain && selectedClassInChain !== classChain[classChain.length - 1] && (
          <button
            type="button"
            className="details-class-chain__reset"
            onClick={() => setSelectedClassInChain(null)}
            title="Clear class filter"
          >
            <X size={10} />
          </button>
        )}
      </div>

      {/* Element Archetype Quick Switcher Bar (Unreal Style Context Switching) */}
      {isComponent && (
        <div className="details-archetype-bar">
          <span className="details-archetype-bar__label">Archetype:</span>
          <div className="details-archetype-pills">
            {(
              [
                { id: "button", label: "Button", icon: Sparkles },
                { id: "image", label: "Image", icon: ImageIcon },
                { id: "text", label: "Text", icon: Type },
                { id: "container", label: "Container", icon: Box },
                { id: "input", label: "Input", icon: Sliders },
                { id: "form", label: "Form", icon: Workflow },
                { id: "generic", label: "Generic", icon: Layers },
              ] as const
            ).map((archetype) => {
              const IconComp = archetype.icon;
              const isActive = activeElementType === archetype.id;
              return (
                <button
                  key={archetype.id}
                  type="button"
                  className={`details-archetype-pill ${
                    isActive ? "details-archetype-pill--active" : ""
                  }`}
                  onClick={() => {
                    setActiveElementType(archetype.id as ElementType);
                    setActionNotification({
                      message: `Switched context to ${archetype.label} Archetype`,
                      type: "success",
                    });
                  }}
                  title={`Switch inspection archetype to ${archetype.label}`}
                >
                  <IconComp size={10} className="details-archetype-pill__icon" />
                  <span>{archetype.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Notification Toast */}
      {actionNotification && (
        <div
          className={`details-toast-notification details-toast-notification--${actionNotification.type}`}
        >
          <Check size={12} className="details-toast-notification__icon" />
          <span>{actionNotification.message}</span>
        </div>
      )}

      <div className="panel-scroll-content">
        {/* ====================================================================
         * CATEGORY 1: IDENTITY & ASSET SPECIFICATION
         * ==================================================================== */}
        <div className="details-section">
          <button
            type="button"
            className="details-section__header"
            onClick={() => toggleSection("identity")}
          >
            <ChevronRight
              size={12}
              className={`details-section__chevron ${
                sectionsOpen.identity || q ? "details-section__chevron--open" : ""
              }`}
            />
            <span className="details-section__title">Asset Specification</span>
          </button>

          {(sectionsOpen.identity || q) && (
            <div className="details-section__body">
              <div className="form-group-row">
                <span className="form-label">Asset Name</span>
                <span className="form-static-val" style={{ fontWeight: 600 }}>
                  {panelTitle}
                </span>
              </div>
              <div className="form-group-row">
                <span className="form-label">Identifier</span>
                <span className="form-static-val"><code>{panelId}</code></span>
              </div>
              <div className="form-group-row">
                <span className="form-label">Archetype Class</span>
                <select
                  className="form-select archetype-select-field"
                  value={activeElementType}
                  onChange={(e) => {
                    const next = e.target.value as ElementType;
                    setActiveElementType(next);
                    setActionNotification({
                      message: `Switched archetype to ${next}`,
                      type: "success",
                    });
                  }}
                >
                  <option value="button">Button (Interactive Widget)</option>
                  <option value="image">Image (Texture / Media)</option>
                  <option value="text">Text (String / Typography)</option>
                  <option value="container">Container (Flexbox / Grid Layout)</option>
                  <option value="input">Input (Form Field / Validation)</option>
                  <option value="form">Form (Composite Submission)</option>
                  <option value="generic">Generic (Base Element)</option>
                </select>
              </div>
              <div className="form-group-row">
                <span className="form-label">Parent Class</span>
                <span className="form-static-val" style={{ color: "var(--accent-primary)" }}>
                  {defaultSchema.parentClass}
                </span>
              </div>
              <div className="form-group-row">
                <span className="form-label">Execution Domain</span>
                <span className="form-static-val" style={{ color: "var(--accent-success)" }}>
                  Client WASM • 120 FPS
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ====================================================================
         * ELEMENT SPECIFIC: BUTTON STATES & CAPABILITIES
         * ==================================================================== */}
        {activeSections.includes("button_states") && (
          <div className="details-section">
            <button
              type="button"
              className="details-section__header"
              onClick={() => toggleSection("button_states")}
            >
              <ChevronRight
                size={12}
                className={`details-section__chevron ${
                  sectionsOpen.button_states || q ? "details-section__chevron--open" : ""
                }`}
              />
              <span className="details-section__title">Button States & Capabilities</span>
            </button>

            {(sectionsOpen.button_states || q) && (
              <div className="details-section__body" style={{ padding: "4px 8px 10px" }}>
                <ButtonStateEditor
                  config={buttonConfig}
                  onChange={setButtonConfig}
                  onReset={() => {
                    if (defaultSchema.buttonConfig) setButtonConfig(defaultSchema.buttonConfig);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
         * ELEMENT SPECIFIC: IMAGE TEXTURE & RENDERING
         * ==================================================================== */}
        {activeSections.includes("image_props") && (
          <div className="details-section">
            <button
              type="button"
              className="details-section__header"
              onClick={() => toggleSection("image_props")}
            >
              <ChevronRight
                size={12}
                className={`details-section__chevron ${
                  sectionsOpen.image_props || q ? "details-section__chevron--open" : ""
                }`}
              />
              <span className="details-section__title">Image Texture & Render Engine</span>
            </button>

            {(sectionsOpen.image_props || q) && (
              <div className="details-section__body" style={{ padding: "4px 8px 10px" }}>
                <ImagePropertiesEditor
                  config={imageConfig}
                  onChange={setImageConfig}
                  onReset={() => {
                    if (defaultSchema.imageConfig) setImageConfig(defaultSchema.imageConfig);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
         * ELEMENT SPECIFIC: TEXT CONTENT & FORMATTING
         * ==================================================================== */}
        {activeSections.includes("text_content") && (
          <div className="details-section">
            <button
              type="button"
              className="details-section__header"
              onClick={() => toggleSection("text_content")}
            >
              <ChevronRight
                size={12}
                className={`details-section__chevron ${
                  sectionsOpen.text_content || q ? "details-section__chevron--open" : ""
                }`}
              />
              <span className="details-section__title">Text Content & Formatting</span>
            </button>

            {(sectionsOpen.text_content || q) && (
              <div className="details-section__body" style={{ padding: "4px 8px 10px" }}>
                <TextContentEditor
                  config={textConfig}
                  onChange={setTextConfig}
                  onReset={() => {
                    if (defaultSchema.textConfig) setTextConfig(defaultSchema.textConfig);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
         * ELEMENT SPECIFIC: CONTAINER LAYOUT & SLOTS
         * ==================================================================== */}
        {activeSections.includes("container_layout") && (
          <div className="details-section">
            <button
              type="button"
              className="details-section__header"
              onClick={() => toggleSection("container_layout")}
            >
              <ChevronRight
                size={12}
                className={`details-section__chevron ${
                  sectionsOpen.container_layout || q ? "details-section__chevron--open" : ""
                }`}
              />
              <span className="details-section__title">Container Layout & Slots</span>
            </button>

            {(sectionsOpen.container_layout || q) && (
              <div className="details-section__body" style={{ padding: "4px 8px 10px" }}>
                <ContainerLayoutEditor
                  config={containerConfig}
                  onChange={setContainerConfig}
                  onReset={() => {
                    if (defaultSchema.containerConfig) setContainerConfig(defaultSchema.containerConfig);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
         * ELEMENT SPECIFIC: INPUT VALIDATION & RULES
         * ==================================================================== */}
        {activeSections.includes("input_validation") && (
          <div className="details-section">
            <button
              type="button"
              className="details-section__header"
              onClick={() => toggleSection("input_validation")}
            >
              <ChevronRight
                size={12}
                className={`details-section__chevron ${
                  sectionsOpen.input_validation || q ? "details-section__chevron--open" : ""
                }`}
              />
              <span className="details-section__title">Input Validation & Rules</span>
            </button>

            {(sectionsOpen.input_validation || q) && (
              <div className="details-section__body" style={{ padding: "4px 8px 10px" }}>
                <InputValidationEditor
                  config={inputConfig}
                  onChange={setInputConfig}
                  onReset={() => {
                    if (defaultSchema.inputConfig) setInputConfig(defaultSchema.inputConfig);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
         * CATEGORY 2: COMPONENT SLOT & HIERARCHY ATTACHMENTS
         * ==================================================================== */}
        {isComponent && activeSections.includes("attachments") && (
          <div className="details-section">
            <button
              type="button"
              className="details-section__header"
              onClick={() => toggleSection("attachments")}
            >
              <ChevronRight
                size={12}
                className={`details-section__chevron ${
                  sectionsOpen.attachments || q ? "details-section__chevron--open" : ""
                }`}
              />
              <span className="details-section__title">Slot & Hierarchy Attachments</span>
            </button>

            {(sectionsOpen.attachments || q) && (
              <div className="details-section__body">
                <div className="ue-attachment-card">
                  <div className="ue-attachment-row">
                    <span className="ue-attachment-label">Attached Parent:</span>
                    <span className="form-static-val" style={{ fontWeight: 600 }}>
                      {attachment.parentName}
                    </span>
                  </div>

                  <div className="ue-attachment-row">
                    <span className="ue-attachment-label">Slot Type:</span>
                    <select
                      className="form-select"
                      style={{ height: 24, fontSize: 11, width: 140 }}
                      value={attachment.slotType}
                      onChange={(e) =>
                        setAttachment((prev) => ({
                          ...prev,
                          slotType: e.target.value as ComponentAttachment["slotType"],
                        }))
                      }
                    >
                      <option value="flex">Flex Child</option>
                      <option value="grid">Grid Cell</option>
                      <option value="absolute">Canvas Absolute</option>
                      <option value="portal">Overlay Portal</option>
                    </select>
                  </div>

                  <div className="ue-attachment-row">
                    <span className="ue-attachment-label">Attachment Socket:</span>
                    <span className="ue-socket-badge">{attachment.attachedSocket || "root"}</span>
                  </div>

                  <div className="ue-attachment-row">
                    <span className="ue-attachment-label">Self Alignment:</span>
                    <select
                      className="form-select"
                      style={{ height: 24, fontSize: 11, width: 140 }}
                      value={attachment.slotProperties.alignSelf || "auto"}
                      onChange={(e) =>
                        setAttachment((prev) => ({
                          ...prev,
                          slotProperties: {
                            ...prev.slotProperties,
                            alignSelf: e.target.value as ComponentAttachment["slotProperties"]["alignSelf"],
                          },
                        }))
                      }
                    >
                      <option value="auto">Auto</option>
                      <option value="flex-start">Start</option>
                      <option value="center">Center</option>
                      <option value="flex-end">End</option>
                      <option value="stretch">Stretch</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
         * CATEGORY 3: TYPED VARIABLES & STATE PROPS (WITH CATEGORIES & ADVANCED)
         * ==================================================================== */}
        {isComponent && activeSections.includes("variables") && (() => {
          const standardVars = filteredVariables.filter((v) => !v.isAdvanced && v.category !== "Advanced");
          const advancedVars = filteredVariables.filter((v) => v.isAdvanced || v.category === "Advanced");

          const standardCategoryNames = Array.from(new Set(standardVars.map((v) => v.category || "General")));
          const orderedStandardCategories = [
            ...["General", "Styling", "Data"].filter((c) => standardCategoryNames.includes(c)),
            ...standardCategoryNames.filter((c) => !["General", "Styling", "Data"].includes(c)),
          ];

          const renderVariableRow = (v: ComponentVariable) => {
            return (
              <div
                key={v.id}
                className="ue-prop-row"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleReorderVariables(v.id)}
              >
                <div className="ue-prop-header">
                  <div className="ue-prop-title-group">
                    {/* Drag Grip Handle */}
                    <span
                      className="ue-drag-handle"
                      draggable
                      onDragStart={() => setDraggedVarId(v.id)}
                      title="Drag to reorder variable"
                    >
                      <GripVertical size={11} />
                    </span>

                    {/* Type Pill */}
                    <span className={`ue-var-pill ue-var-pill--${v.type}`}>{v.type}</span>

                    {/* Variable Name with Floating Tooltip Card */}
                    <div
                      className="ue-prop-name-wrap"
                      onMouseEnter={() => setHoveredVarTooltip(v)}
                      onMouseLeave={() => setHoveredVarTooltip(null)}
                    >
                      <span className="ue-prop-name">{v.name}</span>
                      {v.isAdvanced && <span className="ue-advanced-tag">ADV</span>}

                      {/* FLOATING TOOLTIP CARD */}
                      {hoveredVarTooltip?.id === v.id && (
                        <div className="ue-floating-var-tooltip">
                          <div className="ue-var-tooltip-header">
                            <span className="ue-var-tooltip-name">{v.name}</span>
                            <span className={`ue-var-pill ue-var-pill--${v.type}`}>{v.type}</span>
                          </div>
                          <div className="ue-var-tooltip-desc">
                            {v.tooltip || "No description provided."}
                          </div>
                          <div className="ue-var-tooltip-footer">
                            <div className="ue-var-tooltip-default">
                              <span className="ue-var-tooltip-label">Default:</span>
                              <code>
                                {typeof v.defaultValue === "object"
                                  ? JSON.stringify(v.defaultValue)
                                  : String(v.defaultValue)}
                              </code>
                            </div>
                            <div className="ue-var-tooltip-status">
                              {v.isInstanceEditable ? (
                                <span className="ue-status-badge ue-status-badge--public">
                                  <Eye size={10} /> Public
                                </span>
                              ) : (
                                <span className="ue-status-badge ue-status-badge--private">
                                  Private
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ue-prop-actions">
                    {/* Eye icon: Instance Editable Toggle */}
                    <button
                      type="button"
                      className={`ue-eye-btn ${v.isInstanceEditable ? "ue-eye-btn--active" : ""}`}
                      onClick={() => handleToggleEye(v.id)}
                      title={v.isInstanceEditable ? "Public Component Prop (Click to make Private)" : "Private Internal State (Click to make Public)"}
                    >
                      <Eye size={12} />
                    </button>

                    {/* Yellow Reset-to-Default Button */}
                    <button
                      type="button"
                      className={`ue-reset-btn ${v.isModified ? "ue-reset-btn--active" : ""}`}
                      onClick={() => v.isModified && handleResetVariable(v.id)}
                      title={
                        v.isModified
                          ? `Reset to default: ${typeof v.defaultValue === "object" ? JSON.stringify(v.defaultValue) : String(v.defaultValue)}`
                          : "Default value active"
                      }
                      disabled={!v.isModified}
                    >
                      <RotateCcw size={11} />
                    </button>
                  </div>
                </div>

                {/* Typed Input Controls */}
                <div className="ue-prop-input-container">
                  {v.type === "number" ? (
                    <ScrubNumberInput
                      value={Number(v.currentValue) || 0}
                      onChange={(newNum) => handleVariableChange(v.id, newNum)}
                    />
                  ) : v.type === "json" ? (
                    <JsonObjectEditor
                      value={v.currentValue}
                      onChange={(newObj) => handleVariableChange(v.id, newObj)}
                    />
                  ) : v.type === "reference" ? (
                    <AssetReferencePicker
                      value={String(v.currentValue || "")}
                      onChange={(newRef) => handleVariableChange(v.id, newRef)}
                    />
                  ) : v.type === "string" ? (
                    <input
                      type="text"
                      className="form-input"
                      style={{ height: 26, fontSize: 11 }}
                      value={String(v.currentValue ?? "")}
                      onChange={(e) => handleVariableChange(v.id, e.target.value)}
                    />
                  ) : v.type === "boolean" ? (
                    <div className="form-group-row" style={{ padding: 0 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {v.currentValue ? "True (Enabled)" : "False (Disabled)"}
                      </span>
                      <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={Boolean(v.currentValue)}
                        onChange={(e) => handleVariableChange(v.id, e.target.checked)}
                      />
                    </div>
                  ) : v.type === "enum" ? (
                    <select
                      className="form-select"
                      style={{ height: 26, fontSize: 11 }}
                      value={String(v.currentValue)}
                      onChange={(e) => handleVariableChange(v.id, e.target.value)}
                    >
                      {v.enumOptions?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : v.type === "color" ? (
                    <label className="form-color-picker" style={{ width: "100%" }}>
                      <div
                        className="form-color-picker__swatch"
                        style={{ backgroundColor: String(v.currentValue) }}
                      />
                      <input
                        type="color"
                        style={{ width: 0, height: 0, padding: 0, border: "none", position: "absolute", opacity: 0 }}
                        value={String(v.currentValue)}
                        onChange={(e) => handleVariableChange(v.id, e.target.value)}
                      />
                      <input
                        type="text"
                        className="form-input"
                        style={{ height: 22, fontSize: 11, flex: 1, border: "none", background: "transparent" }}
                        value={String(v.currentValue)}
                        onChange={(e) => handleVariableChange(v.id, e.target.value)}
                      />
                    </label>
                  ) : (
                    <input
                      type="text"
                      className="form-input"
                      style={{ height: 26, fontSize: 11 }}
                      value={String(v.currentValue ?? "")}
                      onChange={(e) => handleVariableChange(v.id, e.target.value)}
                    />
                  )}
                </div>
              </div>
            );
          };

          return (
            <div className="details-section">
              <button
                type="button"
                className="details-section__header"
                onClick={() => toggleSection("variables")}
              >
                <ChevronRight
                  size={12}
                  className={`details-section__chevron ${
                    sectionsOpen.variables || q ? "details-section__chevron--open" : ""
                  }`}
                />
                <span className="details-section__title">
                  Variables & Props ({filteredVariables.length})
                </span>
              </button>

              {(sectionsOpen.variables || q) && (
                <div className="details-section__body" style={{ padding: "4px 8px 10px" }}>
                  {filteredVariables.length === 0 ? (
                    <div style={{ color: "var(--text-muted)", fontSize: 11, padding: "8px 0" }}>
                      No properties match &ldquo;{searchQuery}&rdquo;
                    </div>
                  ) : (
                    <>
                      {/* Render Standard Categories */}
                      {orderedStandardCategories.map((cat) => {
                        const catVars = standardVars.filter((v) => (v.category || "General") === cat);
                        if (catVars.length === 0 && !q) return null;
                        const isCatOpen = openVarCategories[cat] !== false || !!q;

                        return (
                          <div key={cat} className="ue-var-category-group">
                            <button
                              type="button"
                              className="ue-var-category-header"
                              onClick={() => toggleVarCategory(cat)}
                            >
                              <ChevronRight
                                size={11}
                                className={`ue-var-category-chevron ${
                                  isCatOpen ? "ue-var-category-chevron--open" : ""
                                }`}
                              />
                              <span className="ue-var-category-title">{cat}</span>
                              <span className="ue-var-category-count">({catVars.length})</span>
                            </button>

                            {isCatOpen && (
                              <div className="ue-var-category-items">
                                {catVars.map((v) => renderVariableRow(v))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* ADVANCED PROPERTIES GROUP */}
                      {advancedVars.length > 0 && (
                        <div className="ue-var-advanced-wrapper">
                          <button
                            type="button"
                            className="ue-var-advanced-toggle-btn"
                            onClick={() => setShowAdvancedVariables((prev) => !prev)}
                          >
                            <ChevronRight
                              size={11}
                              className={`ue-var-category-chevron ${
                                showAdvancedVariables || q ? "ue-var-category-chevron--open" : ""
                              }`}
                            />
                            <Sliders size={11} />
                            <span>
                              {showAdvancedVariables || q
                                ? "Hide Advanced Properties"
                                : `Show Advanced Properties (${advancedVars.length} hidden)`}
                            </span>
                          </button>

                          {(showAdvancedVariables || q) && (
                            <div className="ue-var-advanced-items">
                              {advancedVars.map((v) => renderVariableRow(v))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* ADD VARIABLE BUTTON & INLINE FORM */}
                  <div className="ue-add-var-container">
                    {!isAddVariableOpen ? (
                      <button
                        type="button"
                        className="ue-add-var-btn"
                        onClick={() => setIsAddVariableOpen(true)}
                      >
                        <Plus size={11} />
                        <span>Add Variable</span>
                      </button>
                    ) : (
                      <div className="ue-add-var-form">
                        <div className="ue-add-var-form-title">
                          <span>New Component Property</span>
                          <button
                            type="button"
                            className="ue-add-var-form-close"
                            onClick={() => setIsAddVariableOpen(false)}
                          >
                            <X size={12} />
                          </button>
                        </div>

                        <div className="form-group-row">
                          <label className="form-label">Name</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. badgeCount"
                            value={newVarDraft.name}
                            onChange={(e) =>
                              setNewVarDraft((prev) => ({ ...prev, name: e.target.value }))
                            }
                            autoFocus
                          />
                        </div>

                        <div className="form-grid-2">
                          <div className="form-group">
                            <label className="form-label">Type</label>
                            <select
                              className="form-select"
                              value={newVarDraft.type}
                              onChange={(e) =>
                                setNewVarDraft((prev) => ({
                                  ...prev,
                                  type: e.target.value as ComponentVariable["type"],
                                }))
                              }
                            >
                              <option value="string">string</option>
                              <option value="number">number</option>
                              <option value="boolean">boolean</option>
                              <option value="color">color</option>
                              <option value="enum">enum</option>
                              <option value="json">json (object)</option>
                              <option value="reference">reference</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="form-label">Category</label>
                            <select
                              className="form-select"
                              value={newVarDraft.category}
                              onChange={(e) =>
                                setNewVarDraft((prev) => ({ ...prev, category: e.target.value }))
                              }
                            >
                              <option value="General">General</option>
                              <option value="Styling">Styling</option>
                              <option value="Data">Data</option>
                              <option value="Advanced">Advanced</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group-row">
                          <label className="form-label">Default Val</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder={newVarDraft.type === "number" ? "0" : newVarDraft.type === "boolean" ? "true" : "Value"}
                            value={newVarDraft.defaultValue}
                            onChange={(e) =>
                              setNewVarDraft((prev) => ({ ...prev, defaultValue: e.target.value }))
                            }
                          />
                        </div>

                        <div className="form-group-row">
                          <label className="form-label">Description</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Tooltip explanation"
                            value={newVarDraft.tooltip}
                            onChange={(e) =>
                              setNewVarDraft((prev) => ({ ...prev, tooltip: e.target.value }))
                            }
                          />
                        </div>

                        <div className="ue-add-var-checkboxes">
                          <label className="ue-add-var-checkbox-label">
                            <input
                              type="checkbox"
                              checked={newVarDraft.isInstanceEditable}
                              onChange={(e) =>
                                setNewVarDraft((prev) => ({
                                  ...prev,
                                  isInstanceEditable: e.target.checked,
                                }))
                              }
                            />
                            <span>Public Prop (Instance Editable)</span>
                          </label>

                          <label className="ue-add-var-checkbox-label">
                            <input
                              type="checkbox"
                              checked={newVarDraft.isAdvanced}
                              onChange={(e) =>
                                setNewVarDraft((prev) => ({
                                  ...prev,
                                  isAdvanced: e.target.checked,
                                }))
                              }
                            />
                            <span>Advanced Property</span>
                          </label>
                        </div>

                        <div className="ue-add-var-actions">
                          <button
                            type="button"
                            className="ue-btn-cancel"
                            onClick={() => setIsAddVariableOpen(false)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="ue-btn-submit"
                            onClick={handleCreateVariable}
                            disabled={!newVarDraft.name.trim()}
                          >
                            Create Variable
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ====================================================================
         * CATEGORY 4: EVENTS & FUNCTION DISPATCHERS ("ATTACH TO FUNCTION")
         * ==================================================================== */}
        {isComponent && activeSections.includes("events") && (
          <div className="details-section">
            <button
              type="button"
              className="details-section__header"
              onClick={() => toggleSection("events")}
            >
              <ChevronRight
                size={12}
                className={`details-section__chevron ${
                  sectionsOpen.events || q ? "details-section__chevron--open" : ""
                }`}
              />
              <span className="details-section__title">
                Events & Function Dispatchers ({filteredEvents.length})
              </span>
            </button>

            {(sectionsOpen.events || q) && (
              <div className="details-section__body">
                <div className="ue-events-list">
                  {filteredEvents.map((evt) => (
                    <div key={evt.eventId} style={{ display: "flex", flexDirection: "column" }}>
                      <div className="ue-event-item">
                        <div className="ue-event-title-group">
                          <Workflow size={12} style={{ color: "var(--accent-primary)" }} />
                          <span className="ue-event-name">{evt.eventLabel}</span>
                          {evt.parameterSignature && (
                            <span className="ue-event-signature" title="Event Parameters">
                              {evt.parameterSignature}
                            </span>
                          )}
                        </div>

                        {evt.attachedFunctionName ? (
                          <div className="ue-event-bound-pill">
                            <span>{evt.attachedFunctionName}</span>
                            <button
                              type="button"
                              className="ue-event-jump-btn"
                              onClick={() => onOpenBlueprint?.(evt.attachedFunctionId || undefined)}
                              title="Jump to Logic Blueprint node"
                            >
                              <ExternalLink size={11} />
                            </button>
                            <button
                              type="button"
                              className="ue-event-detach-btn"
                              onClick={() => handleDetachFunction(evt.eventId)}
                              title="Detach Function"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="ue-event-add-btn"
                            onClick={() =>
                              setActivePickerEventId(
                                activePickerEventId === evt.eventId ? null : evt.eventId
                              )
                            }
                            title="Attach to Logic Blueprint function or create node"
                          >
                            <Plus size={11} />
                            <span>Attach Function</span>
                          </button>
                        )}
                      </div>

                      {/* Dropdown Menu to Pick or Create Function */}
                      {activePickerEventId === evt.eventId && (
                        <div className="ue-function-picker">
                          <span className="ue-function-picker__title">Available Blueprint Functions</span>
                          {AVAILABLE_BLUEPRINT_FUNCTIONS.map((fn) => (
                            <button
                              key={fn.id}
                              type="button"
                              className="ue-function-option"
                              onClick={() => handleAttachFunction(evt.eventId, fn)}
                            >
                              <span>{fn.name}</span>
                              <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{fn.category}</span>
                            </button>
                          ))}
                          <button
                            type="button"
                            className="ue-function-option ue-function-option--create"
                            onClick={() => handleCreateNewBlueprintNode(evt.eventId, evt.eventLabel)}
                          >
                            <Plus size={12} />
                            <span>+ Create New Blueprint Event Node</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
         * CATEGORY 5: APPEARANCE & STYLING
         * ==================================================================== */}
        {isComponent && activeSections.includes("appearance") && (
          <div className="details-section">
            <button
              type="button"
              className="details-section__header"
              onClick={() => toggleSection("appearance")}
            >
              <ChevronRight
                size={12}
                className={`details-section__chevron ${
                  sectionsOpen.appearance || q ? "details-section__chevron--open" : ""
                }`}
              />
              <span className="details-section__title">Appearance & Tokens</span>
            </button>

            {(sectionsOpen.appearance || q) && (
              <div className="details-section__body" style={{ padding: "4px 8px 10px" }}>
                <AppearanceEditor
                  appearance={appearance}
                  onChange={setAppearance}
                  onResetToDefault={() => setAppearance(defaultSchema.appearance)}
                />
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
         * CATEGORY 6: TYPOGRAPHY & TEXT
         * ==================================================================== */}
        {isComponent && activeSections.includes("typography") && (
          <div className="details-section">
            <button
              type="button"
              className="details-section__header"
              onClick={() => toggleSection("typography")}
            >
              <ChevronRight
                size={12}
                className={`details-section__chevron ${
                  sectionsOpen.typography || q ? "details-section__chevron--open" : ""
                }`}
              />
              <span className="details-section__title">Typography & Text</span>
            </button>

            {(sectionsOpen.typography || q) && (
              <div className="details-section__body" style={{ padding: "4px 8px 10px" }}>
                <TypographyEditor
                  typography={typography}
                  onChange={setTypography}
                  onResetToDefault={() => setTypography(defaultSchema.typography)}
                />
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
         * CATEGORY 7: LAYOUT & SPACING
         * ==================================================================== */}
        {isComponent && activeSections.includes("layout") && (
          <div className="details-section">
            <button
              type="button"
              className="details-section__header"
              onClick={() => toggleSection("layout")}
            >
              <ChevronRight
                size={12}
                className={`details-section__chevron ${
                  sectionsOpen.layout || q ? "details-section__chevron--open" : ""
                }`}
              />
              <span className="details-section__title">Layout & Spacing</span>
            </button>

            {(sectionsOpen.layout || q) && (
              <div className="details-section__body" style={{ padding: "4px 8px 10px" }}>
                <LayoutSpacingEditor
                  layout={layout}
                  borderWidth={appearance.borderWidth || 1}
                  onChange={setLayout}
                  onResetToDefault={() =>
                    setLayout(
                      defaultSchema.layout || {
                        margin: { top: 0, right: 0, bottom: 0, left: 0, linked: true, unit: "px" },
                        padding: { top: 8, right: 16, bottom: 8, left: 16, linked: false, unit: "px" },
                        width: "auto",
                        widthUnit: "auto",
                        height: "auto",
                        heightUnit: "auto",
                        boxSizing: "border-box",
                        display: "block",
                        position: "static",
                        zIndex: 1,
                        overflowX: "visible",
                        overflowY: "visible",
                        cursor: "default",
                        pointerEvents: "auto",
                        userSelect: "auto",
                      }
                    )
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* BLUEPRINT CLASS SETTINGS */}
        {isBlueprint && (
          <div className="details-section">
            <button
              type="button"
              className="details-section__header"
              onClick={() => toggleSection("sequence")}
            >
              <ChevronRight
                size={12}
                className={`details-section__chevron ${sectionsOpen.sequence ? "details-section__chevron--open" : ""}`}
              />
              <span className="details-section__title">Class Defaults & Graph Info</span>
            </button>

            {sectionsOpen.sequence && (
              <div className="details-section__body">
                <div className="form-group">
                  <label className="form-label">Parent Class</label>
                  <span className="form-static-val">ActorComponent (WASM Kernel)</span>
                </div>
                <div className="form-group-row">
                  <span className="form-label">Compiled Bytecode</span>
                  <span className="form-static-val" style={{ color: "var(--accent-success)" }}>
                    Ready (0 Errors)
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEQUENCER CONFIGURATION */}
        {isSequencer && (
          <div className="details-section">
            <button
              type="button"
              className="details-section__header"
              onClick={() => toggleSection("sequence")}
            >
              <ChevronRight
                size={12}
                className={`details-section__chevron ${sectionsOpen.sequence ? "details-section__chevron--open" : ""}`}
              />
              <span className="details-section__title">Sequence Configuration</span>
            </button>

            {sectionsOpen.sequence && (
              <div className="details-section__body">
                <div className="form-group">
                  <label className="form-label">Display Rate</label>
                  <span className="form-static-val">60 FPS (Standard Web)</span>
                </div>
                <div className="form-group-row">
                  <span className="form-label">Loop Mode</span>
                  <span className="form-static-val">Continuous Loop</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* OUTPUT LOG CONSOLE */}
        {isConsole && (
          <div className="details-section">
            <button
              type="button"
              className="details-section__header"
              onClick={() => toggleSection("console")}
            >
              <ChevronRight
                size={12}
                className={`details-section__chevron ${sectionsOpen.console ? "details-section__chevron--open" : ""}`}
              />
              <span className="details-section__title">Console Stream Filters</span>
            </button>

            {sectionsOpen.console && (
              <div className="details-section__body">
                <div className="form-group-row">
                  <span className="form-label">Engine Verbosity</span>
                  <span className="form-static-val">Verbose (All Events)</span>
                </div>
                <div className="form-group-row">
                  <span className="form-label">Auto-Scroll</span>
                  <span className="form-static-val">Active</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
