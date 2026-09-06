"use client";

/**
 * ============================================================================
 * DATABASE DESIGNER: ENTITY TABLE CARD
 * ============================================================================
 * Visual table card representing a database collection on the ER Canvas.
 * Displays field list, PKs, type badges, constraints, and action controls.
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.5 & SCHEMA_REFERENCE.md §13
 * ============================================================================
 */

import React from "react";
import {
  Database,
  Key,
  Plus,
  Trash2,
  Table,
  Link,
  Edit2,
  Shield,
  Layers,
} from "lucide-react";
import {
  CollectionSchema,
  DatabaseField,
  DatabaseFieldType,
} from "@/core/types/database";
import "@/editor/styles/panels.css";
import "@/editor/styles/forms.css";

interface EntityTableCardProps {
  schema: CollectionSchema;
  recordsCount: number;
  isSelected?: boolean;
  selectedFieldName?: string | null;
  onSelect?: () => void;
  onSelectField?: (fieldName: string) => void;
  onDoubleClickField?: (fieldName: string) => void;
  onDoubleClickTable?: () => void;
  onAddField?: () => void;
  onEditField?: (field: DatabaseField) => void;
  onDeleteField?: (fieldName: string) => void;
  onDeleteTable?: () => void;
  onViewRecords?: () => void;
}

