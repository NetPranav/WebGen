"use client";

/**
 * ============================================================================
 * DATABASE DESIGNER: FIELD EDITOR MODAL / DRAWER
 * ============================================================================
 * Schema field creator/editor supporting primitive types, relational foreign
 * keys (1:1, 1:N, N:M), constraints, and live schema validation.
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.5 & SCHEMA_REFERENCE.md §13
 * ============================================================================
 */

import React, { useState } from "react";
import { X, Check, Key, Shield, Sparkles } from "lucide-react";
import {
  DatabaseField,
  DatabaseFieldType,
  Cardinality,
  DeleteRule,
} from "@/core/types/database";
import { useProjectStore } from "@/core/store/useProjectStore";
import "@/editor/styles/forms.css";

interface FieldEditorProps {
  collectionName: string;
  existingField?: DatabaseField;
  onSave: (field: DatabaseField) => void;
  onCancel: () => void;
}

export const FieldEditor: React.FC<FieldEditorProps> = ({
  collectionName,
  existingField,
  onSave,
  onCancel,
}) => {
  const { databaseSchemas } = useProjectStore();

  const [name, setName] = useState(existingField?.name || "");
  const [type, setType] = useState<DatabaseFieldType>(existingField?.type || "String");
  const [isPrimaryKey, setIsPrimaryKey] = useState(existingField?.isPrimaryKey || false);
  const [isUnique, setIsUnique] = useState(existingField?.isUnique || false);
  const [isNullable, setIsNullable] = useState(existingField?.isNullable || false);
  const [defaultValue, setDefaultValue] = useState(
    existingField?.defaultValue !== undefined ? String(existingField.defaultValue) : ""
  );
  const [description, setDescription] = useState(existingField?.description || "");

  // Relation states
  const otherCollections = Object.keys(databaseSchemas).filter((c) => c !== collectionName);
  const [targetCollection, setTargetCollection] = useState(
    existingField?.relation?.targetCollection || otherCollections[0] || ""
  );
  const [cardinality, setCardinality] = useState<Cardinality>(
    existingField?.relation?.cardinality || "1:N"
  );
  const [onDelete, setOnDelete] = useState<DeleteRule>(
    existingField?.relation?.onDelete || "CASCADE"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const field: DatabaseField = {
      id: existingField?.id || `f_${name.trim().toLowerCase()}_${Date.now()}`,
      name: name.trim(),
      type,
      isPrimaryKey,
      isUnique,
      isNullable,
      defaultValue: defaultValue ? defaultValue : undefined,
      description: description.trim() || undefined,
      relation:
        type === "Relation" && targetCollection
          ? {
              targetCollection,
              foreignKey: `${targetCollection.toLowerCase()}Id`,
              referencesField: "id",
              cardinality,
              onDelete,
            }
          : undefined,
    };

    onSave(field);
  };

  return (
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
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 380,
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
        {/* Header */}
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
              {existingField ? `Edit Field: ${existingField.name}` : `Add Field to ${collectionName}`}
            </span>
          </div>
          <button
            type="button"
            className="panel-icon-btn"
            onClick={onCancel}
            style={{ width: 22, height: 22 }}
          >
            <X size={12} />
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Row: Field Name & Type */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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
                Field Name *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. title, price"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                Field Type
              </label>
              <select
                className="form-select"
                value={type}
                onChange={(e) => setType(e.target.value as DatabaseFieldType)}
                style={{ height: 26, fontSize: 11, width: "100%" }}
              >
                <option value="String">String (Text)</option>
                <option value="Int">Int (Integer)</option>
                <option value="Float">Float (Decimal)</option>
                <option value="Boolean">Boolean (Flag)</option>
                <option value="DateTime">DateTime (Timestamp)</option>
                <option value="JSON">JSON (Document)</option>
                <option value="Enum">Enum (Options)</option>
                <option value="Relation">Relation (Foreign Key)</option>
              </select>
            </div>
          </div>

          {/* Relation Details (if type === "Relation") */}
          {type === "Relation" && (
            <div
              style={{
                padding: "8px 10px",
                backgroundColor: "var(--surface-2)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 9.5,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      marginBottom: 2,
                    }}
                  >
                    Target Collection
                  </label>
                  <select
                    className="form-select"
                    value={targetCollection}
                    onChange={(e) => setTargetCollection(e.target.value)}
                    style={{ height: 24, fontSize: 10.5, width: "100%" }}
                  >
                    {otherCollections.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 9.5,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      marginBottom: 2,
                    }}
                  >
                    Cardinality
                  </label>
                  <select
                    className="form-select"
                    value={cardinality}
                    onChange={(e) => setCardinality(e.target.value as Cardinality)}
                    style={{ height: 24, fontSize: 10.5, width: "100%" }}
                  >
                    <option value="1:1">1:1 (One-to-One)</option>
                    <option value="1:N">1:N (One-to-Many)</option>
                    <option value="N:M">N:M (Many-to-Many)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Constraint Checkboxes */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "4px 0" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={isPrimaryKey}
                onChange={(e) => setIsPrimaryKey(e.target.checked)}
              />
              <Key size={11} style={{ color: "#eab308" }} />
              <span>Primary Key</span>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={isUnique}
                onChange={(e) => setIsUnique(e.target.checked)}
              />
              <Shield size={11} style={{ color: "var(--accent-primary)" }} />
              <span>Unique</span>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={isNullable}
                onChange={(e) => setIsNullable(e.target.checked)}
              />
              <span>Nullable</span>
            </label>
          </div>

          {/* Default Value & Description */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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
                Default Value
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Optional fallback"
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
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
                Description
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Field documentation"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ height: 26, fontSize: 11 }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
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
            onClick={onCancel}
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
            <Check size={12} strokeWidth={2.5} className="details-add-button__icon" />
            <span>Save Field</span>
          </button>
        </div>
      </form>
    </div>
  );
};
