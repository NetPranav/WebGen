"use client";

/**
 * ============================================================================
 * DATABASE DETAILS PANEL COMPONENT
 * ============================================================================
 * UI Element: Database Studio Right Details Inspector
 * Role:
 * - Table-Level Inspector: Table identity, primary key, columns list, "+ Add Column"
 *   creator, record manager, indexes, and drop table.
 * - Field-Level Inspector: Field name, Prisma data types, primary key, nullable,
 *   unique, default values, foreign key relation rules (cardinality, cascade),
 *   validation checks, and indexing.
 * ============================================================================
 */

import React, { useState } from "react";
import { useProjectStore } from "@/core/store/useProjectStore";
import { DatabaseField, DatabaseFieldType, DeleteRule, Cardinality } from "@/core/types/database";
import {
  Sliders,
  Table,
  Key,
  Shield,
  Link,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  AlertTriangle,
  FileCode,
  Layers,
  Database,
  Workflow,
  ExternalLink,
  Zap,
  ZapOff,
  Check,
} from "lucide-react";
import { DatabaseLatchPickerModal, LatchCandidate } from "./DatabaseLatchPickerModal";
import { DatabaseFunctionLatch } from "@/core/store/useProjectStore";
import { PropertyBlueprintBindingControl } from "../common/PropertyBlueprintBindingControl";

export type FunctionLatch = DatabaseFunctionLatch;

interface DatabaseDetailsPanelProps {
  selectedTableId: string | null;
  selectedFieldName: string | null;
  onSelectField: (tableId: string, fieldName: string | null) => void;
  onTableRenamed?: (oldName: string, newName: string) => void;
}

