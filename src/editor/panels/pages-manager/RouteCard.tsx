"use client";

/**
 * ============================================================================
 * ROUTE CARD COMPONENT
 * ============================================================================
 * Displays individual route metadata, dynamic parameter pills, route guard
 * status, active viewport status, and quick page lifecycle actions.
 * Architecture Ref: ROADMAP.md §Sub-Phase 6.5 & PANELS.md §Panel 30
 * ============================================================================
 */

import React from "react";
import {
  Globe,
  Lock,
  ShieldAlert,
  Variable,
  Copy,
  Trash2,
  Settings2,
  ExternalLink,
  CheckCircle,
  FileCode2,
  AlertTriangle,
} from "lucide-react";
import { PageDefinition } from "@/core/store/useProjectStore";

export interface RouteCardProps {
  page: PageDefinition;
  isActive: boolean;
  canDelete: boolean;
  hasCollision?: boolean;
  onSelect: (pageId: string) => void;
  onEdit: (page: PageDefinition) => void;
  onDuplicate: (pageId: string) => void;
  onDelete: (pageId: string) => void;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  page,
  isActive,
  canDelete,
  hasCollision = false,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const isDynamic = page.isDynamic || (page.parameters && page.parameters.length > 0) || page.slug.includes("[");
  const guardType = page.guard?.type || "public";

  return (
    <div
      onClick={() => onSelect(page.id)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "12px 16px",
        backgroundColor: isActive ? "rgba(32, 104, 89, 0.12)" : "#0F172A",
        border: `1px solid ${
          hasCollision
            ? "#EF4444"
            : isActive
            ? "#206859"
            : "#1E293B"
        }`,
        borderRadius: 8,
        cursor: "pointer",
        transition: "all 0.15s ease",
        position: "relative",
        boxShadow: isActive ? "0 0 16px rgba(32, 104, 89, 0.2)" : "none",
      }}
    >
      {/* Top Header Row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              backgroundColor: isActive ? "#206859" : "#1E293B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isActive ? "#FFFFFF" : "#94A3B8",
            }}
          >
            {page.isCustom404 ? (
              <AlertTriangle size={13} style={{ color: "#F59E0B" }} />
            ) : isDynamic ? (
              <Variable size={13} style={{ color: "#38BDF8" }} />
            ) : (
              <Globe size={13} />
            )}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC" }}>
                {page.name}
              </span>
              {isActive && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "1px 6px",
                    borderRadius: 10,
                    backgroundColor: "rgba(32, 104, 89, 0.3)",
                    color: "#34D399",
                    border: "1px solid #206859",
                  }}
                >
                  Active
                </span>
              )}
              {hasCollision && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 10,
                    backgroundColor: "rgba(239, 68, 68, 0.2)",
                    color: "#EF4444",
                    border: "1px solid #EF4444",
                  }}
                >
                  Collision!
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: 11,
                fontFamily: "monospace",
                color: isActive ? "#38BDF8" : "#94A3B8",
                fontWeight: 600,
              }}
            >
              {page.slug}
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 4 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onEdit(page)}
            style={{
              padding: "4px 8px",
              backgroundColor: "#1E293B",
              border: "1px solid #334155",
              borderRadius: 4,
              color: "#CBD5E1",
              fontSize: 11,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            title="Configure route settings, guard, and SEO"
          >
            <Settings2 size={12} />
            Settings
          </button>

          <button
            onClick={() => onDuplicate(page.id)}
            style={{
              padding: 4,
              backgroundColor: "transparent",
              border: "none",
              color: "#94A3B8",
              cursor: "pointer",
              borderRadius: 4,
            }}
            title="Duplicate page"
          >
            <Copy size={13} />
          </button>

          <button
            onClick={() => onDelete(page.id)}
            disabled={!canDelete}
            style={{
              padding: 4,
              backgroundColor: "transparent",
              border: "none",
              color: canDelete ? "#EF4444" : "#475569",
              cursor: canDelete ? "pointer" : "not-allowed",
              borderRadius: 4,
            }}
            title={canDelete ? "Delete page" : "Cannot delete the only remaining page"}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Badges and Parameters Row */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
        {/* Guard Pill */}
        {guardType === "auth" ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              backgroundColor: "rgba(245, 158, 11, 0.15)",
              color: "#F59E0B",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              fontWeight: 600,
            }}
          >
            <Lock size={10} />
            Auth Guard {page.guard?.redirectUrl ? `➔ ${page.guard.redirectUrl}` : ""}
          </span>
        ) : guardType === "admin" ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#EF4444",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              fontWeight: 600,
            }}
          >
            <ShieldAlert size={10} />
            Admin Role Only
          </span>
        ) : (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              color: "#10B981",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              fontWeight: 600,
            }}
          >
            Public Route
          </span>
        )}

        {/* Dynamic Parameter Pills */}
        {page.parameters && page.parameters.length > 0 ? (
          page.parameters.map((param) => (
            <span
              key={param.name}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 4,
                backgroundColor: "rgba(56, 189, 248, 0.12)",
                color: "#38BDF8",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                fontFamily: "monospace",
                fontWeight: 600,
              }}
            >
              param: {param.name} ({param.type})
            </span>
          ))
        ) : isDynamic ? (
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              backgroundColor: "rgba(56, 189, 248, 0.1)",
              color: "#38BDF8",
              fontFamily: "monospace",
            }}
          >
            Dynamic Route
          </span>
        ) : null}

        {page.isCustom404 && (
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              backgroundColor: "rgba(168, 85, 247, 0.15)",
              color: "#C084FC",
              fontWeight: 600,
            }}
          >
            404 Fallback Handler
          </span>
        )}

        {page.metaTitle && (
          <span
            style={{
              fontSize: 10,
              color: "#64748B",
              fontStyle: "italic",
              marginLeft: "auto",
            }}
          >
            Title: {page.metaTitle}
          </span>
        )}
      </div>
    </div>
  );
};
