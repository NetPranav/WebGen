"use client";

/**
 * ============================================================================
 * DATABASE DESIGNER: MOCK DATA GRID (PANEL 10 TAB)
 * ============================================================================
 * Spreadsheet-style table editor for viewing, creating, and modifying simulated
 * records. Cell edits immediately update the reactive store and propagate live
 * to all bound UI element properties on the canvas.
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.5 & SCHEMA_REFERENCE.md §13
 * ============================================================================
 */

import React, { useState } from "react";
import {
  Table,
  Plus,
  Trash2,
  Search,
  Check,
  X,
  Database,
  ArrowUpDown,
} from "lucide-react";
import { useProjectStore } from "@/core/store/useProjectStore";
import { DatabaseField } from "@/core/types/database";
import "@/editor/styles/panels.css";
import "@/editor/styles/forms.css";

interface MockDataGridProps {
  initialCollection?: string;
}

export const MockDataGrid: React.FC<MockDataGridProps> = ({
  initialCollection,
}) => {
  const {
    databaseSchemas,
    databaseRecords,
    addDatabaseRecord,
    updateDatabaseRecord,
    deleteDatabaseRecord,
  } = useProjectStore();

  const collectionNames = Object.keys(databaseSchemas);
  const [selectedCollection, setSelectedCollection] = useState<string>(
    initialCollection || collectionNames[0] || "Products"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCell, setEditingCell] = useState<{
    rowIdx: number;
    field: string;
    value: string;
  } | null>(null);

  const currentSchema = databaseSchemas[selectedCollection];
  const fields: DatabaseField[] = currentSchema
    ? Object.values(currentSchema.fields)
    : [];
  const records = databaseRecords[selectedCollection] || [];

  // Filter records by search query
  const filteredRecords = records.filter((r) => {
    if (!searchQuery) return true;
    return Object.values(r).some((val) =>
      String(val).toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleAddRow = () => {
    if (!currentSchema) return;

    // Construct record matching schema
    const newRecord: Record<string, unknown> = {
      id: `${selectedCollection.toLowerCase()}_${Date.now()}`,
    };

    fields.forEach((f) => {
      if (f.name === "id") return;
      if (f.defaultValue !== undefined) {
        newRecord[f.name] = f.defaultValue;
      } else if (f.type === "Int" || f.type === "Float") {
        newRecord[f.name] = 0;
      } else if (f.type === "Boolean") {
        newRecord[f.name] = false;
      } else if (f.type === "DateTime") {
        newRecord[f.name] = new Date().toISOString();
      } else if (f.type === "JSON") {
        newRecord[f.name] = {};
      } else {
        newRecord[f.name] = `New ${f.name}`;
      }
    });

    addDatabaseRecord(selectedCollection, newRecord, `Add record to ${selectedCollection}`);
  };

  const handleCommitCellEdit = () => {
    if (!editingCell) return;
    const { rowIdx, field, value } = editingCell;

    const targetFieldDef = fields.find((f) => f.name === field);
    let parsedVal: unknown = value;

    if (targetFieldDef?.type === "Int" || targetFieldDef?.type === "Float") {
      parsedVal = Number(value) || 0;
    } else if (targetFieldDef?.type === "Boolean") {
      parsedVal = value === "true" || value === "1";
    }

    updateDatabaseRecord(
      selectedCollection,
      rowIdx,
      { [field]: parsedVal },
      `Edit ${selectedCollection}.${field}`
    );

    setEditingCell(null);
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
      {/* Top Grid Toolbar */}
      <div
        style={{
          padding: "8px 12px",
          backgroundColor: "var(--surface-panel-solid)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexShrink: 0,
        }}
      >
        {/* Left: Collection Selector & Record Count */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Database size={13} style={{ color: "var(--accent-primary)" }} />
          <select
            className="form-select"
            value={selectedCollection}
            onChange={(e) => {
              setSelectedCollection(e.target.value);
              setEditingCell(null);
            }}
            style={{ height: 26, fontSize: 11, fontWeight: 600 }}
          >
            {collectionNames.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <span
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: "var(--text-tertiary)",
            }}
          >
            {records.length} record(s)
          </span>
        </div>

        {/* Right: Search Input & Add Record Button */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="panel-search-bar" style={{ maxWidth: 160 }}>
            <Search size={11} className="panel-search-bar__icon" />
            <input
              type="text"
              className="panel-search-bar__input"
              placeholder="Search rows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ height: 24, fontSize: 11 }}
            />
            {searchQuery && (
              <button
                type="button"
                className="panel-search-bar__clear"
                onClick={() => setSearchQuery("")}
              >
                <X size={10} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="details-add-button"
            onClick={handleAddRow}
            style={{ height: 24, padding: "0 10px", fontSize: 11 }}
          >
            <Plus size={12} strokeWidth={2.5} className="details-add-button__icon" />
            <span>+ Add Row</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Table View */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 11,
            textAlign: "left",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#F8FAFC",
                borderBottom: "1px solid var(--border-default, rgba(15, 23, 42, 0.08))",
                position: "sticky",
                top: 0,
                zIndex: 10,
              }}
            >
              <th style={{ padding: "8px 10px", width: 40, textAlign: "center", color: "var(--text-tertiary)", fontSize: 10 }}>
                #
              </th>
              {fields.map((f) => (
                <th
                  key={f.name}
                  style={{
                    padding: "8px 12px",
                    color: "var(--text-secondary, #475569)",
                    fontWeight: 700,
                    borderRight: "1px solid var(--border-subtle, rgba(15, 23, 42, 0.06))",
                    whiteSpace: "nowrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ color: "#0F172A" }}>{f.name}</span>
                    <span
                      style={{
                        fontSize: 8.5,
                        fontWeight: 600,
                        color: "var(--text-muted, #64748B)",
                        textTransform: "uppercase",
                      }}
                    >
                      ({f.type})
                    </span>
                  </div>
                </th>
              ))}
              <th style={{ width: 40, padding: "8px 10px", textAlign: "center", color: "var(--text-secondary)" }}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td
                  colSpan={fields.length + 2}
                  style={{
                    padding: "32px",
                    textAlign: "center",
                    color: "var(--text-tertiary)",
                    fontSize: 12,
                  }}
                >
                  No records in '{selectedCollection}'. Click <strong>+ Add Row</strong> to insert mock data.
                </td>
              </tr>
            ) : (
              filteredRecords.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  style={{
                    borderBottom: "1px solid var(--border-subtle, rgba(15, 23, 42, 0.06))",
                    backgroundColor: rowIdx % 2 === 0 ? "#FFFFFF" : "#F8FAFC",
                    transition: "background-color 0.1s ease",
                  }}
                >
                  <td
                    style={{
                      padding: "6px 8px",
                      textAlign: "center",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-tertiary)",
                      fontSize: 10,
                    }}
                  >
                    {rowIdx + 1}
                  </td>

                  {fields.map((f) => {
                    const isEditing =
                      editingCell?.rowIdx === rowIdx && editingCell?.field === f.name;
                    const cellVal = row[f.name];

                    return (
                      <td
                        key={f.name}
                        onDoubleClick={() => {
                          setEditingCell({
                            rowIdx,
                            field: f.name,
                            value: cellVal !== undefined ? String(cellVal) : "",
                          });
                        }}
                        style={{
                          padding: "4px 8px",
                          borderRight: "1px solid var(--border-subtle)",
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-primary)",
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          cursor: "cell",
                        }}
                        title="Double-click to edit cell"
                      >
                        {isEditing ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <input
                              type="text"
                              className="form-input"
                              value={editingCell.value}
                              onChange={(e) =>
                                setEditingCell({
                                  ...editingCell,
                                  value: e.target.value,
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleCommitCellEdit();
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              autoFocus
                              style={{ height: 22, fontSize: 10.5, padding: "0 4px" }}
                            />
                            <button
                              type="button"
                              onClick={handleCommitCellEdit}
                              className="panel-icon-btn"
                              style={{ width: 18, height: 18, color: "#22c55e" }}
                            >
                              <Check size={11} />
                            </button>
                          </div>
                        ) : f.type === "Boolean" ? (
                          <button
                            type="button"
                            onClick={() =>
                              updateDatabaseRecord(
                                selectedCollection,
                                rowIdx,
                                { [f.name]: !cellVal },
                                `Toggle ${f.name}`
                              )
                            }
                            style={{
                              padding: "1px 6px",
                              borderRadius: 3,
                              border: "1px solid var(--border-subtle)",
                              backgroundColor: cellVal
                                ? "rgba(34, 197, 94, 0.15)"
                                : "var(--surface-2)",
                              color: cellVal ? "#22c55e" : "var(--text-tertiary)",
                              fontSize: 9.5,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            {cellVal ? "TRUE" : "FALSE"}
                          </button>
                        ) : (
                          <span>
                            {cellVal !== undefined && cellVal !== null
                              ? typeof cellVal === "object"
                                ? JSON.stringify(cellVal)
                                : String(cellVal)
                              : <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>null</span>}
                          </span>
                        )}
                      </td>
                    );
                  })}

                  <td style={{ padding: "4px 8px", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() =>
                        deleteDatabaseRecord(
                          selectedCollection,
                          rowIdx,
                          `Delete record from ${selectedCollection}`
                        )
                      }
                      className="panel-icon-btn"
                      title="Delete record"
                      style={{ width: 20, height: 20, color: "var(--text-muted)" }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
