"use client";

/**
 * ============================================================================
 * IN-MEMORY RUNTIME SANDBOX HOST WITH MOCK DATABASE & API INTERCEPTOR
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Sub-Phase 5.1 & 5.2, SCHEMA_REFERENCE.md §13.3
 *
 * Capabilities:
 *   1. Isolated iframe runtime boundary (`sandbox="allow-scripts allow-same-origin"`)
 *   2. Real-time DOM reconciliation from active project AST (`useProjectStore`)
 *   3. Runtime exception trapping (window.onerror, unhandledrejection, console.error)
 *      routed directly to Panel 07 (Output Console / DiagnosticBus)
 *   4. Mock Database & Service Worker API Interceptor:
 *      - In-memory & IndexedDB store seeded from project AST schemas & records
 *      - Client-side fetch monkey-patch & Service Worker bridge for zero-backend `/api/*` requests
 *      - Live Play Mode HUD inspector drawer with real-time CRUD and API test triggers
 *   5. Bi-directional message bus for user element interaction and Blueprint execution
 * ============================================================================
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  RotateCcw,
  Square,
  AlertCircle,
  Play,
  CheckCircle2,
  Bug,
  Sparkles,
  ExternalLink,
  Smartphone,
  Tablet,
  Monitor,
  Plus,
  Trash2,
  Zap,
  RefreshCw,
  Sliders,
  ChevronDown,
  X,
  Send,
  Activity,
} from "lucide-react";
import { useProjectStore, PageDefinition, StateVariable } from "@/core/store/useProjectStore";
import { DiagnosticBus } from "@/core/engine/DiagnosticBus";
import { mockDatabase } from "@/runtime/MockDatabase";
import { mockApiServer } from "@/runtime/MockApiServer";
import { executionTracer } from "@/runtime/ExecutionTracer";
import { hotReloadEngine } from "@/runtime/HotReloadEngine";
import { ExecutionRun } from "@/core/types/trace";
import type { Layer } from "@/core/document/schema";
import { propReader } from "@/core/document/properties";
import { useLayers } from "@/core/store/useDocumentStore";

export interface SandboxHostProps {
  width?: number | string;
  height?: number | string;
  deviceMode?: "desktop" | "tablet" | "mobile";
  onStopPlay?: () => void;
  onElementClick?: (elementId: string) => void;
  onOpenExecutionTrace?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

interface TrappedError {
  id: string;
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  timestamp: number;
}

/**
 * Generates modern inline HTML markup from the project AST element tree.
 */
