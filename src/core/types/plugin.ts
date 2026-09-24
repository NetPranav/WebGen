"use client";

/**
 * ============================================================================
 * PLUGIN ARCHITECTURE & EXTENSION SDK CONTRACTS
 * ============================================================================
 * Pure TypeScript contracts for plugin manifests, capability permission model,
 * custom Blueprint node injection, custom element archetypes, and settings.
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.4 & Detailed Roadmap §Phase 29
 * ============================================================================
 */

import { NodeDefinition } from "./node-registry";

export type PluginCapability =
  | "network"
  | "storage"
  | "database"
  | "clipboard"
  | "filesystem";

export type PluginCategory =
  | "Payments"
  | "Data Visualization"
  | "Authentication"
  | "Utilities"
  | "Design System"
  | "Analytics";

export interface PluginSettingField {
  key: string;
  label: string;
  type: "string" | "password" | "number" | "boolean" | "select";
  defaultValue?: unknown;
  options?: { label: string; value: unknown }[];
  description?: string;
  required?: boolean;
}

export interface CustomArchetypeDefinition {
  archetype: string;
  label: string;
  category: string;
  icon?: string;
  defaultProperties: Record<string, unknown>;
  description?: string;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: PluginCategory;
  icon?: string;
  homepage?: string;
  capabilities: PluginCapability[];
  customNodes?: NodeDefinition[];
  customArchetypes?: CustomArchetypeDefinition[];
  settingsSchema?: PluginSettingField[];
}

export interface InstalledPlugin {
  manifest: PluginManifest;
  isEnabled: boolean;
  grantedCapabilities: PluginCapability[];
  settings: Record<string, unknown>;
  installedAt: string;
  lastUpdated?: string;
}

export interface CapabilityCheckResult {
  allowed: boolean;
  pluginId: string;
  capability: PluginCapability;
  reason?: string;
}
