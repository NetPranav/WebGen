/**
 * ============================================================================
 * UNREAL ENGINE STYLE ASSET DETAILS & ATTACHMENT TYPES
 * ============================================================================
 * UI Element: Asset Details, Component Hierarchy, Variables & Event Bindings
 * Screen / Scope: Right Dock Zone & Full-Page Asset Studio (`/editor`)
 * Role: Provides strict TypeScript interfaces for component attachments,
 *       typed variables with defaults, and event-to-function dispatchers.
 * Architecture Ref: `DOCS/UNREAL_FILE_DETAILS_SYSTEM.md`
 * ============================================================================
 */

/** Component Attachment & Slot Descriptor */
export interface ComponentAttachment {
  parentId: string;
  parentName: string;
  slotType: "flex" | "grid" | "absolute" | "portal" | "canvas";
  slotProperties: {
    alignSelf?: "auto" | "flex-start" | "flex-end" | "center" | "stretch";
    flexGrow?: number;
    flexShrink?: number;
    order?: number;
    gridArea?: string;
    zIndex?: number;
    anchors?: {
      horizontal: "left" | "center" | "right" | "stretch";
      vertical: "top" | "center" | "bottom" | "stretch";
    };
  };
  attachedSocket?: string;
}

/** Component Variable / Prop Definition */
export interface ComponentVariable {
  id: string;
  name: string;
  type: "string" | "number" | "boolean" | "color" | "enum" | "json" | "reference";
  category: "General" | "Styling" | "Data" | "Advanced" | string;
  defaultValue: unknown;
  currentValue: unknown;
  isModified: boolean;
  isInstanceEditable: boolean; // "Eye icon" in Unreal
  tooltip?: string;
  enumOptions?: string[];
  isAdvanced?: boolean;
}

/** Asset Reference Option for Reference Variables */
export interface AssetReferenceOption {
  id: string;
  name: string;
  type: "component" | "blueprint" | "image" | "icon";
  path: string;
}

export const AVAILABLE_ASSET_REFERENCES: AssetReferenceOption[] = [
  { id: "ref_icon", name: "Icon.tsx", type: "icon", path: "src/components/ui/Icon.tsx" },
  { id: "ref_badge", name: "Badge.tsx", type: "component", path: "src/components/ui/Badge.tsx" },
  { id: "ref_btn", name: "Button.tsx", type: "component", path: "src/components/ui/Button.tsx" },
  { id: "ref_hero", name: "HeroSection.tsx", type: "component", path: "src/components/sections/HeroSection.tsx" },
  { id: "ref_card", name: "Card.tsx", type: "component", path: "src/components/ui/Card.tsx" },
  { id: "ref_input", name: "Input.tsx", type: "component", path: "src/components/ui/Input.tsx" },
  { id: "ref_modal", name: "Modal.tsx", type: "component", path: "src/components/ui/Modal.tsx" },
  { id: "ref_bp_checkout", name: "bp_checkout.graph", type: "blueprint", path: "blueprints/bp_checkout.graph" },
  { id: "ref_bp_auth", name: "bp_auth.graph", type: "blueprint", path: "blueprints/bp_auth.graph" },
];

/** Component Event Dispatcher & Function Binding */
export interface ComponentEventBinding {
  eventId: string;
  eventName: string; // e.g. "onClick", "onHover", "onChange", "onSubmit"
  eventLabel: string; // e.g. "On Clicked", "On Hovered"
  parameterSignature?: string; // e.g. "(event: MouseEvent)"
  attachedFunctionId: string | null;
  attachedFunctionName: string | null;
  graphId?: string; // Logic Blueprint graph ID where node lives
  isCustomEvent?: boolean;
}

/** Gradient Stop definition */
export interface GradientStop {
  id: string;
  color: string;
  position: number; // 0 to 100
}

/** Gradient configuration */
export interface GradientConfig {
  enabled: boolean;
  type: "linear" | "radial" | "conic";
  angle: number; // 0 to 360
  stops: GradientStop[];
}

/** Background image configuration */
export interface BackgroundImageConfig {
  enabled: boolean;
  url: string;
  size: "cover" | "contain" | "auto";
  repeat: "no-repeat" | "repeat" | "repeat-x" | "repeat-y";
  position: string;
}

/** 4-sided border width configuration */
export interface BorderWidthConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
  linked: boolean;
}

/** 4-corner border radius configuration */
export interface BorderRadiusConfig {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
  linked: boolean;
}

