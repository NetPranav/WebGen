"use client";

/**
 * ============================================================================
 * PANEL 30: PAGES & ROUTING MANAGER
 * ============================================================================
 * Master IDE panel providing visual route tree management, dynamic route parameter
 * configuration ([slug], [id]), route guards (public, auth, admin), redirect rules
 * editor, and real-time route collision detection.
 * Architecture Ref: ROADMAP.md §Sub-Phase 6.5 & PANELS.md §Panel 30
 * ============================================================================
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  Compass,
  Plus,
  Search,
  FolderTree,
  GitFork,
  ArrowRightLeft,
  Settings2,
  Lock,
  Globe,
  Variable,
  AlertTriangle,
  Check,
  X,
  Sparkles,
  Shield,
  FileText,
  Copy,
  Trash2,
} from "lucide-react";
import { useProjectStore, PageDefinition } from "@/core/store/useProjectStore";
import { RedirectRule, RouteParameter, extractRouteParameters, normalizeRouteSlug } from "@/core/types/routing";
import { RouteCard } from "./RouteCard";
import { NavigationFlowDiagram } from "./NavigationFlowDiagram";

export interface PagesManagerProps {
  className?: string;
  style?: React.CSSProperties;
}

type ManagerTab = "tree" | "flow" | "redirects";
type FilterCategory = "all" | "static" | "dynamic" | "protected" | "404";

export const PagesManager: React.FC<PagesManagerProps> = ({ className, style }) => {
  // Store subscriptions
  const pages = useProjectStore((s) => s.pages);
  const activePageId = useProjectStore((s) => s.activePageId);
  const redirectRules = useProjectStore((s) => s.redirectRules || {});
  const setActivePage = useProjectStore((s) => s.setActivePage);
  const addPage = useProjectStore((s) => s.addPage);
  const updatePage = useProjectStore((s) => s.updatePage);
  const deletePage = useProjectStore((s) => s.deletePage);
  const duplicatePage = useProjectStore((s) => s.duplicatePage);
  const addRedirectRule = useProjectStore((s) => s.addRedirectRule);
  const updateRedirectRule = useProjectStore((s) => s.updateRedirectRule);
  const deleteRedirectRule = useProjectStore((s) => s.deleteRedirectRule);

  // Local UI states
  const [activeTab, setActiveTab] = useState<ManagerTab>("tree");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [editingPage, setEditingPage] = useState<PageDefinition | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // New Page Modal Form state
  const [newPageName, setNewPageName] = useState<string>("");
  const [newPageSlug, setNewPageSlug] = useState<string>("");
  const [newPageGuard, setNewPageGuard] = useState<"public" | "auth" | "admin">("public");

  // New Redirect Rule Form state
  const [newSourcePattern, setNewSourcePattern] = useState<string>("");
  const [newTargetPattern, setNewTargetPattern] = useState<string>("");
  const [newStatusCode, setNewStatusCode] = useState<301 | 308>(308);

  // Calculate route collisions
  const routeCollisions = useMemo(() => {
    const slugMap = new Map<string, string>();
    const collisions = new Set<string>();

    for (const page of Object.values(pages)) {
      const normalized = normalizeRouteSlug(page.slug);
      const pattern = normalized.replace(/\[[^\]]+\]/g, ":param").replace(/:[a-zA-Z0-9_]+/g, ":param");

      if (slugMap.has(pattern)) {
        collisions.add(page.id);
        collisions.add(slugMap.get(pattern)!);
      } else {
        slugMap.set(pattern, page.id);
      }
    }
    return collisions;
  }, [pages]);

  // Filtered pages list
  const filteredPages = useMemo(() => {
    return Object.values(pages).filter((p) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSlug = p.slug.toLowerCase().includes(q);
        const matchesParam = p.parameters?.some((param) => param.name.toLowerCase().includes(q));
        if (!matchesName && !matchesSlug && !matchesParam) return false;
      }

      // Category filter
      const isDynamic = p.isDynamic || p.slug.includes("[");
      const isProtected = p.guard?.type === "auth" || p.guard?.type === "admin";
      if (activeFilter === "static" && isDynamic) return false;
      if (activeFilter === "dynamic" && !isDynamic) return false;
      if (activeFilter === "protected" && !isProtected) return false;
      if (activeFilter === "404" && !p.isCustom404) return false;

      return true;
    });
  }, [pages, searchQuery, activeFilter]);

  // Handle page creation
  const handleCreatePage = useCallback(() => {
    if (!newPageName.trim() || !newPageSlug.trim()) return;
    const normalized = normalizeRouteSlug(newPageSlug);
    const params = extractRouteParameters(normalized);

    addPage(
      {
        name: newPageName.trim(),
        slug: normalized,
        isDynamic: params.length > 0,
        parameters: params,
        guard: { type: newPageGuard },
      },
      undefined,
      `Add Page ${newPageName.trim()}`
    );

    setNewPageName("");
    setNewPageSlug("");
    setNewPageGuard("public");
    setIsAddModalOpen(false);
  }, [newPageName, newPageSlug, newPageGuard, addPage]);

  // Apply preset to add page modal
  const handleApplyPreset = (name: string, slug: string, guard: "public" | "auth" | "admin" = "public") => {
    setNewPageName(name);
    setNewPageSlug(slug);
    setNewPageGuard(guard);
  };

  // Handle redirect rule creation
  const handleAddRedirect = useCallback(() => {
    if (!newSourcePattern.trim() || !newTargetPattern.trim()) return;
    addRedirectRule(
      {
        sourcePattern: newSourcePattern.trim(),
        targetPattern: newTargetPattern.trim(),
        statusCode: newStatusCode,
      },
      `Add Redirect ${newSourcePattern}`
    );
    setNewSourcePattern("");
    setNewTargetPattern("");
  }, [newSourcePattern, newTargetPattern, newStatusCode, addRedirectRule]);

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: "#0B0F19",
        color: "#F8FAFC",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* 1. Header Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: "1px solid #1E293B",
          backgroundColor: "#0F172A",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Compass size={18} style={{ color: "#206859" }} />
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC" }}>
              Pages & Routing Manager
            </span>
            <span style={{ fontSize: 11, color: "#64748B", marginLeft: 8 }}>
              Panel 30
            </span>
          </div>
        </div>

        {/* Global Action & Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Search Box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 8px",
              backgroundColor: "#0B0F19",
              border: "1px solid #1E293B",
              borderRadius: 4,
            }}
          >
            <Search size={12} style={{ color: "#64748B" }} />
            <input
              type="text"
              placeholder="Search routes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "#F8FAFC",
                fontSize: 11,
                outline: "none",
                width: 140,
              }}
            />
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 12px",
              backgroundColor: "#206859",
              color: "#FFFFFF",
              border: "1px solid #206859",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={13} />
            Add Page
          </button>
        </div>
      </div>

      {/* 2. Mode Tabs & Filters Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 16px",
          borderBottom: "1px solid #1E293B",
          backgroundColor: "#0F172A",
        }}
      >
        {/* Navigation Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => setActiveTab("tree")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: activeTab === "tree" ? "rgba(32, 104, 89, 0.2)" : "transparent",
              color: activeTab === "tree" ? "#34D399" : "#94A3B8",
              border: `1px solid ${activeTab === "tree" ? "#206859" : "transparent"}`,
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            <FolderTree size={12} />
            Route Tree & Cards
          </button>

          <button
            onClick={() => setActiveTab("flow")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: activeTab === "flow" ? "rgba(32, 104, 89, 0.2)" : "transparent",
              color: activeTab === "flow" ? "#34D399" : "#94A3B8",
              border: `1px solid ${activeTab === "flow" ? "#206859" : "transparent"}`,
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            <GitFork size={12} />
            Navigation Flow
          </button>

          <button
            onClick={() => setActiveTab("redirects")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: activeTab === "redirects" ? "rgba(32, 104, 89, 0.2)" : "transparent",
              color: activeTab === "redirects" ? "#34D399" : "#94A3B8",
              border: `1px solid ${activeTab === "redirects" ? "#206859" : "transparent"}`,
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            <ArrowRightLeft size={12} />
            Redirect Rules ({Object.keys(redirectRules).length})
          </button>
        </div>

        {/* Category Filters (only in Tree mode) */}
        {activeTab === "tree" && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {(["all", "static", "dynamic", "protected", "404"] as FilterCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                style={{
                  padding: "2px 8px",
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "capitalize",
                  backgroundColor: activeFilter === cat ? "#1E293B" : "transparent",
                  color: activeFilter === cat ? "#F8FAFC" : "#64748B",
                  border: `1px solid ${activeFilter === cat ? "#334155" : "transparent"}`,
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Main Tab Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", position: "relative" }}>
        {/* TAB 1: Route Tree & Cards */}
        {activeTab === "tree" && (
          <div
            style={{
              flex: 1,
              padding: 16,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {routeCollisions.size > 0 && (
              <div
                style={{
                  padding: "8px 12px",
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid #EF4444",
                  borderRadius: 6,
                  color: "#FCA5A5",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertTriangle size={14} style={{ color: "#EF4444" }} />
                <span>
                  Warning: Route collision detected! Multiple pages have identical or conflicting URL slugs.
                </span>
              </div>
            )}

            {filteredPages.map((page) => (
              <RouteCard
                key={page.id}
                page={page}
                isActive={page.id === activePageId}
                canDelete={Object.keys(pages).length > 1}
                hasCollision={routeCollisions.has(page.id)}
                onSelect={(id) => setActivePage(id)}
                onEdit={(p) => setEditingPage(p)}
                onDuplicate={(id) => duplicatePage(id, `Duplicate Page ${page.name}`)}
                onDelete={(id) => deletePage(id, `Delete Page ${page.name}`)}
              />
            ))}

            {filteredPages.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "#64748B", fontSize: 12 }}>
                No routes matching the search query or category filter.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Navigation Flow */}
        {activeTab === "flow" && (
          <NavigationFlowDiagram
            pages={pages}
            activePageId={activePageId}
            onSelectPage={(id) => setActivePage(id)}
          />
        )}

        {/* TAB 3: Redirect Rules */}
        {activeTab === "redirects" && (
          <div
            style={{
              flex: 1,
              padding: 20,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Add Redirect Form */}
            <div
              style={{
                padding: 16,
                backgroundColor: "#0F172A",
                border: "1px solid #1E293B",
                borderRadius: 8,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "#F8FAFC" }}>
                Add URL Redirect Rule
              </span>

              <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: "#94A3B8", display: "block", marginBottom: 4 }}>
                    Source URL Pattern
                  </label>
                  <input
                    type="text"
                    placeholder="/old-path"
                    value={newSourcePattern}
                    onChange={(e) => setNewSourcePattern(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      backgroundColor: "#0B0F19",
                      border: "1px solid #1E293B",
                      borderRadius: 4,
                      color: "#F8FAFC",
                      fontSize: 11,
                      fontFamily: "monospace",
                    }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: "#94A3B8", display: "block", marginBottom: 4 }}>
                    Destination Target Pattern
                  </label>
                  <input
                    type="text"
                    placeholder="/new-path"
                    value={newTargetPattern}
                    onChange={(e) => setNewTargetPattern(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      backgroundColor: "#0B0F19",
                      border: "1px solid #1E293B",
                      borderRadius: 4,
                      color: "#F8FAFC",
                      fontSize: 11,
                      fontFamily: "monospace",
                    }}
                  />
                </div>

                <div style={{ width: 120 }}>
                  <label style={{ fontSize: 10, color: "#94A3B8", display: "block", marginBottom: 4 }}>
                    HTTP Status
                  </label>
                  <select
                    value={newStatusCode}
                    onChange={(e) => setNewStatusCode(Number(e.target.value) as 301 | 308)}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      backgroundColor: "#0B0F19",
                      border: "1px solid #1E293B",
                      borderRadius: 4,
                      color: "#F8FAFC",
                      fontSize: 11,
                    }}
                  >
                    <option value={308}>308 (Permanent)</option>
                    <option value={301}>301 (Moved)</option>
                  </select>
                </div>

                <button
                  onClick={handleAddRedirect}
                  style={{
                    padding: "6px 14px",
                    backgroundColor: "#206859",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Create Rule
                </button>
              </div>
            </div>

            {/* Redirect Rules Table */}
            <div
              style={{
                backgroundColor: "#0F172A",
                border: "1px solid #1E293B",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ backgroundColor: "#1E293B", color: "#94A3B8", textAlign: "left" }}>
                    <th style={{ padding: "8px 12px" }}>Source Pattern</th>
                    <th style={{ padding: "8px 12px" }}>Target Pattern</th>
                    <th style={{ padding: "8px 12px" }}>HTTP Code</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(redirectRules).map((rule) => (
                    <tr key={rule.id} style={{ borderBottom: "1px solid #1E293B" }}>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#38BDF8" }}>
                        {rule.sourcePattern}
                      </td>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#34D399" }}>
                        {rule.targetPattern}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span
                          style={{
                            padding: "2px 6px",
                            backgroundColor: "rgba(56, 189, 248, 0.1)",
                            color: "#38BDF8",
                            borderRadius: 4,
                            fontWeight: 600,
                          }}
                        >
                          {rule.statusCode}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>
                        <button
                          onClick={() => deleteRedirectRule(rule.id, `Delete redirect ${rule.sourcePattern}`)}
                          style={{
                            padding: 4,
                            background: "transparent",
                            border: "none",
                            color: "#EF4444",
                            cursor: "pointer",
                          }}
                          title="Delete redirect rule"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {Object.keys(redirectRules).length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: 24, textAlign: "center", color: "#64748B" }}>
                        No redirect rules configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Slide-Out Route Settings Drawer */}
        {editingPage && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 360,
              backgroundColor: "#0F172A",
              borderLeft: "1px solid #1E293B",
              boxShadow: "-8px 0 24px rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              zIndex: 50,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: "1px solid #1E293B",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Settings2 size={16} style={{ color: "#206859" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC" }}>
                  Route Configuration
                </span>
              </div>

              <button
                onClick={() => setEditingPage(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94A3B8",
                  cursor: "pointer",
                  padding: 2,
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Page Name */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#CBD5E1", display: "block", marginBottom: 4 }}>
                  Page Title
                </label>
                <input
                  type="text"
                  value={editingPage.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditingPage((p) => p ? { ...p, name: val } : null);
                    updatePage(editingPage.id, { name: val });
                  }}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    backgroundColor: "#0B0F19",
                    border: "1px solid #1E293B",
                    borderRadius: 4,
                    color: "#F8FAFC",
                    fontSize: 12,
                  }}
                />
              </div>

              {/* Route Slug */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#CBD5E1", display: "block", marginBottom: 4 }}>
                  Route Path (Slug)
                </label>
                <input
                  type="text"
                  value={editingPage.slug}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditingPage((p) => p ? { ...p, slug: val } : null);
                    updatePage(editingPage.id, { slug: val });
                  }}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    backgroundColor: "#0B0F19",
                    border: "1px solid #1E293B",
                    borderRadius: 4,
                    color: "#38BDF8",
                    fontSize: 12,
                    fontFamily: "monospace",
                  }}
                />
                <span style={{ fontSize: 10, color: "#64748B", marginTop: 2, display: "block" }}>
                  Use [id] or [slug] for dynamic URL parameters.
                </span>
              </div>

              {/* Route Guard */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#CBD5E1", display: "block", marginBottom: 4 }}>
                  Access Guard
                </label>
                <select
                  value={editingPage.guard?.type || "public"}
                  onChange={(e) => {
                    const guardType = e.target.value as "public" | "auth" | "admin";
                    setEditingPage((p) => p ? { ...p, guard: { ...p.guard, type: guardType } } : null);
                    updatePage(editingPage.id, { guard: { ...editingPage.guard, type: guardType } });
                  }}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    backgroundColor: "#0B0F19",
                    border: "1px solid #1E293B",
                    borderRadius: 4,
                    color: "#F8FAFC",
                    fontSize: 11,
                  }}
                >
                  <option value="public">Public (Everyone)</option>
                  <option value="auth">Authenticated Users Only</option>
                  <option value="admin">Administrators Only</option>
                </select>
              </div>

              {/* SEO Meta Title */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#CBD5E1", display: "block", marginBottom: 4 }}>
                  SEO Meta Title
                </label>
                <input
                  type="text"
                  placeholder="My Awesome Page — App"
                  value={editingPage.metaTitle || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditingPage((p) => p ? { ...p, metaTitle: val } : null);
                    updatePage(editingPage.id, { metaTitle: val });
                  }}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    backgroundColor: "#0B0F19",
                    border: "1px solid #1E293B",
                    borderRadius: 4,
                    color: "#F8FAFC",
                    fontSize: 11,
                  }}
                />
              </div>

              {/* Custom 404 Handler */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <input
                  type="checkbox"
                  id="custom404Checkbox"
                  checked={editingPage.isCustom404 || false}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setEditingPage((p) => p ? { ...p, isCustom404: val } : null);
                    updatePage(editingPage.id, { isCustom404: val });
                  }}
                />
                <label htmlFor="custom404Checkbox" style={{ fontSize: 11, color: "#CBD5E1", cursor: "pointer" }}>
                  Designate as Custom 404 Error Page
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Add Page Modal */}
      {isAddModalOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 500,
              backgroundColor: "#0F172A",
              border: "1px solid #1E293B",
              borderRadius: 8,
              boxShadow: "0 12px 32px rgba(0, 0, 0, 0.6)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: "1px solid #1E293B",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={16} style={{ color: "#206859" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC" }}>
                  Add New Application Page
                </span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Presets Grid */}
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", display: "block", marginBottom: 6 }}>
                  Quick Presets
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <button
                    onClick={() => handleApplyPreset("Products Catalog", "/products")}
                    style={{
                      padding: "6px 10px",
                      backgroundColor: "#1E293B",
                      border: "1px solid #334155",
                      borderRadius: 4,
                      color: "#F8FAFC",
                      fontSize: 11,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    🛍️ Products (/products)
                  </button>
                  <button
                    onClick={() => handleApplyPreset("Product Details", "/products/[id]")}
                    style={{
                      padding: "6px 10px",
                      backgroundColor: "#1E293B",
                      border: "1px solid #334155",
                      borderRadius: 4,
                      color: "#F8FAFC",
                      fontSize: 11,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    🔍 Detail (/products/[id])
                  </button>
                  <button
                    onClick={() => handleApplyPreset("User Dashboard", "/dashboard", "auth")}
                    style={{
                      padding: "6px 10px",
                      backgroundColor: "#1E293B",
                      border: "1px solid #334155",
                      borderRadius: 4,
                      color: "#F8FAFC",
                      fontSize: 11,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    🔒 Dashboard (/dashboard)
                  </button>
                  <button
                    onClick={() => handleApplyPreset("Sign In", "/login")}
                    style={{
                      padding: "6px 10px",
                      backgroundColor: "#1E293B",
                      border: "1px solid #334155",
                      borderRadius: 4,
                      color: "#F8FAFC",
                      fontSize: 11,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    🔑 Login (/login)
                  </button>
                </div>
              </div>

              {/* Inputs */}
              <div>
                <label style={{ fontSize: 11, color: "#CBD5E1", display: "block", marginBottom: 4 }}>
                  Page Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. User Profile"
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    backgroundColor: "#0B0F19",
                    border: "1px solid #1E293B",
                    borderRadius: 4,
                    color: "#F8FAFC",
                    fontSize: 12,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: "#CBD5E1", display: "block", marginBottom: 4 }}>
                  Route Path (Slug)
                </label>
                <input
                  type="text"
                  placeholder="e.g. /profile/[username]"
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    backgroundColor: "#0B0F19",
                    border: "1px solid #1E293B",
                    borderRadius: 4,
                    color: "#38BDF8",
                    fontSize: 12,
                    fontFamily: "monospace",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: "#CBD5E1", display: "block", marginBottom: 4 }}>
                  Access Guard
                </label>
                <select
                  value={newPageGuard}
                  onChange={(e) => setNewPageGuard(e.target.value as "public" | "auth" | "admin")}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    backgroundColor: "#0B0F19",
                    border: "1px solid #1E293B",
                    borderRadius: 4,
                    color: "#F8FAFC",
                    fontSize: 11,
                  }}
                >
                  <option value="public">Public</option>
                  <option value="auth">Authenticated Only</option>
                  <option value="admin">Admin Only</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "transparent",
                    border: "1px solid #334155",
                    borderRadius: 4,
                    color: "#94A3B8",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePage}
                  disabled={!newPageName.trim() || !newPageSlug.trim()}
                  style={{
                    padding: "6px 16px",
                    backgroundColor: newPageName.trim() && newPageSlug.trim() ? "#206859" : "#334155",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: newPageName.trim() && newPageSlug.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  Create Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
