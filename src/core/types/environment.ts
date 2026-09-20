/**
 * ============================================================================
 * WORLD ENVIRONMENT & ELEMENT EXPERIENCE TYPES (THE TOP 20)
 * ============================================================================
 * Defines the master schema for the canvas viewport, element interaction physics,
 * design system inheritance, motion spring presets, and DevTools inspection.
 * Architecture Ref: DOCS/action working.md & implementation_plan.md
 * ============================================================================
 */

export type PanTriggerGesture = "space_drag" | "middle_mouse" | "any_blank";
export type ZoomSpeedPreset = "normal" | "fast";
export type GridStylePreset = "dots" | "lines" | "none";
export type CollisionBehavior = "pass_through" | "smart_push";
export type MarqueeSelectMode = "intersects" | "encloses";
export type PaletteThemeId = "cyber_indigo" | "emerald_tech" | "slate_modern" | "clean_light";
export type ElevationPreset = "none" | "subtle_float" | "medium_elevation" | "dramatic_pop";
export type InteractiveFeedbackStyle = "subtle_lift" | "glow_accent" | "scale_pop" | "glass_frost" | "none";
export type SpringPresetName = "snappy" | "bouncy" | "smooth" | "custom";

export interface SpringPhysicsConfig {
  stiffness: number; // Harmonic tension (k)
  damping: number;   // Friction coefficient (c)
  mass: number;      // Inertial mass (m)
}

export interface PaletteThemeDefinition {
  id: PaletteThemeId;
  name: string;
  bg: string;
  surface: string;
  accent: string;
  text: string;
  border: string;
  gridDot: string;
}

export interface WorldEnvironmentSettings {
  // 1. Viewport & Camera (3 Props)
  viewport: {
    pan: {
      enabled: boolean;
      trigger: PanTriggerGesture;
    };
    zoom: {
      enabled: boolean;
      speed: ZoomSpeedPreset;
      min: number;
      max: number;
    };
    grid: {
      style: GridStylePreset;
      size: number; // 8, 16, 24, 32
    };
    axes: {
      enabled: boolean;
    };
  };

  // 2. Element Transform & Canvas Interaction (4 Props)
  elements: {
    dragEnabled: boolean;
    autoReparent: boolean;
    collision: CollisionBehavior;
    marqueeMode: MarqueeSelectMode;
  };

  // 3. Snapping & Alignment Physics (3 Props)
  snapping: {
    snapToGrid: boolean;
    snapToElements: boolean;
    details: {
      distanceHUD: boolean;
      magneticDistance: number; // 4, 8, 12
      rotationStep: number;     // 0, 15, 45
      equalDistribution: boolean;
    };
  };

  // 4. Theme & Design System DNA (5 Props)
  theme: {
    palette: PaletteThemeId;
    defaultRadius: number; // 0, 6, 12, 16, 9999
    typography: {
      family: string;
      scaleRatio: number; // 1.2, 1.25, 1.333
    };
    elevation: ElevationPreset;
    feedback: InteractiveFeedbackStyle;
  };

  // 5. Motion & Spring Physics (3 Props)
  motion: {
    timeScale: number; // 0.1, 0.25, 0.5, 1.0, 2.0
    springPreset: SpringPresetName;
    spring: SpringPhysicsConfig;
    reducedMotion: boolean;
  };

  // 6. Diagnostics & DevTools (1 Prop)
  diagnostics: {
    inspectMode: boolean; // Master DevTools overlay toggle
  };
}

export const SPRING_PRESETS: Record<Exclude<SpringPresetName, "custom">, SpringPhysicsConfig> = {
  snappy: { stiffness: 180, damping: 24, mass: 1.0 },
  bouncy: { stiffness: 220, damping: 14, mass: 1.0 },
  smooth: { stiffness: 120, damping: 30, mass: 1.2 },
};

export const THEME_PALETTES: Record<PaletteThemeId, PaletteThemeDefinition> = {
  clean_light: {
    id: "clean_light",
    name: "Clean Light",
    bg: "#FCFDFD",
    surface: "#FFFFFF",
    accent: "#206859",
    text: "#0F172A",
    border: "rgba(15, 23, 42, 0.08)",
    gridDot: "#CBD5E1",
  },
  cyber_indigo: {
    id: "cyber_indigo",
    name: "Cyber Indigo",
    bg: "#0B0F19",
    surface: "#151C2C",
    accent: "#6366F1",
    text: "#F8FAFC",
    border: "rgba(99, 102, 241, 0.25)",
    gridDot: "rgba(148, 163, 184, 0.22)",
  },
  emerald_tech: {
    id: "emerald_tech",
    name: "Emerald Tech",
    bg: "#061814",
    surface: "#0B2620",
    accent: "#10B981",
    text: "#ECFDF5",
    border: "rgba(16, 185, 129, 0.25)",
    gridDot: "rgba(16, 185, 129, 0.20)",
  },
  slate_modern: {
    id: "slate_modern",
    name: "Slate Modern",
    bg: "#0F172A",
    surface: "#1E293B",
    accent: "#38BDF8",
    text: "#F1F5F9",
    border: "rgba(56, 189, 248, 0.25)",
    gridDot: "rgba(148, 163, 184, 0.20)",
  },
};

export const DEFAULT_ENVIRONMENT_SETTINGS: WorldEnvironmentSettings = {
  viewport: {
    pan: {
      enabled: true,
      trigger: "space_drag",
    },
    zoom: {
      enabled: true,
      speed: "normal",
      min: 10,
      max: 400,
    },
    grid: {
      style: "dots",
      size: 24,
    },
    axes: {
      enabled: true,
    },
  },
  elements: {
    dragEnabled: true,
    autoReparent: true,
    collision: "pass_through",
    marqueeMode: "intersects",
  },
  snapping: {
    snapToGrid: true,
    snapToElements: true,
    details: {
      distanceHUD: true,
      magneticDistance: 8,
      rotationStep: 15,
      equalDistribution: true,
    },
  },
  theme: {
    palette: "clean_light",
    defaultRadius: 12,
    typography: {
      family: "Inter",
      scaleRatio: 1.25,
    },
    elevation: "subtle_float",
    feedback: "subtle_lift",
  },
  motion: {
    timeScale: 1.0,
    springPreset: "snappy",
    spring: { ...SPRING_PRESETS.snappy },
    reducedMotion: false,
  },
  diagnostics: {
    inspectMode: false,
  },
};