export function generateElementMarkup(
  elementId: string,
  elements: Record<string, Layer>,
  stateVars: Record<string, StateVariable> = {}
): string {
  const el = elements[elementId];
  if (!el) return "";

  const get = propReader(el.properties);
  const childrenHtml = (el.children || [])
    .map((childId) => generateElementMarkup(childId, elements, stateVars))
    .join("\n");

  // Interpolate state variables in text/label strings if pattern {{varName}} exists
  const interpolate = (str: unknown): string => {
    if (typeof str !== "string") return String(str ?? "");
    return str.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (_, varName) => {
      const v = stateVars[varName];
      return v !== undefined ? String(v.value ?? v.defaultValue ?? "") : `{{${varName}}}`;
    });
  };

  switch (el.archetype) {
    case "container":
    case "form": {
      const isCard = el.name.toLowerCase().includes("card");
      const display = get("layout.display") || "flex";
      const flexDirection = get("layout.flexDirection") || "column";
      const gap = get("layout.gap") !== undefined ? `${get("layout.gap")}px` : "16px";
      const padding = get("layout.padding") !== undefined ? `${get("layout.padding")}px` : "20px";
      const bg = get("appearance.background.color") || (isCard ? "#FFFFFF" : "transparent");
      const radius =
        get("appearance.radius") !== undefined
          ? `${get("appearance.radius")}px`
          : isCard
          ? "8px"
          : "0px";
      const border = isCard ? "1px solid #E2E8F0" : "none";
      const shadow = isCard ? "0 4px 12px rgba(15, 23, 42, 0.05)" : "none";

      return `
        <div
          id="${el.id}"
          data-element-id="${el.id}"
          data-archetype="${el.archetype}"
          style="
            display: ${display};
            flex-direction: ${flexDirection};
            gap: ${gap};
            padding: ${padding};
            background-color: ${bg};
            border-radius: ${radius};
            border: ${border};
            box-shadow: ${shadow};
            box-sizing: border-box;
            transition: all 0.2s ease;
          "
        >
          ${childrenHtml}
        </div>
      `;
    }

    case "text": {
      const text = interpolate(get("content.text") || el.name || "Text Content");
      const fontSize = get("typography.fontSize") ? `${get("typography.fontSize")}px` : "15px";
      const fontWeight = get("typography.fontWeight") || 500;
      const color = get("typography.color") || "#0F172A";
      const textAlign = get("typography.textAlign") || "left";

      return `
        <div
          id="${el.id}"
          data-element-id="${el.id}"
          data-archetype="${el.archetype}"
          style="
            font-size: ${fontSize};
            font-weight: ${fontWeight};
            color: ${color};
            text-align: ${textAlign};
            line-height: 1.5;
            margin: 0;
            cursor: pointer;
          "
        >
          ${text}
        </div>
      `;
    }

    case "button": {
      const label = interpolate(get("content.label") || el.name || "Button");
      const bg = get("appearance.background.color") || "#206859";
      const color = get("typography.color") || "#FFFFFF";
      const disabled = Boolean(get("interaction.disabled"));

      return `
        <button
          id="${el.id}"
          data-element-id="${el.id}"
          data-archetype="button"
          ${disabled ? "disabled" : ""}
          style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 20px;
            font-size: 13px;
            font-weight: 600;
            color: ${color};
            background-color: ${bg};
            border: none;
            border-radius: 6px;
            cursor: ${disabled ? "not-allowed" : "pointer"};
            opacity: ${disabled ? "0.6" : "1"};
            box-shadow: 0 2px 6px rgba(0,0,0,0.08);
            transition: all 0.15s ease;
            outline: none;
          "
          onmouseover="this.style.filter='brightness(1.08)'; this.style.transform='translateY(-1px)';"
          onmouseout="this.style.filter='none'; this.style.transform='none';"
          onmousedown="this.style.transform='translateY(1px)';"
        >
          <span>${label}</span>
        </button>
      `;
    }

    case "input": {
      const placeholder = interpolate(get("input.placeholder") || "Type here...");
      const value = interpolate(get("input.value") || "");

      return `
        <div
          id="${el.id}"
          data-element-id="${el.id}"
          data-archetype="input"
          style="display: flex; flex-direction: column; gap: 4px; width: 100%; box-sizing: border-box;"
        >
          <input
            type="text"
            data-input-element-id="${el.id}"
            placeholder="${placeholder}"
            value="${value}"
            style="
              padding: 9px 12px;
              font-size: 13px;
              border: 1px solid #CBD5E1;
              border-radius: 6px;
              background-color: #FFFFFF;
              color: #0F172A;
              outline: none;
              box-sizing: border-box;
              transition: border-color 0.15s ease;
            "
            onfocus="this.style.borderColor='#206859';"
            onblur="this.style.borderColor='#CBD5E1';"
          />
        </div>
      `;
    }

    case "image": {
      const src =
        get("media.src") ||
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80";
      const alt = get("media.alt") || "Application Asset";

      return `
        <img
          id="${el.id}"
          data-element-id="${el.id}"
          data-archetype="image"
          src="${src}"
          alt="${alt}"
          style="
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            object-fit: cover;
          "
        />
      `;
    }

    default:
      return `
        <div id="${el.id}" data-element-id="${el.id}" style="box-sizing: border-box;">
          ${childrenHtml}
        </div>
      `;
  }
}

/**
 * Builds the complete standalone HTML document for the sandbox iframe,
 * embedding exception trapping, user interaction listeners, and the
 * client-side Mock API fetch interceptor.
 */
