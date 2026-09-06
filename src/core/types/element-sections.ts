"use client";

/**
 * ============================================================================
 * ELEMENT TYPE REGISTRY & CONTEXT-AWARE SECTION DEFINITIONS
 * ============================================================================
 * Defines element-specific schemas and maps element types to their
 * dedicated Details Inspector sections (Unreal Engine 5 style).
 * Architecture Ref: `DOCS/ROADMAP_2.md` §Phase 2.6
 * ============================================================================
 */

export type ElementType =
  | "button"
  | "image"
  | "text"
  | "container"
  | "input"
  | "form"
  | "generic";

export type DetailSectionId =
  | "identity"
  | "attachments"
  | "button_states"
  | "image_props"
  | "text_content"
  | "container_layout"
  | "input_validation"
  | "variables"
  | "events"
  | "appearance"
  | "typography"
  | "layout"
  | "sequence"
  | "console";

/** Section Registry Definition per Element Type */
export const ELEMENT_SECTION_REGISTRY: Record<ElementType, DetailSectionId[]> = {
  button: [
    "identity",
    "button_states",
    "attachments",
    "variables",
    "events",
    "appearance",
    "typography",
    "layout",
  ],
  image: [
    "identity",
    "image_props",
    "attachments",
    "variables",
    "appearance",
    "layout",
  ],
  text: [
    "identity",
    "text_content",
    "attachments",
    "typography",
    "variables",
    "appearance",
    "layout",
  ],
  container: [
    "identity",
    "container_layout",
    "attachments",
    "variables",
    "appearance",
    "layout",
  ],
  input: [
    "identity",
    "input_validation",
    "attachments",
    "variables",
    "events",
    "typography",
    "appearance",
    "layout",
  ],
  form: [
    "identity",
    "input_validation",
    "container_layout",
    "attachments",
    "variables",
    "events",
    "layout",
  ],
  generic: [
    "identity",
    "attachments",
    "variables",
    "events",
    "appearance",
    "typography",
    "layout",
  ],
};

/** Button-specific configuration */
export interface ButtonSpecificConfig {
  hoverBgColor: string;
  activeBgColor: string;
  focusRingColor: string;
  focusRingWidth: number;
  disabledOpacity: number;
  // Loading
  isLoading: boolean;
  spinnerType: "circular" | "dots" | "pulse";
  spinnerColor: string;
  disableWhileLoading: boolean;
  loadingLabel: string;
  // Ripple
  rippleEnabled: boolean;
  rippleColor: string;
  rippleDuration: number;
  rippleOrigin: "center" | "pointer";
}

/** Image-specific configuration */
export interface ImageSpecificConfig {
  src: string;
  fallbackSrc: string;
  alt: string;
  objectFit: "cover" | "contain" | "fill" | "none" | "scale-down";
  objectPosition: string;
  aspectRatio: "1:1" | "16:9" | "4:3" | "21:9" | "auto" | "custom";
  customAspectRatio?: string;
  lazyLoad: boolean;
  loadingMode: "lazy" | "eager";
  placeholder: "blur" | "skeleton" | "none";
}

/** Text-specific configuration */
export interface TextSpecificConfig {
  content: string;
  isRichText: boolean;
  maxLines: number | "none";
  textOverflow: "clip" | "ellipsis";
  expandOnHover: boolean;
  formatBold: boolean;
  formatItalic: boolean;
  formatUnderline: boolean;
  formatStrike: boolean;
  formatCode: boolean;
}

/** Container-specific configuration */
export interface ContainerSpecificConfig {
  layoutMode: "flex" | "grid" | "absolute";
  // Flex
  flexDirection: "row" | "column" | "row-reverse" | "column-reverse";
  flexWrap: "nowrap" | "wrap" | "wrap-reverse";
  justifyContent: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems: "stretch" | "flex-start" | "center" | "flex-end" | "baseline";
  gap: number;
  // Grid
  gridColumns: string;
  gridRows: string;
  gridAutoFlow: "row" | "column" | "dense";
  // Children slots
  childrenSlots: { id: string; name: string; visible: boolean }[];
}

/** Input-specific configuration */
export interface InputSpecificConfig {
  inputType: "text" | "email" | "password" | "number" | "tel" | "url" | "search";
  placeholder: string;
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  errorMessage: string;
  autocomplete: "on" | "off" | "email" | "name" | "current-password" | "tel";
  readOnly: boolean;
  disabled: boolean;
}
