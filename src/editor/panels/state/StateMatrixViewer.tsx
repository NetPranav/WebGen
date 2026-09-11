"use client";

/**
 * ============================================================================
 * STATE MATRIX VIEWER & VARIABLE MANAGER (PANEL 13)
 * ============================================================================
 * Responsive UI Panel for viewing, creating, and editing reactive state variables
 * across Global, Page, and Component scopes with real-time reactive binding propagation.
 * Fully fluid down to 180px panel width without clipping or overflowing.
 * Styling Source: `@/editor/styles/panels.css` & `@/editor/styles/forms.css`
 * Matches: PANELS.md (Panel 13) & UI.md §4.7
 * ============================================================================
 */

import React, { useState, useMemo } from "react";
import {
  Variable,
  Plus,
  Search,
  Trash2,
  Globe,
  FileText,
  Layers,
  AlertTriangle,
  X,
  Sparkles,
} from "lucide-react";
import {
  useProjectStore,
  StateVariable,
  StateVariableScope,
  StateVariableType,
} from "@/core/store/useProjectStore";
import { StateVariableValidator } from "@/core/engine/StateVariableValidator";
import "@/editor/styles/panels.css";
import "@/editor/styles/forms.css";

export const StateMatrixViewer: React.FC = () => {
  const {
    stateVariables,
    addStateVariable,
    updateStateVariable,
    deleteStateVariable,
  } = useProjectStore();

  const [activeScope, setActiveScope] = useState<"all" | StateVariableScope>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // New variable form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<StateVariableType>("string");
  const [newScope, setNewScope] = useState<StateVariableScope>("global");
  const [newValue, setNewValue] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const variablesList = Object.values(stateVariables);

  // Live real-time validation preview while typing in the creation modal
  const validationPreview = useMemo(() => {
    return StateVariableValidator.checkPreview(newType, newValue);
  }, [newType, newValue]);

  const filteredVariables = variablesList.filter((v) => {
    const matchesScope = activeScope === "all" || v.scope === activeScope;
    const matchesSearch =
      !searchQuery ||
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesScope && matchesSearch;
  });

  const handleCreateVariable = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    // Validate and dispatch diagnostic warning to DiagnosticBus / Output Log if mismatched
    const validated = StateVariableValidator.validateAndEmit(
      trimmedName,
      newType,
      newValue,
      newScope
    );

    const newVar: StateVariable = {
      id: trimmedName,
      name: trimmedName,
      type: newType,
      value: validated.parsedValue,
      defaultValue: validated.parsedValue,
      scope: newScope,
      description: newDesc.trim() || undefined,
    };

    addStateVariable(newVar, `Create state variable '${newVar.name}'`);

    // Reset form
    setNewName("");
    setNewValue("");
    setNewDesc("");
    setIsAdding(false);
  };

  const getScopeIcon = (scope: StateVariableScope) => {
    switch (scope) {
      case "global":
        return <Globe size={11} style={{ color: "#38bdf8", flexShrink: 0 }} />;
      case "page":
        return <FileText size={11} style={{ color: "#c084fc", flexShrink: 0 }} />;
      case "component":
        return <Layers size={11} style={{ color: "#fbbf24", flexShrink: 0 }} />;
    }
  };

  const getValuePlaceholder = (type: StateVariableType) => {
    switch (type) {
      case "number":
        return "e.g. 0, 49.99, -1";
      case "boolean":
        return "true or false";
      case "json":
        return '{"theme": "dark", "level": 1}';
      case "array":
        return '["item1", "item2"]';
      case "color":
        return "#206859 or rgb(...)";
      case "string":
      default:
        return "Initial text value...";
    }
  };

  return (
    <div className="state-matrix-shell" role="region" aria-label="State Matrix Viewer">
      {/* Row 1: Responsive Top Header with Title, Count, Search Toggle & Always-Visible +Add Button */}
      <div className="state-matrix-header">
        <div className="state-matrix-title">
          <Variable size={13} style={{ color: "var(--accent-primary)", flexShrink: 0 }} />
          <span className="state-matrix-title__text">State Matrix</span>
          <span className="state-matrix-count">{variablesList.length}</span>
        </div>

        <div className="state-matrix-actions">
          <button
            type="button"
            className={`panel-icon-btn ${showSearch || searchQuery ? "panel-icon-btn--active" : ""}`}
            onClick={() => setShowSearch(!showSearch)}
            title="Search variables"
            style={{ width: 22, height: 22 }}
          >
            <Search size={11} />
          </button>

          {/* Signature UE5 Action Button - ALWAYS visible on the right */}
          <button
            type="button"
            className="details-add-button"
            onClick={() => setIsAdding(!isAdding)}
            title="Create New State Variable"
            id="state-matrix-add-btn"
            style={{
              height: 22,
              padding: "0 8px",
              gap: 4,
              fontSize: 10.5,
              fontWeight: 600,
            }}
          >
            <Plus size={12} strokeWidth={2.5} className="details-add-button__icon" />
            <span>+ Add</span>
          </button>
        </div>
      </div>

      {/* Expandable Full-Width Search Row */}
      {(showSearch || searchQuery) && (
        <div className="state-matrix-search-row">
          <div className="panel-search-bar" style={{ width: "100%", maxWidth: "100%" }}>
            <Search size={11} className="panel-search-bar__icon" />
            <input
              type="text"
              className="panel-search-bar__input"
              placeholder="Search variables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              style={{ height: 22, fontSize: 11 }}
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
        </div>
      )}

      {/* Row 2: Full-Width 4-Column Segmented Scope Tabs */}
      <div className="state-matrix-tabs">
        {[
          { id: "all", label: `All (${variablesList.length})` },
          { id: "global", label: "Global" },
          { id: "page", label: "Page" },
          { id: "component", label: "Comp" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`state-matrix-tab ${activeScope === tab.id ? "state-matrix-tab--active" : ""}`}
            onClick={() => setActiveScope(tab.id as "all" | StateVariableScope)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 100% Fluid Inline Variable Creation Form (Never clipped or squished) */}
      {isAdding && (
        <form onSubmit={handleCreateVariable} className="state-matrix-form">
          {/* Card Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: 5,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Sparkles size={12} style={{ color: "var(--accent-primary)" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)" }}>
                New State Variable
              </span>
            </div>
            <button
              type="button"
              className="panel-icon-btn"
              onClick={() => setIsAdding(false)}
              title="Close form"
              style={{ width: 18, height: 18 }}
            >
              <X size={11} />
            </button>
          </div>

          {/* Field 1: Variable Name (Full Width) */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 9.5,
                fontWeight: 700,
                color: "var(--text-tertiary)",
                marginBottom: 3,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Variable Name *
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. cartTotal, isLoaded"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              autoFocus
              style={{ height: 26, fontSize: 11 }}
            />
          </div>

          {/* Field 2: Type & Scope (Proportional 2-Column Grid) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  marginBottom: 3,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Data Type
              </label>
              <select
                className="form-select"
                value={newType}
                onChange={(e) => setNewType(e.target.value as StateVariableType)}
                style={{ height: 26, fontSize: 11, width: "100%" }}
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="json">JSON</option>
                <option value="array">Array</option>
                <option value="color">Color</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  marginBottom: 3,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Scope
              </label>
              <select
                className="form-select"
                value={newScope}
                onChange={(e) => setNewScope(e.target.value as StateVariableScope)}
                style={{ height: 26, fontSize: 11, width: "100%" }}
              >
                <option value="global">Global</option>
                <option value="page">Page</option>
                <option value="component">Component</option>
              </select>
            </div>
          </div>

          {/* Field 3: Initial Value (Full Width) */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 9.5,
                fontWeight: 700,
                color: "var(--text-tertiary)",
                marginBottom: 3,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Initial Value
            </label>
            <input
              type="text"
              className="form-input"
              placeholder={getValuePlaceholder(newType)}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              style={{ height: 26, fontSize: 11 }}
            />
          </div>

          {/* Field 4: Description (Full Width) */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 9.5,
                fontWeight: 700,
                color: "var(--text-tertiary)",
                marginBottom: 3,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Description (Optional)
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Brief description"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              style={{ height: 26, fontSize: 11 }}
            />
          </div>

          {/* Live Type Checking Warning Banner */}
          {newValue.trim() !== "" && !validationPreview.isValid && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
                padding: "6px 8px",
                backgroundColor: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                borderRadius: "var(--radius-sm)",
                fontSize: 10.5,
                color: "#f59e0b",
                lineHeight: 1.35,
              }}
            >
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Type Warning:</strong> {validationPreview.warningMessage}
                <div style={{ marginTop: 2, color: "var(--text-secondary)", fontSize: 9.5 }}>
                  Falling back to <code>{JSON.stringify(validationPreview.fallbackValue)}</code>. Emits warning to <strong>Output Log [STATE_VAR_WARN]</strong>.
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 6,
              marginTop: 2,
            }}
          >
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              style={{
                padding: "3px 10px",
                height: 24,
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-default)",
                backgroundColor: "transparent",
                color: "var(--text-secondary)",
                fontSize: 10.5,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="details-add-button"
              style={{ height: 24, padding: "0 10px", fontSize: 10.5 }}
            >
              <Plus size={12} strokeWidth={2.5} className="details-add-button__icon" />
              <span>Create</span>
            </button>
          </div>
        </form>
      )}

      {/* Variables List Stream - 100% Fluid Cards */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px" }}>
        {filteredVariables.length === 0 ? (
          <div
            style={{
              padding: "var(--space-lg) var(--space-md)",
              color: "var(--text-tertiary)",
              textAlign: "center",
              fontSize: 11,
            }}
          >
            No state variables found. Click <strong>+ Add</strong> to create one.
          </div>
        ) : (
          filteredVariables.map((v) => (
            <div key={v.id} className="state-var-card">
              {/* Line 1: Scope Icon + Variable Name + Type Badge + Trash Icon */}
              <div className="state-var-card__header">
                <div className="state-var-card__identity">
                  {getScopeIcon(v.scope)}
                  <span className="state-var-card__name" title={v.name}>
                    {v.name}
                  </span>
                  <span className="state-var-card__type">{v.type}</span>
                </div>

                <button
                  type="button"
                  className="state-var-card__delete"
                  onClick={() => deleteStateVariable(v.id, `Delete variable '${v.name}'`)}
                  title="Delete variable"
                >
                  <Trash2 size={11} />
                </button>
              </div>

              {/* Line 2: Full-Width Interactive Value Editor */}
              <div className="state-var-card__value-row">
                {v.type === "boolean" ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateStateVariable(
                        v.id,
                        !v.value,
                        `Toggle variable '${v.name}'`
                      )
                    }
                    style={{
                      width: "100%",
                      height: 24,
                      borderRadius: "var(--radius-sm)",
                      border:
                        "1px solid " +
                        (v.value
                          ? "rgba(34, 197, 94, 0.4)"
                          : "var(--border-default)"),
                      backgroundColor: v.value
                        ? "rgba(34, 197, 94, 0.18)"
                        : "var(--surface-2)",
                      color: v.value ? "#22c55e" : "var(--text-tertiary)",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.5px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {v.value ? "TRUE" : "FALSE"}
                  </button>
                ) : (
                  <input
                    type={v.type === "number" ? "number" : "text"}
                    className="form-input"
                    value={
                      typeof v.value === "object" && v.value !== null
                        ? JSON.stringify(v.value)
                        : String(v.value ?? "")
                    }
                    onChange={(e) => {
                      updateStateVariable(
                        v.id,
                        e.target.value,
                        `Update variable '${v.name}'`
                      );
                    }}
                    style={{ height: 24, fontSize: 11, width: "100%" }}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