export function buildSandboxDocument(
  page: PageDefinition,
  elements: Record<string, Layer>,
  stateVars: Record<string, StateVariable> = {}
): string {
  const rootElementHtml =
    page.rootElementId && elements[page.rootElementId]
      ? generateElementMarkup(page.rootElementId, elements, stateVars)
      : Object.values(elements)
          .filter((e) => !e.parentId)
          .map((e) => generateElementMarkup(e.id, elements, stateVars))
          .join("\n");

  const mockApiScript = mockApiServer.getInjectedScript();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sandbox Runtime Preview</title>
  <style>
    /* Modern Reset & Typography */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #F8FAFC;
      color: #0F172A;
      min-height: 100vh;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
      padding: 24px;
    }
    button, input, textarea, select {
      font: inherit;
    }
    [data-element-id] {
      position: relative;
    }
    .sandbox-click-ripple {
      position: absolute;
      width: 10px;
      height: 10px;
      background: rgba(32, 104, 89, 0.4);
      border-radius: 50%;
      pointer-events: none;
      transform: scale(0);
      animation: rippleAnim 0.45s ease-out forwards;
    }
    @keyframes rippleAnim {
      to {
        transform: scale(8);
        opacity: 0;
      }
    }
  </style>

  <!-- Fail-Safe Exception Trapping Script -->
  <script>
    (function() {
      // 1. Trap global runtime script errors
      window.onerror = function(message, source, lineno, colno, error) {
        var errorData = {
          type: "SANDBOX_RUNTIME_ERROR",
          payload: {
            message: String(message || "Runtime Exception"),
            source: source || "sandbox.html",
            lineno: lineno || 0,
            colno: colno || 0,
            stack: error && error.stack ? error.stack : (new Error().stack || ""),
            timestamp: Date.now()
          }
        };
        try {
          window.parent.postMessage(errorData, "*");
        } catch(e) {}
        return true;
      };

      // 2. Trap unhandled asynchronous promise rejections
      window.addEventListener("unhandledrejection", function(event) {
        var reason = event.reason;
        var errorData = {
          type: "SANDBOX_RUNTIME_ERROR",
          payload: {
            message: "Unhandled Promise Rejection: " + (reason && reason.message ? reason.message : String(reason)),
            stack: reason && reason.stack ? reason.stack : "",
            timestamp: Date.now()
          }
        };
        try {
          window.parent.postMessage(errorData, "*");
        } catch(e) {}
      });

      // 3. Trap console.error and console.warn
      var _origError = console.error;
      console.error = function() {
        var args = Array.prototype.slice.call(arguments);
        var msg = args.map(function(a) {
          return typeof a === "object" ? JSON.stringify(a) : String(a);
        }).join(" ");
        try {
          window.parent.postMessage({
            type: "SANDBOX_CONSOLE_ERROR",
            payload: { message: msg, timestamp: Date.now() }
          }, "*");
        } catch(e) {}
        _origError.apply(console, arguments);
      };

      // 4. Trap interactive click events and notify host
      document.addEventListener("click", function(e) {
        var target = e.target.closest("[data-element-id]");
        if (target) {
          var elId = target.getAttribute("data-element-id");
          try {
            window.parent.postMessage({
              type: "SANDBOX_ELEMENT_CLICK",
              payload: {
                elementId: elId,
                clientX: e.clientX,
                clientY: e.clientY
              }
            }, "*");
          } catch(err) {}

          var rect = target.getBoundingClientRect();
          var ripple = document.createElement("div");
          ripple.className = "sandbox-click-ripple";
          ripple.style.left = (e.clientX - rect.left - 5) + "px";
          ripple.style.top = (e.clientY - rect.top - 5) + "px";
          target.appendChild(ripple);
          setTimeout(function() {
            if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
          }, 500);
        }
      }, true);

      // 5. Signal to parent that sandbox has mounted and is ready
      window.addEventListener("DOMContentLoaded", function() {
        try {
          window.parent.postMessage({ type: "SANDBOX_READY", timestamp: Date.now() }, "*");
        } catch(e) {}
      });

      // 6. Sub-Phase 5.5: In-sandbox Live Hot Patch Listener
      window.addEventListener("message", function(event) {
        if (!event.data || event.data.type !== "SANDBOX_HOT_PATCH") return;
        var msg = event.data.payload;
        if (!msg) return;

        if (msg.action === "update_property" && msg.elementId) {
          var targetEl = document.querySelector('[data-element-id="' + msg.elementId + '"]');
          if (targetEl && msg.properties) {
            // Apply inline styles if provided
            if (msg.properties.style && typeof msg.properties.style === "object") {
              for (var key in msg.properties.style) {
                if (msg.properties.style.hasOwnProperty(key)) {
                  targetEl.style[key] = msg.properties.style[key];
                }
              }
            }
            // Apply textContent if provided
            if (msg.properties.textContent !== undefined) {
              targetEl.textContent = String(msg.properties.textContent);
            }
            // Apply className if provided
            if (msg.properties.className !== undefined) {
              targetEl.className = String(msg.properties.className);
            }
            // Apply custom HTML attributes
            if (msg.properties.attributes && typeof msg.properties.attributes === "object") {
              for (var attr in msg.properties.attributes) {
                if (msg.properties.attributes.hasOwnProperty(attr)) {
                  targetEl.setAttribute(attr, msg.properties.attributes[attr]);
                }
              }
            }
            // Visual feedback flash
            targetEl.classList.add("sandbox-hot-patch-flash");
            setTimeout(function() {
              targetEl.classList.remove("sandbox-hot-patch-flash");
            }, 600);
          }
        } else if (msg.action === "update_state_variable" && msg.variableId) {
          window["_state_" + msg.variableId] = msg.newValue;
        }
      });
    })();
  </script>

  <!-- Sub-Phase 5.2: Injected Mock API Fetch Interceptor & Database Bridge -->
  <script>
    ${mockApiScript}

    // Direct in-sandbox DB helper
    window.db = {
      query: function(coll) {
        return fetch('/api/' + coll).then(function(r) { return r.json(); });
      },
      getById: function(coll, id) {
        return fetch('/api/' + coll + '/' + id).then(function(r) { return r.json(); });
      },
      insert: function(coll, data) {
        return fetch('/api/' + coll, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(function(r) { return r.json(); });
      },
      update: function(coll, id, updates) {
        return fetch('/api/' + coll + '/' + id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        }).then(function(r) { return r.json(); });
      },
      delete: function(coll, id) {
        return fetch('/api/' + coll + '/' + id, { method: 'DELETE' }).then(function(r) { return r.json(); });
      }
    };
  </script>
