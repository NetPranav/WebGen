import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { PluginManagerEngine } from "../../../../runtime/PluginManagerEngine";
import {
  getNodeDefinition,
  searchNodeDefinitions,
  getNodesByCategory,
} from "../../../../core/types/node-registry";
import { DiagnosticBus } from "../../../../core/engine/DiagnosticBus";
import { DiagnosticEvent } from "../../../../core/types/diagnostics";
import { PluginManifest } from "../../../../core/types/plugin";

describe("Sub-Phase 7.4: Plugin Architecture & Extension SDK (Panel 29)", () => {
  beforeEach(() => {
    // Reset to clean seeded state before each test
    PluginManagerEngine.resetToDefaults();
  });

  describe("1. Default Seeded Plugins & State", () => {
    it("initializes with default certified plugins (Stripe, Chart.js, Supabase)", () => {
      const plugins = PluginManagerEngine.getAllPlugins();
      assert.strictEqual(plugins.length >= 3, true);

      const stripe = PluginManagerEngine.getPlugin("plugin.stripe");
      const chartjs = PluginManagerEngine.getPlugin("plugin.chartjs");
      const supabase = PluginManagerEngine.getPlugin("plugin.supabase");

      assert.ok(stripe, "Stripe plugin must exist");
      assert.ok(chartjs, "Chart.js plugin must exist");
      assert.ok(supabase, "Supabase plugin must exist");

      assert.strictEqual(stripe.isEnabled, true);
      assert.strictEqual(chartjs.isEnabled, true);
      assert.strictEqual(supabase.isEnabled, false);
    });

    it("reports active plugins correctly", () => {
      const active = PluginManagerEngine.getActivePlugins();
      const ids = active.map((p) => p.manifest.id);
      assert.ok(ids.includes("plugin.stripe"));
      assert.ok(ids.includes("plugin.chartjs"));
      assert.strictEqual(ids.includes("plugin.supabase"), false);
    });
  });

  describe("2. Dynamic Blueprint Node Injection & Ejection", () => {
    it("dynamically registers custom nodes in node-registry for enabled plugins", () => {
      const stripeNode = getNodeDefinition("stripe/create_checkout_session");
      assert.ok(stripeNode, "Stripe node should be registered in node registry");
      assert.strictEqual(stripeNode.title, "Create Checkout Session");
      assert.strictEqual(stripeNode.category, "API");

      // Verify category lookup includes plugin node
      const apiNodes = getNodesByCategory("API");
      const hasStripeNode = apiNodes.some((n) => n.type === "stripe/create_checkout_session");
      assert.strictEqual(hasStripeNode, true);

      // Verify node search finds plugin node
      const searchResults = searchNodeDefinitions("Checkout");
      assert.ok(searchResults.some((n) => n.type === "stripe/create_checkout_session"));
    });

    it("dynamically unregisters custom nodes when a plugin is disabled", () => {
      // Initially node exists
      assert.ok(getNodeDefinition("stripe/create_checkout_session"));

      // Disable plugin
      const toggled = PluginManagerEngine.togglePlugin("plugin.stripe", false);
      assert.strictEqual(toggled, true);
      assert.strictEqual(PluginManagerEngine.getPlugin("plugin.stripe")?.isEnabled, false);

      // Node should now be unregistered
      const unregisteredNode = getNodeDefinition("stripe/create_checkout_session");
      assert.strictEqual(unregisteredNode, undefined);

      // Re-enable plugin
      PluginManagerEngine.togglePlugin("plugin.stripe", true);
      assert.strictEqual(PluginManagerEngine.getPlugin("plugin.stripe")?.isEnabled, true);

      // Node should be back
      const reRegisteredNode = getNodeDefinition("stripe/create_checkout_session");
      assert.ok(reRegisteredNode);
    });
  });

  describe("3. Capability Permission Sandbox & Diagnostics", () => {
    it("allows capability access when granted on an enabled plugin", () => {
      const result = PluginManagerEngine.checkCapability("plugin.stripe", "network");
      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.pluginId, "plugin.stripe");
      assert.strictEqual(result.capability, "network");
    });

    it("blocks access and emits PLUGIN_SECURITY_VIOLATION diagnostic when ungranted capability is invoked", () => {
      const emittedDiagnostics: DiagnosticEvent[] = [];
      const unsubscribe = DiagnosticBus.subscribe((evt) => {
        if (evt.channel === "PLUGIN_SECURITY_VIOLATION") {
          emittedDiagnostics.push(evt);
        }
      });

      try {
        // Stripe only has 'network' granted by default, not 'filesystem' or 'database'
        const check = PluginManagerEngine.checkCapability("plugin.stripe", "filesystem");
        assert.strictEqual(check.allowed, false);
        assert.ok(check.reason?.includes("without explicit permission grant"));

        // Verify diagnostic was emitted
        assert.strictEqual(emittedDiagnostics.length, 1);
        assert.strictEqual(emittedDiagnostics[0].channel, "PLUGIN_SECURITY_VIOLATION");
        assert.strictEqual(emittedDiagnostics[0].severity, "warning");
        assert.ok(emittedDiagnostics[0].message.includes("filesystem"));
      } finally {
        unsubscribe();
      }
    });

    it("supports dynamic capability revocation and re-granting", () => {
      // Revoke 'network' from Stripe
      PluginManagerEngine.revokeCapability("plugin.stripe", "network");
      const checkRevoked = PluginManagerEngine.checkCapability("plugin.stripe", "network");
      assert.strictEqual(checkRevoked.allowed, false);

      // Re-grant 'network'
      PluginManagerEngine.grantCapability("plugin.stripe", "network");
      const checkGranted = PluginManagerEngine.checkCapability("plugin.stripe", "network");
      assert.strictEqual(checkGranted.allowed, true);
    });

    it("blocks capability access when plugin is disabled", () => {
      // Supabase is disabled by default
      const check = PluginManagerEngine.checkCapability("plugin.supabase", "storage");
      assert.strictEqual(check.allowed, false);
      assert.ok(check.reason?.includes("currently disabled"));
    });

    it("blocks capability access when plugin is not installed", () => {
      const check = PluginManagerEngine.checkCapability("plugin.nonexistent", "network");
      assert.strictEqual(check.allowed, false);
      assert.ok(check.reason?.includes("not installed"));
    });
  });

  describe("4. Custom Element Archetypes", () => {
    it("provides active custom archetypes from enabled plugins", () => {
      const archetypes = PluginManagerEngine.getActiveArchetypes();
      assert.ok(archetypes.length >= 1);

      const chartArchetype = archetypes.find((a) => a.archetype === "chart");
      assert.ok(chartArchetype, "Chart archetype from enabled chartjs plugin should be active");
      assert.strictEqual(chartArchetype.label, "Chart.js Canvas");
      assert.strictEqual(chartArchetype.category, "Visualization");
    });
  });

  describe("5. Third-Party Plugin Lifecycle (Install & Uninstall)", () => {
    it("supports installing, querying, and uninstalling custom third-party plugins", () => {
      const customManifest: PluginManifest = {
        id: "plugin.mock.telemetry",
        name: "Mock Telemetry Exporter",
        version: "1.0.0",
        author: "DevOps Core",
        category: "Analytics",
        description: "Exports performance logs to external APM",
        capabilities: ["network"],
        customNodes: [
          {
            type: "telemetry/flush_metrics",
            title: "Flush Metrics",
            category: "Utility",
            description: "Flushes queued telemetry frames",
            headerColor: "#10B981",
            inputs: [
              { id: "exec_in", name: "Exec", label: "Exec", type: "exec", direction: "input" },
            ],
            outputs: [
              { id: "exec_out", name: "Done", label: "Done", type: "exec", direction: "output" },
            ],
          },
        ],
      };

      // Install and activate
      const installed = PluginManagerEngine.installPlugin(customManifest, { enable: true });
      assert.strictEqual(installed.manifest.id, "plugin.mock.telemetry");
      assert.strictEqual(installed.isEnabled, true);

      // Verify node was registered
      assert.ok(getNodeDefinition("telemetry/flush_metrics"));

      // Uninstall plugin
      const uninstalled = PluginManagerEngine.uninstallPlugin("plugin.mock.telemetry");
      assert.strictEqual(uninstalled, true);
      assert.strictEqual(PluginManagerEngine.getPlugin("plugin.mock.telemetry"), undefined);

      // Verify node was unregistered
      assert.strictEqual(getNodeDefinition("telemetry/flush_metrics"), undefined);
    });
  });

  describe("6. Settings Management", () => {
    it("updates plugin settings correctly and preserves state", () => {
      const newKey = "pk_live_custom_stripe_999";
      PluginManagerEngine.updatePluginSettings("plugin.stripe", { publishableKey: newKey });

      const stripe = PluginManagerEngine.getPlugin("plugin.stripe");
      assert.strictEqual(stripe?.settings.publishableKey, newKey);
      // Other settings preserved
      assert.strictEqual(stripe?.settings.currency, "usd");
    });

    it("throws an error when updating settings for a non-existent plugin", () => {
      assert.throws(() => {
        PluginManagerEngine.updatePluginSettings("plugin.missing", { foo: "bar" });
      }, /is not installed/);
    });
  });

  describe("7. Reactive Subscription Listener", () => {
    it("triggers subscriber notification on state changes", () => {
      let callCount = 0;
      let lastPluginCount = 0;

      const unsubscribe = PluginManagerEngine.subscribe((plugins) => {
        callCount++;
        lastPluginCount = plugins.length;
      });

      // Initial call on subscribe
      assert.strictEqual(callCount, 1);

      // Toggle state triggers notification
      PluginManagerEngine.togglePlugin("plugin.chartjs", false);
      assert.strictEqual(callCount, 2);

      // Updating settings triggers notification
      PluginManagerEngine.updatePluginSettings("plugin.chartjs", { foo: "bar" });
      assert.strictEqual(callCount, 3);

      unsubscribe();

      // No more triggers after unsubscribe
      PluginManagerEngine.togglePlugin("plugin.chartjs", true);
      assert.strictEqual(callCount, 3);
    });
  });
});