export const DatabaseDetailsPanel: React.FC<DatabaseDetailsPanelProps> = ({
  selectedTableId,
  selectedFieldName,
  onSelectField,
}) => {
  const {
    databaseSchemas,
    databaseRecords,
    databaseLatches,
    addDatabaseLatch,
    removeDatabaseLatch,
    addFieldToCollection,
    deleteFieldFromCollection,
    deleteDatabaseCollection,
    addDatabaseRecord,
  } = useProjectStore();

  // Unreal-style Latch Picker Modal state
  const [isLatchPickerOpen, setIsLatchPickerOpen] = useState(false);
  const [latchTargetField, setLatchTargetField] = useState<string | null>(null);

  const handleSelectLatchCandidate = (candidate: LatchCandidate) => {
    if (!selectedTableId) return;
    const targetKey = latchTargetField ? `${selectedTableId}.${latchTargetField}` : selectedTableId;
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

  // Local state for inline Add Column form
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<DatabaseFieldType>("String");
  const [newFieldNullable, setNewFieldNullable] = useState(false);
  const [newFieldUnique, setNewFieldUnique] = useState(false);
  const [newFieldPK, setNewFieldPK] = useState(false);

  // If no table selected, show empty state
  if (!selectedTableId || !databaseSchemas[selectedTableId]) {
    return (
      <div className="db-right-details">
        <div className="db-details-header">
          <span className="db-details-header__title">
            <Sliders size={13} style={{ color: "var(--accent-primary)" }} />
            <span>Database Inspector</span>
          </span>
        </div>
        <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 11.5 }}>
          <Database size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
          <p>Select a table or field from the explorer or canvas to view and edit its properties.</p>
        </div>
      </div>
    );
  }

  const currentSchema = databaseSchemas[selectedTableId];
  const fields = Object.values(currentSchema.fields);
  const records = databaseRecords[selectedTableId] || [];

  // Handle adding a new column to the current table
  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFieldName.trim().replace(/[^a-zA-Z0-9_]/g, "");
    if (!name) return;

    const newField: DatabaseField = {
      id: `fld_${name.toLowerCase()}`,
      name,
      type: newFieldType,
      isPrimaryKey: newFieldPK,
      isNullable: newFieldNullable,
      isUnique: newFieldUnique,
    };

    addFieldToCollection(selectedTableId, newField);
    setNewFieldName("");
    setNewFieldPK(false);
    setNewFieldNullable(false);
    setNewFieldUnique(false);
    onSelectField(selectedTableId, name);
  };

  // --------------------------------------------------------------------------
  // RENDER 1: SPECIFIC FIELD INSPECTOR (When a field is selected)
  // --------------------------------------------------------------------------
  if (selectedFieldName && currentSchema.fields[selectedFieldName]) {
    const field = currentSchema.fields[selectedFieldName];

    return (
      <div className="db-right-details">
        {/* Field Details Header */}
        <div className="db-details-header">
          <button
            type="button"
            onClick={() => onSelectField(selectedTableId, null)}
            className="db-studio-header__nav-btn"
            style={{ padding: "2px 6px", fontSize: 10 }}
            title="Back to Table Inspector"
          >
            <ArrowLeft size={11} />
            <span>Table</span>
          </button>

          <span className="db-details-header__title" style={{ fontSize: 12 }}>
            {field.isPrimaryKey ? <Key size={11} style={{ color: "#eab308" }} /> : <FileCode size={11} />}
            <span>{field.name}</span>
          </span>

          <span
            style={{
              fontSize: 9.5,
              fontFamily: "var(--font-mono)",
              background: "rgba(32, 104, 89, 0.15)",
              color: "#206859",
              padding: "1px 6px",
              borderRadius: 3,
            }}
          >
            {field.type}
          </span>
        </div>

        {/* Field Property Sections */}
        <div className="db-details-scroll">
          {/* Section 1: Field Identity & Data Type */}
          <div className="db-section">
            <span className="db-section-title">Field Identity & Type</span>

            <div className="db-form-row">
              <label>Column Name</label>
              <input
                type="text"
                className="db-input"
                value={field.name}
                readOnly
                title="Column identifier in database"
              />
            </div>

            <div className="db-form-row">
              <label>Data Type (Prisma Aligned)</label>
              <select
                className="db-select"
                value={field.type}
                onChange={(e) => {
                  const updated: DatabaseField = {
                    ...field,
                    type: e.target.value as DatabaseFieldType,
                  };
                  addFieldToCollection(selectedTableId, updated);
                }}
              >
                <option value="String">String (Text, Varchar)</option>
                <option value="Int">Int (Integer 32/64-bit)</option>
                <option value="Float">Float (Double Precision, Decimal)</option>
                <option value="Boolean">Boolean (True / False)</option>
                <option value="DateTime">DateTime (Timestamp ISO)</option>
                <option value="JSON">JSON (Structured Document)</option>
                <option value="Enum">Enum (Categorical Options)</option>
                <option value="Relation">Relation (Foreign Key Reference)</option>
              </select>
            </div>
          </div>

          {/* Section 2: Constraints & Flags */}
          <div className="db-section">
            <span className="db-section-title">Constraints & Flags</span>

            <div className="db-toggle-row">
              <span>Primary Key (Unique Record ID)</span>
              <input
                type="checkbox"
                checked={!!field.isPrimaryKey}
                onChange={(e) => {
                  const updated: DatabaseField = {
                    ...field,
                    isPrimaryKey: e.target.checked,
                    isNullable: e.target.checked ? false : field.isNullable,
                  };
                  addFieldToCollection(selectedTableId, updated);
                }}
              />
            </div>

            <div className="db-toggle-row">
              <span>Nullable (Allow Null / Empty)</span>
              <input
                type="checkbox"
                checked={!!field.isNullable}
                disabled={field.isPrimaryKey}
                onChange={(e) => {
                  const updated: DatabaseField = {
                    ...field,
                    isNullable: e.target.checked,
                  };
                  addFieldToCollection(selectedTableId, updated);
                }}
              />
            </div>

            <div className="db-toggle-row">
              <span>Unique Constraint</span>
              <input
                type="checkbox"
                checked={!!field.isUnique || !!field.isPrimaryKey}
                disabled={field.isPrimaryKey}
                onChange={(e) => {
                  const updated: DatabaseField = {
                    ...field,
                    isUnique: e.target.checked,
                  };
                  addFieldToCollection(selectedTableId, updated);
                }}
              />
            </div>

            <div style={{ marginTop: 8 }}>
              <PropertyBlueprintBindingControl
                label="Default Value Expression"
                value={field.defaultValue !== undefined ? String(field.defaultValue) : ""}
                placeholder={field.isPrimaryKey ? "autoincrement()" : "e.g. 0, 'draft', NOW()"}
                targetProperty={`defaultValue:${field.name}`}
                collectionName={currentSchema.name}
                formulaPresets={[
                  { label: "autoincrement()", expression: "autoincrement()", description: "Auto-incrementing integer key sequence" },
                  { label: "NOW()", expression: "NOW()", description: "Current timestamp ISO at row insertion" },
                  { label: "UUIDv4()", expression: "UUIDv4()", description: "RFC4122 standard random v4 UUID string" },
                  { label: "Conditional Order Status", expression: "orders.length > 0 ? 'Order Again' : 'Order Now'", description: "Dynamic order toggle formula" },
                  { label: "Active User Session", expression: "currentUser ? currentUser.id : null", description: "Current authenticated session ID" },
                ]}
                onChange={(newVal) => {
                  const updated: DatabaseField = {
                    ...field,
                    defaultValue: newVal,
                  };
                  addFieldToCollection(selectedTableId, updated);
                }}
                onBindBlueprint={(funcName, sourceFile) => {
                  const targetKey = `${selectedTableId}.${field.name}`;
                  addDatabaseLatch(
                    {
                      id: `latch_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                      targetKey,
                      functionName: funcName,
                      category: "blueprint",
                      sourceFile,
                      operation: "READ",
                      description: `Bound to default value expression of ${field.name}`,
                    },
                    `Bound ${funcName} to ${targetKey}`
                  );
                  const updated: DatabaseField = {
                    ...field,
                    defaultValue: `[BP:${funcName}()]`,
                  };
                  addFieldToCollection(selectedTableId, updated);
                }}
                onUnbind={() => {
                  const updated: DatabaseField = {
                    ...field,
                    defaultValue: "",
                  };
                  addFieldToCollection(selectedTableId, updated);
                }}
              />
            </div>
          </div>

          {/* Section 3: Foreign Key & Relational Rules */}
          <div className="db-section">
            <span className="db-section-title">Foreign Key & Relational Graph</span>

            <div className="db-form-row">
              <label>Target Collection / Referenced Table</label>
              <select
                className="db-select"
                value={field.relation?.targetCollection || ""}
                onChange={(e) => {
                  const targetCollection = e.target.value;
                  if (!targetCollection) {
                    const { relation, ...rest } = field;
                    addFieldToCollection(selectedTableId, rest);
                  } else {
                    const updated: DatabaseField = {
                      ...field,
                      relation: {
                        targetCollection,
                        foreignKey: field.name,
                        referencesField: "id",
                        cardinality: field.relation?.cardinality || "1:N",
                        onDelete: field.relation?.onDelete || "CASCADE",
                      },
                    };
                    addFieldToCollection(selectedTableId, updated);
                  }
                }}
              >
                <option value="">-- None (Standalone Scalar) --</option>
                {Object.keys(databaseSchemas)
                  .filter((tbl) => tbl !== selectedTableId)
                  .map((tbl) => (
                    <option key={tbl} value={tbl}>
                      {tbl}
                    </option>
                  ))}
              </select>
            </div>

            {field.relation && (
              <>
                <div className="db-form-row">
                  <label>Cardinality</label>
                  <select
                    className="db-select"
                    value={field.relation.cardinality}
                    onChange={(e) => {
                      const updated: DatabaseField = {
                        ...field,
                        relation: {
                          ...field.relation!,
                          cardinality: e.target.value as Cardinality,
                        },
                      };
                      addFieldToCollection(selectedTableId, updated);
                    }}
                  >
                    <option value="1:1">1:1 (One-to-One)</option>
                    <option value="1:N">1:N (One-to-Many)</option>
                    <option value="N:M">N:M (Many-to-Many Junction)</option>
                  </select>
                </div>

                <div className="db-form-row">
                  <label>On Delete Referential Action</label>
                  <select
                    className="db-select"
                    value={field.relation.onDelete}
                    onChange={(e) => {
                      const updated: DatabaseField = {
                        ...field,
                        relation: {
                          ...field.relation!,
                          onDelete: e.target.value as DeleteRule,
                        },
                      };
                      addFieldToCollection(selectedTableId, updated);
                    }}
                  >
                    <option value="CASCADE">CASCADE (Delete child records automatically)</option>
                    <option value="SET_NULL">SET NULL (Set foreign key to NULL)</option>
                    <option value="RESTRICT">RESTRICT (Prevent deletion if children exist)</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Section 4: Validation & Check Constraints */}
          <div className="db-section">
            <span className="db-section-title">Validation & Check Rules</span>

            {field.type === "Int" || field.type === "Float" ? (
              <div className="db-grid-responsive">
                <div className="db-form-row">
                  <label>Min Value</label>
                  <input type="number" className="db-input" placeholder="0" />
                </div>
                <div className="db-form-row">
                  <label>Max Value</label>
                  <input type="number" className="db-input" placeholder="10000" />
                </div>
              </div>
            ) : (
              <div className="db-form-row">
                <label>Regex Pattern Check</label>
                <input
                  type="text"
                  className="db-input"
                  placeholder="e.g. ^[a-z0-9_-]{3,16}$"
                />
              </div>
            )}
          </div>

          {/* Section 5: Connected Functions & Logic Blueprint Mutations */}
          {/* Section 5: Connected Functions & Mutations (Logic Blueprint Latches) */}
          {(() => {
            const fieldTargetKey = `${selectedTableId}.${field.name}`;
            const fieldLatches = databaseLatches[fieldTargetKey] || [];
            const readCount = fieldLatches.filter((l) => l.operation === "READ").length;
            const createCount = fieldLatches.filter((l) => l.operation === "CREATE").length;
            const updateCount = fieldLatches.filter((l) => l.operation === "UPDATE").length;
            const deleteCount = fieldLatches.filter((l) => l.operation === "DELETE").length;

            return (
              <div className="db-section">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span className="db-section-title" style={{ marginBottom: 0 }}>
                    Connected Functions & Mutations
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600,
                      padding: "1px 6px",
                      borderRadius: "var(--radius-full, 9999px)",
                      backgroundColor: fieldLatches.length > 0 ? "#EBF5F3" : "#F1F5F9",
                      color: fieldLatches.length > 0 ? "#206859" : "#64748B",
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                    }}
                  >
                    {fieldLatches.length} Active Callers
                  </span>
                </div>

                {/* If no functions connected, show clean explicit status */}
                {fieldLatches.length === 0 ? (
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: "var(--radius-sm, 6px)",
                      backgroundColor: "#F8FAFC",
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#94A3B8" }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#0F172A" }}>
                        No active function or mutation connections
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 10.5, color: "#64748B", lineHeight: 1.45 }}>
                      This field (<strong>{selectedTableId}.{field.name}</strong>) is not currently referenced, mutated, or bound by any Logic Blueprint node, API route, or component state in this website.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {fieldLatches.map((latch) => (
                      <div
                        key={latch.id}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 6,
                          backgroundColor: "#F8FAFC",
                          border: "1px solid rgba(15, 23, 42, 0.08)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Workflow size={12} style={{ color: "#206859" }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#0F172A" }}>
                              {latch.functionName}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: 8.5,
                              fontWeight: 700,
                              padding: "1px 5px",
                              borderRadius: 3,
                              backgroundColor:
                                latch.operation === "READ"
                                  ? "#EBF5F3"
                                  : latch.operation === "CREATE"
                                  ? "#F0FDF4"
                                  : latch.operation === "DELETE"
                                  ? "#FEE2E2"
                                  : "#FEF3C7",
                              color:
                                latch.operation === "READ"
                                  ? "#206859"
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

                        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          {latch.sourceFile}
                        </span>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                          <button
                            type="button"
                            onClick={() => alert(`Navigating to Logic Blueprint function: ${latch.functionName} in ${latch.sourceFile}`)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#206859",
                              fontSize: 10.5,
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: 0,
                            }}
                          >
                            <span>Visit Function</span>
                            <ExternalLink size={10} />
                          </button>

                          <button
                            type="button"
                            onClick={() => removeDatabaseLatch(fieldTargetKey, latch.id, `Unlatch ${latch.functionName}`)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#EF4444",
                              fontSize: 10,
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mutation Operation Matrix */}
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Operation Permitted Matrix
                  </span>
                  <div className="db-grid-responsive" style={{ gap: 4 }}>
                    <div style={{ flex: "1 1 110px", minWidth: 0, padding: "4px 8px", background: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.06)", borderRadius: 4, fontSize: 10 }}>
                      <span style={{ color: "#206859", fontWeight: 600 }}>READ:</span> <span style={{ color: "#64748B" }}>{readCount} Callers</span>
                    </div>
                    <div style={{ flex: "1 1 110px", minWidth: 0, padding: "4px 8px", background: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.06)", borderRadius: 4, fontSize: 10 }}>
                      <span style={{ color: "#10B981", fontWeight: 600 }}>CREATE:</span> <span style={{ color: "#64748B" }}>{createCount} Callers</span>
                    </div>
                    <div style={{ flex: "1 1 110px", minWidth: 0, padding: "4px 8px", background: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.06)", borderRadius: 4, fontSize: 10 }}>
                      <span style={{ color: "#F59E0B", fontWeight: 600 }}>UPDATE:</span> <span style={{ color: "#64748B" }}>{updateCount} Callers</span>
                    </div>
                    <div style={{ flex: "1 1 110px", minWidth: 0, padding: "4px 8px", background: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.06)", borderRadius: 4, fontSize: 10 }}>
                      <span style={{ color: "#EF4444", fontWeight: 600 }}>DELETE:</span> <span style={{ color: "#64748B" }}>{deleteCount} Callers</span>
                    </div>
                  </div>
                </div>

                {/* Latch Action Button */}
                <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="db-explorer-header__btn"
                    onClick={() => {
                      setLatchTargetField(field.name);
                      setIsLatchPickerOpen(true);
                    }}
                    style={{ flex: 1, justifyContent: "center", padding: "5px 8px", fontSize: 11 }}
                  >
                    <Workflow size={12} />
                    <span>+ Latch to Logic Blueprint</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Section 6: Delete Field */}
          <div className="db-section" style={{ marginTop: "auto" }}>
            <button
              type="button"
              onClick={() => {
                deleteFieldFromCollection(selectedTableId, field.name);
                onSelectField(selectedTableId, null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                background: "rgba(239, 68, 68, 0.1)",
                color: "#f87171",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Trash2 size={12} />
              <span>Delete Column ({field.name})</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER 2: OVERALL TABLE INSPECTOR (When entire table is selected)
  // --------------------------------------------------------------------------
  return (
    <div className="db-right-details">
      {/* Table Details Header */}
      <div className="db-details-header">
        <span className="db-details-header__title">
          <Table size={13} style={{ color: "#206859" }} />
          <span>{currentSchema.name}</span>
        </span>

        <span
          style={{
            fontSize: 10,
            background: "rgba(32, 104, 89, 0.15)",
            color: "#206859",
            padding: "2px 6px",
            borderRadius: 3,
            fontWeight: 600,
          }}
        >
          {fields.length} Columns
        </span>
      </div>

      <div className="db-details-scroll">
        {/* Section 1: Table Identity */}
        <div className="db-section">
          <span className="db-section-title">Table Identity</span>

          <div className="db-form-row">
            <label>Table / Collection Name</label>
            <input
              type="text"
              className="db-input"
              value={currentSchema.name}
              readOnly
              title="Database table name"
            />
          </div>

          <div className="db-form-row">
            <label>Display Label</label>
            <input
              type="text"
              className="db-input"
              value={currentSchema.displayName || currentSchema.name}
              readOnly
            />
          </div>
        </div>

        {/* Section 2: Columns in Table */}
        <div className="db-section">
          <span className="db-section-title">Columns ({fields.length})</span>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {fields.map((f) => (
              <div
                key={f.id || f.name}
                onClick={() => onSelectField(selectedTableId, f.name)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm, 6px)",
                  background: "#F8FAFC",
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {f.isPrimaryKey ? (
                    <Key size={11} style={{ color: "#eab308" }} />
                  ) : f.relation ? (
                    <Link size={11} style={{ color: "#ec4899" }} />
                  ) : (
                    <FileCode size={11} style={{ color: "var(--text-muted)" }} />
                  )}
                  <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--text-primary)" }}>
                    {f.name}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                    {f.type}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFieldFromCollection(selectedTableId, f.name);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      display: "flex",
                    }}
                    title="Delete column"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Add New Column Form */}
        <div className="db-section">
          <span className="db-section-title">Add Column to {currentSchema.name}</span>

          <form onSubmit={handleAddColumn} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="db-form-row">
              <label>Column Name</label>
              <input
                type="text"
                className="db-input"
                placeholder="e.g. status, createdAt, quantity"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
              />
            </div>

            <div className="db-form-row">
              <label>Data Type</label>
              <select
                className="db-select"
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as DatabaseFieldType)}
              >
                <option value="String">String</option>
                <option value="Int">Int</option>
                <option value="Float">Float</option>
                <option value="Boolean">Boolean</option>
                <option value="DateTime">DateTime</option>
                <option value="JSON">JSON</option>
                <option value="Enum">Enum</option>
                <option value="Relation">Relation</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 2 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={newFieldNullable}
                  onChange={(e) => setNewFieldNullable(e.target.checked)}
                />
                <span>Nullable</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={newFieldUnique}
                  onChange={(e) => setNewFieldUnique(e.target.checked)}
                />
                <span>Unique</span>
              </label>
            </div>

            <button
              type="submit"
              className="db-explorer-header__btn"
              style={{
                justifyContent: "center",
                padding: "6px",
                marginTop: 4,
              }}
            >
              <Plus size={12} />
              <span>Add Column</span>
            </button>
          </form>
        </div>

        {/* Section 4: Data Rows & Mock Records */}
        <div className="db-section">
          <span className="db-section-title">Seed Records ({records.length})</span>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              {records.length} mock rows loaded
            </span>

            <button
              type="button"
              className="db-studio-header__nav-btn"
              onClick={() => {
                const defaultRow: Record<string, unknown> = {
                  id: records.length + 1,
                };
                fields.forEach((f) => {
                  if (f.name !== "id") {
                    defaultRow[f.name] = f.defaultValue !== undefined ? f.defaultValue : f.type === "Boolean" ? false : "";
                  }
                });
                addDatabaseRecord(selectedTableId, defaultRow);
              }}
              style={{ padding: "3px 8px" }}
            >
              <Plus size={11} />
              <span>Add Row</span>
            </button>
          </div>
        </div>

        {/* Section 5: Connected Functions & Logic Blueprint Mutations for Table */}
        {(() => {
          const tableLatches = databaseLatches[selectedTableId] || [];

          return (
            <div className="db-section">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span className="db-section-title" style={{ marginBottom: 0 }}>
                  Connected Functions & Mutations
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 600,
                    padding: "1px 6px",
                    borderRadius: "var(--radius-full, 9999px)",
                    backgroundColor: tableLatches.length > 0 ? "#EBF5F3" : "#F1F5F9",
                    color: tableLatches.length > 0 ? "#206859" : "#64748B",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                  }}
                >
                  {tableLatches.length} Active Callers
                </span>
              </div>

              {tableLatches.length === 0 ? (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm, 6px)",
                    backgroundColor: "#F8FAFC",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#94A3B8" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#0F172A" }}>
                      No active function or mutation connections
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 10.5, color: "#64748B", lineHeight: 1.45 }}>
                    This table (<strong>{currentSchema.name}</strong>) is not currently referenced, mutated, or queried by any Logic Blueprint node, API route, or component state in this website.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {tableLatches.map((latch) => (
                    <div
                      key={latch.id}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 6,
                        backgroundColor: "#F8FAFC",
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Workflow size={12} style={{ color: "#206859" }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#0F172A" }}>
                            {latch.functionName}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 8.5,
                            fontWeight: 700,
                            padding: "1px 5px",
                            borderRadius: 3,
                            backgroundColor:
                              latch.operation === "READ"
                                ? "#EBF5F3"
                                : latch.operation === "CREATE"
                                ? "#F0FDF4"
                                : latch.operation === "DELETE"
                                ? "#FEE2E2"
                                : "#FEF3C7",
                            color:
                              latch.operation === "READ"
                                ? "#206859"
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

                      <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        {latch.sourceFile}
                      </span>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => alert(`Navigating to Logic Blueprint function: ${latch.functionName} in ${latch.sourceFile}`)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#206859",
                            fontSize: 10.5,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: 0,
                          }}
                        >
                          <span>Visit Function</span>
                          <ExternalLink size={10} />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeDatabaseLatch(selectedTableId, latch.id, `Unlatch ${latch.functionName}`)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#EF4444",
                            fontSize: 10,
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="db-explorer-header__btn"
                  onClick={() => {
                    setLatchTargetField(null);
                    setIsLatchPickerOpen(true);
                  }}
                  style={{ flex: 1, justifyContent: "center", padding: "5px 8px", fontSize: 11 }}
                >
                  <Workflow size={12} />
                  <span>+ Latch to Logic Blueprint</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* Section 6: Table Danger Zone */}
        <div className="db-section" style={{ marginTop: "auto" }}>
          <button
            type="button"
            onClick={() => {
              deleteDatabaseCollection(selectedTableId);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#f87171",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Trash2 size={12} />
            <span>Drop Table ({currentSchema.name})</span>
          </button>
        </div>
      </div>

      {/* Unreal-Style Latch Picker Modal */}
      {selectedTableId && (
        <DatabaseLatchPickerModal
          isOpen={isLatchPickerOpen}
          targetCollection={selectedTableId}
          targetField={latchTargetField}
          existingLatches={
            databaseLatches[
              latchTargetField ? `${selectedTableId}.${latchTargetField}` : selectedTableId
            ] || []
          }
          onSelectLatch={handleSelectLatchCandidate}
          onClose={() => setIsLatchPickerOpen(false)}
        />
      )}
    </div>
  );
};
