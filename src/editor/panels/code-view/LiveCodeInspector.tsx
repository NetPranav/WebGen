"use client";

/**
 * ============================================================================
 * PANEL 16: LIVE CODE INSPECTOR
 * ============================================================================
 * Read-only production code viewer displaying compiled Next.js 15, React 19,
 * Prisma, scoped CSS, and GSAP code with bidirectional AST-to-code mapping.
 * Architecture Ref: PANELS.md §Panel 16 & ROADMAP.md §Sub-Phase 6.3
 * ============================================================================
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  FileCode,
  FileText,
  Database,
  Copy,
  Check,
  Download,
  RefreshCw,
  Search,
  Zap,
  Globe,
  Layers,
  Sparkles,
  ExternalLink,
  Code,
  CheckCircle2,
  AlertCircle,
  Hash,
  FolderArchive,
} from "lucide-react";
import { useProjectStore, ProjectElement, ProjectStoreState } from "@/core/store/useProjectStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { DiagnosticBus } from "@/core/engine/DiagnosticBus";
import { EmittedFile } from "@/core/types/compiler";
import { ReactComponentEmitter } from "@/compiler/emitters/ReactComponentEmitter";
import { StyleEmitter } from "@/compiler/emitters/StyleEmitter";
import { GSAPAnimationEmitter } from "@/compiler/emitters/GSAPAnimationEmitter";
import { PrismaSchemaEmitter } from "@/compiler/emitters/PrismaSchemaEmitter";
import { ApiRouteEmitter } from "@/compiler/emitters/ApiRouteEmitter";
import { LogicFlowEmitter } from "@/compiler/emitters/LogicFlowEmitter";
import { GitExporter } from "@/compiler/export/GitExporter";
import { errorMessage } from "@/core/errors";

/** Compiles the whole project into emitted files and reports how long it took. */
function compileProjectFiles(project: {
  pages: ProjectStoreState["pages"];
  elements: ProjectStoreState["elements"];
  databaseSchemas: ProjectStoreState["databaseSchemas"];
  animationSamples: ProjectStoreState["animationSamples"];
  blueprintGraphs: ProjectStoreState["blueprintGraphs"];
}): { files: EmittedFile[]; durationMs: number } {
  const { pages, elements, databaseSchemas, animationSamples, blueprintGraphs } = project;
  const t0 = performance.now();
  const files: EmittedFile[] = [];

  try {
    // 1. Pages
    for (const page of Object.values(pages)) {
      if (page.rootElementId && elements[page.rootElementId]) {
        files.push(ReactComponentEmitter.emitPage(page, elements));
      }
    }

    // 2. Standalone Key Components (e.g. root containers or distinct components)
    for (const el of Object.values(elements)) {
      if (el.parentId === null && el.children && el.children.length > 0) {
        files.push(ReactComponentEmitter.emitComponent(el.id, elements));
      }
    }

    // 3. Styles (Tokens + Elements)
    files.push(
      StyleEmitter.emitTokens({
        colors: {
          canvasBg: "#0F172A",
          accentPrimary: "#206859",
          textPrimary: "#F8FAFC",
          borderDefault: "#334155",
        },
        wires: {
          exec: "#FFFFFF",
          string: "#F59E0B",
          number: "#10B981",
          boolean: "#EF4444",
        },
      })
    );
    files.push(StyleEmitter.emitProjectStyles(elements));

    // 4. Animations
    for (const sample of Object.values(animationSamples)) {
      files.push(GSAPAnimationEmitter.emitHook(sample));
    }

    // 5. Database & Prisma
    if (Object.keys(databaseSchemas).length > 0) {
      files.push(PrismaSchemaEmitter.emitSchema(databaseSchemas));
      files.push(PrismaSchemaEmitter.emitSqlMigration(databaseSchemas));
    }

    // 6. API Routes
    for (const schema of Object.values(databaseSchemas)) {
      files.push(ApiRouteEmitter.emitCollectionRoute(schema));
      files.push(ApiRouteEmitter.emitItemRoute(schema));
    }

    // 7. Logic Flows
    for (const graph of Object.values(blueprintGraphs)) {
      files.push(LogicFlowEmitter.emitLogicFlow(graph));
    }

  } catch (err) {
    DiagnosticBus.emit({
      channel: "CODEGEN_INTEGRITY_ERR",
      severity: "error",
      source: {
        panel: "Panel 16: Live Code Inspector",
        entityId: "compiler_engine",
      },
      message: `[CODEGEN_INTEGRITY_ERR] Failed to compile visual project AST: ${errorMessage(err)}`,
      suggestion: "Verify that all root elements, variables, and database schemas are properly defined.",
      isFixable: false,
    });
  }

  return { files, durationMs: Math.max(1, Math.round(performance.now() - t0)) };
}

