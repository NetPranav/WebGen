"use client";

/**
 * ============================================================================
 * DATABASE CENTER STAGE COMPONENT
 * ============================================================================
 * UI Element: Database Studio Center Workspace
 * Role:
 * - Engine Selector dropdown (PostgreSQL 16, SQLite 3, MySQL 8, MongoDB)
 * - Triple View switcher: Visual ER Canvas | Mock Data Grid | SQL DDL Preview
 * - Live interactive entity table cards with draggable coordinates and SVG relations
 * ============================================================================
 */

import React, { useState, useMemo, useRef } from "react";
import { useProjectStore, DatabaseFunctionLatch } from "@/core/store/useProjectStore";
import { EntityTableCard } from "./EntityTableCard";
import { MockDataGrid } from "./MockDataGrid";
import { DatabaseLatchPickerModal, LatchCandidate } from "./DatabaseLatchPickerModal";
import {
  Layout,
  Table as TableIcon,
  Code2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Check,
  Server,
  Sparkles,
  Plus,
  X,
  Key,
  Link,
  Shield,
  FileCode,
  ArrowRight,
  Workflow,
  ExternalLink,
  Database,
} from "lucide-react";

export type DatabaseEngineType = "postgresql" | "sqlite" | "mysql" | "mongodb";
export type DatabaseViewMode = "canvas" | "grid" | "ddl";

export interface DatabaseOpenTab {
  id: string;
  type: "canvas" | "table" | "field";
  tableName: string;
  fieldName?: string;
  title: string;
  canClose: boolean;
}

interface DatabaseCenterStageProps {
  selectedTableId: string | null;
  selectedFieldName: string | null;
  onSelectTable: (tableId: string) => void;
  onSelectField: (tableId: string, fieldName: string) => void;
  onOpenFieldEditor?: (tableName: string, fieldName?: string) => void;
  onAddTable?: () => void;
}

