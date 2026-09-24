"use client";

/**
 * ============================================================================
 * DETAILS INSPECTOR: DATA BINDING SECTION
 * ============================================================================
 * Context-aware property binding inspector. Connects UI element properties to
 * Database Collection fields, Reactive State Variables, URL params, or Storage
 * based on the Archetype Property Compatibility Matrix.
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.5 & SCHEMA_REFERENCE.md §13
 * ============================================================================
 */

import React, { useState, useMemo } from "react";
import {
  Link,
  Plus,
  Trash2,
  Globe,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sliders,
  Sparkles,
  X,
} from "lucide-react";
import {
  useProjectStore,
} from "@/core/store/useProjectStore";
import {
  BindingSourceType,
  DataBindingDescriptor,
  TransformFunctionType,
} from "@/core/types/data-binding";
import type { ArchetypeId } from "@/core/document/registry";
import {
  ARCHETYPE_PROPERTY_BINDING_MATRIX,
  DatabaseField,
} from "@/core/types/database";
import { DataBindingValidator } from "@/core/engine/DataBindingValidator";
import { ConnectionPipeline } from "@/core/engine/ConnectionPipeline";
import { StateVariablePicker } from "../controls/StateVariablePicker";
import "@/editor/styles/panels.css";
import "@/editor/styles/forms.css";

interface DataBindingEditorProps {
  elementId: string;
  elementName?: string;
  archetype?: ArchetypeId;
  onOpenDatabase?: () => void;
}

