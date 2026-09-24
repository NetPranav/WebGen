"use client";

/**
 * ============================================================================
 * DATABASE LEFT EXPLORER COMPONENT
 * ============================================================================
 * UI Element: Database Studio Left Navigation (2 Sections)
 * Role:
 * - Top Section: Search bar + "+ Add" button + Indented Database Explorer Tree
 *   (Project Database ➔ Tables/Collections ➔ Fields with type/PK badges)
 * - Bottom Section: Relational Hierarchy & Foreign Key Dependency Tree
 *   (Visualizes parent-to-child entity relations, cardinality, and cascade rules)
 * ============================================================================
 */

import React, { useState, useMemo } from "react";
import { useProjectStore } from "@/core/store/useProjectStore";
import {
  Search,
  Plus,
  Table,
  Key,
  Link,
  ChevronDown,
  ChevronRight,
  Database,
  Network,
  Trash2,
  Layers,
  ArrowRight,
} from "lucide-react";

interface DatabaseLeftExplorerProps {
  selectedTableId: string | null;
  selectedFieldName: string | null;
  onSelectTable: (tableId: string) => void;
  onSelectField: (tableId: string, fieldName: string) => void;
  onAddTable: () => void;
}

export const DatabaseLeftExplorer: React.FC<DatabaseLeftExplorerProps> = ({
  selectedTableId,
  selectedFieldName,
  onSelectTable,
  onSelectField,
  onAddTable,
}) => {
  const { databaseSchemas, databaseRecords } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({
    Products: true,
    Users: true,
  });

  const toggleTableExpand = (tableName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTables((prev) => ({
      ...prev,
      [tableName]: !prev[tableName],
    }));
  };

  // Filtered tables & fields based on search query
  const filteredSchemas = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return Object.values(databaseSchemas);

    return Object.values(databaseSchemas).filter((schema) => {
      if (schema.name.toLowerCase().includes(q)) return true;
      return Object.values(schema.fields).some(
        (f) => f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q)
      );
    });
  }, [databaseSchemas, searchQuery]);

  // Compute Relational Dependencies for the Bottom Hierarchy Section
  const relationalHierarchy = useMemo(() => {
    const schemas = Object.values(databaseSchemas);
    const relations: Array<{
      sourceTable: string;
      sourceField: string;
      targetTable: string;
      cardinality: string;
      onDelete: string;
    }> = [];

    schemas.forEach((schema) => {
      Object.values(schema.fields).forEach((field) => {
        if (field.relation) {
          relations.push({
            sourceTable: schema.name,
            sourceField: field.name,
            targetTable: field.relation.targetCollection,
            cardinality: field.relation.cardinality || "1:N",
            onDelete: field.relation.onDelete || "CASCADE",
          });
        }
      });
    });

    return relations;
  }, [databaseSchemas]);

  return (
    <div className="db-left-explorer">
      {/* --------------------------------------------------------------------
       * TOP SECTION: Search + Add Button + Indented Database Explorer Tree
       * -------------------------------------------------------------------- */}
      <div className="db-explorer-section db-explorer-section--top">
        {/* Explorer Header */}
        <div className="db-explorer-header">
          <span className="db-explorer-header__title">
            <Database size={12} style={{ color: "var(--accent-warning)" }} />
            <span>Collections ({Object.keys(databaseSchemas).length})</span>
          </span>

          <button
            type="button"
            className="db-explorer-header__btn"
            onClick={onAddTable}
            title="Create New Table / Collection"
          >
            <Plus size={12} />
            <span>Add</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="db-explorer-search">
          <Search size={12} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Filter tables, fields, types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Indented Tree Scroll */}
        <div className="db-tree-scroll">
          {/* Root Database Item */}
          <div
            style={{
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-secondary)",
              borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
              marginBottom: 4,
            }}
          >
            <Database size={11} style={{ color: "#206859" }} />
            <span>AppRelationalDB (PostgreSQL 16)</span>
          </div>

          {filteredSchemas.length === 0 ? (
            <div style={{ padding: "16px 12px", fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
              No matching tables or fields
            </div>
          ) : (
            filteredSchemas.map((schema) => {
              const isTableSelected = selectedTableId === schema.name && selectedFieldName === null;
              const isExpanded = expandedTables[schema.name] !== false;
              const fieldCount = Object.keys(schema.fields).length;
              const recordCount = databaseRecords[schema.name]?.length || 0;

              return (
                <div key={schema.id || schema.name}>
                  {/* Table Item Row */}
                  <div
                    className={`db-tree-item ${isTableSelected ? "db-tree-item--active" : ""}`}
                    onClick={() => onSelectTable(schema.name)}
                    style={{ paddingLeft: 18 }}
                  >
                    <div className="db-tree-item__left">
                      <span
                        onClick={(e) => toggleTableExpand(schema.name, e)}
                        style={{ cursor: "pointer", display: "inline-flex", color: "var(--text-muted)" }}
                      >
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </span>
                      <Table size={12} style={{ color: isTableSelected ? "var(--accent-primary)" : "#206859" }} />
                      <span className="db-tree-item__name">{schema.name}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span className="db-tree-item__badge" title={`${recordCount} rows`}>
                        {recordCount}r
                      </span>
                      <span className="db-tree-item__badge" title={`${fieldCount} columns`}>
                        {fieldCount}c
                      </span>
                    </div>
                  </div>

                  {/* Indented Field Rows */}
                  {isExpanded && (
                    <div style={{ paddingLeft: 12 }}>
                      {Object.values(schema.fields).map((field) => {
                        const isFieldSelected =
                          selectedTableId === schema.name && selectedFieldName === field.name;

                        return (
                          <div
                            key={field.id || field.name}
                            className={`db-tree-item db-tree-item__field ${isFieldSelected ? "db-tree-item--active" : ""}`}
                            onClick={() => onSelectField(schema.name, field.name)}
                          >
                            <div className="db-tree-item__left">
                              {field.isPrimaryKey ? (
                                <Key size={10} style={{ color: "#eab308" }} />
                              ) : field.relation ? (
                                <Link size={10} style={{ color: "#ec4899" }} />
                              ) : (
                                <span style={{ width: 10 }} />
                              )}
                              <span style={{ color: isFieldSelected ? "var(--accent-primary)" : "var(--text-secondary)" }}>
                                {field.name}
                              </span>
                            </div>

                            <span
                              style={{
                                fontSize: 9.5,
                                fontFamily: "var(--font-mono)",
                                color: "var(--text-muted)",
                              }}
                            >
                              {field.type}
                              {field.isNullable ? "?" : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------
       * BOTTOM SECTION: Relational Hierarchy & Foreign Key Dependency Tree
       * -------------------------------------------------------------------- */}
      <div className="db-explorer-section db-explorer-section--bottom">
        <div className="db-explorer-header">
          <span className="db-explorer-header__title">
            <Network size={12} style={{ color: "#ec4899" }} />
            <span>Relational Hierarchy</span>
          </span>

          <span
            style={{
              fontSize: 9.5,
              background: "rgba(236, 72, 153, 0.15)",
              color: "#ec4899",
              padding: "1px 5px",
              borderRadius: "var(--radius-xs)",
              fontWeight: 600,
            }}
          >
            {relationalHierarchy.length} Relations
          </span>
        </div>

        <div className="db-tree-scroll" style={{ padding: "8px" }}>
          {relationalHierarchy.length === 0 ? (
            <div style={{ padding: "12px 6px", fontSize: 11, color: "var(--text-muted)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                <Layers size={11} />
                <span>No Foreign Keys Defined</span>
              </div>
              <p style={{ fontSize: 10, lineHeight: 1.4, margin: 0, color: "var(--text-muted)" }}>
                Add a field with type Relation to establish parent-child table hierarchies.
              </p>
            </div>
          ) : (
            relationalHierarchy.map((rel, idx) => (
              <div
                key={idx}
                className="db-rel-tree-node"
                onClick={() => onSelectTable(rel.sourceTable)}
                style={{ cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5 }}>
                  <span className="db-rel-tree-node--parent">{rel.targetTable}</span>
                  <ArrowRight size={10} style={{ color: "var(--text-muted)" }} />
                  <span style={{ color: "#ec4899", fontWeight: 600 }}>{rel.sourceTable}</span>
                </div>

                <div className="db-rel-tree-child">
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5 }}>
                    via {rel.sourceField} ({rel.cardinality})
                  </span>
                  <span
                    style={{
                      fontSize: 8.5,
                      background: "#F1F5F9",
                      color: "#475569",
                      padding: "1px 5px",
                      borderRadius: 3,
                      border: "1px solid rgba(15, 23, 42, 0.06)",
                    }}
                  >
                    {rel.onDelete}
                  </span>
                </div>
              </div>
            ))
          )}

          {/* Standalone Tables Summary */}
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(15, 23, 42, 0.06)", paddingLeft: 4 }}>
            <span style={{ fontSize: 9.5, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>
              Primary Collections
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
              {Object.keys(databaseSchemas).map((tbl) => (
                <button
                  key={tbl}
                  type="button"
                  onClick={() => onSelectTable(tbl)}
                  style={{
                    background: selectedTableId === tbl ? "#EBF5F3" : "#F8FAFC",
                    border: `1px solid ${selectedTableId === tbl ? "rgba(32, 104, 89, 0.4)" : "rgba(15, 23, 42, 0.08)"}`,
                    color: selectedTableId === tbl ? "#206859" : "#475569",
                    padding: "3px 7px",
                    borderRadius: "var(--radius-xs, 4px)",
                    fontSize: 10.5,
                    fontWeight: selectedTableId === tbl ? 600 : 500,
                    cursor: "pointer",
                  }}
                >
                  {tbl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
