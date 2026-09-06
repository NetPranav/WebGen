"use client";

/**
 * ============================================================================
 * STATE VARIABLE PICKER CONTROL
 * ============================================================================
 * Contextual dropdown picker for selecting reactive state variables across
 * Global, Page, and Component scopes to bind to element properties.
 * Architecture Ref: SCHEMA_REFERENCE.md §13 & ROADMAP.md §Sub-Phase 2.5
 * ============================================================================
 */

import React, { useState, useRef, useEffect } from "react";
import { Globe, FileText, Layers, ChevronDown, Check, X, Variable } from "lucide-react";
import { useProjectStore, StateVariable, StateVariableScope } from "@/core/store/useProjectStore";
import "@/editor/styles/forms.css";

interface StateVariablePickerProps {
  value?: string; // selected stateVariableId
  onChange: (variableId: string) => void;
  filterType?: string; // e.g. "number", "string", "boolean"
  placeholder?: string;
  disabled?: boolean;
}

export const StateVariablePicker: React.FC<StateVariablePickerProps> = ({
  value,
  onChange,
  filterType,
  placeholder = "Select state variable...",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const { stateVariables } = useProjectStore();

  const allVariables = Object.values(stateVariables);

  // Filter by search query and optional type
  const filtered = allVariables.filter((v) => {
    const matchesSearch =
      !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.description && v.description.toLowerCase().includes(search.toLowerCase()));
    const matchesType = !filterType || v.type === filterType;
    return matchesSearch && matchesType;
  });

  const selectedVar = value ? stateVariables[value] : undefined;

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

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

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%" }}
      className="state-var-picker"
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="form-input"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: disabled ? "not-allowed" : "pointer",
          padding: "0 8px",
          height: 26,
          backgroundColor: "var(--surface-panel-solid)",
          borderColor: isOpen ? "var(--accent-primary)" : "var(--border-default)",
          gap: 6,
          fontSize: 11,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
          {selectedVar ? (
            <>
              {getScopeIcon(selectedVar.scope)}
              <span
                style={{
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {selectedVar.name}
              </span>
              <span
                style={{
                  fontSize: 8.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "1px 4px",
                  borderRadius: 3,
                  backgroundColor: "var(--surface-2)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {selectedVar.type}
              </span>
            </>
          ) : (
            <span style={{ color: "var(--text-tertiary)" }}>{placeholder}</span>
          )}
        </div>
        <ChevronDown
          size={12}
          style={{
            color: "var(--text-tertiary)",
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: "var(--surface-panel-solid)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            maxHeight: 220,
          }}
        >
          {/* Search Header */}
          <div
            style={{
              padding: "6px",
              borderBottom: "1px solid var(--border-subtle)",
              backgroundColor: "var(--surface-1)",
            }}
          >
            <input
              type="text"
              className="form-input"
              placeholder="Search variables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              style={{ height: 22, fontSize: 10.5 }}
            />
          </div>

          {/* Variables List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px" }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "12px",
                  textAlign: "center",
                  fontSize: 10.5,
                  color: "var(--text-tertiary)",
                }}
              >
                No state variables found
              </div>
            ) : (
              filtered.map((v) => {
                const isSelected = v.id === value;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      onChange(v.id);
                      setIsOpen(false);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "5px 8px",
                      borderRadius: "var(--radius-sm)",
                      border: "none",
                      backgroundColor: isSelected ? "var(--accent-primary-light)" : "transparent",
                      color: isSelected ? "var(--accent-primary)" : "var(--text-primary)",
                      cursor: "pointer",
                      fontSize: 11,
                      textAlign: "left",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                      {getScopeIcon(v.scope)}
                      <span
                        style={{
                          fontWeight: isSelected ? 700 : 500,
                          fontFamily: "var(--font-mono)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {v.name}
                      </span>
                      <span
                        style={{
                          fontSize: 8.5,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          padding: "1px 4px",
                          borderRadius: 3,
                          backgroundColor: "var(--surface-2)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        {v.type}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--text-tertiary)",
                          maxWidth: 60,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {String(v.value ?? "")}
                      </span>
                      {isSelected && <Check size={12} style={{ color: "var(--accent-primary)" }} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