export const EntityTableCard: React.FC<EntityTableCardProps> = ({
  schema,
  recordsCount,
  isSelected = false,
  selectedFieldName = null,
  onSelect,
  onSelectField,
  onDoubleClickField,
  onDoubleClickTable,
  onAddField,
  onEditField,
  onDeleteField,
  onDeleteTable,
  onViewRecords,
}) => {
  const fields = Object.values(schema.fields);
  const [hoveredField, setHoveredField] = React.useState<{
    field: DatabaseField;
    x: number;
    y: number;
  } | null>(null);

  const getTypeBadgeStyle = (type: DatabaseFieldType) => {
    switch (type) {
      case "String":
        return { bg: "rgba(56, 189, 248, 0.15)", color: "#0284c7", border: "rgba(56, 189, 248, 0.3)" };
      case "Int":
      case "Float":
        return { bg: "rgba(249, 115, 22, 0.15)", color: "#ea580c", border: "rgba(249, 115, 22, 0.3)" };
      case "Boolean":
        return { bg: "rgba(34, 197, 94, 0.15)", color: "#16a34a", border: "rgba(34, 197, 94, 0.3)" };
      case "DateTime":
        return { bg: "rgba(192, 132, 252, 0.15)", color: "#9333ea", border: "rgba(192, 132, 252, 0.3)" };
      case "JSON":
        return { bg: "rgba(251, 191, 36, 0.15)", color: "#d97706", border: "rgba(251, 191, 36, 0.3)" };
      case "Relation":
        return { bg: "rgba(236, 72, 153, 0.15)", color: "#db2777", border: "rgba(236, 72, 153, 0.3)" };
      case "Enum":
      default:
        return { bg: "rgba(148, 163, 184, 0.15)", color: "#475569", border: "rgba(148, 163, 184, 0.3)" };
    }
  };

  return (
    <>
      <div
        onClick={onSelect}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onDoubleClickTable?.();
        }}
        style={{
          width: 270,
          backgroundColor: "#FFFFFF",
          border: `1px solid ${isSelected ? "#3B82F6" : "rgba(15, 23, 42, 0.08)"}`,
          borderRadius: "var(--radius-md, 8px)",
          boxShadow: isSelected
            ? "0 10px 25px -3px rgba(59, 130, 246, 0.2), 0 0 0 2px #3B82F6"
            : "0 4px 16px -2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transition: "all 0.15s ease",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
      {/* Table Card Header */}
      <div
        style={{
          padding: "9px 12px",
          backgroundColor: isSelected ? "#EFF6FF" : "#F8FAFC",
          borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
          <Database size={13} style={{ color: "#3B82F6", flexShrink: 0 }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#0F172A",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {schema.name}
          </span>
          <span
            style={{
              fontSize: 9.5,
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              padding: "1px 6px",
              borderRadius: "var(--radius-full, 9999px)",
              backgroundColor: isSelected ? "#DBEAFE" : "#F1F5F9",
              color: isSelected ? "#1D4ED8" : "#475569",
              border: "1px solid rgba(15, 23, 42, 0.06)",
              flexShrink: 0,
            }}
            title={`${recordsCount} records`}
          >
            {recordsCount}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          {onViewRecords && (
            <button
              type="button"
              className="panel-icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                onViewRecords();
              }}
              title="View Mock Records Grid"
              style={{ width: 22, height: 22 }}
            >
              <Table size={11} />
            </button>
          )}

          {onDeleteTable && (
            <button
              type="button"
              className="panel-icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteTable();
              }}
              title="Delete Collection"
              style={{ width: 22, height: 22, color: "var(--text-muted)" }}
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Field List Rows */}
      <div style={{ padding: "4px 0", maxHeight: 240, overflowY: "auto" }}>
        {fields.map((f) => {
          const badgeStyle = getTypeBadgeStyle(f.type);
          const isFieldSelected = isSelected && selectedFieldName === f.name;

          return (
            <div
              key={f.name}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.();
                onSelectField?.(f.name);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onDoubleClickField?.(f.name);
              }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredField({
                  field: f,
                  x: rect.right + 10,
                  y: rect.top - 10,
                });
              }}
              onMouseLeave={() => {
                setHoveredField(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "5px 10px",
                borderBottom: "1px solid var(--border-subtle, rgba(15, 23, 42, 0.06))",
                backgroundColor: isFieldSelected ? "#EFF6FF" : "transparent",
                borderLeft: isFieldSelected ? "3px solid #3B82F6" : "3px solid transparent",
                fontSize: 11,
                gap: 6,
                cursor: "pointer",
                transition: "background-color 0.12s ease",
              }}
              className="db-field-row"
            >
              {/* Left Identity: PK Icon + Field Name */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, flex: 1 }}>
                {f.isPrimaryKey ? (
                  <span title="Primary Key" style={{ display: "inline-flex", flexShrink: 0 }}>
                    <Key size={11} style={{ color: "#eab308" }} />
                  </span>
                ) : f.relation ? (
                  <span title={`Relation -> ${f.relation.targetCollection}`} style={{ display: "inline-flex", flexShrink: 0 }}>
                    <Link size={10} style={{ color: "#ec4899" }} />
                  </span>
                ) : (
                  <span style={{ width: 11 }} />
                )}

                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: f.isPrimaryKey || isFieldSelected ? 700 : 500,
                    color: isFieldSelected ? "#1D4ED8" : f.isPrimaryKey ? "var(--text-primary)" : "var(--text-secondary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={f.name}
                >
                  {f.name}
                </span>

                {f.isUnique && !f.isPrimaryKey && (
                  <span title="Unique Constraint" style={{ display: "inline-flex", flexShrink: 0 }}>
                    <Shield size={10} style={{ color: "var(--accent-primary)" }} />
                  </span>
                )}
              </div>

              {/* Right Type Badge & Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: 8.5,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 3,
                    backgroundColor: badgeStyle.bg,
                    color: badgeStyle.color,
                    border: `1px solid ${badgeStyle.border}`,
                    letterSpacing: "0.3px",
                  }}
                >
                  {f.type}
                </span>

                {onDeleteField && !f.isPrimaryKey && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteField(f.name);
                    }}
                    className="panel-icon-btn"
                    title="Delete Field"
                    style={{ width: 18, height: 18, color: "var(--text-muted)" }}
                  >
                    <Trash2 size={9} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Card Footer: Add Field Action */}
      {onAddField && (
        <div
          style={{
            padding: "6px 10px",
            backgroundColor: "#F8FAFC",
            borderTop: "1px solid rgba(15, 23, 42, 0.06)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            className="details-add-button"
            onClick={(e) => {
              e.stopPropagation();
              onAddField();
            }}
            style={{ height: 22, padding: "0 8px", fontSize: 10 }}
          >
            <Plus size={11} strokeWidth={2.5} className="details-add-button__icon" />
            <span>+ Field</span>
          </button>
        </div>
      )}
    </div>

    {/* Rich Hover Popover Tooltip for Field Hierarchy & Detailing */}
    {hoveredField && (
      <div
        className="db-field-hover-popover"
        style={{
          position: "fixed",
          left: Math.min(hoveredField.x, window.innerWidth - 300),
          top: Math.max(10, Math.min(hoveredField.y, window.innerHeight - 200)),
        }}
      >
        <div className="db-field-hover-popover__header">
          <span className="db-field-hover-popover__hierarchy">
            📁 {schema.name} &gt; 🏷️ {hoveredField.field.name}
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 5px",
              borderRadius: 3,
              backgroundColor: getTypeBadgeStyle(hoveredField.field.type).bg,
              color: getTypeBadgeStyle(hoveredField.field.type).color,
            }}
          >
            {hoveredField.field.type}
          </span>
        </div>

        <p className="db-field-hover-popover__desc">
          {hoveredField.field.description ||
            (hoveredField.field.isPrimaryKey
              ? "Primary key unique record identifier for the collection."
              : hoveredField.field.relation
              ? `Foreign key reference establishing a relational connection to ${hoveredField.field.relation.targetCollection}.${hoveredField.field.relation.referencesField || "id"}.`
              : `Entity property attribute mapped to PostgreSQL column "${hoveredField.field.name}".`)}
        </p>

        <div className="db-field-hover-popover__meta">
          <div>
            <strong>Primary Key:</strong> {hoveredField.field.isPrimaryKey ? "Yes" : "No"}
          </div>
          <div>
            <strong>Nullable:</strong> {hoveredField.field.isNullable ? "Yes" : "No (Required)"}
          </div>
          <div>
            <strong>Unique:</strong> {hoveredField.field.isUnique ? "Yes" : "No"}
          </div>
          <div>
            <strong>Default:</strong>{" "}
            {hoveredField.field.defaultValue !== undefined ? String(hoveredField.field.defaultValue) : "None"}
          </div>
          {hoveredField.field.relation && (
            <div style={{ gridColumn: "span 2", color: "#db2777" }}>
              <strong>Relation:</strong> ➔ {hoveredField.field.relation.targetCollection} ({hoveredField.field.relation.cardinality || "1:N"})
            </div>
          )}
        </div>

        <div className="db-field-hover-popover__hint">
          💡 Click to inspect in Details • Double-click to drill down
        </div>
      </div>
    )}
  </>
);
};
