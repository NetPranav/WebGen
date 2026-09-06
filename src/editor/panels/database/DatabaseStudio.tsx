"use client";

/**
 * ============================================================================
 * DATABASE STUDIO MASTER COMPONENT
 * ============================================================================
 * UI Element: Dedicated Full Database Studio Page (/database)
 * Architecture:
 * - Top Header: Navigation back to Visual Editor + Engine Title
 * - Left Explorer: 2-Section tree (Top: Collections & Fields, Bottom: FK Hierarchy)
 * - Center Stage: Engine selector, View modes (ER Canvas, Mock Grid, SQL DDL)
 * - Right Details Panel: Deep Table & Field inspector with rules, relations, constraints
 * - Bottom Status Bar: Engine connection, schema validation status
 * ============================================================================
 */

import React, { useState } from "react";
import { useProjectStore } from "@/core/store/useProjectStore";
import { StudioHeader } from "@/editor/shell/StudioHeader";
import { DatabaseLeftExplorer } from "./DatabaseLeftExplorer";
import { DatabaseCenterStage } from "./DatabaseCenterStage";
import { DatabaseDetailsPanel } from "./DatabaseDetailsPanel";
import { DatabaseStatusBar } from "./DatabaseStatusBar";
import { FieldEditor } from "./FieldEditor";
import { OutputConsole } from "@/editor/panels/console/OutputConsole";
import { CollectionSchema } from "@/core/types/database";
import {
  Database,
  ArrowLeft,
  Plus,
  Server,
  Layers,
  Sparkles,
  X,
} from "lucide-react";
import "@/editor/styles/database-studio.css";

interface DatabaseStudioProps {
  onBackToEditor?: () => void;
}

