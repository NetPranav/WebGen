"use client";

/**
 * ============================================================================
 * PROPERTY BLUEPRINT BINDING CONTROL (UNREAL-STYLE PROPERTY BINDING)
 * ============================================================================
 * UI Element: Unified Property & Default Value Binding Selector
 * Role: Allows developers to toggle between static literal values and dynamic
 *       Logic Blueprint functions, conditional ternary expressions, or state variables.
 * Architecture: Modeled after Unreal Engine UMG / Blueprint Property Binding.
 * ============================================================================
 */

import React, { useState } from "react";
import {
  Workflow,
  Sparkles,
  Database,
  Layers,
  X,
  Check,
  Code2,
  ChevronDown,
  ArrowRight,
  Zap,
} from "lucide-react";
import { useProjectStore } from "@/core/store/useProjectStore";

export type BindingMode = "static" | "blueprint" | "formula" | "state" | "database";

export interface PropertyBlueprintBindingControlProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (newValue: string) => void;
  targetProperty?: string;
  elementId?: string;
  collectionName?: string;
  isBound?: boolean;
  boundSourceDescription?: string;
  onBindBlueprint?: (funcName: string, sourceFile: string) => void;
  onUnbind?: () => void;
  formulaPresets?: Array<{ label: string; expression: string; description?: string }>;
}