export interface LiveCodeInspectorProps {
  className?: string;
  style?: React.CSSProperties;
}

type FileCategory = "all" | "component" | "page" | "styles" | "api" | "schema" | "logic" | "animation";

export const LiveCodeInspector: React.FC<LiveCodeInspectorProps> = ({ className, style }) => {
  // Store subscriptions
  const pages = useProjectStore((s) => s.pages);
  const elements = useProjectStore((s) => s.elements);
  const databaseSchemas = useProjectStore((s) => s.databaseSchemas);
  const animationSamples = useProjectStore((s) => s.animationSamples);
  const blueprintGraphs = useProjectStore((s) => s.blueprintGraphs);
  const projectName = useProjectStore((s) => s.projectName);
  const selectedElementId = useSelectionStore((s) => s.selectedId);
  const selectElement = useSelectionStore((s) => s.select);

  // Local UI state
  const [selectedFilePath, setSelectedFilePath] = useState<string>("app/page.tsx");
  const [activeCategory, setActiveCategory] = useState<FileCategory>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [highlightedLineIndex, setHighlightedLineIndex] = useState<number | null>(null);

  const codeContainerRef = useRef<HTMLDivElement>(null);

  // Compile entire project into EmittedFile collection
  const { files: emittedFiles, durationMs: compileDurationMs } = useMemo(
    () => compileProjectFiles({ pages, elements, databaseSchemas, animationSamples, blueprintGraphs }),
    [pages, elements, databaseSchemas, animationSamples, blueprintGraphs]
  );

  // Filtered files based on category and search query
  const filteredFiles = useMemo(() => {
    return emittedFiles.filter((f) => {
      if (activeCategory !== "all" && f.type !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return f.path.toLowerCase().includes(q) || f.language.toLowerCase().includes(q);
      }
      return true;
    });
  }, [emittedFiles, activeCategory, searchQuery]);

  // Active file
  const activeFile = useMemo(() => {
    return (
      emittedFiles.find((f) => f.path === selectedFilePath) ||
      filteredFiles[0] ||
      emittedFiles[0] ||
      null
    );
  }, [emittedFiles, selectedFilePath, filteredFiles]);

  // Code lines for the active file
  const codeLines = useMemo(() => {
    if (!activeFile) return [];
    return activeFile.content.split("\n");
  }, [activeFile]);

  // Bidirectional AST Sync: When selectedElementId changes in canvas, find matching line in code
  const selectionMatch = useMemo((): { lineIndex: number | null } | null => {
    if (!selectedElementId || !activeFile) return null;

    const el = elements[selectedElementId];
    if (!el) return null;

    const cleanName = el.name.toLowerCase();
    const shortId = el.id.replace(/^el_/, "").toLowerCase();

    // Look for lines containing className or tag matching element
    const matchingIdx = codeLines.findIndex((line) => {
      const lower = line.toLowerCase();
      return (
        lower.includes(shortId) ||
        lower.includes(`className="${cleanName}`) ||
        lower.includes(`>${el.properties?.textContent}<`) ||
        lower.includes(`>${el.properties?.label}<`)
      );
    });

    return { lineIndex: matchingIdx === -1 ? null : matchingIdx };
  }, [selectedElementId, activeFile, codeLines, elements]);

  const [prevSelectionMatch, setPrevSelectionMatch] = useState<typeof selectionMatch>(null);
  if (selectionMatch !== prevSelectionMatch) {
    setPrevSelectionMatch(selectionMatch);
    if (selectionMatch) setHighlightedLineIndex(selectionMatch.lineIndex);
  }

  // Scroll the selection-matched line into view
  useEffect(() => {
    const lineIndex = selectionMatch?.lineIndex;
    if (lineIndex == null || !codeContainerRef.current) return;
    const lineEl = codeContainerRef.current.querySelector(`[data-line-index="${lineIndex}"]`);
    if (lineEl instanceof HTMLElement) {
      lineEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectionMatch]);

  // Handle line click: Bidirectional Code-to-AST selection
  const handleLineClick = useCallback(
    (lineIdx: number, lineText: string) => {
      setHighlightedLineIndex(lineIdx);

      // Extract element ID or class name from line text
      for (const el of Object.values(elements)) {
        const shortId = el.id.replace(/^el_/, "");
        if (lineText.includes(shortId) || (el.name && lineText.includes(el.name))) {
          selectElement(el.id, "element");
          break;
        }
      }
    },
    [elements, selectElement]
  );

  // Copy code to clipboard
  const handleCopyCode = useCallback(() => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [activeFile]);

  // Download active file
  const handleDownloadFile = useCallback(() => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = activeFile.path.split("/").pop() || "file.txt";
    link.click();
    URL.revokeObjectURL(url);
  }, [activeFile]);

  // Export entire standalone Git repository as a ZIP archive
  const handleExportRepoZip = useCallback(() => {
    try {
      setIsExporting(true);
      const bundle = GitExporter.packageProject(
        {
          pages,
          elements,
          databaseSchemas,
          blueprintGraphs,
          animationSamples,
        },
        {
          projectName: projectName || "webgen-app",
        }
      );
      bundle.downloadZip();
      setTimeout(() => setIsExporting(false), 1200);
    } catch (err) {
      setIsExporting(false);
      DiagnosticBus.emit({
        channel: "CODEGEN_INTEGRITY_ERR",
        severity: "error",
        source: {
          panel: "Panel 16: Live Code Inspector",
          entityId: "git_exporter",
        },
        message: `Failed to package Git repository: ${errorMessage(err)}`,
      });
    }
  }, [pages, elements, databaseSchemas, blueprintGraphs, animationSamples, projectName]);

  // File type icon resolver
  const getFileIcon = (file: EmittedFile) => {
    switch (file.type) {
      case "page":
        return <Globe size={13} style={{ color: "#38BDF8" }} />;
      case "component":
        return <Code size={13} style={{ color: "#206859" }} />;
      case "styles":
        return <Layers size={13} style={{ color: "#EC4899" }} />;
      case "schema":
        return <Database size={13} style={{ color: "#10B981" }} />;
      case "api":
        return <Zap size={13} style={{ color: "#F59E0B" }} />;
      case "animation":
        return <Sparkles size={13} style={{ color: "#8B5CF6" }} />;
      default:
        return <FileCode size={13} style={{ color: "#94A3B8" }} />;
    }
  };

  // Syntax highlighting formatter for a code line
  const renderSyntaxLine = (text: string) => {
    if (!text.trim()) return <span>&nbsp;</span>;

    // Full comment lines
    if (
      text.trim().startsWith("//") ||
      text.trim().startsWith("/*") ||
      text.trim().startsWith("*") ||
      text.trim().startsWith("--")
    ) {
      return <span style={{ color: "#64748B", fontStyle: "italic" }}>{text}</span>;
    }

    // Direct token colorization for common JS/TS/CSS/Prisma patterns
    const parts = text.split(/([a-zA-Z0-9_$]+|"[^"]*"|'[^']*'|`[^`]*`|[{}()[\]:;,.=><!&|])/g);

    return (
      <>
        {parts.map((token, i) => {
          if (!token) return null;

          // Strings
          if (
            (token.startsWith('"') && token.endsWith('"')) ||
            (token.startsWith("'") && token.endsWith("'")) ||
            (token.startsWith("`") && token.endsWith("`"))
          ) {
            return (
              <span key={i} style={{ color: "#FBBF24" }}>
                {token}
              </span>
            );
          }

          // Keywords
          const keywords = new Set([
            "import",
            "export",
            "default",
            "function",
            "const",
            "let",
            "var",
            "return",
            "await",
            "async",
            "interface",
            "type",
            "from",
            "if",
            "else",
            "try",
            "catch",
            "model",
            "datasource",
            "generator",
            "enum",
          ]);
          if (keywords.has(token)) {
            return (
              <span key={i} style={{ color: "#F43F5E", fontWeight: 600 }}>
                {token}
              </span>
            );
          }

          // Types & Interfaces
          const types = new Set([
            "string",
            "number",
            "boolean",
            "any",
            "void",
            "unknown",
            "String",
            "Int",
            "Float",
            "Boolean",
            "DateTime",
            "Json",
            "NextRequest",
            "NextResponse",
            "React",
            "Promise",
          ]);
          if (types.has(token) || (token.length > 2 && token.charAt(0) === token.charAt(0).toUpperCase() && /^[A-Z][a-zA-Z0-9]+$/.test(token))) {
            return (
              <span key={i} style={{ color: "#38BDF8" }}>
                {token}
              </span>
            );
          }

          // HTML/JSX tag brackets
          if (token === "<" || token === ">" || token === "</" || token === "/>") {
            return (
              <span key={i} style={{ color: "#3B82F6" }}>
                {token}
              </span>
            );
          }

          return <span key={i}>{token}</span>;
        })}
      </>
    );
  };

  return (
    <div
      className={`code-inspector ${className || ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: "#0B0F19",
        color: "#F8FAFC",
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Top Header & Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          borderBottom: "1px solid #1E293B",
          backgroundColor: "#0F172A",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              borderRadius: 6,
              backgroundColor: "rgba(32, 104, 89, 0.2)",
              border: "1px solid #206859",
              color: "#34D399",
            }}
          >
            <Code size={14} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC", display: "flex", alignItems: "center", gap: 6 }}>
              Live Code Inspector
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 4,
                  backgroundColor: "rgba(56, 189, 248, 0.15)",
                  color: "#38BDF8",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                }}
              >
                Panel 16
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>
              Compiled Next.js 15, React 19, Prisma & CSS
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              color: "#94A3B8",
              backgroundColor: "#1E293B",
              padding: "3px 8px",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Zap size={11} style={{ color: "#F59E0B" }} />
            Compiled in {compileDurationMs}ms
          </span>

          <button
            onClick={handleCopyCode}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: copied ? "rgba(16, 185, 129, 0.2)" : "#1E293B",
              color: copied ? "#34D399" : "#F8FAFC",
              border: `1px solid ${copied ? "#10B981" : "#334155"}`,
              borderRadius: 4,
              cursor: "pointer",
            }}
            title="Copy code to clipboard"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied!" : "Copy Code"}
          </button>

          <button
            onClick={handleDownloadFile}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: "#1E293B",
              color: "#F8FAFC",
              border: "1px solid #334155",
              borderRadius: 4,
              cursor: "pointer",
            }}
            title="Download file"
          >
            <Download size={12} />
            Export File
          </button>

          <button
            onClick={handleExportRepoZip}
            disabled={isExporting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: isExporting ? "rgba(32, 104, 89, 0.4)" : "#206859",
              color: "#FFFFFF",
              border: "1px solid #206859",
              borderRadius: 4,
              cursor: isExporting ? "wait" : "pointer",
              transition: "all 0.15s ease",
            }}
            title="Package and download complete standalone Next.js 15 repository as a ZIP archive"
          >
            <FolderArchive size={12} />
            {isExporting ? "Packaging..." : "Export Repo (.zip)"}
          </button>
        </div>
      </div>

      {/* Category Tabs Strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 16px",
          borderBottom: "1px solid #1E293B",
          backgroundColor: "#0B0F19",
          overflowX: "auto",
        }}
      >
        {(
          [
            { id: "all", label: "All Files", count: emittedFiles.length },
            { id: "page", label: "Pages", count: emittedFiles.filter((f) => f.type === "page").length },
            { id: "component", label: "Components", count: emittedFiles.filter((f) => f.type === "component").length },
            { id: "styles", label: "Styles & Tokens", count: emittedFiles.filter((f) => f.type === "styles").length },
            { id: "api", label: "API Routes", count: emittedFiles.filter((f) => f.type === "api").length },
            { id: "schema", label: "Database / Prisma", count: emittedFiles.filter((f) => f.type === "schema").length },
            { id: "logic", label: "Logic Flows", count: emittedFiles.filter((f) => f.type === "logic").length },
            { id: "animation", label: "Animations", count: emittedFiles.filter((f) => f.type === "animation").length },
          ] as { id: FileCategory; label: string; count: number }[]
        ).map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "#F8FAFC" : "#94A3B8",
                backgroundColor: isActive ? "#206859" : "transparent",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
              <span
                style={{
                  fontSize: 10,
                  opacity: 0.8,
                  backgroundColor: isActive ? "rgba(0,0,0,0.3)" : "#1E293B",
                  padding: "0 4px",
                  borderRadius: 3,
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Split Body: File Tree (Left) + Code Viewer (Right) */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left Sidebar: File List */}
        <div
          style={{
            width: 260,
            borderRight: "1px solid #1E293B",
            backgroundColor: "#0A0E17",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          {/* File Search Input */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid #1E293B" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px",
                backgroundColor: "#0F172A",
                border: "1px solid #1E293B",
                borderRadius: 4,
              }}
            >
              <Search size={12} style={{ color: "#64748B" }} />
              <input
                type="text"
                placeholder="Search generated files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "none",
                  border: "none",
                  outline: "none",
                  color: "#F8FAFC",
                  fontSize: 11,
                  width: "100%",
                }}
              />
            </div>
          </div>

          {/* Files List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
            {filteredFiles.map((file) => {
              const isSelected = activeFile?.path === file.path;
              return (
                <div
                  key={file.path}
                  onClick={() => setSelectedFilePath(file.path)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    borderRadius: 4,
                    cursor: "pointer",
                    backgroundColor: isSelected ? "rgba(32, 104, 89, 0.25)" : "transparent",
                    border: isSelected ? "1px solid rgba(32, 104, 89, 0.6)" : "1px solid transparent",
                    marginBottom: 2,
                    transition: "all 0.1s ease",
                  }}
                >
                  {getFileIcon(file)}
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: '"JetBrains Mono", monospace',
                      color: isSelected ? "#F8FAFC" : "#94A3B8",
                      fontWeight: isSelected ? 600 : 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {file.path}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Code Viewer */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            backgroundColor: "#070A10",
          }}
        >
          {/* File Header Bar */}
          {activeFile && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 16px",
                borderBottom: "1px solid #1E293B",
                backgroundColor: "#0D111D",
                fontSize: 11,
                color: "#94A3B8",
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {getFileIcon(activeFile)}
                <span style={{ color: "#F8FAFC", fontWeight: 600 }}>{activeFile.path}</span>
                <span
                  style={{
                    fontSize: 9,
                    textTransform: "uppercase",
                    padding: "1px 5px",
                    borderRadius: 3,
                    backgroundColor: "#1E293B",
                    color: "#64748B",
                  }}
                >
                  {activeFile.language}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span>{codeLines.length} lines</span>
                <span>{(activeFile.content.length / 1024).toFixed(1)} KB</span>
              </div>
            </div>
          )}

          {/* Line-Numbered Syntax Viewer */}
          <div
            ref={codeContainerRef}
            style={{
              flex: 1,
              overflow: "auto",
              padding: "12px 0",
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              fontSize: 12,
              lineHeight: "20px",
            }}
          >
            {codeLines.map((line, idx) => {
              const isHighlighted = highlightedLineIndex === idx;
              return (
                <div
                  key={idx}
                  data-line-index={idx}
                  onClick={() => handleLineClick(idx, line)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    padding: "0 16px",
                    backgroundColor: isHighlighted ? "rgba(245, 158, 11, 0.15)" : "transparent",
                    borderLeft: isHighlighted ? "3px solid #F59E0B" : "3px solid transparent",
                    cursor: "pointer",
                    userSelect: "text",
                    transition: "background-color 0.1s ease",
                  }}
                >
                  {/* Line Number */}
                  <span
                    style={{
                      width: 38,
                      color: isHighlighted ? "#F59E0B" : "#475569",
                      fontWeight: isHighlighted ? 700 : 400,
                      textAlign: "right",
                      paddingRight: 14,
                      flexShrink: 0,
                      userSelect: "none",
                    }}
                  >
                    {idx + 1}
                  </span>

                  {/* Line Content */}
                  <span
                    style={{
                      flex: 1,
                      whiteSpace: "pre",
                      color: "#E2E8F0",
                      wordBreak: "break-all",
                    }}
                  >
                    {renderSyntaxLine(line)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
