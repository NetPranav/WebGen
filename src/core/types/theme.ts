/**
 * ============================================================================
 * THEME & DESIGN TOKEN TYPE CONTRACTS
 * ============================================================================
 * UI Element: Design Token TypeScript Interface & Schema Definitions
 * Screen / Scope: Core Platform Layer -> Theme Engine & Panel 27 (Design System)
 * Role: Provides strict type definitions for all visual tokens across the engine.
 * 
 * SWAPPABILITY NOTE:
 * Defines the contract matching SCHEMA_REFERENCE.md §10 and UI.md §2.
 * Any theme preset (Light Confluence, Dark Unreal, Custom Brand) must conform to ThemeConfig.
 * ============================================================================
 */

export interface ColorTokens {
  /* Canvas & Surfaces */
  canvasBg: string;
  canvasDotColor: string;
  canvasDotSpacing: string;
  surfacePanel: string;
  surfacePanelSolid: string;
  surfacePanelHover: string;
  surfacePanelActive: string;
  surfacePanelSelected: string;
  surfaceDockBar: string;
  surfaceToolbar: string;
  surfaceStatusBar: string;
  surfaceOverlay: string;
  surfaceTooltip: string;

  /* Borders */
  borderSubtle: string;
  borderDefault: string;
  borderStrong: string;
  borderFocus: string;
  borderActive: string;

  /* Text */
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textTertiary: string;
  textInverse: string;
  textAccent: string;

  /* Semantic Accents */
  accentPrimary: string;
  accentPrimaryHover: string;
  accentPrimaryLight: string;
  accentSuccess: string;
  accentSuccessLight: string;
  accentWarning: string;
  accentWarningLight: string;
  accentDanger: string;
  accentDangerLight: string;
  accentInfo: string;
  accentInfoLight: string;
}

export interface WireColorTokens {
  exec: string;
  string: string;
  number: string;
  boolean: string;
  object: string;
  array: string;
  database: string;
  motion: string;
  event: string;
}

export interface TypographyTokens {
  fontSans: string;
  fontMono: string;
  scale: {
    xs: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
    "3xl": string;
    "4xl": string;
  };
  weights: {
    regular: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeights: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export interface SpacingTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
  "3xl": string;
}

export interface RadiiTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
  full: string;
}

export interface ShadowTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  floatingDock: string;
  divider: string;
}

export interface TransitionTokens {
  fast: string;
  normal: string;
  slow: string;
  bounce: string;
}

export interface ZIndexTokens {
  canvas: number;
  viewportElements: number;
  gizmo: number;
  panels: number;
  header: number;
  floatingDock: number;
  dropdown: number;
  modal: number;
  tooltip: number;
  toast: number;
}

export interface DockDimensions {
  headerHeight: string;
  toolbarHeight: string;
  statusBarHeight: string;
  dockLeftWidth: string;
  dockRightWidth: string;
  dockBottomHeight: string;
  tabBarHeight: string;
  collapsedStripWidth: string;
}

export interface ThemeConfig {
  $schema?: string;
  id: string;
  name: string;
  mode: "light" | "dark" | "custom";
  colors: ColorTokens;
  wires: WireColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radii: RadiiTokens;
  shadows: ShadowTokens;
  transitions: TransitionTokens;
  zIndex: ZIndexTokens;
  dock: DockDimensions;
}