/** Box shadow layer */
export interface BoxShadowLayer {
  id: string;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  inset: boolean;
  enabled: boolean;
}

/** Text shadow configuration */
export interface TextShadowConfig {
  enabled: boolean;
  x: number;
  y: number;
  blur: number;
  color: string;
}

/** Backdrop filter configuration */
export interface BackdropFilterConfig {
  enabled: boolean;
  blur: number;
  brightness: number;
  contrast: number;
  saturate: number;
}

/** Transform configuration */
export interface TransformConfig {
  translateX: number;
  translateY: number;
  rotate: number; // -180 to 180 deg
  scaleX: number;
  scaleY: number;
  scaleLinked: boolean;
  skewX: number;
  skewY: number;
  origin:
    | "top-left"
    | "top"
    | "top-right"
    | "left"
    | "center"
    | "right"
    | "bottom-left"
    | "bottom"
    | "bottom-right";
}

/** Transition and timing configuration */
export interface TransitionConfig {
  properties: string[];
  duration: number; // ms
  easing: string;
  delay: number; // ms
}

/** Comprehensive Asset Appearance Schema */
export interface AssetAppearanceSchema {
  // Legacy / top-level compatible
  backgroundColor: string;
  defaultBgColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  boxShadow: string;
  opacity: number;

  // Background deep properties
  backgroundMode?: "solid" | "gradient" | "image";
  backgroundOpacity?: number; // 0 to 100
  gradient?: GradientConfig;
  backgroundImage?: BackgroundImageConfig;
  backgroundBlendMode?: "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten";

  // Border deep properties
  borderWidths?: BorderWidthConfig;
  borderRadii?: BorderRadiusConfig;
  borderStyle?: "solid" | "dashed" | "dotted" | "double" | "none";

  // Shadows & Effects deep properties
  boxShadows?: BoxShadowLayer[];
  textShadow?: TextShadowConfig;
  backdropFilter?: BackdropFilterConfig;
  mixBlendMode?: "normal" | "multiply" | "screen" | "overlay" | "difference";

  // Transform deep properties
  transform?: TransformConfig;

  // Transition & Timing deep properties
  transition?: TransitionConfig;
}

/** Comprehensive Typography Schema */
export interface AssetTypographySchema {
  // Primary
  fontFamily: string;
  fontSize: number;
  fontSizeUnit?: "px" | "rem" | "em" | "vw";
  fontWeight: string; // "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900"
  lineHeight: number;
  lineHeightUnit?: "px" | "rem" | "em" | "";
  textAlign: "left" | "center" | "right" | "justify";
  color?: string;

  // Spacing & Flow
  letterSpacing?: number;
  letterSpacingUnit?: "px" | "em";
  wordSpacing?: number;
  wordSpacingUnit?: "px" | "em";
  whiteSpace?: "normal" | "nowrap" | "pre" | "pre-wrap";
  textOverflow?: "clip" | "ellipsis" | "fade";

  // Decoration & Transformation
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: "none" | "underline" | "line-through" | "overline";
  textDecorationColor?: string;
  textDecorationStyle?: "solid" | "dashed" | "dotted" | "wavy" | "double";
  fontStyle?: "normal" | "italic";
}

/** 4-sided Quad Box Values (for Margins & Paddings) */
export interface BoxEdgeValues {
  top: number;
  right: number;
  bottom: number;
  left: number;
  linked: boolean;
  unit: "px" | "rem" | "%" | "auto";
}

/** Comprehensive Layout & Spacing Schema */
export interface AssetLayoutSchema {
  // Spacing (Box Model)
  margin: BoxEdgeValues;
  padding: BoxEdgeValues;

  // Sizing & Dimensions
  width: number | string;
  widthUnit: "px" | "%" | "rem" | "vw" | "auto" | "fit-content";
  height: number | string;
  heightUnit: "px" | "%" | "rem" | "vh" | "auto" | "fit-content";
  minWidth?: number | string;
  maxWidth?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
  boxSizing?: "border-box" | "content-box";

  // Display & Flow
  display: "block" | "flex" | "grid" | "inline-flex" | "inline-block" | "inline" | "none";
  position: "static" | "relative" | "absolute" | "fixed" | "sticky";
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  zIndex?: number;
  overflowX: "visible" | "hidden" | "scroll" | "auto";
  overflowY: "visible" | "hidden" | "scroll" | "auto";