</head>
<body>
  <div id="sandbox-root">
    ${rootElementHtml}
  </div>
</body>
</html>`;
}

const DEFAULT_PAGE: PageDefinition = {
  id: "default_page",
  name: "Home",
  slug: "/",
  rootElementId: "",
};

export const SandboxHost: React.FC<SandboxHostProps> = ({
  width = "100%",
  height = "100%",
  deviceMode = "desktop",
  onStopPlay,
  onElementClick,
  onOpenExecutionTrace,
  className = "",
  style = {},
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isSandboxReady, setIsSandboxReady] = useState(false);
  const [trappedErrors, setTrappedErrors] = useState<TrappedError[]>([]);
  const [lastClickedElement, setLastClickedElement] = useState<string | null>(null);

  // Sub-Phase 5.2: Mock Database Drawer & Controls State
  const [selectedCollection, setSelectedCollection] = useState<string>("Products");
  const [apiLatency, setApiLatency] = useState<number>(50);
  const [testApiStatus, setTestApiStatus] = useState<string | null>(null);
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [newRecordForm, setNewRecordForm] = useState<Record<string, string>>({});
  const [dbMutationTick, setDbMutationTick] = useState(0);

  // AST state from store
  const elements = useLayers();
  const {
    pages,
    activePageId,
    stateVariables,
    databaseSchemas,
    databaseRecords,
    activeBlueprintGraphId,
    blueprintGraphs,
  } = useProjectStore();

  const [lastTraceRun, setLastTraceRun] = useState<ExecutionRun | null>(
    () => executionTracer.getLatestRun() || null
  );

  useEffect(() => {
    return executionTracer.subscribe((run) => {
      setLastTraceRun(run);
    });
  }, []);

  const activePage = pages[activePageId] || Object.values(pages)[0] || DEFAULT_PAGE;

  // Seed MockDatabase with project schemas and records on mount or store change
  useEffect(() => {
    mockDatabase.seed(databaseSchemas, databaseRecords);
  }, [databaseSchemas, databaseRecords]);

  // Fall back to the first collection when the selected one no longer exists
  if (!databaseSchemas[selectedCollection]) {
    const firstCol = Object.keys(databaseSchemas)[0];
    if (firstCol) setSelectedCollection(firstCol);
  }

  // Subscribe to live MockDatabase mutations to update the local HUD table
  useEffect(() => {
    return mockDatabase.subscribe(() => {
      setDbMutationTick((t) => t + 1);
    });
  }, []);

  // Sub-Phase 5.5: Hot Reload Engine Lifecycle
  useEffect(() => {
    if (iframeRef.current) {
      hotReloadEngine.activate(iframeRef.current);
    }
    return () => {
      hotReloadEngine.deactivate();
    };
  }, []);

  // Sync server latency setting
  const handleLatencyChange = useCallback((ms: number) => {
    setApiLatency(ms);
    mockApiServer.setLatency(ms);
  }, []);

  // Compile full sandbox HTML document (a manual reload remounts the iframe via `key={reloadKey}`)
  const sandboxHtml = useMemo(() => {
    return buildSandboxDocument(activePage, elements, stateVariables);
  }, [activePage, elements, stateVariables]);

  // Handle reload action
  const handleRestart = useCallback(() => {
    setTrappedErrors([]);
    setIsSandboxReady(false);
    setReloadKey((k) => k + 1);

    DiagnosticBus.emit({
      channel: "SANDBOX_INFO",
      severity: "info",
      source: {
        panel: "SandboxHost",
        entityId: "sandbox-runtime",
        entityName: "Play Mode Host",
      },
      message: "Sandbox runtime environment reloaded successfully.",
    });
  }, []);

  // Intentional error simulation for verifying Panel 07 routing
  const handleSimulateError = useCallback(() => {
    const errorMsg = "ReferenceError: userProfile is not defined at handleButtonClick (line 42)";
    const simulatedError: TrappedError = {
      id: `err_${Date.now()}`,
      message: errorMsg,
      source: "Sandbox Simulation",
      lineno: 42,
      colno: 18,
      timestamp: Date.now(),
    };

    setTrappedErrors((prev) => [simulatedError, ...prev]);

    DiagnosticBus.emit({
      channel: "SANDBOX_ERR",
      severity: "error",
      source: {
        panel: "Panel 07: Output Console (Sandbox Host)",
        entityId: "sandbox-simulated",
        entityName: "Play Mode Simulator",
        propertyKey: "userProfile",
      },
      message: `[SANDBOX_ERR] ${errorMsg}`,
      suggestion: "Define state variable 'userProfile' in My Blueprint or bind a valid database collection.",
      targetInspectorSection: "state-matrix",
      isFixable: true,
    });
  }, []);

  // Test Fetch API call directly
  const handleTestFetch = useCallback(async () => {
    setTestApiStatus("Executing...");
    const url = `/api/${selectedCollection}`;
    const start = performance.now();
    try {
      const res = await mockApiServer.handleRequest(url);
      const data = await res.json();
      const dur = Math.round(performance.now() - start);
      const count = Array.isArray(data) ? data.length : 1;
      setTestApiStatus(`200 OK • ${count} items • ${dur}ms`);
      setTimeout(() => setTestApiStatus(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestApiStatus(`Error: ${msg}`);
    }
  }, [selectedCollection]);

  // Handle Add Record submit in HUD drawer
  const handleSaveRecord = useCallback(() => {
    try {
      const payload: Record<string, unknown> = {};
      const schema = databaseSchemas[selectedCollection];
      if (schema) {
        for (const [fieldName, field] of Object.entries(schema.fields)) {
          if (field.isPrimaryKey) continue;
          const inputVal = newRecordForm[fieldName];
          if (inputVal !== undefined && inputVal !== "") {
            if (field.type === "Int") payload[fieldName] = parseInt(inputVal, 10);
            else if (field.type === "Float") payload[fieldName] = parseFloat(inputVal);
            else if (field.type === "Boolean") payload[fieldName] = inputVal === "true";
            else payload[fieldName] = inputVal;
          } else if (field.type === "Boolean") {
            payload[fieldName] = false;
          }
        }
      }
      mockDatabase.insert(selectedCollection, payload);
      setIsAddingRecord(false);
      setNewRecordForm({});
    } catch (err: unknown) {
      alert(`Insert failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [databaseSchemas, selectedCollection, newRecordForm]);

  // Window postMessage listener: bridges sandbox exceptions, element clicks, & API requests
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;
      const { type, payload } = event.data;

      // Handle in-sandbox /api/* fetch requests intercepted inside iframe
      if (type === "MOCK_API_REQUEST") {
        const { requestId, url, options } = event.data;
        const res = await mockApiServer.handleRequest(url, options || {});
        let data: unknown = null;
        try {
          data = await res.json();
        } catch {
          data = null;
        }

        iframeRef.current?.contentWindow?.postMessage(
          {
            type: "MOCK_API_RESPONSE",
            requestId,
            response: {
              status: res.status,
              statusText: res.statusText,
              data,
            },
          },
          "*"
        );
        return;
      }

      if (type === "SANDBOX_READY") {
        setIsSandboxReady(true);
        if (iframeRef.current) {
          hotReloadEngine.activate(iframeRef.current);
          hotReloadEngine.setSandboxIframe(iframeRef.current);
        }
        DiagnosticBus.emit({
          channel: "SANDBOX_INFO",
          severity: "info",
          source: {
            panel: "SandboxHost",
            entityId: "sandbox-ready",
            entityName: "Play Mode Host",
          },
          message: "Sandbox iframe runtime successfully initialized and DOM reconciled.",
        });
      } else if (type === "SANDBOX_RUNTIME_ERROR" || type === "SANDBOX_CONSOLE_ERROR") {
        const err: TrappedError = {
          id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          message: payload.message || "Runtime Error",
          source: payload.source,
          lineno: payload.lineno,
          colno: payload.colno,
          stack: payload.stack,
          timestamp: payload.timestamp || Date.now(),
        };

        setTrappedErrors((prev) => [err, ...prev.slice(0, 9)]);

        DiagnosticBus.emit({
          channel: "SANDBOX_ERR",
          severity: "error",
          source: {
            panel: "Panel 07: Output Console (Sandbox Host)",
            entityId: payload.source || "sandbox-runtime",
            entityName: "In-Memory Sandbox",
          },
          message: `[SANDBOX_ERR] ${payload.message}`,
          suggestion: "Inspect element properties or blueprint wire connections in the Logic Blueprint editor.",
          isFixable: false,
        });
      } else if (type === "SANDBOX_ELEMENT_CLICK") {
        const elId = payload.elementId;
        setLastClickedElement(elId);
        if (onElementClick) {
          onElementClick(elId);
        }

        // Sub-Phase 5.3: Trigger real-time Execution Trace & wire pulse simulation
        if (activeBlueprintGraphId && blueprintGraphs[activeBlueprintGraphId]) {
          executionTracer.simulateGraphExecution(
            blueprintGraphs[activeBlueprintGraphId],
            `onClick (${elements[elId]?.name || elId})`
          );
        }

        DiagnosticBus.emit({
          channel: "SANDBOX_INFO",
          severity: "info",
          source: {
            panel: "SandboxHost",
            entityId: elId,
            entityName: elements[elId]?.name || elId,
          },
          message: `Element '${elements[elId]?.name || elId}' clicked in Play Mode runtime.`,
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [elements, onElementClick, activeBlueprintGraphId, blueprintGraphs]);

  // Derived DB stats
  const collectionNames = mockDatabase.getCollectionNames();
  const currentCollectionRecords = mockDatabase.query(selectedCollection);
  const currentSchema = databaseSchemas[selectedCollection];
  const totalDbRecords = collectionNames.reduce(
    (acc, name) => acc + mockDatabase.count(name),
    0
  );

  return (
    <div
      className={`sandbox-host-container ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        height,
        backgroundColor: "#0B0F19",
        position: "relative",
        overflow: "hidden",
        borderRadius: 8,
        border: "1px solid #1E293B",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.28)",
        ...style,
      }}
    >
      {/* Play Mode Floating HUD Control Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          height: 38,
          backgroundColor: "#0F172A",
          borderBottom: "1px solid #1E293B",
          color: "#E2E8F0",
          fontSize: 11,
          fontWeight: 600,
          zIndex: 30,
        }}
      >
        {/* Left: Play Mode Active Badge & Device Mode */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 8px",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              borderRadius: 4,
              color: "#10B981",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "#10B981",
                boxShadow: "0 0 8px #10B981",
                animation: "pulse 1.8s infinite",
              }}
            />
            <span>SIMULATION ACTIVE</span>
          </div>

          <span style={{ color: "#64748B", fontSize: 11 }}>•</span>

          {/* Sub-Phase 5.5: Hot Reload Status Indicator */}
          <div
            className="hot-reload-indicator"
            title="Hot Reload Engine active: updates to element properties and state patch the live iframe without restart"
          >
            <span className="hot-reload-indicator__dot" />
            <span>HOT RELOAD</span>
          </div>


          {/* Sub-Phase 5.3: Execution Trace Trigger */}
          {onOpenExecutionTrace && (
            <button
              type="button"
              onClick={onOpenExecutionTrace}
              title="Open Visual Execution Trace (Blueprint Debugger)"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 8px",
                backgroundColor: "#1E293B",
                border: "1px solid #334155",
                borderRadius: 4,
                color: "#38BDF8",
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Activity size={11} />
              <span>
                Trace: {lastTraceRun ? `${lastTraceRun.steps.length} steps` : "Live"}
              </span>
            </button>
          )}

          <span style={{ color: "#64748B", fontSize: 11 }}>•</span>

          <span style={{ color: "#94A3B8", display: "flex", alignItems: "center", gap: 4 }}>
            {deviceMode === "desktop" && <Monitor size={12} />}
            {deviceMode === "tablet" && <Tablet size={12} />}
            {deviceMode === "mobile" && <Smartphone size={12} />}
            <span style={{ textTransform: "capitalize" }}>{deviceMode}</span>
          </span>

          {lastClickedElement && (
            <span
              style={{
                fontSize: 10,
                color: "#CBD5E1",
                backgroundColor: "#1E293B",
                padding: "2px 6px",
                borderRadius: 3,
              }}
            >
              Event: {elements[lastClickedElement]?.name || lastClickedElement}
            </span>
          )}
        </div>

        {/* Right: Runtime Controls (Simulate Error, Reload, Stop) */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Debug Error Trigger button */}
          <button
            type="button"
            onClick={handleSimulateError}
            title="Inject a test runtime error to verify Output Log trapping"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 7px",
              borderRadius: 4,
              border: "1px solid #334155",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              color: "#F87171",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Bug size={11} />
            <span>Simulate Error</span>
          </button>

          {/* Reload / Restart Runtime Sandbox */}
          <button
            type="button"
            onClick={handleRestart}
            title="Restart runtime sandbox and re-reconcile DOM (Ctrl+R)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 4,
              border: "1px solid #334155",
              backgroundColor: "#1E293B",
              color: "#E2E8F0",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <RotateCcw size={11} />
            <span>Restart</span>
          </button>

          {/* Stop Simulation Button */}
          {onStopPlay && (
            <button
              type="button"
              onClick={onStopPlay}
              title="Stop simulation and return to Design Editor (Esc)"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 10px",
                borderRadius: 4,
                border: "1px solid rgba(239, 68, 68, 0.5)",
                backgroundColor: "#EF4444",
                color: "#FFFFFF",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Square size={10} fill="#FFFFFF" />
              <span>Stop (Esc)</span>
            </button>
          )}
        </div>
      </div>

      {/* Trapped Error Alert Banner */}
      {trappedErrors.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 14px",
            backgroundColor: "rgba(185, 28, 28, 0.95)",
            borderBottom: "1px solid #DC2626",
            color: "#FFFFFF",
            fontSize: 11,
            fontWeight: 500,
            zIndex: 25,
            animation: "slideDown 0.2s ease-out",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={14} style={{ color: "#FCA5A5", flexShrink: 0 }} />
            <span>
              <strong>[SANDBOX_ERR]</strong> {trappedErrors[0].message}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, opacity: 0.85 }}>Routed to Output Log (Panel 07)</span>
            <button
              type="button"
              onClick={() => setTrappedErrors([])}
              style={{
                background: "transparent",
                border: "none",
                color: "#FFFFFF",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                padding: "0 4px",
              }}
              title="Dismiss error notice"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Isolated iframe Runtime Boundary */}
      <div
        style={{
          flex: 1,
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <iframe
          key={reloadKey}
          ref={iframeRef}
          srcDoc={sandboxHtml}
          title="Visual Application Runtime Sandbox"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            backgroundColor: "#F8FAFC",
            display: "block",
          }}
        />
      </div>
    </div>
  );
};
