"use client";

/**
 * ============================================================================
 * PANEL 29: PLUGIN MANAGER & EXTENSION SDK
 * ============================================================================
 * Master IDE panel for installing, configuring, sandboxing, and toggling
 * third-party plugins that extend Blueprint nodes and canvas archetypes.
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.4 & PANELS.md §Panel 29
 * ============================================================================
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  InstalledPlugin,
  PluginCapability,
  PluginCategory,
} from "@/core/types/plugin";
import { PluginManagerEngine } from "@/runtime/PluginManagerEngine";
import {
  Boxes,
  Search,
  Check,
  Shield,
  ShieldAlert,
  Settings,
  Trash2,
  ExternalLink,
  Plus,
  Power,
  Layers,
  Cpu,
  X,
  Lock,
  Globe,
  HardDrive,
  Database,
  Sliders,
} from "lucide-react";

export interface PluginManagerProps {
  className?: string;
  style?: React.CSSProperties;
}

type FilterTab = "all" | "active" | "disabled" | PluginCategory;

export const PluginManager: React.FC<PluginManagerProps> = ({
  className,
  style,
}) => {
  const [plugins, setPlugins] = useState<InstalledPlugin[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedPlugin, setSelectedPlugin] = useState<InstalledPlugin | null>(null);

  useEffect(() => {
    const unsubscribe = PluginManagerEngine.subscribe((list) => {
      setPlugins(list);
      // Keep selected plugin in sync
      if (selectedPlugin) {
        const updated = list.find((p) => p.manifest.id === selectedPlugin.manifest.id);
        if (updated) setSelectedPlugin(updated);
      }
    });
    return unsubscribe;
  }, [selectedPlugin]);

  const handleToggle = (id: string, current: boolean) => {
    PluginManagerEngine.togglePlugin(id, !current);
  };

  const handleUninstall = (id: string) => {
    if (window.confirm("Are you sure you want to uninstall this extension?")) {
      PluginManagerEngine.uninstallPlugin(id);
      if (selectedPlugin?.manifest.id === id) {
        setSelectedPlugin(null);
      }
    }
  };

  const handleSaveSettings = (settings: Record<string, unknown>) => {
    if (!selectedPlugin) return;
    PluginManagerEngine.updatePluginSettings(selectedPlugin.manifest.id, settings);
  };

  const handleToggleCapability = (cap: PluginCapability) => {
    if (!selectedPlugin) return;
    const hasGrant = selectedPlugin.grantedCapabilities.includes(cap);
    if (hasGrant) {
      PluginManagerEngine.revokeCapability(selectedPlugin.manifest.id, cap);
    } else {
      PluginManagerEngine.grantCapability(selectedPlugin.manifest.id, cap);
    }
  };

  const filteredPlugins = useMemo(() => {
    return plugins.filter((p) => {
      // Tab filter
      if (activeTab === "active" && !p.isEnabled) return false;
      if (activeTab === "disabled" && p.isEnabled) return false;
      if (activeTab !== "all" && activeTab !== "active" && activeTab !== "disabled") {
        if (p.manifest.category !== activeTab) return false;
      }

      // Query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.manifest.name.toLowerCase().includes(q) ||
        p.manifest.description.toLowerCase().includes(q) ||
        p.manifest.author.toLowerCase().includes(q) ||
        p.manifest.category.toLowerCase().includes(q)
      );
    });
  }, [plugins, activeTab, searchQuery]);

  const getCapabilityIcon = (cap: PluginCapability) => {
    switch (cap) {
      case "network":
        return <Globe size={11} />;
      case "storage":
        return <HardDrive size={11} />;
      case "database":
        return <Database size={11} />;
      default:
        return <Shield size={11} />;
    }
  };

  return (
    <div
      className={`plugin-manager-panel ${className || ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "#0E0F14",
        color: "#FFFFFF",
        overflow: "hidden",
        fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
        ...style,
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          background: "#16171F",
          borderBottom: "1px solid #232430",
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "linear-gradient(135deg, #10B981, #059669)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              boxShadow: "0 2px 10px rgba(16, 185, 129, 0.3)",
            }}
          >
            <Boxes size={20} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
                Plugin Manager & Extension SDK
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: "#232430",
                  color: "#9CA3AF",
                  fontWeight: 600,
                }}
              >
                Panel 29
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: "#9CA3AF" }}>
              Sandboxed extensions providing custom Blueprint nodes, element archetypes, and API integrations.
            </div>
          </div>
        </div>

        {/* Search Input Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, width: "320px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#0E0F14",
              border: "1px solid #2A2B36",
              borderRadius: 6,
              padding: "6px 12px",
              width: "100%",
            }}
          >
            <Search size={14} style={{ color: "#9CA3AF" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search installed plugins..."
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#FFFFFF",
                fontSize: 12,
                width: "100%",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{ background: "transparent", border: "none", color: "#9CA3AF", cursor: "pointer", padding: 0 }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 24px",
          borderBottom: "1px solid #1E202B",
          background: "#13141C",
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        {[
          { id: "all", label: `All (${plugins.length})` },
          { id: "active", label: `Active (${plugins.filter((p) => p.isEnabled).length})` },
          { id: "disabled", label: `Disabled (${plugins.filter((p) => !p.isEnabled).length})` },
          { id: "Payments", label: "Payments" },
          { id: "Data Visualization", label: "Visualization" },
          { id: "Authentication", label: "Authentication" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as FilterTab)}
              style={{
                padding: "5px 12px",
                background: isActive ? "#10B981" : "#1E202B",
                color: isActive ? "#FFFFFF" : "#9CA3AF",
                border: "none",
                borderRadius: 4,
                fontSize: 11.5,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content: Plugin Grid + Settings Drawer */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left Plugin List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 24,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: 16,
            alignContent: "flex-start",
          }}
        >
          {filteredPlugins.map((plugin) => {
            const isSelected = selectedPlugin?.manifest.id === plugin.manifest.id;

            return (
              <div
                key={plugin.manifest.id}
                style={{
                  background: "#16171F",
                  border: isSelected ? "2px solid #10B981" : "1px solid #232430",
                  borderRadius: 10,
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  transition: "all 0.15s ease",
                  boxShadow: isSelected ? "0 4px 20px rgba(16, 185, 129, 0.2)" : "none",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 8,
                        background: plugin.isEnabled ? "rgba(16, 185, 129, 0.15)" : "#232430",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: plugin.isEnabled ? "#34D399" : "#9CA3AF",
                      }}
                    >
                      <Boxes size={20} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>
                          {plugin.manifest.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "1px 6px",
                            borderRadius: 4,
                            background: "#232430",
                            color: "#9CA3AF",
                            fontFamily: "monospace",
                          }}
                        >
                          v{plugin.manifest.version}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#6B7280" }}>
                        by {plugin.manifest.author} • {plugin.manifest.category}
                      </div>
                    </div>
                  </div>

                  {/* Enable / Disable Switch */}
                  <button
                    onClick={() => handleToggle(plugin.manifest.id, plugin.isEnabled)}
                    style={{
                      padding: "4px 10px",
                      background: plugin.isEnabled ? "rgba(16, 185, 129, 0.2)" : "#232430",
                      color: plugin.isEnabled ? "#34D399" : "#9CA3AF",
                      border: plugin.isEnabled ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid #374151",
                      borderRadius: 14,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Power size={11} />
                    {plugin.isEnabled ? "ENABLED" : "DISABLED"}
                  </button>
                </div>

                {/* Description */}
                <div style={{ fontSize: 11.5, color: "#9CA3AF", lineHeight: 1.45 }}>
                  {plugin.manifest.description}
                </div>

                {/* Capabilities & Extension Points Badges */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
                  {plugin.manifest.customNodes && plugin.manifest.customNodes.length > 0 && (
                    <span
                      style={{
                        fontSize: 10.5,
                        padding: "2px 7px",
                        borderRadius: 4,
                        background: "#1E202B",
                        color: "#F59E0B",
                        border: "1px solid #2F3142",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Cpu size={11} />
                      {plugin.manifest.customNodes.length} Node{plugin.manifest.customNodes.length > 1 ? "s" : ""}
                    </span>
                  )}

                  {plugin.manifest.customArchetypes && plugin.manifest.customArchetypes.length > 0 && (
                    <span
                      style={{
                        fontSize: 10.5,
                        padding: "2px 7px",
                        borderRadius: 4,
                        background: "#1E202B",
                        color: "#818CF8",
                        border: "1px solid #2F3142",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Layers size={11} />
                      {plugin.manifest.customArchetypes.length} Archetype
                    </span>
                  )}

                  {plugin.manifest.capabilities.map((cap) => {
                    const hasGrant = plugin.grantedCapabilities.includes(cap);
                    return (
                      <span
                        key={cap}
                        style={{
                          fontSize: 10.5,
                          padding: "2px 7px",
                          borderRadius: 4,
                          background: hasGrant ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          color: hasGrant ? "#34D399" : "#EF4444",
                          border: hasGrant ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {getCapabilityIcon(cap)}
                        {cap}
                      </span>
                    );
                  })}
                </div>

                {/* Card Action Footer */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 10,
                    borderTop: "1px solid #232430",
                  }}
                >
                  <button
                    onClick={() => setSelectedPlugin(isSelected ? null : plugin)}
                    style={{
                      padding: "5px 10px",
                      background: isSelected ? "#10B981" : "#232430",
                      color: isSelected ? "#FFFFFF" : "#D1D5DB",
                      border: "none",
                      borderRadius: 4,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Settings size={12} />
                    {isSelected ? "Close Settings" : "Configure & Permissions"}
                  </button>

                  <button
                    onClick={() => handleUninstall(plugin.manifest.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#6B7280",
                      cursor: "pointer",
                      padding: 4,
                    }}
                    title="Uninstall Plugin"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Configuration & Permissions Drawer */}
        {selectedPlugin && (
          <div
            style={{
              width: "360px",
              background: "#12131A",
              borderLeft: "1px solid #232430",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              overflowY: "auto",
              flexShrink: 0,
            }}
          >
            {/* Drawer Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sliders size={16} style={{ color: "#10B981" }} />
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                  Plugin Configuration
                </h3>
              </div>
              <button
                onClick={() => setSelectedPlugin(null)}
                style={{ background: "transparent", border: "none", color: "#9CA3AF", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Plugin Summary */}
            <div style={{ background: "#16171F", padding: 12, borderRadius: 8, border: "1px solid #232430" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>
                {selectedPlugin.manifest.name}
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                ID: <code>{selectedPlugin.manifest.id}</code>
              </div>
            </div>

            {/* Capability Permissions Sandbox */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#FFFFFF", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <Shield size={14} style={{ color: "#34D399" }} />
                Capability Permissions Model
              </div>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 10px 0", lineHeight: 1.4 }}>
                Control explicit access grants. Ungranted operations are blocked by the security sandbox.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedPlugin.manifest.capabilities.map((cap) => {
                  const hasGrant = selectedPlugin.grantedCapabilities.includes(cap);
                  return (
                    <div
                      key={cap}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background: "#16171F",
                        border: "1px solid #232430",
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {getCapabilityIcon(cap)}
                        <span style={{ fontSize: 12, textTransform: "capitalize", color: "#FFFFFF" }}>
                          {cap} Access
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleCapability(cap)}
                        style={{
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: hasGrant ? "rgba(16, 185, 129, 0.2)" : "#232430",
                          color: hasGrant ? "#34D399" : "#9CA3AF",
                          border: hasGrant ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid #374151",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {hasGrant ? "GRANTED" : "DENIED"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Plugin Settings Form */}
            {selectedPlugin.manifest.settingsSchema && selectedPlugin.manifest.settingsSchema.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#FFFFFF", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <Settings size={14} style={{ color: "#818CF8" }} />
                  Custom Plugin Settings
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {selectedPlugin.manifest.settingsSchema.map((field) => (
                    <div key={field.key}>
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: "#9CA3AF", display: "block", marginBottom: 4 }}>
                        {field.label}
                      </label>
                      <input
                        type={field.type === "password" ? "password" : "text"}
                        value={String(selectedPlugin.settings[field.key] ?? field.defaultValue ?? "")}
                        onChange={(e) =>
                          handleSaveSettings({ [field.key]: e.target.value })
                        }
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          background: "#0E0F14",
                          border: "1px solid #2A2B36",
                          borderRadius: 6,
                          color: "#FFFFFF",
                          fontSize: 12,
                        }}
                      />
                      {field.description && (
                        <div style={{ fontSize: 10.5, color: "#6B7280", marginTop: 2 }}>
                          {field.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