  // Flexbox container & item properties
  flexDirection?: "row" | "row-reverse" | "column" | "column-reverse";
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems?: "stretch" | "flex-start" | "center" | "flex-end" | "baseline";
  gap?: number;
  gapUnit?: "px" | "rem";
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string;
  alignSelf?: "auto" | "flex-start" | "center" | "flex-end" | "stretch";
  order?: number;

  // Grid container & item properties
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  rowGap?: number;
  columnGap?: number;
  gridColumn?: string;
  gridRow?: string;
  gridArea?: string;
  placeSelf?: "auto" | "start" | "end" | "center" | "stretch";

  // Cursor & Interaction
  cursor?: "default" | "pointer" | "grab" | "grabbing" | "text" | "not-allowed" | "crosshair" | "move" | "zoom-in";
  pointerEvents?: "auto" | "none";
  userSelect?: "auto" | "none" | "text" | "all";
}

import {
  ButtonSpecificConfig,
  ImageSpecificConfig,
  TextSpecificConfig,
  ContainerSpecificConfig,
  InputSpecificConfig,
} from "./element-sections";
import type { ArchetypeId } from "../document/registry";

/** Complete Asset Details Schema */
export interface AssetDetailSchema {
  assetId: string;
  assetTitle: string;
  assetType: "component" | "blueprint" | "sequencer" | "database" | "image" | "console";
  elementType?: ArchetypeId;
  path: string;
  parentClass: string;
  classChain: string[];
  executionDomain: "client-wasm" | "serverless-edge" | "hybrid";
  attachment: ComponentAttachment;
  variables: ComponentVariable[];
  events: ComponentEventBinding[];
  appearance: AssetAppearanceSchema;
  typography: AssetTypographySchema;
  layout?: AssetLayoutSchema;
  buttonConfig?: ButtonSpecificConfig;
  imageConfig?: ImageSpecificConfig;
  textConfig?: TextSpecificConfig;
  containerConfig?: ContainerSpecificConfig;
  inputConfig?: InputSpecificConfig;
}

