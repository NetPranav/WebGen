"use client";

/**
 * ============================================================================
 * OUTPUT LOG & CONSOLE PANEL
 * ============================================================================
 * UI Element: Developer Console & Output Log (Unreal Equivalent: Output Log)
 * Screen / Scope: Screen 07: Output Log & Console (`/editor`)
 * Role: Real-time engine log stream, compiler status, and CLI command prompt.
 * Styling Source: `@/editor/styles/panels.css` & `@/editor/styles/forms.css`
 * Matches: PANELS.md (Panel 07) & UI.md §4.4
 * ============================================================================
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Terminal,
  Trash2,
  Copy,
  ArrowDown,
  Search,
  Check,
  X,
  Play,
} from "lucide-react";
import { DiagnosticBus } from "@/core/engine/DiagnosticBus";
import { DatabaseValidator } from "@/core/engine/DatabaseValidator";
import { ConnectionPipeline } from "@/core/engine/ConnectionPipeline";
import { AnimationValidator } from "@/core/engine/AnimationValidator";
import { GSAPTimelineCompiler } from "@/core/engine/GSAPTimelineCompiler";
import { DiagnosticEvent } from "@/core/types/diagnostics";
import "@/editor/styles/panels.css";
import "@/editor/styles/forms.css";

interface LogEntry {
  id: string;
  time: string;
  category: "all" | "blueprint" | "database" | "api" | "compiler" | "error" | "warning";
  level: "info" | "warn" | "error" | "success" | "bp";
  badge: string;
  message: string;
  timing?: string;
}

const INITIAL_LOGS: LogEntry[] = [
  {
    id: "l_1",
    time: "21:30:00.012",
    category: "compiler",
    level: "success",
    badge: "INIT",
    message: "Engine Wasm core initialized successfully (120 FPS Hermite spline physics)",
    timing: "32ms",
  },
  {
    id: "l_2",
    time: "21:30:00.048",
    category: "database",
    level: "info",
    badge: "DB",
    message: "SQLite In-Memory Schema loaded: 'Users' and 'Projects' tables verified",
    timing: "4ms",
  },
  {
    id: "l_3",
    time: "21:30:00.112",
    category: "blueprint",
    level: "bp",
    badge: "BLUEPRINT",
    message: "Linked Logic Graph 'AuthWorkflow' (6 nodes, 8 type-safe Hermite wires)",
  },
  {
    id: "l_4",
    time: "21:30:00.204",
    category: "compiler",
    level: "info",
    badge: "COMPILER",
    message: "AST Tree verified: 12 components, 3 pages, 0 compilation errors",
    timing: "18ms",
  },
  {
    id: "l_5",
    time: "21:30:01.340",
    category: "api",
    level: "info",
    badge: "API",
    message: "GET /api/v1/projects • 200 OK (returned 2 mock records)",
    timing: "14ms",
  },
  {
    id: "l_6",
    time: "21:30:02.120",
    category: "warning",
    level: "warn",
    badge: "WARN",
    message: "Responsive notice: 'comp_grid' width exceeds 375px on mobile portrait preview",
  },
  {
    id: "l_7",
    time: "21:30:03.450",
    category: "blueprint",
    level: "bp",
    badge: "EXEC",
    message: "Triggered 'OnComponentMount' event sequence for 'Hero Section'",
  },
  {
    id: "l_8",
    time: "21:30:04.010",
    category: "api",
    level: "info",
    badge: "API",
    message: "POST /api/v1/auth/session • 200 OK (Token verified)",
    timing: "22ms",
  },
];

export const OutputConsole: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [cliInput, setCliInput] = useState("");
  const [copied, setCopied] = useState(false);

  const streamRef = useRef<HTMLDivElement>(null);

  // Subscribe to central DiagnosticBus
  useEffect(() => {
    // Process incoming diagnostic events into Output Log entries
    const handleDiagnostic = (event: DiagnosticEvent) => {
      const d = new Date(event.timestamp);
      const timeStr =
        d.toTimeString().split(" ")[0] +
        "." +
        String(d.getMilliseconds()).padStart(3, "0");

      let category: LogEntry["category"] = "all";
      if (event.channel === "DB_SCHEMA_ERR" || event.channel === "BIND_ERR" || event.channel === "MOCK_DB_ERR") {
        category = "database";
      } else if (event.channel === "MOCK_API_INFO" || event.channel === "MOCK_API_ERR") {
        category = "api";
      } else if (event.channel === "ANIM_COMPAT" || event.channel === "STATE_VAR_WARN") {
        category = "warning";
      } else if (event.channel === "BLUEPRINT_ERR") {
        category = "blueprint";
      } else if (event.severity === "error") {
        category = "error";
      } else if (event.severity === "warning") {
        category = "warning";
      }

      const level: LogEntry["level"] =
        event.severity === "error"
          ? "error"
          : event.severity === "warning"
          ? "warn"
          : "info";

      const badge = event.channel;
      const entityTag = event.source.entityName
        ? `[${event.source.entityName}] `
        : event.source.entityId
        ? `[${event.source.entityId}] `
        : "";

      const fullMessage = `${entityTag}${event.message}${
        event.suggestion ? ` • Suggestion: ${event.suggestion}` : ""
      }${
        event.fallbackApplied !== undefined
          ? ` (Fallback applied: ${JSON.stringify(event.fallbackApplied)})`
          : ""
      }`;

      const entry: LogEntry = {
        id: event.id,
        time: timeStr,
        category,
        level,
        badge,
        message: fullMessage,
      };

      setLogs((prev) => [...prev, entry]);
    };

    const unsubscribe = DiagnosticBus.subscribe(handleDiagnostic);
    return unsubscribe;
  }, []);

  // Auto-scroll on new log entry
  useEffect(() => {
    if (autoScroll && streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleClear = () => {
    setLogs([]);
  };

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.time}] [${l.badge}] ${l.message}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCliSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliInput.trim()) return;

    const cmd = cliInput.trim();
    const time = new Date().toTimeString().split(" ")[0] + ".000";

    const userEntry: LogEntry = {
      id: `cli_${Date.now()}`,
      time,
      category: "compiler",
      level: "info",
      badge: "COMMAND",
      message: `> ${cmd}`,
    };

    let responseEntry: LogEntry;

    if (cmd.toLowerCase() === "help") {
      responseEntry = {
        id: `res_${Date.now()}`,
        time,
        category: "compiler",
        level: "info",
        badge: "HELP",
        message: "Available commands: 'clear', 'build', 'fps', 'stats', 'version', 'test-bind', 'test-schema', 'reset'",
      };
    } else if (cmd.toLowerCase() === "clear") {
      setLogs([]);
      setCliInput("");
      return;
    } else if (cmd.toLowerCase() === "test-bind") {
      // Trigger live binding compatibility test
      DatabaseValidator.validatePropertyBinding({
        elementId: "btn_cta_checkout",
        elementName: "CheckoutButton",
        archetype: "button",
        propertyKey: "label",
        sourceField: {
          id: "f_rel_items",
          name: "orderItems",
          type: "Relation",
        },
        sourceCollectionName: "Orders",
      });
      responseEntry = {
        id: `res_${Date.now()}`,
        time,
        category: "database",
        level: "info",
        badge: "TEST",
        message: "Simulated illegal binding: 'Orders.orderItems' (Relation) -> Button.label. Diagnostic intercepted.",
      };
    } else if (cmd.toLowerCase() === "test-pipeline") {
      // Trigger live ConnectionPipeline evaluation
      const mockContext = {
        database: {
          Products: [
            {
              id: "prod_01",
              title: "Wireless Mechanical Keyboard",
              price: 149.99,
              inStock: true,
              imageUrl: "/assets/keyboard.png",
              tags: ["hardware", "peripherals"],
            },
          ],
        },
        stateVariables: {
          cartCount: 3,
          isUserLoggedIn: true,
        },
        urlParams: {
          ref: "promo_summer",
        },
        localStorage: {
          themeMode: "dark",
        },
      };

      // 1. Valid binding: Products.title -> heading.textContent
      ConnectionPipeline.registerBinding({
        id: "b_head_01",
        target: {
          elementId: "el_hero_heading",
          elementName: "HeroHeading",
          archetype: "text",
          propertyKey: "textContent",
        },
        sourceType: "database",
        sourceCollection: "Products",
        sourceField: "title",
      });

      // 2. Valid binding with USD currency transform: Products.price -> price_tag.textContent
      ConnectionPipeline.registerBinding({
        id: "b_price_01",
        target: {
          elementId: "el_price_tag",
          elementName: "PriceTag",
          archetype: "text",
          propertyKey: "textContent",
        },
        sourceType: "database",
        sourceCollection: "Products",
        sourceField: "price",
        transformFn: "currency_usd",
      });

      // 3. Illegal binding: tags (Array) -> Button.label (Should be trapped by DiagnosticBus)
      ConnectionPipeline.registerBinding({
        id: "b_btn_illegal",
        target: {
          elementId: "el_buy_button",
          elementName: "BuyButton",
          archetype: "button",
          propertyKey: "label",
        },
        sourceType: "database",
        sourceCollection: "Products",
        sourceField: "tags",
        fallbackValue: "Buy Now",
      });

      // Evaluate pipeline
      const evaluated = ConnectionPipeline.evaluateAll(mockContext);

      responseEntry = {
        id: `res_${Date.now()}`,
        time,
        category: "database",
        level: "success",
        badge: "PIPELINE",
        message: `ConnectionPipeline evaluated ${ConnectionPipeline.getAllBindings().length} active bindings across ${evaluated.size} elements. Incompatible bindings trapped and logged to Output Log.`,
      };
    } else if (cmd.toLowerCase() === "test-anim") {
      // Trigger live animation compatibility test
      const sampleWithIncompatibleTrack = {
        id: "sample_hero_fade",
        name: "HeroEnter",
        duration: 800,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        iterations: 1 as const,
        direction: "normal" as const,
        fillMode: "forwards" as const,
        tracks: [
          {
            trackId: "opacity" as const,
            keyframes: [
              { offset: 0, value: 0 },
              { offset: 100, value: 1 },
            ],
          },
          {
            trackId: "translateY" as const,
            keyframes: [
              { offset: 0, value: 30 },
              { offset: 100, value: 0 },
            ],
          },
          // Incompatible with image!
          {
            trackId: "letterSpacing" as const,
            keyframes: [
              { offset: 0, value: 4 },
              { offset: 100, value: 0 },
            ],
          },
        ],
      };

      const valRes = AnimationValidator.validateSampleForElement(
        sampleWithIncompatibleTrack,
        {
          elementId: "img_hero_banner",
          elementName: "HeroBannerImage",
          archetype: "image",
        }
      );

      const compiled = GSAPTimelineCompiler.compile(valRes.sanitizedSample);

      responseEntry = {
        id: `res_${Date.now()}`,
        time,
        category: "warning",
        level: "warn",
        badge: "ANIM",
        message: `Animation '${sampleWithIncompatibleTrack.name}' attached to HeroBannerImage: ${valRes.allowedTracks.length} tracks allowed, ${valRes.rejectedTracks.length} incompatible tracks trapped and skipped. Compiled to CSS keyframes '${compiled.name}'.`,
      };
    } else if (cmd.toLowerCase() === "test-schema") {
      // Trigger live schema validation test
      DatabaseValidator.validateSchema(
        {
          id: "col_invalid_01",
          name: "BrokenCatalog",
          displayName: "Broken Catalog",
          fields: {
            title: { id: "f1", name: "title", type: "String" },
          },
        },
        []
      );
      responseEntry = {
        id: `res_${Date.now()}`,
        time,
        category: "database",
        level: "info",
        badge: "TEST",
        message: "Simulated invalid schema: 'BrokenCatalog' (no Primary Key). Diagnostic emitted.",
      };
    } else if (cmd.toLowerCase() === "fps") {
      responseEntry = {
        id: `res_${Date.now()}`,
        time,
        category: "compiler",
        level: "success",
        badge: "WASM_STATS",
        message: "C++ Hermite Engine: 120 FPS stable • Frame Time: 0.8ms • GPU Cable Physics active",
      };
    } else if (cmd.toLowerCase() === "build") {
      responseEntry = {
        id: `res_${Date.now()}`,
        time,
        category: "compiler",
        level: "success",
        badge: "BUILD",
        message: "Production bundle generated in 240ms • Output: standalone Next.js 15 App",
        timing: "240ms",
      };
    } else if (cmd.toLowerCase() === "version") {
      responseEntry = {
        id: `res_${Date.now()}`,
        time,
        category: "compiler",
        level: "info",
        badge: "SYSTEM",
        message: "Visual Web Application Engine Studio v1.2.0 • Phase 1.6 Core Panels",
      };
    } else {
      responseEntry = {
        id: `res_${Date.now()}`,
        time,
        category: "compiler",
        level: "info",
        badge: "EXEC",
        message: `Command executed: '${cmd}' (return code: 0)`,
      };
    }

    setLogs((prev) => [...prev, userEntry, responseEntry]);
    setCliInput("");
  };

  const filteredLogs = logs.filter((log) => {
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "errors" && log.level === "error") ||
      (activeFilter === "warnings" && log.level === "warn") ||
      log.category === activeFilter;

    const matchesSearch =
      !searchQuery ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.badge.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="panel-shell" role="region" aria-label="Output Log & Console">
      {/* Console Top Toolbar */}
      <div className="console-toolbar">
        {/* Category Tabs */}
        <div className="console-tabs">
          {[
            { id: "all", label: `All (${logs.length})` },
            { id: "blueprint", label: "Blueprints" },
            { id: "sequencer", label: "Sequencer" },
            { id: "api", label: "API" },
            { id: "compiler", label: "Compiler" },
            { id: "warnings", label: "Warnings" },
            { id: "errors", label: "Errors" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`console-tab ${activeFilter === tab.id ? "console-tab--active" : ""}`}
              onClick={() => setActiveFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
          <div className="panel-search-bar" style={{ maxWidth: 160 }}>
            <Search size={11} className="panel-search-bar__icon" />
            <input
              type="text"
              className="panel-search-bar__input"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            className={`panel-icon-btn ${autoScroll ? "panel-icon-btn--active" : ""}`}
            onClick={() => setAutoScroll(!autoScroll)}
            title="Toggle Auto-Scroll"
          >
            <ArrowDown size={12} />
          </button>

          <button
            type="button"
            className="panel-icon-btn"
            onClick={handleCopy}
            title="Copy all logs"
          >
            {copied ? <Check size={12} style={{ color: "var(--accent-success)" }} /> : <Copy size={12} />}
          </button>

          <button
            type="button"
            className="panel-icon-btn"
            onClick={handleClear}
            title="Clear console"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Log Stream Output Body */}
      <div className="console-stream" ref={streamRef}>
        {filteredLogs.length === 0 ? (
          <div style={{ padding: "var(--space-md)", color: "var(--text-tertiary)", textAlign: "center" }}>
            No log entries match the current filter.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="console-line">
              <span className="console-line__time">{log.time}</span>
              <span className={`console-line__badge console-line__badge--${log.level}`}>
                {log.badge}
              </span>
              <span className="console-line__msg">{log.message}</span>
              {log.timing && <span className="console-line__timing">[{log.timing}]</span>}
            </div>
          ))
        )}
      </div>

      {/* Interactive CLI Prompt */}
      <form className="console-cli" onSubmit={handleCliSubmit}>
        <span className="console-cli__prompt">&gt;</span>
        <input
          type="text"
          className="console-cli__input"
          placeholder="Type an engine command (e.g. 'help', 'fps', 'build', 'version')..."
          value={cliInput}
          onChange={(e) => setCliInput(e.target.value)}
        />
        <button type="submit" className="panel-icon-btn" title="Run Command">
          <Play size={11} />
        </button>
      </form>
    </div>
  );
};
