"use client";

/**
 * ============================================================================
 * DATABASE DESIGNER & VISUAL ER MODELER (PANEL 10)
 * ============================================================================
 * Visual schema designer for modeling relational databases, defining fields,
 * inspecting SQL DDL migrations, and editing live mock records.
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.5, PANELS.md §Panel 10, SCHEMA_REFERENCE.md §13
 * ============================================================================
 */

import React, { useState, useMemo } from "react";
import {
  Database,
  Plus,
  Table,
  FileCode,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  X,
  Sparkles,
  Layers,
} from "lucide-react";
import { useProjectStore } from "@/core/store/useProjectStore";
import {
  CollectionSchema,
  DatabaseField,
  DatabaseFieldType,
} from "@/core/types/database";
import { DatabaseValidator } from "@/core/engine/DatabaseValidator";
import { EntityTableCard } from "./EntityTableCard";
import { FieldEditor } from "./FieldEditor";
import { MockDataGrid } from "./MockDataGrid";
import "@/editor/styles/panels.css";
import "@/editor/styles/forms.css";

interface DatabaseDesignerProps {
  onClose?: () => void;
}

type DesignerViewMode = "diagram" | "mock_data" | "sql_ddl";

export const DatabaseDesigner: React.FC<DatabaseDesignerProps> = ({ onClose }) => {
  const {
    databaseSchemas,
    databaseRecords,
    addDatabaseCollection,
    deleteDatabaseCollection,
    addFieldToCollection,
    deleteFieldFromCollection,
  } = useProjectStore();

  const [viewMode, setViewMode] = useState<DesignerViewMode>("diagram");
  const [selectedCollection, setSelectedCollection] = useState<string>("Products");
  const [isNewTableModalOpen, setIsNewTableModalOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableDesc, setNewTableDesc] = useState("");

  // Field editing state
  const [editingFieldModal, setEditingFieldModal] = useState<{
    collectionName: string;
    field?: DatabaseField;
  } | null>(null);

  const [copiedSql, setCopiedSql] = useState(false);

  const schemasList = Object.values(databaseSchemas);

  // Validate all schemas using DatabaseValidator
  const validationSummary = useMemo(() => {
    let totalErrors = 0;
    schemasList.forEach((schema) => {
      const res = DatabaseValidator.validateSchema(schema, schemasList);
      totalErrors += res.errors.length;
    });
    return {
      isValid: totalErrors === 0,
      totalErrors,
    };
  }, [schemasList]);

  // Generate SQL DDL for all schemas
  const generatedSql = useMemo(() => {
    let sql = `-- ====================================================\n`;
    sql += `-- Generated Relational DDL (PostgreSQL / Prisma Standard)\n`;
    sql += `-- Project Engine AST Schema Export\n`;
    sql += `-- ====================================================\n\n`;

    schemasList.forEach((schema) => {
      sql += `CREATE TABLE "${schema.name}" (\n`;
      const fieldEntries = Object.values(schema.fields);
      const lines: string[] = [];

      fieldEntries.forEach((f) => {
        let colType = "VARCHAR(255)";
        if (f.type === "Int") colType = "INTEGER";
        else if (f.type === "Float") colType = "NUMERIC(10, 2)";
        else if (f.type === "Boolean") colType = "BOOLEAN DEFAULT FALSE";
        else if (f.type === "DateTime") colType = "TIMESTAMP WITH TIME ZONE DEFAULT NOW()";
        else if (f.type === "JSON") colType = "JSONB DEFAULT '{}'";

        let constraints = "";
        if (f.isPrimaryKey) constraints += " PRIMARY KEY";
        if (f.isUnique && !f.isPrimaryKey) constraints += " UNIQUE";
        if (!f.isNullable && !f.isPrimaryKey) constraints += " NOT NULL";

        lines.push(`  "${f.name}" ${colType}${constraints}`);
      });

      // Foreign Key constraints
      fieldEntries.forEach((f) => {
        if (f.type === "Relation" && f.relation) {
          lines.push(
            `  CONSTRAINT "fk_${schema.name}_${f.name}" FOREIGN KEY ("${f.relation.foreignKey}") REFERENCES "${f.relation.targetCollection}" ("${f.relation.referencesField}") ON DELETE ${f.relation.onDelete}`
          );
        }
      });

      sql += lines.join(",\n");
      sql += `\n);\n\n`;
    });

    return sql;
  }, [schemasList]);

  const handleCreateTable = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTableName.trim();
    if (!name) return;

    // Create default schema with ID primary key
    const newSchema: CollectionSchema = {
      id: `col_${name.toLowerCase()}_${Date.now()}`,
      name,
      displayName: name,
      description: newTableDesc.trim() || undefined,
      fields: {
        id: {
          id: `f_id_${Date.now()}`,
          name: "id",
          type: "String",
          isPrimaryKey: true,
          isUnique: true,
          isNullable: false,
        },
      },
    };

    addDatabaseCollection(newSchema, `Create collection '${name}'`);
    setSelectedCollection(name);
    setNewTableName("");
    setNewTableDesc("");
    setIsNewTableModalOpen(false);
  };

  const handleSaveField = (field: DatabaseField) => {
    if (!editingFieldModal) return;
    addFieldToCollection(
      editingFieldModal.collectionName,
      field,
      `Add/update field '${field.name}' in '${editingFieldModal.collectionName}'`
    );
    setEditingFieldModal(null);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(generatedSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: "var(--surface-panel)",
        overflow: "hidden",
      }}
    >
      {/* Panel Top Toolbar */}
      <div
        style={{
          padding: "8px 12px",
          backgroundColor: "var(--surface-panel-solid)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexShrink: 0,
        }}
      >
        {/* Left: Brand / Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Database size={15} style={{ color: "var(--accent-primary)" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
            Database Designer (ER Modeler)
          </span>
          <span
            style={{
              fontSize: 9.5,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 8,
              backgroundColor: "var(--surface-2)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {schemasList.length} Tables
          </span>

          {/* Validation Status Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 12,
              backgroundColor: validationSummary.isValid
                ? "rgba(34, 197, 94, 0.15)"
                : "rgba(239, 68, 68, 0.15)",
              color: validationSummary.isValid ? "#22c55e" : "#ef4444",
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {validationSummary.isValid ? (
              <>
                <CheckCircle2 size={11} />
                <span>Schema Valid</span>
              </>
            ) : (
              <>
                <AlertTriangle size={11} />
                <span>{validationSummary.totalErrors} Schema Issue(s)</span>
              </>
            )}
          </div>
        </div>

        {/* Center: View Switcher */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "var(--surface-1)",
            padding: 2,
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode("diagram")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              borderRadius: 3,
              backgroundColor: viewMode === "diagram" ? "var(--surface-panel-solid)" : "transparent",
              color: viewMode === "diagram" ? "var(--accent-primary)" : "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <LayoutGrid size={11} />
            <span>ER Canvas</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("mock_data")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              borderRadius: 3,
              backgroundColor: viewMode === "mock_data" ? "var(--surface-panel-solid)" : "transparent",
              color: viewMode === "mock_data" ? "var(--accent-primary)" : "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <Table size={11} />
            <span>Mock Records</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("sql_ddl")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              borderRadius: 3,
              backgroundColor: viewMode === "sql_ddl" ? "var(--surface-panel-solid)" : "transparent",
              color: viewMode === "sql_ddl" ? "var(--accent-primary)" : "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <FileCode size={11} />
            <span>SQL DDL</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="details-add-button"
            onClick={() => setIsNewTableModalOpen(true)}
            style={{ height: 26, padding: "0 10px", fontSize: 11 }}
          >
            <Plus size={13} strokeWidth={2.5} className="details-add-button__icon" />
            <span>+ New Table</span>
          </button>

          {onClose && (
            <button
              type="button"
              className="panel-icon-btn"
              onClick={onClose}
              title="Close Database Designer"
              style={{ width: 22, height: 22 }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport Content */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {/* VIEW 1: ER DIAGRAM CANVAS */}
        {viewMode === "diagram" && (
          <div
            style={{
              width: "100%",
              height: "100%",
              overflow: "auto",
              padding: 24,
              backgroundImage:
                "radial-gradient(var(--border-subtle) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
              backgroundColor: "var(--surface-panel)",
              display: "flex",
              flexWrap: "wrap",
              gap: 24,
              alignContent: "flex-start",
            }}
          >
            {schemasList.map((schema) => {
              const records = databaseRecords[schema.name] || [];
              const isSelected = schema.name === selectedCollection;

              return (
                <EntityTableCard
                  key={schema.name}
                  schema={schema}
                  recordsCount={records.length}
                  isSelected={isSelected}
                  onSelect={() => setSelectedCollection(schema.name)}
                  onAddField={() =>
                    setEditingFieldModal({ collectionName: schema.name })
                  }
                  onEditField={(field) =>
                    setEditingFieldModal({
                      collectionName: schema.name,
                      field,
                    })
                  }
                  onDeleteField={(fieldName) =>
                    deleteFieldFromCollection(
                      schema.name,
                      fieldName,
                      `Delete field '${fieldName}' from '${schema.name}'`
                    )
                  }
                  onDeleteTable={() =>
                    deleteDatabaseCollection(
                      schema.name,
                      `Delete collection '${schema.name}'`
                    )
                  }
                  onViewRecords={() => {
                    setSelectedCollection(schema.name);
                    setViewMode("mock_data");
                  }}
                />
              );
            })}
          </div>
        )}

        {/* VIEW 2: MOCK DATA GRID */}
        {viewMode === "mock_data" && (
          <MockDataGrid initialCollection={selectedCollection} />
        )}

        {/* VIEW 3: SQL MIGRATION DDL */}
        {viewMode === "sql_ddl" && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "var(--surface-panel-solid)",
            }}
          >
            <div
              style={{
                padding: "8px 14px",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "var(--surface-1)",
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
                Standard PostgreSQL / Prisma DDL Migration Output
              </span>

              <button
                type="button"
                onClick={handleCopySql}
                className="panel-icon-btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "0 8px",
                  height: 24,
                  fontSize: 10.5,
                }}
              >
                {copiedSql ? (
                  <>
                    <Check size={11} style={{ color: "#22c55e" }} />
                    <span style={{ color: "#22c55e" }}>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>

            <div style={{ flex: 1, padding: 16, overflow: "auto" }}>
              <pre
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: "#38bdf8",
                  margin: 0,
                }}
              >
                {generatedSql}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: Create New Collection / Table */}
      {isNewTableModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setIsNewTableModalOpen(false)}
        >
          <form
            onSubmit={handleCreateTable}
            style={{
              width: 340,
              backgroundColor: "var(--surface-panel-solid)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "0 20px 48px rgba(0, 0, 0, 0.6)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "var(--surface-1)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={13} style={{ color: "var(--accent-primary)" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                  New Relational Table
                </span>
              </div>
              <button
                type="button"
                className="panel-icon-btn"
                onClick={() => setIsNewTableModalOpen(false)}
                style={{ width: 22, height: 22 }}
              >
                <X size={12} />
              </button>
            </div>

            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    marginBottom: 3,
                    textTransform: "uppercase",
                  }}
                >
                  Table Name *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Orders, Reviews"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  required
                  autoFocus
                  style={{ height: 26, fontSize: 11 }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    marginBottom: 3,
                    textTransform: "uppercase",
                  }}
                >
                  Description (Optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Purpose of this entity"
                  value={newTableDesc}
                  onChange={(e) => setNewTableDesc(e.target.value)}
                  style={{ height: 26, fontSize: 11 }}
                />
              </div>

              <div
                style={{
                  fontSize: 10.5,
                  color: "var(--text-secondary)",
                  backgroundColor: "var(--surface-2)",
                  padding: "6px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                Auto-creates primary key <code>id (String, PK)</code>.
              </div>
            </div>

            <div
              style={{
                padding: "10px 14px",
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                backgroundColor: "var(--surface-1)",
              }}
            >
              <button
                type="button"
                onClick={() => setIsNewTableModalOpen(false)}
                style={{
                  padding: "4px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-default)",
                  backgroundColor: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="details-add-button"
                style={{ height: 26, padding: "0 12px" }}
              >
                <Plus size={12} strokeWidth={2.5} className="details-add-button__icon" />
                <span>Create Table</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 2: Add / Edit Field Drawer */}
      {editingFieldModal && (
        <FieldEditor
          collectionName={editingFieldModal.collectionName}
          existingField={editingFieldModal.field}
          onSave={handleSaveField}
          onCancel={() => setEditingFieldModal(null)}
        />
      )}
    </div>
  );
};
