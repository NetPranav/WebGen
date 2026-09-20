"use client";

/**
 * ============================================================================
 * NAVIGATION FLOW DIAGRAM (VISUAL SITEMAP DIAGRAM)
 * ============================================================================
 * Renders an interactive visual sitemap graph diagram connecting pages in
 * a hierarchical tree from Root (/) down to nested and dynamic segments.
 * Architecture Ref: ROADMAP.md §Sub-Phase 6.5 & PANELS.md §Panel 30
 * ============================================================================
 */

import React, { useMemo } from "react";
import {
  Globe,
  Variable,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FolderTree,
} from "lucide-react";
import { PageDefinition } from "@/core/store/useProjectStore";

export interface NavigationFlowDiagramProps {
  pages: Record<string, PageDefinition>;
  activePageId: string;
  onSelectPage: (pageId: string) => void;
}

interface FlowTreeNode {
  page: PageDefinition;
  depth: number;
  parentSlug: string | null;
  children: FlowTreeNode[];
}

export const NavigationFlowDiagram: React.FC<NavigationFlowDiagramProps> = ({
  pages,
  activePageId,
  onSelectPage,
}) => {
  // Organize pages by route hierarchy depth
  const { levels, tree } = useMemo(() => {
    const pageList = Object.values(pages);
    const sorted = [...pageList].sort((a, b) => {
      if (a.slug === "/") return -1;
      if (b.slug === "/") return 1;
      return a.slug.localeCompare(b.slug);
    });

    const depthLevels: Record<number, PageDefinition[]> = {};

    sorted.forEach((page) => {
      const segments = page.slug === "/" ? [] : page.slug.replace(/^\//, "").split("/");
      const depth = segments.length;
      if (!depthLevels[depth]) depthLevels[depth] = [];
      depthLevels[depth].push(page);
    });

    return { levels: depthLevels, tree: sorted };
  }, [pages]);

  const totalPages = Object.keys(pages).length;
  const dynamicCount = Object.values(pages).filter((p) => p.isDynamic || p.slug.includes("[")).length;
  const protectedCount = Object.values(pages).filter((p) => p.guard?.type === "auth" || p.guard?.type === "admin").length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 20,
        height: "100%",
        overflowY: "auto",
        backgroundColor: "#0B0F19",
      }}
    >
      {/* Top Sitemap Stats HUD */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          backgroundColor: "#0F172A",
          borderRadius: 8,
          border: "1px solid #1E293B",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FolderTree size={16} style={{ color: "#206859" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#F8FAFC" }}>
            Application Route Hierarchy & Navigation Tree
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>
            Total Pages: <strong style={{ color: "#F8FAFC" }}>{totalPages}</strong>
          </span>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>
            Dynamic Segments: <strong style={{ color: "#38BDF8" }}>{dynamicCount}</strong>
          </span>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>
            Protected Routes: <strong style={{ color: "#F59E0B" }}>{protectedCount}</strong>
          </span>
        </div>
      </div>

      {/* Visual Hierarchy Columns */}
      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "flex-start",
          minWidth: "max-content",
          paddingBottom: 24,
        }}
      >
        {Object.entries(levels).map(([depthStr, pagesAtDepth]) => {
          const depth = Number(depthStr);
          const levelTitle = depth === 0 ? "Root Level (/)" : depth === 1 ? "Top-Level Routes" : `Nested Level ${depth}`;

          return (
            <div
              key={depth}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minWidth: 260,
                maxWidth: 300,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: "#64748B",
                  paddingBottom: 4,
                  borderBottom: "1px solid #1E293B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{levelTitle}</span>
                <span style={{ color: "#475569" }}>{pagesAtDepth.length}</span>
              </div>

              {pagesAtDepth.map((page) => {
                const isActive = page.id === activePageId;
                const isDynamic = page.isDynamic || page.slug.includes("[");
                const isProtected = page.guard?.type === "auth" || page.guard?.type === "admin";

                return (
                  <div
                    key={page.id}
                    onClick={() => onSelectPage(page.id)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      padding: "12px 14px",
                      backgroundColor: isActive ? "rgba(32, 104, 89, 0.15)" : "#0F172A",
                      border: `1px solid ${isActive ? "#206859" : "#1E293B"}`,
                      borderRadius: 8,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: isActive ? "0 0 12px rgba(32, 104, 89, 0.25)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {page.isCustom404 ? (
                          <AlertTriangle size={13} style={{ color: "#F59E0B" }} />
                        ) : isDynamic ? (
                          <Variable size={13} style={{ color: "#38BDF8" }} />
                        ) : (
                          <Globe size={13} style={{ color: isActive ? "#34D399" : "#94A3B8" }} />
                        )}
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC" }}>
                          {page.name}
                        </span>
                      </div>

                      {isActive && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "1px 5px",
                            borderRadius: 10,
                            backgroundColor: "rgba(32, 104, 89, 0.3)",
                            color: "#34D399",
                          }}
                        >
                          Active
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: isDynamic ? "#38BDF8" : "#94A3B8",
                        fontWeight: 600,
                      }}
                    >
                      {page.slug}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      {isProtected ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            fontSize: 9,
                            color: "#F59E0B",
                            fontWeight: 600,
                          }}
                        >
                          <Lock size={9} />
                          {page.guard?.type === "admin" ? "Admin" : "Auth"}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 9,
                            color: "#10B981",
                            fontWeight: 600,
                          }}
                        >
                          Public
                        </span>
                      )}

                      {page.parameters && page.parameters.length > 0 && (
                        <span
                          style={{
                            fontSize: 9,
                            color: "#38BDF8",
                            fontFamily: "monospace",
                            marginLeft: "auto",
                          }}
                        >
                          {page.parameters.map((p) => p.name).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
