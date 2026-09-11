"use client";

/**
 * ============================================================================
 * MY BLUEPRINT PANEL
 * ============================================================================
 * Unreal Engine-style My Blueprint explorer panel:
 * - Graph hierarchies (Event Graphs, Function Graphs, Macro Graphs)
 * - Functions list & function definition creator
 * - Graph Variables inspector with drag-and-drop / Get & Set node generation
 * - Event Dispatchers / Component Event hooks
 *
 * Architecture Ref: ROADMAP.md §Sub-Phase 3.4 & UI.md §4.6
 * ============================================================================
 */

import React, { useState } from "react";
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Play,
  FileCode,
  Folder,
  Hash,
  ToggleLeft,
  Search,
  Zap,
  ArrowRightCircle,
  HelpCircle,
} from "lucide-react";
import { useProjectStore } from "@/core/store/useProjectStore";
import { BlueprintVariable } from "@/core/ast/ASTManager";
import { PIN_COLOR_MAP, PinDataType } from "@/core/types/node-registry";

interface MyBlueprintPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onAddNodeAtCenter?: (typeId: string, customParams?: Record<string, unknown>) => void;
}

export const MyBlueprintPanel: React.FC<MyBlueprintPanelProps> = ({
  isOpen,
  onToggle,
  onAddNodeAtCenter,
}) => {
  const {
    blueprintGraphs,
    activeBlueprintGraphId,
    setActiveBlueprintGraph,
    createBlueprintGraph,
    addBlueprintVariable,
    removeBlueprintVariable,
  } = useProjectStore();

  const activeGraph = blueprintGraphs[activeBlueprintGraphId] || Object.values(blueprintGraphs)[0];

  // Accordion open/closed state
  const [graphsExpanded, setGraphsExpanded] = useState(true);
  const [functionsExpanded, setFunctionsExpanded] = useState(true);
  const [variablesExpanded, setVariablesExpanded] = useState(true);
  const [eventsExpanded, setEventsExpanded] = useState(true);

  // New item forms
  const [isAddingGraph, setIsAddingGraph] = useState(false);
  const [newGraphName, setNewGraphName] = useState("");

  const [isAddingVar, setIsAddingVar] = useState(false);
  const [newVarName, setNewVarName] = useState("");
  const [newVarType, setNewVarType] = useState<"boolean" | "number" | "string" | "object" | "array">("string");
  const [newVarDefault, setNewVarDefault] = useState<string>("");

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  const handleCreateGraph = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGraphName.trim()) return;
    const id = createBlueprintGraph(newGraphName.trim(), "event", `Create Blueprint Graph '${newGraphName}'`);
    setActiveBlueprintGraph(id);
    setNewGraphName("");
    setIsAddingGraph(false);
  };

  const handleCreateVariable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVarName.trim() || !activeGraph) return;

    let parsedVal: unknown = newVarDefault;
    if (newVarType === "number") {
      parsedVal = Number(newVarDefault) || 0;
    } else if (newVarType === "boolean") {
      parsedVal = newVarDefault.toLowerCase() === "true";
    } else if (newVarType === "object" || newVarType === "array") {
      try {
        parsedVal = JSON.parse(newVarDefault || (newVarType === "array" ? "[]" : "{}"));
      } catch {
        parsedVal = newVarType === "array" ? [] : {};
      }
    }

    addBlueprintVariable(
      activeGraph.id,
      {
        name: newVarName.trim(),
        type: newVarType,
        defaultValue: parsedVal,
        category: "User Variables",
      },
      `Add Variable '${newVarName}'`
    );

    setNewVarName("");
    setNewVarDefault("");
    setIsAddingVar(false);
  };

  const handleAddGetNode = (v: BlueprintVariable) => {
    if (onAddNodeAtCenter) {
      onAddNodeAtCenter("variables/get", {
        variableName: v.name,
        variableType: v.type,
      });
    }
  };

  const handleAddSetNode = (v: BlueprintVariable) => {
    if (onAddNodeAtCenter) {
      onAddNodeAtCenter("variables/set", {
        variableName: v.name,
        variableType: v.type,
      });
    }
  };

  if (!isOpen) {
    return null;
  }

  const graphsList = Object.values(blueprintGraphs).filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const variablesList = (activeGraph?.variables || []).filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      className="my-bp-panel"
      role="complementary"
      aria-label="My Blueprint Hierarchy"
      style={{
        width: 260,
        height: "100%",
        backgroundColor: "#FFFFFF",
        borderRight: "1px solid #E2E8F0",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        zIndex: 10,
        userSelect: "none",
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: "1px solid #E2E8F0",
          backgroundColor: "#F8FAFC",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Layers size={14} style={{ color: "#206859" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", letterSpacing: "-0.01em" }}>
            My Blueprint
          </span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          title="Collapse Panel"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px 4px",
            borderRadius: 4,
            color: "#64748B",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Blueprint Search Bar */}
      <div style={{ padding: "6px 10px", borderBottom: "1px solid #F1F5F9" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            backgroundColor: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 4,
            padding: "3px 8px",
          }}
        >
          <Search size={12} style={{ color: "#94A3B8" }} />
          <input
            type="text"
            placeholder="Search Blueprint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 11,
              width: "100%",
              outline: "none",
              color: "#0F172A",
            }}
          />
        </div>
      </div>

      {/* Sections Accordion */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* GRAPHS SECTION */}
        <div style={{ borderBottom: "1px solid #F1F5F9" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 10px",
              backgroundColor: "#FAFAFA",
              cursor: "pointer",
              userSelect: "none",
            }}
            onClick={() => setGraphsExpanded(!graphsExpanded)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <ChevronDown
                size={12}
                style={{
                  color: "#64748B",
                  transform: graphsExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                  transition: "transform 0.15s ease",
                }}
              />
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569" }}>
                Graphs ({graphsList.length})
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddingGraph(true);
                setGraphsExpanded(true);
              }}
              title="Add New Graph"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 4px",
                color: "#206859",
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Plus size={13} />
            </button>
          </div>

          {graphsExpanded && (
            <div style={{ padding: "2px 0" }}>
              {isAddingGraph && (
                <form
                  onSubmit={handleCreateGraph}
                  style={{
                    padding: "4px 12px",
                    display: "flex",
                    gap: 4,
                  }}
                >
                  <input
                    type="text"
                    autoFocus
                    placeholder="Graph Name..."
                    value={newGraphName}
                    onChange={(e) => setNewGraphName(e.target.value)}
                    style={{
                      flex: 1,
                      fontSize: 11,
                      padding: "3px 6px",
                      border: "1px solid #206859",
                      borderRadius: 4,
                      outline: "none",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: "#206859",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: 4,
                      padding: "2px 8px",
                      fontSize: 10,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingGraph(false)}
                    style={{
                      background: "#E2E8F0",
                      color: "#475569",
                      border: "none",
                      borderRadius: 4,
                      padding: "2px 6px",
                      fontSize: 10,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </form>
              )}

              {graphsList.map((graph) => {
                const isActive = graph.id === activeBlueprintGraphId;
                const nodeCount = Object.keys(graph.nodes || {}).length;
                return (
                  <div
                    key={graph.id}
                    onClick={() => setActiveBlueprintGraph(graph.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "5px 12px 5px 22px",
                      cursor: "pointer",
                      backgroundColor: isActive ? "#EBF5F3" : "transparent",
                      borderLeft: isActive ? "3px solid #206859" : "3px solid transparent",
                      fontSize: 12,
                      color: isActive ? "#206859" : "#334155",
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                      <FileCode size={13} style={{ color: isActive ? "#206859" : "#94A3B8" }} />
                      <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {graph.name}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 5px",
                        borderRadius: 8,
                        backgroundColor: isActive ? "rgba(32, 104, 89, 0.15)" : "#F1F5F9",
                        color: isActive ? "#206859" : "#64748B",
                      }}
                    >
                      {nodeCount} {nodeCount === 1 ? "node" : "nodes"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: VARIABLES */}
        <div style={{ marginBottom: 8 }}>
          <div
            onClick={() => setVariablesExpanded(!variablesExpanded)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {variablesExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span>Variables ({variablesList.length})</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddingVar(true);
                setVariablesExpanded(true);
              }}
              title="Add Variable"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 4px",
                color: "#206859",
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Plus size={13} />
            </button>
          </div>

          {variablesExpanded && (
            <div style={{ padding: "2px 0" }}>
              {isAddingVar && (
                <form
                  onSubmit={handleCreateVariable}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#F8FAFC",
                    borderBottom: "1px solid #E2E8F0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <input
                    type="text"
                    autoFocus
                    placeholder="Variable Name..."
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                    style={{
                      fontSize: 11,
                      padding: "4px 6px",
                      border: "1px solid #CBD5E1",
                      borderRadius: 4,
                      outline: "none",
                    }}
                  />
                  <div style={{ display: "flex", gap: 4 }}>
                    <select
                      value={newVarType}
                      onChange={(e) => setNewVarType(e.target.value as any)}
                      style={{
                        flex: 1,
                        fontSize: 11,
                        padding: "3px 4px",
                        border: "1px solid #CBD5E1",
                        borderRadius: 4,
                        backgroundColor: "#FFFFFF",
                      }}
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="object">Object</option>
                      <option value="array">Array</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Default..."
                      value={newVarDefault}
                      onChange={(e) => setNewVarDefault(e.target.value)}
                      style={{
                        flex: 1,
                        fontSize: 11,
                        padding: "3px 4px",
                        border: "1px solid #CBD5E1",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setIsAddingVar(false)}
                      style={{
                        background: "#E2E8F0",
                        border: "none",
                        borderRadius: 3,
                        padding: "2px 8px",
                        fontSize: 10,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{
                        background: "#206859",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: 3,
                        padding: "2px 8px",
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Add Variable
                    </button>
                  </div>
                </form>
              )}

              {variablesList.length === 0 && !isAddingVar && (
                <div style={{ padding: "6px 22px", fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>
                  No variables defined
                </div>
              )}

              {variablesList.map((variable) => {
                const pinColor = PIN_COLOR_MAP[variable.type as PinDataType] || "#64748B";
                return (
                  <div
                    key={variable.id}
                    className="bp-variable-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "5px 10px 5px 22px",
                      fontSize: 11,
                      borderBottom: "1px solid #F8FAFC",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: pinColor,
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 500, color: "#0F172A", textOverflow: "ellipsis", overflow: "hidden" }}>
                        {variable.name}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => handleAddGetNode(variable)}
                        title={`Drop Get ${variable.name} Node`}
                        style={{
                          background: "#F1F5F9",
                          border: "1px solid #E2E8F0",
                          borderRadius: 3,
                          padding: "1px 5px",
                          fontSize: 9,
                          fontWeight: 600,
                          color: "#334155",
                          cursor: "pointer",
                        }}
                      >
                        GET
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddSetNode(variable)}
                        title={`Drop Set ${variable.name} Node`}
                        style={{
                          background: "#EBF5F3",
                          border: "1px solid rgba(32, 104, 89, 0.3)",
                          borderRadius: 3,
                          padding: "1px 5px",
                          fontSize: 9,
                          fontWeight: 600,
                          color: "#206859",
                          cursor: "pointer",
                        }}
                      >
                        SET
                      </button>
                      <button
                        type="button"
                        onClick={() => activeGraph && removeBlueprintVariable(activeGraph.id, variable.id, `Delete Variable ${variable.name}`)}
                        title="Delete Variable"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "1px 3px",
                          color: "#94A3B8",
                          borderRadius: 3,
                        }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 3: EVENT DISPATCHERS & HOOKS */}
        <div style={{ marginBottom: 8 }}>
          <div
            onClick={() => setEventsExpanded(!eventsExpanded)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {eventsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span>Event Hooks</span>
            </div>
          </div>

          {eventsExpanded && (
            <div style={{ padding: "2px 0" }}>
              {[
                { type: "event/onClick", label: "On Click", subtitle: "Element Click" },
                { type: "event/onPageLoad", label: "On Page Load", subtitle: "Mount Hook" },
                { type: "event/onSubmit", label: "On Form Submit", subtitle: "Form Event" },
                { type: "event/onHover", label: "On Hover", subtitle: "Cursor Event" },
                { type: "event/onTimer", label: "On Timer Interval", subtitle: "Interval Tick" },
              ].map((evt) => (
                <div
                  key={evt.type}
                  onClick={() => onAddNodeAtCenter && onAddNodeAtCenter(evt.type)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "5px 12px 5px 22px",
                    cursor: "pointer",
                    fontSize: 11,
                    color: "#334155",
                  }}
                  title={`Click to drop ${evt.label} event on canvas`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Zap size={12} style={{ color: "#4338CA" }} />
                    <span style={{ fontWeight: 500 }}>{evt.label}</span>
                  </div>
                  <span style={{ fontSize: 9, color: "#94A3B8" }}>+ Drop</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div
        style={{
          padding: "8px 12px",
          borderTop: "1px solid #E2E8F0",
          backgroundColor: "#F8FAFC",
          fontSize: 10,
          color: "#64748B",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <HelpCircle size={12} style={{ color: "#94A3B8" }} />
        <span>Drag or click GET/SET to wire logic</span>
      </div>
    </aside>
  );
};
