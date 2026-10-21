"use client";

import React from "react";
import { invokeCommand } from "@/core/commands";
import { useDocument } from "@/core/store/useDocumentStore";

/** The document's components in the Assets panel (ROADMAP Phase 46): click to put an instance on the canvas, or go to the main component. */
export const ComponentsList: React.FC = () => {
  const components = useDocument((d) => d.designComponents);
  const layers = useDocument((d) => d.layers);
  const list = Object.values(components ?? {});
  if (list.length === 0) return null;
  const counts = new Map<string, number>();
  for (const l of Object.values(layers)) if (l.instance?.root) counts.set(l.instance.component, (counts.get(l.instance.component) ?? 0) + 1);
  return (
    <section aria-label="Components" style={{ padding: "6px 8px", borderBottom: "1px solid var(--border-subtle, rgba(128,128,128,0.2))" }}>
      <strong style={{ fontSize: 11 }}>Components</strong>
      <ul style={{ listStyle: "none", margin: "4px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        {list.map((c) => (
          <li key={c.id} data-component={c.name} style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center", fontSize: 12 }}>
            <span>
              {c.name} <span style={{ opacity: 0.6 }}>{counts.get(c.id) ?? 0}</span>
            </span>
            <span style={{ display: "flex", gap: 4 }}>
              <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Insert ${c.name}`} onClick={() => void invokeCommand("component.insert", { component: c.id })}>
                Insert
              </button>
              <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Go to ${c.name}`} onClick={() => void invokeCommand("component.goToMain", { id: c.mainId })}>
                Main
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};
