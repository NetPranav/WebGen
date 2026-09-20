"use client";

/**
 * ============================================================================
 * PLUGIN RUNTIME MANAGER & SECURITY SANDBOX
 * ============================================================================
 * Central singleton orchestrating plugin installation, capability permission
 * enforcement, dynamic Blueprint node injection, and settings management.
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.4 & Detailed Roadmap §Phase 29
 * ============================================================================
 */

import {
  PluginManifest,
  InstalledPlugin,
  PluginCapability,
  CapabilityCheckResult,
  CustomArchetypeDefinition,
} from "../core/types/plugin";
import {
  registerCustomNodeDefinition,
  unregisterCustomNodeDefinition,
} from "../core/types/node-registry";
import { DiagnosticBus } from "../core/engine/DiagnosticBus";

export type PluginListener = (plugins: InstalledPlugin[]) => void;

class PluginManagerEngineManager {
  private plugins: Map<string, InstalledPlugin> = new Map();
  private listeners: Set<PluginListener> = new Set();

  constructor() {
    this.seedDefaultPlugins();
  }

  public subscribe(listener: PluginListener): () => void {
    this.listeners.add(listener);
    listener(this.getAllPlugins());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const list = this.getAllPlugins();
    for (const listener of this.listeners) {
      try {
        listener(list);
      } catch (err) {
        console.error("[PluginManager] Listener error:", err);
      }
    }
  }

  public getAllPlugins(): InstalledPlugin[] {
    return Array.from(this.plugins.values());
  }

  public getPlugin(id: string): InstalledPlugin | undefined {
    return this.plugins.get(id);
  }

  public getActivePlugins(): InstalledPlugin[] {
    return this.getAllPlugins().filter((p) => p.isEnabled);
  }

  public getActiveArchetypes(): CustomArchetypeDefinition[] {
    const archetypes: CustomArchetypeDefinition[] = [];
    for (const plugin of this.getActivePlugins()) {
      if (plugin.manifest.customArchetypes) {
        archetypes.push(...plugin.manifest.customArchetypes);
      }
    }
    return archetypes;
  }

  public resetToDefaults(): void {
    for (const plugin of this.plugins.values()) {
      this.deactivatePluginExtensions(plugin.manifest);
    }
    this.plugins.clear();
    this.seedDefaultPlugins();
  }

  /**
   * Installs a plugin and activates its extensions if enabled.
   */
  public installPlugin(
    manifest: PluginManifest,
    options?: { enable?: boolean; grantedCapabilities?: PluginCapability[] }
  ): InstalledPlugin {
    const isEnabled = options?.enable ?? true;
    const grantedCapabilities = options?.grantedCapabilities ?? [...manifest.capabilities];

    const defaultSettings: Record<string, unknown> = {};
    if (manifest.settingsSchema) {
      for (const field of manifest.settingsSchema) {
        defaultSettings[field.key] = field.defaultValue;
      }
    }

    const plugin: InstalledPlugin = {
      manifest,
      isEnabled,
      grantedCapabilities,
      settings: defaultSettings,
      installedAt: new Date().toISOString(),
    };

    this.plugins.set(manifest.id, plugin);

    if (isEnabled) {
      this.activatePluginExtensions(manifest);
    }

    this.notify();
    return plugin;
  }

  /**
   * Uninstalls a plugin and unbinds its custom extensions.
   */
  public uninstallPlugin(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    this.deactivatePluginExtensions(plugin.manifest);
    this.plugins.delete(pluginId);
    this.notify();
    return true;
  }

  /**
   * Toggles a plugin enabled or disabled without full application restart.
   */
  public togglePlugin(pluginId: string, enabled?: boolean): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    const nextState = enabled !== undefined ? enabled : !plugin.isEnabled;
    plugin.isEnabled = nextState;
    plugin.lastUpdated = new Date().toISOString();

    if (nextState) {
      this.activatePluginExtensions(plugin.manifest);
    } else {
      this.deactivatePluginExtensions(plugin.manifest);
    }