/** Sample Mock Schemas for Components */
export const SAMPLE_ASSET_SCHEMAS: Record<string, AssetDetailSchema> = {
  ast_btn: {
    assetId: "ast_btn",
    assetTitle: "Button.tsx",
    assetType: "component",
    elementType: "button",
    path: "src/components/ui/Button.tsx",
    buttonConfig: {
      hoverBgColor: "#174f43",
      activeBgColor: "#134036",
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
    },
    parentClass: "BaseInteractiveWidget",
    classChain: ["UObject", "PageElement", "BaseInteractiveWidget", "Button"],
    executionDomain: "client-wasm",
    attachment: {
      parentId: "comp_hero",
      parentName: "Hero Container",
      slotType: "flex",
      slotProperties: {
        alignSelf: "center",
        flexGrow: 0,
        flexShrink: 0,
        order: 1,
        zIndex: 2,
      },
      attachedSocket: "action-button-slot",
    },
    variables: [
      {
        id: "var_label",
        name: "children (label)",
        type: "string",
        category: "General",
        defaultValue: "Click Me",
        currentValue: "Primary Action",
        isModified: true,
        isInstanceEditable: true,
        tooltip: "The text content rendered inside the button.",
      },
      {
        id: "var_variant",
        name: "variant",
        type: "enum",
        category: "Styling",
        defaultValue: "primary",
        currentValue: "primary",
        isModified: false,
        isInstanceEditable: true,
        enumOptions: ["primary", "secondary", "ghost", "danger"],
        tooltip: "Visual theme variant of the button.",
      },
      {
        id: "var_size",
        name: "size",
        type: "enum",
        category: "Styling",
        defaultValue: "md",
        currentValue: "md",
        isModified: false,
        isInstanceEditable: true,
        enumOptions: ["sm", "md", "lg"],
        tooltip: "Padding and typography size scale.",
      },
      {
        id: "var_loading",
        name: "isLoading",
        type: "boolean",
        category: "Data",
        defaultValue: false,
        currentValue: false,
        isModified: false,
        isInstanceEditable: true,
        tooltip: "Displays animated spinner and disables pointer events.",
      },
      {
        id: "var_color",
        name: "accentColor",
        type: "color",
        category: "Styling",
        defaultValue: "#206859",
        currentValue: "#206859",
        isModified: false,
        isInstanceEditable: true,
        tooltip: "Custom accent color override.",
      },
      {
        id: "var_elevation",
        name: "elevation",
        type: "number",
        category: "Styling",
        defaultValue: 2,
        currentValue: 2,
        isModified: false,
        isInstanceEditable: true,
        tooltip: "Z-axis elevation shadow level (0-10).",
      },
      {
        id: "var_icon_ref",
        name: "iconAsset",
        type: "reference",
        category: "General",
        defaultValue: "Icon.tsx",
        currentValue: "Icon.tsx",
        isModified: false,
        isInstanceEditable: true,
        tooltip: "Reference to an icon asset component.",
      },
      {
        id: "var_analytics",
        name: "analyticsMeta",
        type: "json",
        category: "Data",
        defaultValue: { event: "click_cta", source: "hero", track: true },
        currentValue: { event: "click_cta", source: "hero", track: true },
        isModified: false,
        isInstanceEditable: true,
        tooltip: "Telemetry & analytics metadata payload.",
      },
      {
        id: "var_debounce",
        name: "debounceMs",
        type: "number",
        category: "Advanced",
        isAdvanced: true,
        defaultValue: 300,
        currentValue: 300,
        isModified: false,
        isInstanceEditable: true,
        tooltip: "Click event debounce interval in milliseconds.",
      },
      {
        id: "var_aria_role",
        name: "ariaRole",
        type: "string",
        category: "Advanced",
        isAdvanced: true,
        defaultValue: "button",
        currentValue: "button",
        isModified: false,
        isInstanceEditable: false,
        tooltip: "ARIA accessibility role override.",
      },
    ],
    events: [
      {
        eventId: "evt_click",
        eventName: "onClick",
        eventLabel: "On Clicked",
        parameterSignature: "(event: MouseEvent)",
        attachedFunctionId: "fn_submit_order",
        attachedFunctionName: "SubmitOrder()",
        graphId: "bp_checkout",
      },
      {
        eventId: "evt_hover",
        eventName: "onMouseEnter",
        eventLabel: "On Hovered",
        parameterSignature: "(event: MouseEvent)",
        attachedFunctionId: null,
        attachedFunctionName: null,
      },
      {
        eventId: "evt_unhover",
        eventName: "onMouseLeave",
        eventLabel: "On Unhovered",
        parameterSignature: "(event: MouseEvent)",
        attachedFunctionId: null,
        attachedFunctionName: null,
      },
      {
        eventId: "evt_keydown",
        eventName: "onKeyDown",
        eventLabel: "On Key Down",
        parameterSignature: "(event: KeyboardEvent)",
        attachedFunctionId: null,
        attachedFunctionName: null,
      },
    ],
    appearance: {
      backgroundColor: "#206859",
      defaultBgColor: "#206859",
      borderColor: "rgba(32, 104, 89, 0.4)",
      borderWidth: 1,
      borderRadius: 6,
      boxShadow: "0 2px 8px rgba(32, 104, 89, 0.25)",
      opacity: 1,

      backgroundMode: "solid",
      backgroundOpacity: 100,
      gradient: {
        enabled: false,
        type: "linear",
        angle: 135,
        stops: [
          { id: "stop_1", color: "#206859", position: 0 },
          { id: "stop_2", color: "#174f43", position: 100 },
        ],
      },
      backgroundImage: {
        enabled: false,
        url: "",
        size: "cover",
        repeat: "no-repeat",
        position: "center",
      },
      backgroundBlendMode: "normal",

      borderWidths: {
        top: 1,
        right: 1,
        bottom: 1,
        left: 1,
        linked: true,
      },
      borderRadii: {
        topLeft: 6,
        topRight: 6,
        bottomRight: 6,
        bottomLeft: 6,
        linked: true,
      },
      borderStyle: "solid",

      boxShadows: [
        {
          id: "sh_btn_1",
          x: 0,
          y: 2,
          blur: 8,
          spread: 0,
          color: "rgba(32, 104, 89, 0.25)",
          inset: false,
          enabled: true,
        },
      ],
      textShadow: {
        enabled: false,
        x: 0,
        y: 1,
        blur: 2,
        color: "rgba(0, 0, 0, 0.2)",
      },
      backdropFilter: {
        enabled: false,
        blur: 0,
        brightness: 100,
        contrast: 100,
        saturate: 100,
      },
      mixBlendMode: "normal",

      transform: {
        translateX: 0,
        translateY: 0,
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
        scaleLinked: true,
        skewX: 0,
        skewY: 0,
        origin: "center",
      },

      transition: {
        properties: ["all"],
        duration: 200,
        easing: "ease",
        delay: 0,
      },
    },
    typography: {
      fontFamily: "Inter, sans-serif",
      fontSize: 14,
      fontSizeUnit: "px",
      fontWeight: "600",
      lineHeight: 1.4,
      lineHeightUnit: "",
      textAlign: "center",
      color: "#ffffff",
      letterSpacing: 0.2,
      letterSpacingUnit: "px",
      wordSpacing: 0,
      wordSpacingUnit: "px",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      textTransform: "none",
      textDecoration: "none",
      textDecorationColor: "#ffffff",
      textDecorationStyle: "solid",
      fontStyle: "normal",
    },
    layout: {
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        linked: true,
        unit: "px",
      },
      padding: {
        top: 10,
        right: 20,
        bottom: 10,
        left: 20,
        linked: false,
        unit: "px",
      },
      width: "auto",
      widthUnit: "auto",
      height: 40,
      heightUnit: "px",
      minWidth: 96,
      maxWidth: "none",
      minHeight: 36,
      maxHeight: "none",
      boxSizing: "border-box",
      display: "inline-flex",
      position: "relative",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 1,
      overflowX: "hidden",
      overflowY: "hidden",
      flexDirection: "row",
      flexWrap: "nowrap",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      gapUnit: "px",
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: "auto",
      alignSelf: "auto",
      order: 0,
      cursor: "pointer",
      pointerEvents: "auto",
      userSelect: "none",
    },
  },

  ast_hero: {
    assetId: "ast_hero",
    assetTitle: "HeroSection.tsx",
    assetType: "component",
    elementType: "container",
    containerConfig: {
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
    },
    path: "src/components/sections/HeroSection.tsx",
    parentClass: "BasePageSection",
    classChain: ["UObject", "PageElement", "BasePageSection", "HeroSection"],
    executionDomain: "client-wasm",
    attachment: {
      parentId: "page_home",
      parentName: "Landing Page Root",
      slotType: "flex",
      slotProperties: {
        alignSelf: "stretch",
        flexGrow: 1,
        flexShrink: 0,
        order: 0,
        zIndex: 1,
      },
      attachedSocket: "main-content-flow",
    },
    variables: [
      {
        id: "var_headline",
        name: "headline",
        type: "string",
        category: "General",
        defaultValue: "Build Applications Visually",
        currentValue: "Next-Generation Web Applications",
        isModified: true,
        isInstanceEditable: true,
        tooltip: "Main primary display heading.",
      },
      {
        id: "var_subhead",
        name: "subhead",
        type: "string",
        category: "General",
        defaultValue: "High-performance visual web engine.",
        currentValue: "Engineered with Unreal Engine precision and reactive AST compiling.",
        isModified: true,
        isInstanceEditable: true,
        tooltip: "Secondary explanatory paragraph text.",
      },
      {
        id: "var_cta_text",
        name: "ctaText",
        type: "string",
        category: "General",
        defaultValue: "Get Started",
        currentValue: "Get Started",
        isModified: false,
        isInstanceEditable: true,
        tooltip: "Call-to-action button caption.",
      },
      {
        id: "var_show_badge",
        name: "showReleaseBadge",
        type: "boolean",
        category: "General",
        defaultValue: true,
        currentValue: true,
        isModified: false,
        isInstanceEditable: true,
        tooltip: "Toggles release badge chip above headline.",
      },
      {
        id: "var_glow_color",
        name: "ambientGlow",
        type: "color",
        category: "Styling",
        defaultValue: "#8b5cf6",
        currentValue: "#8b5cf6",
        isModified: false,
        isInstanceEditable: true,
        tooltip: "Background radial gradient glow color.",
      },
    ],
    events: [
      {
        eventId: "evt_cta_click",
        eventName: "onCtaClick",
        eventLabel: "On CTA Clicked",
        attachedFunctionId: "fn_open_signup_modal",
        attachedFunctionName: "OpenSignupModal()",
        graphId: "bp_auth",
      },
      {
        eventId: "evt_scroll",
        eventName: "onScrollIntoView",
        eventLabel: "On Scroll Into View",
        attachedFunctionId: null,
        attachedFunctionName: null,
      },
    ],
    appearance: {
      backgroundColor: "#0d0f17",
      defaultBgColor: "#0d0f17",
      borderColor: "#1e2235",
      borderWidth: 1,
      borderRadius: 12,
      boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
      opacity: 1,

      backgroundMode: "solid",
      backgroundOpacity: 100,
      gradient: {
        enabled: true,
        type: "linear",
        angle: 180,
        stops: [
          { id: "h_stop_1", color: "#0D0F17", position: 0 },
          { id: "h_stop_2", color: "#1A1D2B", position: 100 },
        ],
      },
      backgroundImage: {
        enabled: false,
        url: "",
        size: "cover",
        repeat: "no-repeat",
        position: "center",
      },
      backgroundBlendMode: "normal",

      borderWidths: {
        top: 1,
        right: 1,
        bottom: 1,
        left: 1,
        linked: true,
      },
      borderRadii: {
        topLeft: 12,
        topRight: 12,
        bottomRight: 12,
        bottomLeft: 12,
        linked: true,
      },
      borderStyle: "solid",

      boxShadows: [
        {
          id: "sh_hero_1",
          x: 0,
          y: 12,
          blur: 40,
          spread: 0,
          color: "rgba(0, 0, 0, 0.4)",
          inset: false,
          enabled: true,
        },
      ],
      textShadow: {
        enabled: false,
        x: 0,
        y: 2,
        blur: 4,
        color: "rgba(0, 0, 0, 0.5)",
      },
      backdropFilter: {
        enabled: true,
        blur: 8,
        brightness: 100,
        contrast: 100,
        saturate: 100,
      },
      mixBlendMode: "normal",

      transform: {
        translateX: 0,
        translateY: 0,
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
        scaleLinked: true,
        skewX: 0,
        skewY: 0,
        origin: "center",
      },

      transition: {
        properties: ["all"],
        duration: 300,
        easing: "ease-out",
        delay: 0,
      },
    },
    typography: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 32,
      fontSizeUnit: "px",
      fontWeight: "700",
      lineHeight: 1.2,
      lineHeightUnit: "",
      textAlign: "center",
      color: "#f8fafc",
      letterSpacing: -0.5,
      letterSpacingUnit: "px",
      wordSpacing: 0,
      wordSpacingUnit: "px",
      whiteSpace: "normal",
      textOverflow: "clip",
      textTransform: "none",
      textDecoration: "none",
      textDecorationColor: "#f8fafc",
      textDecorationStyle: "solid",
      fontStyle: "normal",
    },
    layout: {
      margin: {
        top: 0,
        right: 0,
        bottom: 24,
        left: 0,
        linked: false,
        unit: "px",
      },
      padding: {
        top: 48,
        right: 32,
        bottom: 48,
        left: 32,
        linked: false,
        unit: "px",
      },
      width: 100,
      widthUnit: "%",
      height: "auto",
      heightUnit: "auto",
      minWidth: "auto",
      maxWidth: 1200,
      minHeight: 400,
      maxHeight: "none",
      boxSizing: "border-box",
      display: "flex",
      position: "relative",
      zIndex: 1,
      overflowX: "visible",
      overflowY: "visible",
      flexDirection: "column",
      flexWrap: "nowrap",
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
      gapUnit: "px",
      flexGrow: 1,
      flexShrink: 0,
      flexBasis: "auto",
      alignSelf: "stretch",
      order: 0,
      cursor: "default",
      pointerEvents: "auto",
      userSelect: "auto",
    },
  },

  ast_img: {
    assetId: "ast_img",
    assetTitle: "ProductImage.webp",
    assetType: "image",
    elementType: "image",
    path: "public/assets/ProductImage.webp",
    parentClass: "BaseVisualElement",
    classChain: ["UObject", "PageElement", "BaseVisualElement", "ImageElement"],
    executionDomain: "client-wasm",
    imageConfig: {
      src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
      fallbackSrc: "/placeholder.svg",
      alt: "Abstract 3D holographic rendering",
      objectFit: "cover",
      objectPosition: "center",
      aspectRatio: "16:9",
      lazyLoad: true,
      loadingMode: "lazy",
      placeholder: "blur",
    },
    attachment: {
      parentId: "ast_hero",
      parentName: "HeroSection.tsx",
      slotType: "flex",
      slotProperties: {
        alignSelf: "center",
        flexGrow: 0,
        flexShrink: 0,
        order: 2,
        zIndex: 1,
      },
      attachedSocket: "slot_preview",
    },
    variables: [
      {
        id: "var_img_alt",
        name: "altText",
        type: "string",
        category: "General",
        defaultValue: "Visual showcase",
        currentValue: "Abstract 3D holographic rendering",
        isModified: true,
        isInstanceEditable: true,
        tooltip: "Accessibility description for screen readers.",
      },
    ],
    events: [
      {
        eventId: "evt_img_load",
        eventName: "onLoad",
        eventLabel: "On Image Loaded",
        attachedFunctionId: null,
        attachedFunctionName: null,
      },
    ],
    appearance: {
      backgroundColor: "transparent",
      defaultBgColor: "transparent",
      borderColor: "#23283b",
      borderWidth: 1,
      borderRadius: 12,
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      opacity: 1,
    },
    typography: {
      fontFamily: "Inter, sans-serif",
      fontSize: 14,
      fontSizeUnit: "px",
      fontWeight: "400",
      lineHeight: 1.4,
      lineHeightUnit: "",
      textAlign: "center",
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
  },

  ast_input: {
    assetId: "ast_input",
    assetTitle: "Input.tsx",
    assetType: "component",
    elementType: "input",
    path: "src/components/ui/Input.tsx",
    parentClass: "BaseInputField",
    classChain: ["UObject", "PageElement", "BaseInteractiveWidget", "BaseInputField"],
    executionDomain: "client-wasm",
    inputConfig: {
      inputType: "email",
      placeholder: "name@company.com",
      required: true,
      minLength: 5,
      maxLength: 128,
      pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
      errorMessage: "Please enter a valid work email address.",
      autocomplete: "email",
      readOnly: false,
      disabled: false,
    },
    attachment: {
      parentId: "ast_hero",
      parentName: "HeroSection.tsx",
      slotType: "flex",
      slotProperties: {
        alignSelf: "stretch",
        flexGrow: 1,
        flexShrink: 0,
        order: 1,
        zIndex: 2,
      },
      attachedSocket: "slot_cta",
    },
    variables: [
      {
        id: "var_placeholder",
        name: "placeholder",
        type: "string",
        category: "General",
        defaultValue: "Enter email...",
        currentValue: "name@company.com",
        isModified: true,
        isInstanceEditable: true,
        tooltip: "Hint text displayed inside the field.",
      },
    ],
    events: [
      {
        eventId: "evt_input_change",
        eventName: "onChange",
        eventLabel: "On Value Changed",
        attachedFunctionId: null,
        attachedFunctionName: null,
      },
    ],
    appearance: {
      backgroundColor: "#0d1117",
      defaultBgColor: "#0d1117",
      borderColor: "#30363d",
      borderWidth: 1,
      borderRadius: 6,
      boxShadow: "none",
      opacity: 1,
    },
    typography: {
      fontFamily: "Inter, sans-serif",
      fontSize: 14,
      fontSizeUnit: "px",
      fontWeight: "400",
      lineHeight: 1.5,
      lineHeightUnit: "",
      textAlign: "left",
      color: "#e6edf3",
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
  },
};

/** Mock Blueprint Functions available for event attachment */
export interface BlueprintFunctionOption {
  id: string;
  name: string;
  graph: string;
  category: string;
}

export const AVAILABLE_BLUEPRINT_FUNCTIONS: BlueprintFunctionOption[] = [
  { id: "fn_submit_order", name: "SubmitOrder()", graph: "bp_checkout", category: "Checkout" },
  { id: "fn_open_signup_modal", name: "OpenSignupModal()", graph: "bp_auth", category: "Auth" },
  { id: "fn_navigate_dashboard", name: "NavigateToDashboard()", graph: "bp_navigation", category: "Routing" },
  { id: "fn_toggle_theme", name: "ToggleTheme()", graph: "bp_theme", category: "Settings" },
  { id: "fn_fetch_user_data", name: "FetchUserData()", graph: "bp_api", category: "Data" },
  { id: "fn_trigger_particle", name: "TriggerConfettiParticle()", graph: "bp_motion", category: "VFX" },
];

/** +Add Palette Categories */
export type AddPaletteCategory = "component" | "behavior" | "data" | "animation";

/** +Add Palette Item */
export interface AddPaletteItem {
  id: string;
  name: string;
  category: AddPaletteCategory;
  description: string;
  iconName: "Sparkles" | "Type" | "Box" | "Layers" | "RotateCcw" | "ImageIcon" | "Workflow" | "Eye" | "Database" | "Cpu" | "ExternalLink" | "Terminal" | "Film";
  badge?: string;
}

/** Pre-configured Palette Catalog for +Add Component / Behavior */
export const ADD_PALETTE_CATALOG: AddPaletteItem[] = [
  // Sub-components
  {
    id: "comp_icon",
    name: "Icon",
    category: "component",
    description: "Vector glyph icon slot with Lucide/Heroicon support.",
    iconName: "Sparkles",
    badge: "Slot",
  },
  {
    id: "comp_label",
    name: "Label",
    category: "component",
    description: "Secondary text or status caption element.",
    iconName: "Type",
    badge: "Slot",
  },
  {
    id: "comp_badge",
    name: "Badge",
    category: "component",
    description: "Count pill or categorical tag indicator.",
    iconName: "Box",
    badge: "Sub-comp",
  },
  {
    id: "comp_tooltip",
    name: "Tooltip",
    category: "component",
    description: "Hover overlay message with anchor positioning.",
    iconName: "Layers",
    badge: "Overlay",
  },
  {
    id: "comp_spinner",
    name: "Loading Spinner",
    category: "component",
    description: "Smooth CSS rotating indeterminate loading indicator.",
    iconName: "RotateCcw",
    badge: "Sub-comp",
  },
  {
    id: "comp_avatar",
    name: "User Avatar",
    category: "component",
    description: "Circular user thumbnail with monogram initials fallback.",
    iconName: "ImageIcon",
    badge: "Sub-comp",
  },

  // Behaviors
  {
    id: "beh_hover",
    name: "Hover Effect",
    category: "behavior",
    description: "Spring elevation, scale, and dynamic border glow on hover.",
    iconName: "Sparkles",
    badge: "Physics",
  },
  {
    id: "beh_click",
    name: "Click Animation",
    category: "behavior",
    description: "Tactile haptic press shrink and material ink ripple response.",
    iconName: "Workflow",
    badge: "Haptic",
  },
  {
    id: "beh_scroll",
    name: "Scroll Trigger",
    category: "behavior",
    description: "Scroll position-linked parallax or viewport activation.",
    iconName: "Layers",
    badge: "Trigger",
  },
  {
    id: "beh_observer",
    name: "Intersection Observer",
    category: "behavior",
    description: "Triggers view entry event when scrolled into viewport.",
    iconName: "Eye",
    badge: "Lifecycle",
  },
  {
    id: "beh_drag",
    name: "Draggable",
    category: "behavior",
    description: "Freeform or constrained mouse/touch drag behavior.",
    iconName: "Box",
    badge: "Interactive",
  },

  // Data Bindings
  {
    id: "data_api",
    name: "API Endpoint",
    category: "data",
    description: "Connect to REST / GraphQL query with automated revalidation.",
    iconName: "Database",
    badge: "REST/GQL",
  },
  {
    id: "data_state",
    name: "State Variable",
    category: "data",
    description: "Bind reactive property to global store or local signal.",
    iconName: "Cpu",
    badge: "Signal",
  },
  {
    id: "data_url",
    name: "URL Parameter",
    category: "data",
    description: "Two-way bind query parameters from route pathname.",
    iconName: "ExternalLink",
    badge: "Route",
  },
  {
    id: "data_storage",
    name: "LocalStorage Key",
    category: "data",
    description: "Persist values across sessions in browser storage.",
    iconName: "Database",
    badge: "Storage",
  },
  {
    id: "data_ws",
    name: "WebSocket Stream",
    category: "data",
    description: "Real-time socket channel event stream listener.",
    iconName: "Terminal",
    badge: "Stream",
  },

  // Animations
  {
    id: "anim_fade",
    name: "Fade In",
    category: "animation",
    description: "Smooth 300ms opacity reveal with cubic bezier curve.",
    iconName: "Film",
    badge: "Preset",
  },
  {
    id: "anim_slide",
    name: "Slide Up",
    category: "animation",
    description: "Vertical translation entrance from 20px bottom offset.",
    iconName: "Film",
    badge: "Preset",
  },
  {
    id: "anim_bounce",
    name: "Bounce",
    category: "animation",
    description: "Dynamic spring physics bounce with subtle overshoot.",
    iconName: "Film",
    badge: "Spring",
  },
  {
    id: "anim_pulse",
    name: "Pulse Loop",
    category: "animation",
    description: "Continuous subtle ambient breathing glow/scale animation.",
    iconName: "Film",
    badge: "Loop",
  },
  {
    id: "anim_skeleton",
    name: "Skeleton Loader",
    category: "animation",
    description: "Shimmer placeholder wave while asset is fetching data.",
    iconName: "Film",
    badge: "Loader",
  },
];