export const DatabaseStudio: React.FC<DatabaseStudioProps> = ({ onBackToEditor }) => {
  const { databaseSchemas, addDatabaseCollection } = useProjectStore();

  // Active selection state
  const [selectedTableId, setSelectedTableId] = useState<string | null>(
    Object.keys(databaseSchemas)[0] || "Products"
  );
  const [selectedFieldName, setSelectedFieldName] = useState<string | null>(null);

  // Field Editor Modal state
  const [fieldEditorTarget, setFieldEditorTarget] = useState<{
    tableName: string;
    fieldName?: string;
  } | null>(null);

  // New Table Modal state
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableDisplayName, setNewTableDisplayName] = useState("");

  // Output log drawer
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  const handleSelectTable = (tableId: string) => {
    setSelectedTableId(tableId);
    setSelectedFieldName(null);
  };

  const handleSelectField = (tableId: string, fieldName: string | null) => {
    setSelectedTableId(tableId);
    setSelectedFieldName(fieldName);
  };

  const handleCreateTable = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTableName.trim().replace(/[^a-zA-Z0-9_]/g, "");
    if (!name) return;

    const newSchema: CollectionSchema = {
      id: `col_${name.toLowerCase()}`,
      name,
      displayName: newTableDisplayName.trim() || name,
      fields: {
        id: {
          id: `f_${name.toLowerCase()}_id`,
          name: "id",
          type: "Int",
          isPrimaryKey: true,
          isNullable: false,
          isUnique: true,
        },
      },
    };

    addDatabaseCollection(newSchema);
    setSelectedTableId(name);
    setSelectedFieldName(null);
    setNewTableName("");
    setNewTableDisplayName("");
    setIsAddTableOpen(false);
  };

  const handleNavigateToEditor = () => {
    if (onBackToEditor) {
      onBackToEditor();
    } else {
      window.location.href = "/editor";
    }
  };

  return (
    <div className="db-studio-layout">
      {/* --------------------------------------------------------------------
       * 1ST BAR: STUDIO MASTER TOP MENU BAR (From Home Screen)
       * -------------------------------------------------------------------- */}
      <StudioHeader
        activePage="database"
        onOpenDatabase={() => {}}
        onOpenSettings={handleNavigateToEditor}
        onOpenPanel={handleNavigateToEditor}
        onSelectDeviceMode={() => {}}
      />

      {/* --------------------------------------------------------------------
       * 2ND BAR: DATABASE STUDIO SUB-HEADER
       * -------------------------------------------------------------------- */}
      <header className="db-studio-header">
        <div className="db-studio-header__brand">
          <button
            type="button"
            className="db-studio-header__nav-btn"
            onClick={handleNavigateToEditor}
            title="Return to IDE Visual Canvas Studio"
          >
            <ArrowLeft size={13} />
            <span>Visual Editor</span>
          </button>

          <span style={{ color: "var(--border-subtle)", margin: "0 4px" }}>|</span>

          <span className="db-studio-header__title-badge">
            <span style={{ fontSize: 16 }}>⚡</span>
            <span>Database Studio</span>
          </span>

          <span className="db-studio-header__engine-pill">
            <Database size={11} />
            <span>PostgreSQL 16 Relational Engine</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="db-explorer-header__btn"
            onClick={() => setIsAddTableOpen(true)}
            title="Add New Entity Table"
            style={{ padding: "5px 12px", fontSize: 12 }}
          >
            <Plus size={13} />
            <span>New Table</span>
          </button>
        </div>
      </header>

      {/* --------------------------------------------------------------------
       * 3-COLUMN MAIN BODY: Left Explorer | Center Stage | Right Details
       * -------------------------------------------------------------------- */}
      <main className="db-studio-body">
        {/* Left Panel: 2 Sections (Collections Tree + Hierarchy Graph) */}
        <DatabaseLeftExplorer
          selectedTableId={selectedTableId}
          selectedFieldName={selectedFieldName}
          onSelectTable={handleSelectTable}
          onSelectField={(table, field) => handleSelectField(table, field)}
          onAddTable={() => setIsAddTableOpen(true)}
        />

        {/* Center Stage: View Modes (ER Canvas, Mock Data Grid, SQL DDL) */}
        <DatabaseCenterStage
          selectedTableId={selectedTableId}
          selectedFieldName={selectedFieldName}
          onSelectTable={handleSelectTable}
          onSelectField={(table, field) => handleSelectField(table, field)}
          onOpenFieldEditor={(table, field) => setFieldEditorTarget({ tableName: table, fieldName: field })}
          onAddTable={() => setIsAddTableOpen(true)}
        />

        {/* Right Details Panel: Deep Table & Field Inspectors */}
        <DatabaseDetailsPanel
          selectedTableId={selectedTableId}
          selectedFieldName={selectedFieldName}
          onSelectField={handleSelectField}
        />
      </main>

      {/* --------------------------------------------------------------------
       * BOTTOM STATUS BAR & CONSOLE DRAWER
       * -------------------------------------------------------------------- */}
      {isConsoleOpen && (
        <div style={{ height: 220, borderTop: "1px solid var(--border-default)", background: "var(--surface-panel-solid)" }}>
          <OutputConsole />
        </div>
      )}

      <DatabaseStatusBar onToggleConsole={() => setIsConsoleOpen((c) => !c)} />

      {/* --------------------------------------------------------------------
       * MODAL: ADD NEW TABLE
       * -------------------------------------------------------------------- */}
      {isAddTableOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setIsAddTableOpen(false)}
        >
          <div
            style={{
              width: 380,
              background: "var(--surface-panel-solid)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-xl)",
              padding: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Database size={16} style={{ color: "var(--accent-warning)" }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Create Entity Table</span>
              </div>

              <button
                type="button"
                onClick={() => setIsAddTableOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTable} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="db-form-row">
                <label>Table / Model Name (CamelCase or snake_case)</label>
                <input
                  type="text"
                  className="db-input"
                  placeholder="e.g. Orders, Customers, Categories"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="db-form-row">
                <label>Display Label</label>
                <input
                  type="text"
                  className="db-input"
                  placeholder="e.g. Customer Orders"
                  value={newTableDisplayName}
                  onChange={(e) => setNewTableDisplayName(e.target.value)}
                />
              </div>

              <p style={{ fontSize: 10.5, color: "var(--text-muted)", lineHeight: 1.4, margin: 0 }}>
                A default Primary Key (<code>id : Int [PK]</code>) will be created automatically. You can add more columns and relational foreign keys afterwards.
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="db-studio-header__nav-btn"
                  onClick={() => setIsAddTableOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="db-explorer-header__btn"
                  disabled={!newTableName.trim()}
                  style={{ padding: "6px 14px", fontSize: 12 }}
                >
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Field Editor Modal for advanced editing */}
      {fieldEditorTarget && (
        <FieldEditor
          collectionName={fieldEditorTarget.tableName}
          existingField={
            fieldEditorTarget.fieldName
              ? databaseSchemas[fieldEditorTarget.tableName]?.fields[fieldEditorTarget.fieldName]
              : undefined
          }
          onSave={(updatedField) => {
            useProjectStore.getState().addFieldToCollection(fieldEditorTarget.tableName, updatedField);
            setFieldEditorTarget(null);
          }}
          onCancel={() => setFieldEditorTarget(null)}
        />
      )}
    </div>
  );
};
