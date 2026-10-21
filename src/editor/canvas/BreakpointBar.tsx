"use client";

import React, { useState } from "react";
import { invokeCommand } from "@/core/commands";
import { breakpointsOf, isBase } from "@/core/breakpoints/breakpoints";
import { targetFrameId } from "@/core/breakpoints/breakpointOps";
import { useBreakpointStore } from "@/core/store/useBreakpointStore";
import { useBreakpointViewStore } from "@/core/store/useBreakpointViewStore";
import { useModeStore } from "@/core/store/useModeStore";
import { modesOf } from "@/core/tokens/tokens";
import { documentStore } from "@/core/store/documentState";

/**
 * The breakpoint bar (ROADMAP Phase 43), like Wix Studio's: one button for each breakpoint of the document, widest
 * (the base) first. Choosing a smaller one shows the page at that width, and edits from then on are that
 * breakpoint's overrides. A frame is responsive when its width follows the bar; "Responsive" turns that on or off for
 * the frame you are working in. "+" adds a breakpoint of your own width.
 */
export const BreakpointBar: React.FC = () => {
  const activeId = useBreakpointStore((s) => s.activeId);
  const doc = documentStore((s) => s.document);
  const list = breakpointsOf(doc);
  const base = isBase(list, activeId);
  const showAll = useBreakpointViewStore((s) => s.showAll);
  const activeMode = useModeStore((s) => s.activeModeId);
  const modes = modesOf(doc);
  const [adding, setAdding] = useState(false);
  const [width, setWidth] = useState("1024");
  const frameId = targetFrameId();
  const responsive = frameId ? doc.layers[frameId]?.properties["breakpoints.responsive"] === true : false;
  return (
    <div className="breakpoint-bar" role="toolbar" aria-label="Breakpoints" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: "max-content", maxWidth: "calc(100% - 24px)", whiteSpace: "nowrap", display: "flex", gap: 4, alignItems: "center", padding: 4, borderRadius: 10, background: "var(--panel-bg, #fff)", boxShadow: "0 1px 6px rgba(0,0,0,0.18)", zIndex: 45, fontSize: 12 }}>
      {list.map((b, i) => (
        <button
          key={b.id}
          type="button"
          className="panel-icon-btn panel-text-btn"
          aria-pressed={(base && i === 0) || b.id === activeId}
          aria-label={`${b.name} ${b.width}`}
          title={`${b.name}: ${b.width} px${i === 0 ? " (base)" : ""}`}
          style={{ padding: "3px 8px", fontWeight: (base && i === 0) || b.id === activeId ? 600 : 400 }}
          onClick={() => void invokeCommand("breakpoint.set", { id: i === 0 ? null : b.id })}
        >
          {b.name} <span style={{ opacity: 0.6 }}>{b.width}</span>
        </button>
      ))}
      {adding ? (
        <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
          <input
            aria-label="New breakpoint width"
            type="number"
            min={100}
            max={10000}
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void invokeCommand("breakpoint.add", { name: `${width}`, width: Number(width) });
                setAdding(false);
              } else if (e.key === "Escape") setAdding(false);
            }}
            style={{ width: 64 }}
            autoFocus
          />
        </span>
      ) : (
        <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Add breakpoint" title="Add a breakpoint" onClick={() => setAdding(true)} style={{ padding: "3px 8px" }}>
          +
        </button>
      )}
      <button type="button" className="panel-icon-btn panel-text-btn" aria-pressed={showAll} aria-label="Show all breakpoints" title="Show every breakpoint of a responsive page side by side" onClick={() => useBreakpointViewStore.getState().setShowAll(!showAll)} style={{ fontWeight: showAll ? 600 : 400 }}>
        All
      </button>
      {Object.keys(doc.variables ?? {}).length > 0 && (
        <span role="group" aria-label="Mode" style={{ display: "inline-flex", gap: 2, marginLeft: 6, paddingLeft: 6, borderLeft: "1px solid rgba(128,128,128,0.3)" }}>
          {modes.map((m, i) => (
            <button key={m.id} type="button" className="panel-icon-btn panel-text-btn" aria-pressed={(activeMode ?? modes[0].id) === m.id} aria-label={`Mode: ${m.name}`} style={{ fontWeight: (activeMode ?? modes[0].id) === m.id ? 600 : 400 }} onClick={() => void invokeCommand("token.setMode", { id: i === 0 ? null : m.id })}>
              {m.name}
            </button>
          ))}
        </span>
      )}
      {!base && list.length > 1 && (
        <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Remove ${list.find((b) => b.id === activeId)?.name ?? "breakpoint"}`} title="Remove this breakpoint and its overrides" onClick={() => void invokeCommand("breakpoint.remove", { id: activeId })} style={{ padding: "3px 8px" }}>
          ×
        </button>
      )}
      {frameId && (
        <label style={{ display: "inline-flex", gap: 4, alignItems: "center", marginLeft: 6, opacity: 0.85 }} title="The frame's width follows the breakpoint">
          <input type="checkbox" aria-label="Responsive" checked={responsive} onChange={(e) => void invokeCommand("breakpoint.setResponsive", { on: e.target.checked })} />
          Responsive
        </label>
      )}
    </div>
  );
};