    this.notify();
    return true;
  }

  /**
   * Updates settings for a specific plugin.
   */
  public updatePluginSettings(
    pluginId: string,
    settings: Record<string, unknown>
  ): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" is not installed.`);
    }

    plugin.settings = { ...plugin.settings, ...settings };
    plugin.lastUpdated = new Date().toISOString();
    this.notify();
  }

  /**
   * Grants a security capability to a plugin.
   */
  public grantCapability(pluginId: string, capability: PluginCapability): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    if (!plugin.grantedCapabilities.includes(capability)) {
      plugin.grantedCapabilities.push(capability);
      this.notify();
    }
  }

  /**
   * Revokes a capability from a plugin.
   */
  public revokeCapability(pluginId: string, capability: PluginCapability): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    plugin.grantedCapabilities = plugin.grantedCapabilities.filter((c) => c !== capability);
    this.notify();
  }

  /**
   * Evaluates if a plugin is allowed to execute an operation requiring a specific capability.
   * If ungranted or disabled, blocks the call and emits a [PLUGIN_SECURITY_VIOLATION] diagnostic.
   */
  public checkCapability(
    pluginId: string,
    capability: PluginCapability
  ): CapabilityCheckResult {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      const result: CapabilityCheckResult = {
        allowed: false,
        pluginId,
        capability,
        reason: `Plugin "${pluginId}" is not installed.`,
      };
      this.emitSecurityViolation(result);
      return result;
    }

    if (!plugin.isEnabled) {
      const result: CapabilityCheckResult = {
        allowed: false,
        pluginId,
        capability,
        reason: `Plugin "${pluginId}" is currently disabled.`,
      };
      this.emitSecurityViolation(result);
      return result;
    }

    const hasGrant = plugin.grantedCapabilities.includes(capability);
    if (!hasGrant) {
      const result: CapabilityCheckResult = {
        allowed: false,
        pluginId,
        capability,
        reason: `Plugin "${plugin.manifest.name}" attempted capability "${capability}" without explicit permission grant.`,
      };
      this.emitSecurityViolation(result);
      return result;
    }

    return { allowed: true, pluginId, capability };
  }

  private emitSecurityViolation(check: CapabilityCheckResult): void {
    DiagnosticBus.emit({
      channel: "PLUGIN_SECURITY_VIOLATION",
      severity: "warning",
      source: { panel: "Panel 29: Plugin Manager", entityId: check.pluginId },
      message: `Security sandbox violation: ${check.reason}`,
      suggestion: "Grant the requested capability in Plugin Manager settings.",
    });
  }

  private activatePluginExtensions(manifest: PluginManifest): void {
    // Register custom Blueprint nodes
    if (manifest.customNodes) {
      for (const nodeDef of manifest.customNodes) {
        registerCustomNodeDefinition(nodeDef);
      }
    }
  }

  private deactivatePluginExtensions(manifest: PluginManifest): void {
    // Unregister custom Blueprint nodes
    if (manifest.customNodes) {
      for (const nodeDef of manifest.customNodes) {
        unregisterCustomNodeDefinition(nodeDef.type);
      }
    }
  }

  /**
   * Seeds default certified plugins for instant testing and demonstration.
   */
  private seedDefaultPlugins(): void {
    const stripeManifest: PluginManifest = {
      id: "plugin.stripe",
      name: "Stripe Payments Gateway",
      version: "1.4.0",
      author: "Stripe Developer Tools",
      category: "Payments",
      description: "Embed Stripe Checkout sessions, handle webhooks, and process one-time or subscription payments.",
      capabilities: ["network"],
      customNodes: [
        {
          type: "stripe/create_checkout_session",
          title: "Create Checkout Session",
          category: "API",
          description: "Initializes a Stripe Checkout session and yields the redirect URL",
          headerColor: "#6366F1",
          inputs: [
            { id: "p_exec", name: "Exec", label: "Exec", type: "exec", direction: "input" },
            { id: "p_price_id", name: "PriceId", label: "Price ID", type: "string", direction: "input" },
            { id: "p_quantity", name: "Quantity", label: "Quantity", type: "number", direction: "input", defaultValue: 1 },
          ],
          outputs: [
            { id: "p_out_exec", name: "OnSession", label: "On Session", type: "exec", direction: "output" },
            { id: "p_url", name: "SessionUrl", label: "Checkout URL", type: "string", direction: "output" },
          ],
        },
      ],
      settingsSchema: [
        {
          key: "publishableKey",
          label: "Publishable API Key",
          type: "string",
          defaultValue: "pk_test_sample_key_123",
          description: "Client-side Stripe publishable key",
        },
        {
          key: "currency",
          label: "Default Currency",
          type: "select",
          defaultValue: "usd",
          options: [
            { label: "USD ($)", value: "usd" },
            { label: "EUR (€)", value: "eur" },
            { label: "GBP (£)", value: "gbp" },
          ],
        },
      ],
    };

    const chartjsManifest: PluginManifest = {
      id: "plugin.chartjs",
      name: "Chart.js Visual Analytics",
      version: "2.1.2",
      author: "OpenSource Viz Team",
      category: "Data Visualization",
      description: "Interactive animated Bar, Line, Doughnut, and Radar charts with real-time state variable data-binding.",
      capabilities: ["storage"],
      customArchetypes: [
        {
          archetype: "chart",
          label: "Chart.js Canvas",
          category: "Visualization",
          defaultProperties: {
            chartType: "bar",
            responsive: true,
            aspectRatio: 2,
          },
        },
      ],
      customNodes: [
        {
          type: "chart/update_dataset",
          title: "Update Chart Dataset",
          category: "Utility",
          description: "Pushes dynamic numerical points into an active Chart.js visual element",
          headerColor: "#EC4899",
          inputs: [
            { id: "p_in", name: "Exec", label: "Exec", type: "exec", direction: "input" },
            { id: "p_data", name: "Points", label: "Data Points", type: "array", direction: "input" },
          ],
          outputs: [
            { id: "p_out", name: "Done", label: "Done", type: "exec", direction: "output" },
          ],
        },
      ],
    };

    const supabaseManifest: PluginManifest = {
      id: "plugin.supabase",
      name: "Supabase Auth Connector",
      version: "1.0.8",
      author: "Supabase Community",
      category: "Authentication",
      description: "PostgreSQL Row-Level-Security (RLS) policies, OAuth social logins, and JWT token persistence.",
      capabilities: ["network", "storage"],
      settingsSchema: [
        {
          key: "projectUrl",
          label: "Supabase Project URL",
          type: "string",
          defaultValue: "https://your-project.supabase.co",
        },
        {
          key: "anonKey",
          label: "Anon / Public Key",
          type: "password",
          defaultValue: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        },
      ],
    };

    this.installPlugin(stripeManifest, { enable: true });
    this.installPlugin(chartjsManifest, { enable: true });
    this.installPlugin(supabaseManifest, { enable: false, grantedCapabilities: ["storage"] });
  }
}

export const PluginManagerEngine = new PluginManagerEngineManager();