export const PropertyBlueprintBindingControl: React.FC<PropertyBlueprintBindingControlProps> = ({
  label,
  value,
  placeholder = "Enter static value...",
  onChange,
  targetProperty = "value",
  elementId,
  collectionName,
  isBound: externalIsBound,
  boundSourceDescription: externalBoundDesc,
  onBindBlueprint,
  onUnbind: externalOnUnbind,
  formulaPresets,
}) => {
  const { stateVariables, databaseSchemas } = useProjectStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"formula" | "blueprint" | "state">("formula");
  const [customFormula, setCustomFormula] = useState("");
  const [selectedBlueprint, setSelectedBlueprint] = useState("");
  const [selectedStateVar, setSelectedStateVar] = useState("");

  // Internal bound state if not externally managed
  const [internalBound, setInternalBound] = useState(false);
  const [internalBoundDesc, setInternalBoundDesc] = useState("");

  const isBound = externalIsBound !== undefined ? externalIsBound : internalBound;
  const boundDesc = externalBoundDesc !== undefined ? externalBoundDesc : internalBoundDesc;

  // Default rich conditional logic presets (including user's exact order now / order again example)
  const PRESETS = formulaPresets || [
    {
      label: "Orders Count: 'Order Again' vs 'Order Now'",
      expression: `orders.length > 0 ? "Order Again" : "Order Now"`,
      description: "Dynamically switches call-to-action placeholder when customer has existing order history.",
    },
    {
      label: "Cart Status: 'View Cart (N)' vs 'Order Now'",
      expression: `cart.items.length > 0 ? "View Cart (" + cart.items.length + ")" : "Order Now"`,
      description: "Reflects current session cart itemCount in field label.",
    },
    {
      label: "Authentication: 'Welcome Back' vs 'Guest'",
      expression: `user.isLoggedIn ? "Welcome back, " + user.name : "Sign In to Order"`,
      description: "Personalized identity greeting placeholder.",
    },
    {
      label: "Database Autoincrement PK",
      expression: "autoincrement()",
      description: "Generates sequential integer sequence on record insertion.",
    },
    {
      label: "Global UUIDv4 Identifier",
      expression: "UUIDv4()",
      description: "Generates collision-free RFC 4122 v4 unique identifier.",
    },
    {
      label: "Current Timestamp",
      expression: "NOW()",
      description: "Injects server ISO 8601 creation timestamp.",
    },
  ];

  // Available candidate Logic Blueprint functions
  const BLUEPRINT_CANDIDATES = [
    {
      name: "getConditionalPlaceholder()",
      file: "src/blueprints/cart.bp",
      category: "Blueprint",
      description: "Evaluates user cart & orders state to yield dynamic string.",
    },
    {
      name: "computeOrderStatus()",
      file: "src/blueprints/checkout.bp",
      category: "Blueprint",
      description: "Returns localized state label (Pending, Paid, Delivered).",
    },
    {
      name: "generateProductSKU()",
      file: "src/blueprints/admin-cms.bp",
      category: "Blueprint",
      description: "Computes SKU hash code based on collection category and timestamp.",
    },
    {
      name: "calculateDefaultPrice()",
      file: "src/blueprints/pricing.bp",
      category: "Blueprint",
      description: "Applies tier discount logic to compute base currency value.",
    },
  ];

  const handleApplyPreset = (expr: string, desc: string) => {
    onChange(expr);
    setInternalBound(true);
    setInternalBoundDesc(`Formula: ${expr}`);
    if (onBindBlueprint) {
      onBindBlueprint(`formula(${expr})`, "dynamic-expression");
    }
    setIsOpen(false);
  };

  const handleApplyCustomFormula = () => {
    if (!customFormula.trim()) return;
    onChange(customFormula.trim());
    setInternalBound(true);
    setInternalBoundDesc(`Formula: ${customFormula.trim()}`);
    if (onBindBlueprint) {
      onBindBlueprint(`formula(${customFormula.trim()})`, "dynamic-expression");
    }
    setIsOpen(false);
  };

  const handleSelectBlueprint = (candidate: typeof BLUEPRINT_CANDIDATES[0]) => {
    onChange(`blueprint::${candidate.name}`);
    setInternalBound(true);
    setInternalBoundDesc(`Blueprint: ${candidate.name}`);
    if (onBindBlueprint) {
      onBindBlueprint(candidate.name, candidate.file);
    }
    setIsOpen(false);
  };

  const handleSelectStateVariable = (varName: string) => {
    onChange(`state::${varName}`);
    setInternalBound(true);
    setInternalBoundDesc(`State Variable: ${varName}`);
    if (onBindBlueprint) {
      onBindBlueprint(`state(${varName})`, "state-matrix");
    }
    setIsOpen(false);
  };

  const handleUnbind = () => {
    setInternalBound(false);
    setInternalBoundDesc("");
    if (externalOnUnbind) {
      externalOnUnbind();
    }
    onChange("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%", minWidth: 0, boxSizing: "border-box" }}>
      {/* Header Label + Unreal Engine Bind Button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
        <label style={{ fontSize: 11.5, fontWeight: 600, color: "#475569", margin: 0 }}>
          {label}
        </label>

        {isBound ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontSize: 9.5,
                fontWeight: 700,
                color: "#7C3AED",
                backgroundColor: "#F5F3FF",
                padding: "2px 6px",
                borderRadius: 4,
                border: "1px solid #DDD6FE",
              }}
            >
              <Zap size={10} style={{ fill: "#7C3AED" }} />
              <span>Bound</span>
            </span>

            <button
              type="button"
              onClick={handleUnbind}
              title="Disconnect Blueprint Binding (Revert to Static Literal)"
              style={{
                background: "none",
                border: "none",
                color: "#94A3B8",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                borderRadius: 3,
              }}
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: 600,
              color: "#6D28D9",
              backgroundColor: "#F5F3FF",
              border: "1px solid #DDD6FE",
              borderRadius: 4,
              padding: "2px 7px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Connect property to a dynamic Logic Blueprint function, state variable, or conditional formula"
          >
            <Zap size={10} style={{ fill: "#7C3AED" }} />
            <span>+ Bind Blueprint</span>
            <ChevronDown size={10} />
          </button>
        )}
      </div>

      {/* Main Input Display: Bound Pill OR Static Text Input */}
      {isBound ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 10px",
            borderRadius: "var(--radius-sm, 6px)",
            backgroundColor: "#FAF5FF",
            border: "1px solid #C4B5FD",
            color: "#5B21B6",
            fontSize: 11.5,
            fontFamily: "var(--font-mono)",
            gap: 8,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, overflow: "hidden" }}>
            <Workflow size={13} style={{ color: "#7C3AED", flexShrink: 0 }} />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontWeight: 600,
              }}
              title={boundDesc || value}
            >
              {boundDesc || value}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            style={{
              background: "none",
              border: "none",
              color: "#7C3AED",
              fontSize: 10.5,
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
            }}
          >
            Edit
          </button>
        </div>
      ) : (
        <input
          type="text"
          className="db-input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        />
      )}

      {/* Unreal-Style Interactive Binding Popover Dialog */}
      {isOpen && (
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid rgba(15, 23, 42, 0.12)",
            borderRadius: "var(--radius-md, 8px)",
            boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)",
            padding: 12,
            marginTop: 4,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            zIndex: 50,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(15, 23, 42, 0.06)", paddingBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={13} style={{ color: "#7C3AED" }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#0F172A" }}>
                Unreal Blueprint Property Binding
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", padding: 2 }}
            >
              <X size={12} />
            </button>
          </div>

          {/* Mode Tabs */}
          <div style={{ display: "flex", gap: 4, backgroundColor: "#F1F5F9", padding: 2, borderRadius: 6 }}>
            <button
              type="button"
              onClick={() => setActiveTab("formula")}
              style={{
                flex: 1,
                padding: "3px 6px",
                fontSize: 10.5,
                fontWeight: activeTab === "formula" ? 700 : 500,
                backgroundColor: activeTab === "formula" ? "#FFFFFF" : "transparent",
                color: activeTab === "formula" ? "#0F172A" : "#64748B",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                boxShadow: activeTab === "formula" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              🔀 Expression
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("blueprint")}
              style={{
                flex: 1,
                padding: "3px 6px",
                fontSize: 10.5,
                fontWeight: activeTab === "blueprint" ? 700 : 500,
                backgroundColor: activeTab === "blueprint" ? "#FFFFFF" : "transparent",
                color: activeTab === "blueprint" ? "#0F172A" : "#64748B",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                boxShadow: activeTab === "blueprint" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              ⚡ Blueprint
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("state")}
              style={{
                flex: 1,
                padding: "3px 6px",
                fontSize: 10.5,
                fontWeight: activeTab === "state" ? 700 : 500,
                backgroundColor: activeTab === "state" ? "#FFFFFF" : "transparent",
                color: activeTab === "state" ? "#0F172A" : "#64748B",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                boxShadow: activeTab === "state" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              🏷️ State
            </button>
          </div>

          {/* Tab 1: Conditional Formula / Dynamic Expression */}
          {activeTab === "formula" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 10, color: "#64748B", lineHeight: 1.35 }}>
                Bind to conditional expressions evaluating user state or session context:
              </span>

              {/* Presets List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p.expression, p.label)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 6,
                      backgroundColor: "#F8FAFC",
                      border: "1px solid rgba(15, 23, 42, 0.06)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#EBF5F3")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                  >
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "#0F172A" }}>
                      {p.label}
                    </span>
                    <code style={{ fontSize: 9.5, color: "#206859", fontFamily: "var(--font-mono)" }}>
                      {p.expression}
                    </code>
                  </button>
                ))}
              </div>

              {/* Custom Formula Input */}
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                <input
                  type="text"
                  className="db-input"
                  placeholder="e.g. orders.length > 0 ? 'Order Again' : 'Order Now'"
                  value={customFormula}
                  onChange={(e) => setCustomFormula(e.target.value)}
                  style={{ flex: 1, fontSize: 11, fontFamily: "var(--font-mono)", padding: "4px 8px" }}
                />
                <button
                  type="button"
                  onClick={handleApplyCustomFormula}
                  className="db-explorer-header__btn"
                  style={{ padding: "4px 10px", fontSize: 11, backgroundColor: "#7C3AED", color: "#FFFFFF", border: "none" }}
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Logic Blueprint Candidates */}
          {activeTab === "blueprint" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
              <span style={{ fontSize: 10, color: "#64748B" }}>
                Select candidate Logic Blueprint function to resolve this property:
              </span>
              {BLUEPRINT_CANDIDATES.map((candidate) => (
                <div
                  key={candidate.name}
                  onClick={() => handleSelectBlueprint(candidate)}
                  style={{
                    padding: "6px 8px",
                    borderRadius: 6,
                    backgroundColor: "#F8FAFC",
                    border: "1px solid rgba(15, 23, 42, 0.06)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5F3FF")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Workflow size={11} style={{ color: "#7C3AED" }} />
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#0F172A" }}>
                        {candidate.name}
                      </span>
                    </div>
                    <span style={{ fontSize: 9.5, color: "#64748B" }}>{candidate.description}</span>
                  </div>
                  <ArrowRight size={12} style={{ color: "#7C3AED" }} />
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: State Variables */}
          {activeTab === "state" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
              <span style={{ fontSize: 10, color: "#64748B" }}>
                Select an active reactive state atom:
              </span>
              {Object.keys(stateVariables).length === 0 ? (
                <div style={{ padding: "8px", fontSize: 11, color: "#94A3B8", textAlign: "center" }}>
                  No state variables created yet.
                </div>
              ) : (
                Object.values(stateVariables).map((v) => (
                  <div
                    key={v.id}
                    onClick={() => handleSelectStateVariable(v.name)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 6,
                      backgroundColor: "#F8FAFC",
                      border: "1px solid rgba(15, 23, 42, 0.06)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5F3FF")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                  >
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#0F172A" }}>
                        {v.name}
                      </span>
                      <span style={{ fontSize: 9.5, color: "#64748B", marginLeft: 6 }}>
                        ({v.type})
                      </span>
                    </div>
                    <ArrowRight size={12} style={{ color: "#7C3AED" }} />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