export const DatabaseCenterStage: React.FC<DatabaseCenterStageProps> = ({
  selectedTableId,
  selectedFieldName,
  onSelectTable,
  onSelectField,
  onOpenFieldEditor,
  onAddTable,
}) => {
  const {
    databaseSchemas,
    databaseRecords,
    databaseLatches,
    addDatabaseLatch,
    removeDatabaseLatch,
  } = useProjectStore();
  const [engineType, setEngineType] = useState<DatabaseEngineType>("postgresql");
  const [viewMode, setViewMode] = useState<DatabaseViewMode>("canvas");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [copiedSql, setCopiedSql] = useState(false);

  // Unreal-style Latch Picker Modal state for viewport
  const [isCenterLatchPickerOpen, setIsCenterLatchPickerOpen] = useState(false);
  const [centerLatchTargetCollection, setCenterLatchTargetCollection] = useState<string>("Products");
  const [centerLatchTargetField, setCenterLatchTargetField] = useState<string | null>(null);

  const handleCenterSelectLatchCandidate = (candidate: LatchCandidate) => {
    const targetKey = centerLatchTargetField
      ? `${centerLatchTargetCollection}.${centerLatchTargetField}`
      : centerLatchTargetCollection;
    addDatabaseLatch(
      {
        id: `latch_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        targetKey,
        functionName: candidate.functionName,
        category: candidate.category,
        sourceFile: candidate.sourceFile,
        operation: candidate.operation,
        description: candidate.description,
      },
      `Latch ${candidate.functionName} to ${targetKey}`
    );
  };

  // 3rd Strip: Open tabs in the database viewport
  const [openTabs, setOpenTabs] = useState<DatabaseOpenTab[]>([
    {
      id: "root-canvas",
      type: "canvas",
      tableName: selectedTableId || "Products",
      title: `${selectedTableId || "Products"} (Canvas)`,
      canClose: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("root-canvas");

  // Table card positions on the canvas
  const [tablePositions, setTablePositions] = useState<Record<string, { x: number; y: number }>>({
    Products: { x: 60, y: 60 },
    Users: { x: 420, y: 60 },
    Orders: { x: 420, y: 360 },
  });

  const activeTable = selectedTableId || Object.keys(databaseSchemas)[0] || "Products";

  // Double-click on field opens dedicated tab in the 3rd strip
  const handleDoubleClickField = (tableName: string, fieldName: string) => {
    const tabId = `field:${tableName}.${fieldName}`;
    setOpenTabs((prev) => {
      if (prev.some((t) => t.id === tabId)) {
        return prev;
      }
      return [
        ...prev,
        {
          id: tabId,
          type: "field",
          tableName,
          fieldName,
          title: `${tableName}.${fieldName}`,
          canClose: true,
        },
      ];
    });
    setActiveTabId(tabId);
    onSelectTable(tableName);
    onSelectField(tableName, fieldName);
  };

  // Double-click on table opens dedicated tab in the 3rd strip
  const handleDoubleClickTable = (tableName: string) => {
    const tabId = `table:${tableName}`;
    setOpenTabs((prev) => {
      if (prev.some((t) => t.id === tabId)) {
        return prev;
      }
      return [
        ...prev,
        {
          id: tabId,
          type: "table",
          tableName,
          title: tableName,
          canClose: true,
        },
      ];
    });
    setActiveTabId(tabId);
    onSelectTable(tableName);
  };

  // Close tab in 3rd strip
  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) {
        const closedIdx = prev.findIndex((t) => t.id === tabId);
        const fallback = prev[closedIdx - 1] || next[0] || { id: "root-canvas" };
        setActiveTabId(fallback.id);
        if (fallback.type === "field" && fallback.fieldName) {
          onSelectField(fallback.tableName, fallback.fieldName);
        } else if (fallback.tableName) {
          onSelectTable(fallback.tableName);
        }
      }
      return next;
    });
  };

  const currentTab = openTabs.find((t) => t.id === activeTabId) || openTabs[0];

  const handleDragCard = (tableName: string, dx: number, dy: number) => {
    setTablePositions((prev) => {
      const current = prev[tableName] || { x: 100, y: 100 };
      return {
        ...prev,
        [tableName]: {
          x: Math.max(20, current.x + dx),
          y: Math.max(20, current.y + dy),
        },
      };
    });
  };

  // Generate live SQL DDL string based on current database schemas
  const generatedSql = useMemo(() => {
    const lines: string[] = [];
    lines.push(`-- Visual Web Application Engine: Generated DDL`);
    lines.push(`-- Engine: ${engineType.toUpperCase()} | Generated at ${new Date().toISOString()}`);
    lines.push("");

    Object.values(databaseSchemas).forEach((schema) => {
      lines.push(`CREATE TABLE "${schema.name}" (`);
      const fieldDefs: string[] = [];

      Object.values(schema.fields).forEach((field) => {
        let col = `  "${field.name}" `;
        if (field.type === "Int") col += "SERIAL";
        else if (field.type === "Float") col += "DOUBLE PRECISION";
        else if (field.type === "Boolean") col += "BOOLEAN";
        else if (field.type === "DateTime") col += "TIMESTAMPTZ DEFAULT NOW()";
        else if (field.type === "JSON") col += "JSONB";
        else col += "VARCHAR(255)";

        if (field.isPrimaryKey) col += " PRIMARY KEY";
        if (field.isUnique && !field.isPrimaryKey) col += " UNIQUE";
        if (!field.isNullable && !field.isPrimaryKey) col += " NOT NULL";

        if (field.relation) {
          col += ` REFERENCES "${field.relation.targetCollection}"("${field.relation.referencesField || "id"}") ON DELETE ${field.relation.onDelete || "CASCADE"}`;
        }

        fieldDefs.push(col);
      });

      lines.push(fieldDefs.join(",\n"));
      lines.push(");");
      lines.push("");
    });

    return lines.join("\n");
  }, [databaseSchemas, engineType]);

  const handleCopySql = () => {
    navigator.clipboard.writeText(generatedSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="db-center-stage">
      {/* --------------------------------------------------------------------
       * TOP TOOLBAR: Engine Selector + View Mode Switcher + Canvas Actions
       * -------------------------------------------------------------------- */}
      <div className="db-stage-toolbar">
        <div className="db-stage-toolbar__left">
          {/* Engine Selector */}
          <div className="db-engine-select" title="Target Database Engine">
            <Server size={12} style={{ color: "#f59e0b" }} />
            <select
              value={engineType}
              onChange={(e) => setEngineType(e.target.value as DatabaseEngineType)}
            >
              <option value="postgresql">PostgreSQL 16 (Relational)</option>
              <option value="sqlite">SQLite 3 (Embedded Local)</option>
              <option value="mysql">MySQL 8 (InnoDB Relational)</option>
              <option value="mongodb">MongoDB (Document Store)</option>
            </select>
          </div>

          {/* View Mode Segmented Control */}
          <div className="db-view-segmented" role="tablist" aria-label="Database View Mode">
            <button
              type="button"
              className={`db-view-btn ${viewMode === "canvas" ? "db-view-btn--active" : ""}`}
              onClick={() => setViewMode("canvas")}
              title="Visual Entity Relationship Canvas"
            >
              <Layout size={12} />
              <span>ER Canvas</span>
            </button>

            <button
              type="button"
              className={`db-view-btn ${viewMode === "grid" ? "db-view-btn--active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Mock Data Records Spreadsheet"
            >
              <TableIcon size={12} />
              <span>Mock Data ({databaseRecords[activeTable]?.length || 0})</span>
            </button>

            <button
              type="button"
              className={`db-view-btn ${viewMode === "ddl" ? "db-view-btn--active" : ""}`}
              onClick={() => setViewMode("ddl")}
              title="SQL DDL & Migration Preview"
            >
              <Code2 size={12} />
              <span>SQL DDL</span>
            </button>
          </div>
        </div>

        <div className="db-stage-toolbar__right">
          {/* Zoom controls for canvas view */}
          {viewMode === "canvas" && (
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button
                type="button"
                className="viewport-action-btn"
                onClick={() => setZoomLevel((z) => Math.max(z - 10, 40))}
                title="Zoom Out"
                style={{ width: 24, height: 24 }}
              >
                <ZoomOut size={12} />
              </button>
              <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", width: 36, textAlign: "center" }}>
                {zoomLevel}%
              </span>
              <button
                type="button"
                className="viewport-action-btn"
                onClick={() => setZoomLevel((z) => Math.min(z + 10, 160))}
                title="Zoom In"
                style={{ width: 24, height: 24 }}
              >
                <ZoomIn size={12} />
              </button>
              <button
                type="button"
                className="viewport-action-btn"
                onClick={() => setZoomLevel(100)}
                title="Reset Zoom"
                style={{ width: 24, height: 24 }}
              >
                <Maximize2 size={12} />
              </button>
            </div>
          )}

          {viewMode === "ddl" && (
            <button
              type="button"
              className="db-explorer-header__btn"
              onClick={handleCopySql}
              title="Copy SQL to Clipboard"
              style={{ padding: "4px 10px" }}
            >
              {copiedSql ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedSql ? "Copied!" : "Copy SQL"}</span>
            </button>
          )}

          {onAddTable && (
            <button
              type="button"
              className="db-explorer-header__btn"
              onClick={onAddTable}
              title="Add New Table"
              style={{ padding: "4px 10px" }}
            >
              <Plus size={12} />
              <span>New Table</span>
            </button>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------
       * 3RD STRIP: OPEN DATABASE ITEMS / NAVIGATION TABS
       * -------------------------------------------------------------------- */}
      <div className="db-document-tabs-strip">
        {openTabs.map((tab) => {
          const isActive = activeTabId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`db-document-tab ${isActive ? "db-document-tab--active" : ""}`}
              onClick={() => {
                setActiveTabId(tab.id);
                if (tab.type === "field" && tab.fieldName) {
                  onSelectTable(tab.tableName);
                  onSelectField(tab.tableName, tab.fieldName);
                } else if (tab.tableName) {
                  onSelectTable(tab.tableName);
                }
              }}
            >
              {tab.type === "canvas" && <Layout size={11} />}
              {tab.type === "table" && <TableIcon size={11} />}
              {tab.type === "field" && <Key size={11} />}
              <span>{tab.title}</span>
              {tab.canClose && (
                <span
                  className="db-document-tab__close"
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  title="Close Tab"
                >
                  <X size={10} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* --------------------------------------------------------------------
       * WORKSPACE CONTENT AREA (Drill-Down View OR Canvas / Grid / DDL)
       * -------------------------------------------------------------------- */}
      {currentTab.type === "field" && currentTab.fieldName ? (
        /* ===================================================================
         * VIEWPORT DRILL-DOWN: FIELD DETAILED ARCHITECTURE & CART HIERARCHY
         * =================================================================== */
        (() => {
          const schema = databaseSchemas[currentTab.tableName];
          const field = schema?.fields[currentTab.fieldName];
          const tableRecords = databaseRecords[currentTab.tableName] || [];

          if (!schema || !field) {
            return (
              <div className="db-drill-down-container">
                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  Field not found. It may have been renamed or deleted.
                </div>
              </div>
            );
          }

          // Check for related incoming connections from other tables
          const incomingRelations: Array<{ sourceTable: string; sourceField: string }> = [];
          Object.values(databaseSchemas).forEach((otherSchema) => {
            Object.values(otherSchema.fields).forEach((f) => {
              if (f.relation && f.relation.targetCollection === schema.name) {
                incomingRelations.push({ sourceTable: otherSchema.name, sourceField: f.name });
              }
            });
          });

          return (
            <div className="db-drill-down-container">
              <div className="db-drill-down-content">
                {/* Breadcrumbs Navigation Bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    backgroundColor: "#FFFFFF",
                    padding: "8px 14px",
                    borderRadius: "var(--radius-sm, 6px)",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTabId("root-canvas")}
                    style={{ background: "none", border: "none", color: "#2563EB", cursor: "pointer", fontWeight: 600, fontSize: 12 }}
                  >
                    Database ER Canvas
                  </button>
                  <span>&gt;</span>
                  <button
                    type="button"
                    onClick={() => handleDoubleClickTable(schema.name)}
                    style={{ background: "none", border: "none", color: "#2563EB", cursor: "pointer", fontWeight: 600, fontSize: 12 }}
                  >
                    {schema.name}
                  </button>
                  <span>&gt;</span>
                  <span style={{ fontWeight: 700, color: "#0F172A" }}>{field.name}</span>
                </div>

                {/* Primary Field Architecture Card */}
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    borderRadius: "var(--radius-md, 8px)",
                    padding: "20px",
                    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: "#EFF6FF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#2563EB",
                        }}
                      >
                        {field.isPrimaryKey ? <Key size={18} style={{ color: "#EAB308" }} /> : <FileCode size={18} />}
                      </div>
                      <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#0F172A" }}>
                          {schema.name}.{field.name}
                        </h2>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          Type: {field.type} • Engine Storage: {field.type === "Int" ? "SERIAL / INT4" : field.type === "Float" ? "NUMERIC(10,2)" : field.type === "Boolean" ? "BOOLEAN" : field.type === "DateTime" ? "TIMESTAMPTZ" : "VARCHAR(255)"}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6 }}>
                      {field.isPrimaryKey && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: "#FEF9C3", color: "#A16207", padding: "2px 8px", borderRadius: 4 }}>
                          PRIMARY KEY
                        </span>
                      )}
                      {field.isUnique && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: "#EFF6FF", color: "#1D4ED8", padding: "2px 8px", borderRadius: 4 }}>
                          UNIQUE
                        </span>
                      )}
                      <span style={{ fontSize: 10, fontWeight: 700, background: field.isNullable ? "#F1F5F9" : "#FEE2E2", color: field.isNullable ? "#475569" : "#DC2626", padding: "2px 8px", borderRadius: 4 }}>
                        {field.isNullable ? "NULLABLE" : "NOT NULL (REQUIRED)"}
                      </span>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {field.description || `Attribute field stored in relational table "${schema.name}". Single-click selects this column in the Right Details Panel for property tweaking.`}
                  </p>

                  {/* Relational Hierarchy & Cart Traversal Card */}
                  {field.relation ? (
                    <div
                      style={{
                        padding: "14px",
                        backgroundColor: "#FDF2F8",
                        border: "1px solid #FBCFE8",
                        borderRadius: "var(--radius-sm, 6px)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Link size={14} style={{ color: "#DB2777" }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#9D174D" }}>
                            Foreign Key Connection (Hierarchical Relationship)
                          </span>
                        </div>
                        <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, background: "#FFFFFF", color: "#DB2777", padding: "2px 8px", borderRadius: 4 }}>
                          {field.relation.cardinality || "1:N"}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#831843" }}>
                        <span>
                          <strong>Source:</strong> {schema.name}.{field.name}
                        </span>
                        <ArrowRight size={14} />
                        <span>
                          <strong>Target:</strong> {field.relation.targetCollection}.{field.relation.referencesField || "id"}
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                        <button
                          type="button"
                          className="db-explorer-header__btn"
                          onClick={() => handleDoubleClickTable(field.relation!.targetCollection)}
                          style={{
                            padding: "6px 14px",
                            backgroundColor: "#DB2777",
                            color: "#FFFFFF",
                            border: "none",
                            fontWeight: 600,
                          }}
                        >
                          <span>Drill Down into Target Table: {field.relation.targetCollection}</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Incoming Relations to this Table */}
                  {incomingRelations.length > 0 && (
                    <div
                      style={{
                        padding: "12px",
                        backgroundColor: "#F0FDF4",
                        border: "1px solid #BBF7D0",
                        borderRadius: "var(--radius-sm, 6px)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#166534" }}>
                        Incoming Relational References ({incomingRelations.length})
                      </span>
                      {incomingRelations.map((rel) => (
                        <div key={`${rel.sourceTable}-${rel.sourceField}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
                          <span style={{ color: "#15803D" }}>
                            Table <strong>{rel.sourceTable}</strong> references this entity via <code>{rel.sourceField}</code>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDoubleClickTable(rel.sourceTable)}
                            style={{ background: "none", border: "none", color: "#15803D", cursor: "pointer", fontWeight: 600, fontSize: 11 }}
                          >
                            Drill into {rel.sourceTable} &rarr;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Connected Functions & Mutation Status in Viewport */}
                  {(() => {
                    const fieldTargetKey = `${schema.name}.${field.name}`;
                    const fieldLatches = databaseLatches[fieldTargetKey] || [];

                    return (
                      <div
                        style={{
                          padding: "14px",
                          backgroundColor: "#F8FAFC",
                          border: "1px solid rgba(15, 23, 42, 0.08)",
                          borderRadius: "var(--radius-sm, 6px)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Workflow size={14} style={{ color: "var(--accent-primary)" }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>
                              Connected Functions & Mutations (AST Call Graph)
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: 9.5,
                              fontFamily: "var(--font-mono)",
                              color: fieldLatches.length > 0 ? "#2563EB" : "#64748B",
                              background: fieldLatches.length > 0 ? "#EFF6FF" : "#FFFFFF",
                              padding: "2px 8px",
                              borderRadius: 4,
                              border: "1px solid rgba(15, 23, 42, 0.08)",
                              fontWeight: 600,
                            }}
                          >
                            {fieldLatches.length} Active Callers
                          </span>
                        </div>

                        {fieldLatches.length === 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748B" }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#94A3B8" }} />
                            <span>No active connections or modifications. This field is not currently referenced or mutated by any Logic Blueprint node or API function.</span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {fieldLatches.map((latch) => (
                              <div
                                key={latch.id}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: 6,
                                  backgroundColor: "#FFFFFF",
                                  border: "1px solid rgba(15, 23, 42, 0.08)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 12,
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                  <Workflow size={13} style={{ color: "#2563EB", flexShrink: 0 }} />
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                                        {latch.functionName}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: 8.5,
                                          fontWeight: 700,
                                          padding: "1px 5px",
                                          borderRadius: 3,
                                          backgroundColor:
                                            latch.operation === "READ"
                                              ? "#EFF6FF"
                                              : latch.operation === "CREATE"
                                              ? "#F0FDF4"
                                              : latch.operation === "DELETE"
                                              ? "#FEE2E2"
                                              : "#FEF3C7",
                                          color:
                                            latch.operation === "READ"
                                              ? "#2563EB"
                                              : latch.operation === "CREATE"
                                              ? "#16A34A"
                                              : latch.operation === "DELETE"
                                              ? "#DC2626"
                                              : "#D97706",
                                        }}
                                      >
                                        {latch.operation}
                                      </span>
                                    </div>
                                    <span style={{ fontSize: 10, color: "#64748B", fontFamily: "var(--font-mono)" }}>
                                      {latch.sourceFile}
                                    </span>
                                  </div>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                  <button
                                    type="button"
                                    onClick={() => alert(`Navigating to Logic Blueprint function: ${latch.functionName} in ${latch.sourceFile}`)}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "#2563EB",
                                      fontSize: 11,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
                                      padding: "4px 8px",
                                      borderRadius: 4,
                                      backgroundColor: "#EFF6FF",
                                    }}
                                  >
                                    <span>Visit Function</span>
                                    <ExternalLink size={11} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => removeDatabaseLatch(fieldTargetKey, latch.id, `Unlatch ${latch.functionName}`)}
                                    title="Disconnect Latch"
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "#EF4444",
                                      cursor: "pointer",
                                      padding: "4px",
                                      borderRadius: 4,
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <button
                            type="button"
                            className="db-explorer-header__btn"
                            onClick={() => {
                              setCenterLatchTargetCollection(schema.name);
                              setCenterLatchTargetField(field.name);
                              setIsCenterLatchPickerOpen(true);
                            }}
                            style={{ padding: "5px 12px", fontSize: 11 }}
                          >
                            <Workflow size={12} />
                            <span>+ Latch to Logic Blueprint</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Seed / Mock Records Value Slice */}
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", display: "block", marginBottom: 6 }}>
                      Sample Mock Records for {field.name} ({tableRecords.length} rows)
                    </span>
                    <div style={{ border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: 6, overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid rgba(15, 23, 42, 0.08)", textAlign: "left" }}>
                            <th style={{ padding: "6px 12px", color: "#475569", width: 60 }}>#</th>
                            <th style={{ padding: "6px 12px", color: "#475569" }}>Column Value</th>
                            <th style={{ padding: "6px 12px", color: "#475569" }}>Type Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tableRecords.length > 0 ? (
                            tableRecords.slice(0, 5).map((row, idx) => (
                              <tr key={idx} style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.04)" }}>
                                <td style={{ padding: "6px 12px", color: "#64748B", fontFamily: "var(--font-mono)" }}>{idx + 1}</td>
                                <td style={{ padding: "6px 12px", fontWeight: 600, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                                  {row[field.name] !== undefined ? String(row[field.name]) : "NULL"}
                                </td>
                                <td style={{ padding: "6px 12px", color: "#16A34A" }}>Valid ({field.type})</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} style={{ padding: "12px", textAlign: "center", color: "#94A3B8" }}>
                                No mock records seeded for this table yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      ) : currentTab.type === "table" ? (
        /* ===================================================================
         * VIEWPORT DRILL-DOWN: TABLE / COLLECTION ARCHITECTURE & LATCH GRAPH
         * =================================================================== */
        (() => {
          const schema = databaseSchemas[currentTab.tableName];
          const tableRecords = databaseRecords[currentTab.tableName] || [];

          if (!schema) {
            return (
              <div className="db-drill-down-container">
                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  Table not found. It may have been dropped or renamed.
                </div>
              </div>
            );
          }

          // Check for incoming references
          const incomingRelations: Array<{ sourceTable: string; sourceField: string }> = [];
          Object.values(databaseSchemas).forEach((otherSchema) => {
            Object.values(otherSchema.fields).forEach((f) => {
              if (f.relation && f.relation.targetCollection === schema.name) {
                incomingRelations.push({ sourceTable: otherSchema.name, sourceField: f.name });
              }
            });
          });

          const tableLatches = databaseLatches[schema.name] || [];

          return (
            <div className="db-drill-down-container">
              <div className="db-drill-down-content">
                {/* Breadcrumbs Navigation Bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    backgroundColor: "#FFFFFF",
                    padding: "8px 14px",
                    borderRadius: "var(--radius-sm, 6px)",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTabId("root-canvas")}
                    style={{ background: "none", border: "none", color: "#2563EB", cursor: "pointer", fontWeight: 600, fontSize: 12 }}
                  >
                    Database ER Canvas
                  </button>
                  <span>&gt;</span>
                  <span style={{ fontWeight: 700, color: "#0F172A" }}>{schema.name}</span>
                </div>

                {/* Primary Table Architecture Card */}
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    borderRadius: "var(--radius-md, 8px)",
                    padding: "20px",
                    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: "#EFF6FF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#2563EB",
                        }}
                      >
                        <TableIcon size={18} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#0F172A" }}>
                          {schema.name}
                        </h2>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          Engine Storage: public.{schema.name.toLowerCase()} • {Object.keys(schema.fields).length} Columns • {tableRecords.length} Rows
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, background: "#EFF6FF", color: "#1D4ED8", padding: "2px 8px", borderRadius: 4 }}>
                        {engineType.toUpperCase()}
                      </span>
                      <button
                        type="button"
                        className="db-view-btn"
                        onClick={() => {
                          setViewMode("grid");
                          setActiveTabId("root-canvas");
                        }}
                        style={{ fontSize: 11, padding: "3px 10px" }}
                      >
                        <TableIcon size={12} />
                        <span>Open Data Grid</span>
                      </button>
                    </div>
                  </div>

                  {/* Columns Summary Table */}
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", display: "block", marginBottom: 6 }}>
                      Schema Columns ({Object.keys(schema.fields).length})
                    </span>
                    <div style={{ border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: 6, overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid rgba(15, 23, 42, 0.08)", textAlign: "left" }}>
                            <th style={{ padding: "6px 12px", color: "#475569" }}>Column Name</th>
                            <th style={{ padding: "6px 12px", color: "#475569" }}>Type</th>
                            <th style={{ padding: "6px 12px", color: "#475569" }}>Attributes</th>
                            <th style={{ padding: "6px 12px", color: "#475569", textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.values(schema.fields).map((col) => (
                            <tr key={col.name} style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.04)" }}>
                              <td style={{ padding: "6px 12px", fontWeight: 600, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                                {col.name}
                              </td>
                              <td style={{ padding: "6px 12px", color: "#2563EB", fontFamily: "var(--font-mono)" }}>
                                {col.type}
                              </td>
                              <td style={{ padding: "6px 12px" }}>
                                <div style={{ display: "flex", gap: 4 }}>
                                  {col.isPrimaryKey && (
                                    <span style={{ fontSize: 9, fontWeight: 700, background: "#FEF9C3", color: "#A16207", padding: "1px 5px", borderRadius: 3 }}>
                                      PK
                                    </span>
                                  )}
                                  {col.isUnique && (
                                    <span style={{ fontSize: 9, fontWeight: 700, background: "#EFF6FF", color: "#1D4ED8", padding: "1px 5px", borderRadius: 3 }}>
                                      UNIQUE
                                    </span>
                                  )}
                                  {col.relation && (
                                    <span style={{ fontSize: 9, fontWeight: 700, background: "#FCE7F3", color: "#BE185D", padding: "1px 5px", borderRadius: 3 }}>
                                      FK &rarr; {col.relation.targetCollection}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: "6px 12px", textAlign: "right" }}>
                                <button
                                  type="button"
                                  onClick={() => handleDoubleClickField(schema.name, col.name)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#2563EB",
                                    fontSize: 10.5,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Drill into Field &rarr;
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Relational References */}
                  {incomingRelations.length > 0 && (
                    <div
                      style={{
                        padding: "12px",
                        backgroundColor: "#F0FDF4",
                        border: "1px solid #BBF7D0",
                        borderRadius: "var(--radius-sm, 6px)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#166534" }}>
                        Incoming Relational References ({incomingRelations.length})
                      </span>
                      {incomingRelations.map((rel) => (
                        <div key={`${rel.sourceTable}-${rel.sourceField}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
                          <span style={{ color: "#15803D" }}>
                            Table <strong>{rel.sourceTable}</strong> references this entity via <code>{rel.sourceField}</code>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDoubleClickTable(rel.sourceTable)}
                            style={{ background: "none", border: "none", color: "#15803D", cursor: "pointer", fontWeight: 600, fontSize: 11 }}
                          >
                            Drill into {rel.sourceTable} &rarr;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Connected Functions & Mutation Status for Table */}
                  <div
                    style={{
                      padding: "14px",
                      backgroundColor: "#F8FAFC",
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                      borderRadius: "var(--radius-sm, 6px)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Workflow size={14} style={{ color: "var(--accent-primary)" }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>
                          Connected Functions & Mutations (AST Call Graph)
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 9.5,
                          fontFamily: "var(--font-mono)",
                          color: tableLatches.length > 0 ? "#2563EB" : "#64748B",
                          background: tableLatches.length > 0 ? "#EFF6FF" : "#FFFFFF",
                          padding: "2px 8px",
                          borderRadius: 4,
                          border: "1px solid rgba(15, 23, 42, 0.08)",
                          fontWeight: 600,
                        }}
                      >
                        {tableLatches.length} Active Callers
                      </span>
                    </div>

                    {tableLatches.length === 0 ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748B" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#94A3B8" }} />
                        <span>No active connections or modifications. This table ({schema.name}) is not currently referenced or mutated by any Logic Blueprint node or API function.</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {tableLatches.map((latch) => (
                          <div
                            key={latch.id}
                            style={{
                              padding: "8px 12px",
                              borderRadius: 6,
                              backgroundColor: "#FFFFFF",
                              border: "1px solid rgba(15, 23, 42, 0.08)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                              <Workflow size={13} style={{ color: "#2563EB", flexShrink: 0 }} />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                                    {latch.functionName}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 8.5,
                                      fontWeight: 700,
                                      padding: "1px 5px",
                                      borderRadius: 3,
                                      backgroundColor:
                                        latch.operation === "READ"
                                          ? "#EFF6FF"
                                          : latch.operation === "CREATE"
                                          ? "#F0FDF4"
                                          : latch.operation === "DELETE"
                                          ? "#FEE2E2"
                                          : "#FEF3C7",
                                      color:
                                        latch.operation === "READ"
                                          ? "#2563EB"
                                          : latch.operation === "CREATE"
                                          ? "#16A34A"
                                          : latch.operation === "DELETE"
                                          ? "#DC2626"
                                          : "#D97706",
                                    }}
                                  >
                                    {latch.operation}
                                  </span>
                                </div>
                                <span style={{ fontSize: 10, color: "#64748B", fontFamily: "var(--font-mono)" }}>
                                  {latch.sourceFile}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => alert(`Navigating to Logic Blueprint function: ${latch.functionName} in ${latch.sourceFile}`)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#2563EB",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "4px 8px",
                                  borderRadius: 4,
                                  backgroundColor: "#EFF6FF",
                                }}
                              >
                                <span>Visit Function</span>
                                <ExternalLink size={11} />
                              </button>

                              <button
                                type="button"
                                onClick={() => removeDatabaseLatch(schema.name, latch.id, `Unlatch ${latch.functionName}`)}
                                title="Disconnect Latch"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#EF4444",
                                  cursor: "pointer",
                                  padding: "4px",
                                  borderRadius: 4,
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button
                        type="button"
                        className="db-explorer-header__btn"
                        onClick={() => {
                          setCenterLatchTargetCollection(schema.name);
                          setCenterLatchTargetField(null);
                          setIsCenterLatchPickerOpen(true);
                        }}
                        style={{ padding: "5px 12px", fontSize: 11 }}
                      >
                        <Workflow size={12} />
                        <span>+ Latch to Logic Blueprint</span>
                      </button>
                    </div>
                  </div>

                  {/* Seed / Mock Records Value Slice */}
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", display: "block", marginBottom: 6 }}>
                      Sample Mock Records ({tableRecords.length} rows)
                    </span>
                    <div style={{ border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: 6, overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid rgba(15, 23, 42, 0.08)", textAlign: "left" }}>
                            <th style={{ padding: "6px 12px", color: "#475569", width: 40 }}>#</th>
                            {Object.keys(schema.fields).slice(0, 4).map((fName) => (
                              <th key={fName} style={{ padding: "6px 12px", color: "#475569" }}>
                                {fName}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableRecords.length > 0 ? (
                            tableRecords.slice(0, 5).map((row, idx) => (
                              <tr key={idx} style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.04)" }}>
                                <td style={{ padding: "6px 12px", color: "#64748B", fontFamily: "var(--font-mono)" }}>{idx + 1}</td>
                                {Object.keys(schema.fields).slice(0, 4).map((fName) => (
                                  <td key={fName} style={{ padding: "6px 12px", fontWeight: 500, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                                    {row[fName] !== undefined ? String(row[fName]) : "NULL"}
                                  </td>
                                ))}
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} style={{ padding: "16px", textAlign: "center", color: "#94A3B8" }}>
                                No mock records seeded yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        /* ===================================================================
         * DEFAULT OVERVIEW: VISUAL ER CANVAS / MOCK DATA GRID / SQL DDL
         * =================================================================== */
        <>
          {viewMode === "canvas" && (
            <div className="db-canvas-container" style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "0 0" }}>
              {/* Render All Entity Table Cards */}
              {Object.values(databaseSchemas).map((schema, index) => {
                const pos = tablePositions[schema.name] || {
                  x: 60 + (index % 3) * 360,
                  y: 60 + Math.floor(index / 3) * 320,
                };

                return (
                  <div
                    key={schema.id || schema.name}
                    style={{
                      position: "absolute",
                      left: pos.x,
                      top: pos.y,
                      zIndex: selectedTableId === schema.name ? 10 : 1,
                    }}
                  >
                    <EntityTableCard
                      schema={schema}
                      recordsCount={databaseRecords[schema.name]?.length || 0}
                      isSelected={selectedTableId === schema.name}
                      selectedFieldName={selectedTableId === schema.name ? selectedFieldName : null}
                      onSelect={() => {
                        onSelectTable(schema.name);
                      }}
                      onSelectField={(fieldName) => {
                        onSelectTable(schema.name);
                        onSelectField(schema.name, fieldName);
                      }}
                      onDoubleClickField={(fieldName) => {
                        handleDoubleClickField(schema.name, fieldName);
                      }}
                      onDoubleClickTable={() => {
                        handleDoubleClickTable(schema.name);
                      }}
                      onAddField={() => onOpenFieldEditor?.(schema.name)}
                      onEditField={(field) => onOpenFieldEditor?.(schema.name, field.name)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === "grid" && (
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <MockDataGrid initialCollection={activeTable} />
            </div>
          )}

          {viewMode === "ddl" && (
            <div style={{ flex: 1, padding: "24px", overflow: "auto", backgroundColor: "var(--canvas-bg, #FCFDFD)" }}>
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  borderRadius: "var(--radius-md, 8px)",
                  padding: "20px",
                  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                  maxWidth: 900,
                  margin: "0 auto",
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    lineHeight: 1.65,
                    color: "#0F172A",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {generatedSql}
                </pre>
              </div>
            </div>
          )}
        </>
      )}

      {/* Unreal-Style Latch Picker Modal */}
      <DatabaseLatchPickerModal
        isOpen={isCenterLatchPickerOpen}
        targetCollection={centerLatchTargetCollection}
        targetField={centerLatchTargetField}
        existingLatches={
          databaseLatches[
            centerLatchTargetField
              ? `${centerLatchTargetCollection}.${centerLatchTargetField}`
              : centerLatchTargetCollection
          ] || []
        }
        onSelectLatch={handleCenterSelectLatchCandidate}
        onClose={() => setIsCenterLatchPickerOpen(false)}
      />
    </div>
  );
};
