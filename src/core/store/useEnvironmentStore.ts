"use client";

/**
 * ============================================================================
 * WORLD ENVIRONMENT STORE (ROADMAP Sub-Phase 41.1)
 * ============================================================================
 * The World Environment (viewport, snapping, theme, motion, diagnostics — "the
 * Top 20") is independent of `useProjectStore`; it participates in undo as
 * part of "project" history entries (see `useProjectStore.ts`'s
 * `PROJECT_STATE_KEYS`/`pickProjectState` and `useDocumentStore.ts`'s
 * `applyEntry`), and in the serialization contract via `ProjectStateSnapshot.environment`,
 * but it is no longer a field on the live project store.
 * ============================================================================
 */

import { create } from "zustand";
import {
  WorldEnvironmentSettings,
  DEFAULT_ENVIRONMENT_SETTINGS,
  SPRING_PRESETS,
  SpringPresetName,
} from "../types/environment";

interface EnvironmentStoreState {
  environment: WorldEnvironmentSettings;
  updateEnvironment: (
    partial:
      | Partial<WorldEnvironmentSettings>
      | ((prev: WorldEnvironmentSettings) => Partial<WorldEnvironmentSettings>)
  ) => void;
  resetEnvironment: () => void;
  setSpringPreset: (preset: Exclude<SpringPresetName, "custom">) => void;
  toggleInspectMode: () => void;
}

export const useEnvironmentStore = create<EnvironmentStoreState>((set) => ({
  environment: DEFAULT_ENVIRONMENT_SETTINGS,

  updateEnvironment: (partial) => {
    set((state) => {
      const nextEnv = typeof partial === "function" ? partial(state.environment) : partial;
      const merged: WorldEnvironmentSettings = {
        ...state.environment,
        ...nextEnv,
        viewport: {
          ...state.environment.viewport,
          ...(nextEnv.viewport || {}),
          pan: {
            ...state.environment.viewport.pan,
            ...(nextEnv.viewport?.pan || {}),
          },
          zoom: {
            ...state.environment.viewport.zoom,
            ...(nextEnv.viewport?.zoom || {}),
          },
          grid: {
            ...state.environment.viewport.grid,
            ...(nextEnv.viewport?.grid || {}),
          },
          axes: {
            ...state.environment.viewport.axes,
            ...(nextEnv.viewport?.axes || {}),
          },
        },
        elements: {
          ...state.environment.elements,
          ...(nextEnv.elements || {}),
        },
        snapping: {
          ...state.environment.snapping,
          ...(nextEnv.snapping || {}),
          details: {
            ...state.environment.snapping.details,
            ...(nextEnv.snapping?.details || {}),
          },
        },
        theme: {
          ...state.environment.theme,
          ...(nextEnv.theme || {}),
          typography: {
            ...state.environment.theme.typography,
            ...(nextEnv.theme?.typography || {}),
          },
        },
        motion: {
          ...state.environment.motion,
          ...(nextEnv.motion || {}),
          spring: {
            ...state.environment.motion.spring,
            ...(nextEnv.motion?.spring || {}),
          },
        },
        diagnostics: {
          ...state.environment.diagnostics,
          ...(nextEnv.diagnostics || {}),
        },
      };
      return { environment: merged };
    });
  },

  resetEnvironment: () => {
    set({ environment: DEFAULT_ENVIRONMENT_SETTINGS });
  },

  setSpringPreset: (preset) => {
    const springVals = SPRING_PRESETS[preset];
    if (!springVals) return;
    set((state) => ({
      environment: {
        ...state.environment,
        motion: {
          ...state.environment.motion,
          springPreset: preset,
          spring: { ...springVals },
        },
      },
    }));
  },

  toggleInspectMode: () => {
    set((state) => ({
      environment: {
        ...state.environment,
        diagnostics: {
          ...state.environment.diagnostics,
          inspectMode: !state.environment.diagnostics.inspectMode,
        },
      },
    }));
  },
}));

export function getEnvironment(): WorldEnvironmentSettings {
  return useEnvironmentStore.getState().environment;
}

export function setEnvironment(next: WorldEnvironmentSettings): void {
  useEnvironmentStore.setState({ environment: next });
}