export const DataBindingEditor: React.FC<DataBindingEditorProps> = ({
  elementId,
  elementName = "Element",
  archetype = "container",
  onOpenDatabase,
}) => {
  const {
    bindings,
    databaseSchemas,
    stateVariables,
    registerBinding,
    unregisterBinding,
    getDataContext,
  } = useProjectStore();

  const [isAdding, setIsAdding] = useState(false);

  // New binding form state
  const [targetProperty, setTargetProperty] = useState("");
  const [sourceType, setSourceType] = useState<BindingSourceType>("state_variable");
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [selectedField, setSelectedField] = useState<string>("");
  const [selectedStateVar, setSelectedStateVar] = useState<string>("");
  const [storageKey, setStorageKey] = useState<string>("");
  const [paramKey, setParamKey] = useState<string>("");
  const [transformFn, setTransformFn] = useState<TransformFunctionType>("none");

  // Determine active bindings for this element
  const elementBindings = useMemo(() => {
    return Object.values(bindings).filter(
      (b) => b.target.elementId === elementId
    );
  }, [bindings, elementId]);

  // Discover bindable properties for this element archetype
  const bindableProperties = useMemo(() => {
    const defaultProps = ["opacity", "visibility", "width", "height"];
    switch (archetype) {
      case "text":
        return ["textContent", "fontSize", "color", ...defaultProps];
      case "button":
        return ["label", "disabled", "backgroundColor", ...defaultProps];
      case "image":
        return ["src", "alt", "borderRadius", ...defaultProps];
      case "input":
        return ["value", "placeholder", "disabled", ...defaultProps];
      case "container":
      default:
        return ["itemsSource", "display", "backgroundColor", ...defaultProps];
    }
  }, [archetype]);

  // Available database collections
  const collectionNames = Object.keys(databaseSchemas);

  // Ensure default selections
  const effectiveCollection = selectedCollection || collectionNames[0] || "";
  const currentSchema = databaseSchemas[effectiveCollection];
  const fields: DatabaseField[] = currentSchema ? Object.values(currentSchema.fields) : [];
  const effectiveField = selectedField || (fields[0]?.name ?? "");
  const effectiveProperty = targetProperty || bindableProperties[0] || "textContent";

  // Real-time live compatibility evaluation of pending binding
  const compatibilityAssessment = useMemo(() => {
    if (!isAdding) return { isCompatible: true };

    const ctx = getDataContext();

    const candidateBinding: DataBindingDescriptor = {
      id: "candidate_eval",
      target: {
        elementId,
        elementName,
        archetype,
        propertyKey: effectiveProperty,
      },
      sourceType,
      sourceCollection: sourceType === "database" ? effectiveCollection : undefined,
      sourceField: sourceType === "database" ? effectiveField : undefined,
      stateVariableId: sourceType === "state_variable" ? (selectedStateVar || Object.keys(stateVariables)[0]) : undefined,
      storageKey: sourceType === "local_storage" ? storageKey : undefined,
      paramKey: sourceType === "url_param" ? paramKey : undefined,
      transformFn: transformFn !== "none" ? transformFn : undefined,
    };

    const evaluation = DataBindingValidator.evaluateBinding(candidateBinding, ctx);
    const matrixEntry = ARCHETYPE_PROPERTY_BINDING_MATRIX[archetype]?.[effectiveProperty];

    return {
      isCompatible: evaluation.isValid,
      resolvedValue: evaluation.value,
      error: evaluation.error,
      matrixEntry,
    };
  }, [
    isAdding,
    elementId,
    elementName,
    archetype,
    effectiveProperty,
    sourceType,
    effectiveCollection,
    effectiveField,
    selectedStateVar,
    storageKey,
    paramKey,
    transformFn,
    stateVariables,
    getDataContext,
  ]);

  const handleCreateBinding = (e: React.FormEvent) => {
    e.preventDefault();

    const newBinding: DataBindingDescriptor = {
      id: `bind_${elementId}_${effectiveProperty}_${Date.now()}`,
      target: {
        elementId,
        elementName,
        archetype,
        propertyKey: effectiveProperty,
      },
      sourceType,
      sourceCollection: sourceType === "database" ? effectiveCollection : undefined,
      sourceField: sourceType === "database" ? effectiveField : undefined,
      stateVariableId: sourceType === "state_variable" ? (selectedStateVar || Object.keys(stateVariables)[0]) : undefined,
      storageKey: sourceType === "local_storage" ? storageKey : undefined,
      paramKey: sourceType === "url_param" ? paramKey : undefined,
      transformFn: transformFn !== "none" ? transformFn : undefined,
    };

    registerBinding(newBinding, `Bind ${effectiveProperty} to ${sourceType}`);
    setIsAdding(false);
  };

  // Evaluate current element's bound property values live (re-renders on any store change)
  const evaluatedProps = ConnectionPipeline.evaluateElementProperties(elementId, getDataContext());

  return (
    <div className="data-binding-section">
      {/* Header with Title and Add Binding Action */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Link size={12} style={{ color: "var(--accent-info)" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Active Bindings ({elementBindings.length})
          </span>
        </div>

        <button
          type="button"
          className="details-add-button"
          onClick={() => setIsAdding(!isAdding)}
          style={{ height: 22, padding: "0 8px", fontSize: 10.5 }}
          title="Add Property Binding"
        >
          <Plus size={12} strokeWidth={2.5} className="details-add-button__icon" />
          <span>+ Bind</span>
        </button>
      </div>

      {/* Creation Modal / Form */}
      {isAdding && (
        <form
          onSubmit={handleCreateBinding}
          style={{
            padding: "10px 12px",
            backgroundColor: "var(--surface-panel-solid)",
            border: "1px solid var(--accent-primary)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.35)",
            marginBottom: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Sparkles size={12} style={{ color: "var(--accent-primary)" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)" }}>
                Bind Property to Data Source
              </span>
            </div>
            <button
              type="button"
              className="panel-icon-btn"
              onClick={() => setIsAdding(false)}
              style={{ width: 18, height: 18 }}
            >
              <X size={11} />
            </button>
          </div>

          {/* Row 1: Target Property & Source Type */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div>
              <label style={{ display: "block", fontSize: 9.5, fontWeight: 700, color: "var(--text-tertiary)", marginBottom: 3, textTransform: "uppercase" }}>
                Target Property *
              </label>
              <select
                className="form-select"
                value={effectiveProperty}
                onChange={(e) => setTargetProperty(e.target.value)}
                style={{ height: 26, fontSize: 11, width: "100%" }}
              >
                {bindableProperties.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 9.5, fontWeight: 700, color: "var(--text-tertiary)", marginBottom: 3, textTransform: "uppercase" }}>
                Source Type
              </label>
              <select
                className="form-select"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as BindingSourceType)}
                style={{ height: 26, fontSize: 11, width: "100%" }}
              >
                <option value="state_variable">State Variable</option>
                <option value="url_param">URL Query Param</option>
                <option value="local_storage">Local Storage</option>
              </select>
            </div>
          </div>

          {sourceType === "state_variable" && (
            <div>
              <label style={{ display: "block", fontSize: 9.5, fontWeight: 700, color: "var(--text-tertiary)", marginBottom: 3, textTransform: "uppercase" }}>
                Select State Variable
              </label>
              <StateVariablePicker
                value={selectedStateVar || Object.keys(stateVariables)[0]}
                onChange={(varId) => setSelectedStateVar(varId)}
              />
            </div>
          )}

          {sourceType === "local_storage" && (
            <div>
              <label style={{ display: "block", fontSize: 9.5, fontWeight: 700, color: "var(--text-tertiary)", marginBottom: 3, textTransform: "uppercase" }}>
                Local Storage Key
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. user_session, auth_token"
                value={storageKey}
                onChange={(e) => setStorageKey(e.target.value)}
                style={{ height: 26, fontSize: 11 }}
              />
            </div>
          )}

          {sourceType === "url_param" && (
            <div>
              <label style={{ display: "block", fontSize: 9.5, fontWeight: 700, color: "var(--text-tertiary)", marginBottom: 3, textTransform: "uppercase" }}>
                URL Query Parameter
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. id, ref, page"
                value={paramKey}
                onChange={(e) => setParamKey(e.target.value)}
                style={{ height: 26, fontSize: 11 }}
              />
            </div>
          )}

          {/* Row 3: Optional Transform Function */}
          <div>
            <label style={{ display: "block", fontSize: 9.5, fontWeight: 700, color: "var(--text-tertiary)", marginBottom: 3, textTransform: "uppercase" }}>
              Value Transform (Optional)
            </label>
            <select
              className="form-select"
              value={transformFn}
              onChange={(e) => setTransformFn(e.target.value as TransformFunctionType)}
              style={{ height: 26, fontSize: 11, width: "100%" }}
            >
              <option value="none">Direct Pass-Through (None)</option>
              <option value="currency_usd">Currency USD ($0.00)</option>
              <option value="uppercase">UPPERCASE</option>
              <option value="lowercase">lowercase</option>
              <option value="number_round">Round to Integer</option>
              <option value="date_localized">Format Date (Localized)</option>
              <option value="date_iso">ISO 8601 Timestamp</option>
              <option value="boolean_not">Invert Flag (NOT)</option>
            </select>
          </div>

          {/* Real-time Compatibility Feedback Indicator */}
          <div
            style={{
              padding: "6px 8px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: compatibilityAssessment.isCompatible
                ? "rgba(34, 197, 94, 0.1)"
                : "rgba(239, 68, 68, 0.12)",
              border: `1px solid ${
                compatibilityAssessment.isCompatible
                  ? "rgba(34, 197, 94, 0.3)"
                  : "rgba(239, 68, 68, 0.35)"
              }`,
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
              fontSize: 10.5,
              lineHeight: 1.35,
            }}
          >
            {compatibilityAssessment.isCompatible ? (
              <>
                <CheckCircle2 size={13} style={{ color: "#22c55e", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <span style={{ fontWeight: 600, color: "#22c55e" }}>Compatible Binding</span>
                  <div style={{ color: "var(--text-secondary)", fontSize: 9.5, marginTop: 2 }}>
                    Preview Output: <code>{JSON.stringify(compatibilityAssessment.resolvedValue)}</code>
                  </div>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle size={13} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <span style={{ fontWeight: 600, color: "#ef4444" }}>Incompatible Binding</span>
                  <div style={{ color: "var(--text-secondary)", fontSize: 9.5, marginTop: 2 }}>
                    {compatibilityAssessment.error} (Will dispatch [BIND_ERR] to Output Log).
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Modal Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 2 }}>
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
              <span>Create Binding</span>
            </button>
          </div>
        </form>
      )}

      {/* Active Bindings List */}
      {elementBindings.length === 0 ? (
        <div
          style={{
            padding: "12px",
            backgroundColor: "var(--surface-1)",
            border: "1px dashed var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-tertiary)",
            textAlign: "center",
            fontSize: 10.5,
          }}
        >
          No dynamic data bindings attached. Click <strong>+ Bind</strong> to connect to State Variables or URL Parameters.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {elementBindings.map((b) => {
            const sourceLabel =
              b.sourceType === "database"
                ? `${b.sourceCollection}.${b.sourceField}`
                : b.sourceType === "state_variable"
                ? `state.${b.stateVariableId}`
                : b.storageKey || b.paramKey || b.sourceType;

            const liveValue = evaluatedProps.properties[b.target.propertyKey];

            return (
              <div
                key={b.id}
                style={{
                  padding: "6px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--surface-panel-solid)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {/* Line 1: Property Target -> Source Path + Trash */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 10.5,
                        fontFamily: "var(--font-mono)",
                        color: "var(--accent-primary)",
                      }}
                    >
                      {b.target.propertyKey}
                    </span>
                    <ArrowRight size={10} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 10.5,
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={sourceLabel}
                    >
                      {sourceLabel}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => unregisterBinding(b.id, `Unbind ${b.target.propertyKey}`)}
                    className="panel-icon-btn"
                    title="Remove binding"
                    style={{ color: "var(--text-muted)", width: 18, height: 18 }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>

                {/* Line 2: Transform & Live Value Pill */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 9.5,
                    color: "var(--text-secondary)",
                  }}
                >
                  <span style={{ color: "var(--text-tertiary)" }}>
                    {b.transformFn && b.transformFn !== "none" ? `Transform: ${b.transformFn}` : "Direct"}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "#22c55e",
                      maxWidth: 100,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    = {JSON.stringify(liveValue ?? "")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
