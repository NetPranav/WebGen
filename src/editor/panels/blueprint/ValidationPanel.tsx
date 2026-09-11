"use client";

/**
 * ============================================================================
 * BLUEPRINT VALIDATION & COMPILATION PANEL
 * ============================================================================
 * Visual compiler status bar and drawer displaying:
 * - Real-time AST compilation status & issue count
 * - Diagnostic issue cards (Cycles, Pin Mismatches, Unlinked Required Pins)
 * - Clickable jump-to-node links
 * - `.bp.json` AST file Export & Import serialization controls
 *
 * Architecture Ref: ROADMAP.md §Sub-Phase 3.5 & UI.md §4.6
 * ============================================================================
 */

import React, { useRef, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Play,
  Download,
  Upload,
  ExternalLink,
  Code2,
  RefreshCw,
} from "lucide-react";
import { useProjectStore } from "@/core/store/useProjectStore";
import { ASTManager, BlueprintValidationIssue } from "@/core/ast/ASTManager";

interface ValidationPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onJumpToNode?: (nodeId: string) => void;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  isOpen,
  onToggle,
  onJumpToNode,
}) => {
  const {
    blueprintGraphs,
    activeBlueprintGraphId,
    compileActiveBlueprintGraph,
    loadBlueprintGraph,
  } = useProjectStore();

  const [isCompiling, setIsCompiling] = useState(false);
  const [lastValidationTime, setLastValidationTime] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<BlueprintValidationIssue[]>([]);
  const [hasCompiledOnce, setHasCompiledOnce] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeGraph = blueprintGraphs[activeBlueprintGraphId];

  const handleCompile = () => {
    setIsCompiling(true);
    setTimeout(() => {
      const result = compileActiveBlueprintGraph();
      setValidationIssues(result.issues);
      setHasCompiledOnce(true);
      setLastValidationTime(new Date().toLocaleTimeString());
      setIsCompiling(false);
    }, 300);
  };

  const handleExportJson = () => {
    if (!activeGraph) return;
    try {
      const json = ASTManager.serializeGraphToJson(activeGraph);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${activeGraph.name.toLowerCase().replace(/\s+/g, "_")}.bp.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNotice("Exported successfully!");
      setTimeout(() => setExportNotice(null), 2500);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const graph = ASTManager.deserializeJsonToGraph(text);
        loadBlueprintGraph(graph, `Import Blueprint '${graph.name}'`);
        setExportNotice(`Imported '${graph.name}'!`);
        setTimeout(() => setExportNotice(null), 2500);
        // Automatically compile after import
        setTimeout(handleCompile, 100);
      } catch (err: any) {
        alert(`Failed to import blueprint: ${err.message}`);
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = "";
  };

  const errorCount = validationIssues.filter((i) => i.severity === "error").length;
  const warningCount = validationIssues.filter((i) => i.severity === "warning").length;

  return (
    <div
      className="bp-validation-drawer"
      role="region"
      aria-label="Blueprint Compilation & Validation Drawer"
      style={{
        width: "100%",
        backgroundColor: "#FFFFFF",
        borderTop: "1px solid #E2E8F0",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        zIndex: 10,
        boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* Status Bar / Toggle Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 14px",
          height: 36,
          backgroundColor: "#F8FAFC",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={onToggle}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCompile();
            }}
            disabled={isCompiling}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              backgroundColor: isCompiling ? "#94A3B8" : "#206859",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 4,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 600,
              cursor: isCompiling ? "wait" : "pointer",
              transition: "background 0.15s ease",
            }}
          >
            <Play size={11} />
            <span>{isCompiling ? "Compiling..." : "Compile Graph"}</span>
          </button>

          {/* Compilation Badge */}
          {!hasCompiledOnce ? (
            <span style={{ fontSize: 11, color: "#64748B" }}>Ready to compile AST</span>
          ) : errorCount > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#DC2626", fontSize: 11, fontWeight: 600 }}>
              <AlertCircle size={13} />
              <span>Compilation Failed ({errorCount} errors, {warningCount} warnings)</span>
            </div>
          ) : warningCount > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#D97706", fontSize: 11, fontWeight: 600 }}>
              <AlertTriangle size={13} />
              <span>Compiled with {warningCount} warnings</span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#059669", fontSize: 11, fontWeight: 600 }}>
              <CheckCircle2 size={13} />
              <span>Good to Go (AST Valid)</span>
            </div>
          )}

          {lastValidationTime && (
            <span style={{ fontSize: 10, color: "#94A3B8" }}>
              Last compiled: {lastValidationTime}
            </span>
          )}

          {exportNotice && (
            <span style={{ fontSize: 11, color: "#206859", fontWeight: 500 }}>
              {exportNotice}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Export JSON Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleExportJson();
            }}
            title="Export AST as .bp.json"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              backgroundColor: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: 4,
              padding: "2px 8px",
              fontSize: 10,
              color: "#334155",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            <Download size={11} />
            <span>Export .bp.json</span>
          </button>

          {/* Import JSON Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportJson}
            accept=".json,.bp.json"
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            title="Import .bp.json file"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              backgroundColor: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: 4,
              padding: "2px 8px",
              fontSize: 10,
              color: "#334155",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            <Upload size={11} />
            <span>Import .bp.json</span>
          </button>

          <span style={{ color: "#64748B", display: "flex", alignItems: "center" }}>
            {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </span>
        </div>
      </div>

      {/* Expanded Issue List Drawer */}
      {isOpen && (
        <div
          style={{
            height: 140,
            overflowY: "auto",
            backgroundColor: "#FFFFFF",
            borderTop: "1px solid #F1F5F9",
            padding: "8px 14px",
          }}
        >
          {validationIssues.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#64748B",
                gap: 6,
              }}
            >
              <CheckCircle2 size={24} style={{ color: "#10B981" }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>
                All graph nodes and wires are cleanly validated.
              </span>
              <span style={{ fontSize: 11, color: "#64748B" }}>
                No cyclic execution loops, type incompatibilities, or unlinked required pins detected.
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {validationIssues.map((issue) => {
                const isError = issue.severity === "error";
                const isWarning = issue.severity === "warning";
                const bg = isError ? "#FEF2F2" : isWarning ? "#FFFBEB" : "#F0FDF4";
                const border = isError ? "#FCA5A5" : isWarning ? "#FCD34D" : "#86EFAC";
                const textColor = isError ? "#991B1B" : isWarning ? "#92400E" : "#166534";

                return (
                  <div
                    key={issue.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 12px",
                      borderRadius: 4,
                      backgroundColor: bg,
                      border: `1px solid ${border}`,
                      fontSize: 11,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {isError ? (
                        <AlertCircle size={14} style={{ color: "#DC2626", flexShrink: 0 }} />
                      ) : (
                        <AlertTriangle size={14} style={{ color: "#D97706", flexShrink: 0 }} />
                      )}
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 10,
                          backgroundColor: isError ? "#FEE2E2" : "#FEF3C7",
                          padding: "1px 5px",
                          borderRadius: 3,
                          color: textColor,
                        }}
                      >
                        [{issue.code}]
                      </span>
                      <span style={{ color: textColor, fontWeight: 500 }}>
                        {issue.message}
                      </span>
                    </div>

                    {issue.nodeId && (
                      <button
                        type="button"
                        onClick={() => onJumpToNode && onJumpToNode(issue.nodeId!)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          background: "none",
                          border: "none",
                          color: "#206859",
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        <span>Focus Node</span>
                        <ExternalLink size={10} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
