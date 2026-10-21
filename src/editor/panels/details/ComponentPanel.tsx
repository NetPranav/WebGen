"use client";

/**
 * Components on the selection (ROADMAP Phase 46), in the Design inspector: for a main component its name, how many
 * instances it has and a way to make a component from a plain frame; for a layer of an instance, what it came from, the
 * properties it overrides (each can be reset), and reset, swap, detach and "go to main component".
 */

import React from "react";
import { invokeCommand } from "@/core/commands";
import { instanceRootOf } from "@/core/components/instances";
import { documentStore } from "@/core/store/documentState";
import { useLayers } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";

const run = (command: string, args?: unknown) => void invokeCommand(command, args);
const box: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, padding: "6px 8px", borderBottom: "1px solid var(--border-subtle, rgba(128,128,128,0.2))", fontSize: 11 };

export const ComponentPanel: React.FC = () => {
  const doc = documentStore((s) => s.document);
  const layers = useLayers();
  const ids = useSelectionStore((s) => s.selectedIds).filter((id) => layers[id]);
  if (ids.length === 0) return null;
  const first = layers[ids[0]];
  const comps = Object.values(doc.designComponents ?? {});
  const componentId = first.componentMain ?? first.instance?.component;
  const comp = componentId ? doc.designComponents?.[componentId] : undefined;
  const raw = doc.layers[first.id];

  if (first.componentMain && comp) {
    const count = Object.values(doc.layers).filter((l) => l.instance?.component === comp.id && l.instance.root).length;
    return (
      <section aria-label="Component" style={box}>
        <strong>Main component</strong>
        <span>
          {comp.name} · {count} {count === 1 ? "instance" : "instances"}
        </span>
        <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Insert instance" onClick={() => run("component.insert", { component: comp.id })}>
            Insert instance
          </button>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Delete component" onClick={() => run("component.delete", { component: comp.id })}>
            Delete component
          </button>
        </span>
      </section>
    );
  }

  if (first.instance && comp) {
    const rootId = instanceRootOf(doc.layers, first.id);
    const overridden = raw?.instance?.overridden ?? [];
    return (
      <section aria-label="Instance" style={box}>
        <strong>Instance of {comp.name}</strong>
        {overridden.length > 0 ? (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            {overridden.map((k) => (
              <li key={k} data-overridden={k} style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                <span title={k}>{k}</span>
                <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Reset ${k}`} onClick={() => run("component.resetOverrides", { ids: [first.id], keys: [k] })}>
                  Reset
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <span style={{ opacity: 0.7 }}>No overrides on this layer.</span>
        )}
        <span style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Go to main component" onClick={() => run("component.goToMain", { id: first.id })}>
            Go to main
          </button>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Reset all overrides of the instance" onClick={() => run("component.resetOverrides", { ids: rootId ? [rootId] : [first.id] })}>
            Reset all
          </button>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Detach instance" onClick={() => run("component.detach", { ids: [first.id] })}>
            Detach
          </button>
        </span>
        {comps.length > 1 && (
          <select aria-label="Swap instance" value="" onChange={(e) => e.target.value && run("component.swap", { component: e.target.value, id: first.id })}>
            <option value="">Swap with…</option>
            {comps
              .filter((c) => c.id !== comp.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        )}
      </section>
    );
  }

  // a frame that could become a component
  if (first.archetype === "container" && first.parentId !== null) {
    return (
      <section aria-label="Component" style={box}>
        <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Create component" title="Create component (Ctrl+Alt+K)" onClick={() => run("component.create")}>
          Create component
        </button>
      </section>
    );
  }
  return null;
};
