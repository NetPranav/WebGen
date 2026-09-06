"use client";

/**
 * ============================================================================
 * JSON / OBJECT PROPERTY EDITOR (UNREAL ENGINE 5 STYLE)
 * ============================================================================
 * Interactive nested key-value inspector for JSON / Object props:
 * - Tree view with property counts and type indicators
 * - Inline editing of keys and values
 * - Add Property / Delete Property
 * - Raw JSON / Visual Tree mode toggle
 * ============================================================================
 */

import React, { useState } from "react";
import { Plus, Trash2, ChevronRight, Code, Eye, AlertCircle } from "lucide-react";

export interface JsonObjectEditorProps {
  value: unknown;
  onChange: (newVal: unknown) => void;
  disabled?: boolean;
}

export const JsonObjectEditor: React.FC<JsonObjectEditorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isRawMode, setIsRawMode] = useState(false);
  const [rawText, setRawText] = useState(() => JSON.stringify(value || {}, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  // New property draft state
  const [newKey, setNewKey] = useState("");
  const [newValType, setNewValType] = useState<"string" | "number" | "boolean">("string");

  // Ensure object
  const obj: Record<string, any> =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, any>)
      : {};

  const keys = Object.keys(obj);

  const handleUpdateValue = (k: string, v: any) => {
    const next = { ...obj, [k]: v };
    onChange(next);
    setRawText(JSON.stringify(next, null, 2));
  };

  const handleDeleteKey = (k: string) => {
    const next = { ...obj };
    delete next[k];
    onChange(next);
    setRawText(JSON.stringify(next, null, 2));
  };

  const handleAddProperty = () => {
    const trimmed = newKey.trim();
    if (!trimmed || trimmed in obj) return;

    let defaultVal: any = "";
    if (newValType === "number") defaultVal = 0;
    if (newValType === "boolean") defaultVal = true;

    const next = { ...obj, [trimmed]: defaultVal };
    onChange(next);
    setRawText(JSON.stringify(next, null, 2));
    setNewKey("");
  };

  const handleRawTextChange = (text: string) => {
    setRawText(text);
    try {
      const parsed = JSON.parse(text);
      setJsonError(null);
      onChange(parsed);
    } catch (err: any) {
      setJsonError(err.message || "Invalid JSON syntax");
    }
  };

  const getTypeLabel = (val: any): string => {
    if (typeof val === "boolean") return "bool";
    if (typeof val === "number") return "num";
    if (typeof val === "string") return "str";
    if (Array.isArray(val)) return "arr";
    if (typeof val === "object" && val !== null) return "obj";
    return "any";
  };

  return (
    <div className="json-editor-container">
      {/* JSON Editor Header */}
      <div className="json-editor-header">
        <button
          type="button"
          className="json-editor-toggle-btn"
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronRight
            size={11}
            className={`json-editor-chevron ${isOpen ? "json-editor-chevron--open" : ""}`}
          />
          <span className="json-editor-title">Object ({keys.length} props)</span>
        </button>

        <div className="json-editor-actions">
          <button
            type="button"
            className={`json-mode-btn ${isRawMode ? "json-mode-btn--active" : ""}`}
            onClick={() => {
              if (!isRawMode) {
                setRawText(JSON.stringify(obj, null, 2));
                setJsonError(null);
              }
              setIsRawMode(!isRawMode);
            }}
            title={isRawMode ? "Switch to Visual Tree" : "Switch to Raw JSON"}
          >
            {isRawMode ? <Eye size={10} /> : <Code size={10} />}
            <span>{isRawMode ? "Tree" : "JSON"}</span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="json-editor-body">
          {isRawMode ? (
            /* RAW JSON MODE */
            <div className="json-raw-wrap">
              <textarea
                className="json-raw-textarea"
                value={rawText}
                onChange={(e) => handleRawTextChange(e.target.value)}
                disabled={disabled}
                rows={5}
                spellCheck={false}
              />
              {jsonError && (
                <div className="json-error-banner">
                  <AlertCircle size={10} />
                  <span>{jsonError}</span>
                </div>
              )}
            </div>
          ) : (
            /* VISUAL TREE MODE */
            <div className="json-tree-wrap">
              {keys.length === 0 ? (
                <div className="json-empty-hint">Empty object {"{}"}</div>
              ) : (
                keys.map((k) => {
                  const val = obj[k];
                  const typeLabel = getTypeLabel(val);

                  return (
                    <div key={k} className="json-tree-row">
                      <div className="json-tree-key-group">
                        <span className={`json-type-badge json-type-badge--${typeLabel}`}>
                          {typeLabel}
                        </span>
                        <span className="json-tree-key-name" title={k}>
                          {k}
                        </span>
                      </div>

                      <div className="json-tree-val-group">
                        {typeof val === "boolean" ? (
                          <input
                            type="checkbox"
                            className="form-checkbox"
                            checked={Boolean(val)}
                            onChange={(e) => handleUpdateValue(k, e.target.checked)}
                            disabled={disabled}
                          />
                        ) : typeof val === "number" ? (
                          <input
                            type="number"
                            className="form-input form-input--number json-val-input"
                            value={val}
                            onChange={(e) => handleUpdateValue(k, Number(e.target.value))}
                            disabled={disabled}
                          />
                        ) : (
                          <input
                            type="text"
                            className="form-input json-val-input"
                            value={typeof val === "object" ? JSON.stringify(val) : String(val)}
                            onChange={(e) => handleUpdateValue(k, e.target.value)}
                            disabled={disabled}
                          />
                        )}

                        <button
                          type="button"
                          className="json-del-btn"
                          onClick={() => handleDeleteKey(k)}
                          title={`Delete ${k}`}
                          disabled={disabled}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Add Property Row */}
              {!disabled && (
                <div className="json-add-row">
                  <input
                    type="text"
                    className="form-input json-new-key-input"
                    placeholder="key_name"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddProperty()}
                  />
                  <select
                    className="form-select json-new-type-select"
                    value={newValType}
                    onChange={(e) => setNewValType(e.target.value as any)}
                  >
                    <option value="string">str</option>
                    <option value="number">num</option>
                    <option value="boolean">bool</option>
                  </select>
                  <button
                    type="button"
                    className="json-add-btn"
                    onClick={handleAddProperty}
                    disabled={!newKey.trim()}
                    title="Add property"
                  >
                    <Plus size={11} />
                    <span>Add</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
