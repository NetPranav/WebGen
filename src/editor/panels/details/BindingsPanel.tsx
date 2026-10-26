"use client";

/**
 * Tokens on the selection (ROADMAP Phase 45), in the Design inspector: which properties follow a variable, shown as
 * bound or detached (a detached one keeps its value and says which variable it came from, with a way back), a way to
 * bind a property to a variable, and the text and effect styles the selection follows. FigCraft port F10: string and
 * boolean variables (text, font, visibility), pickers offer only variables in scope, fill, stroke and grid styles, and
 * the mode a frame shows for each collection.
 */

import React, { useState } from "react";
import { invokeCommand } from "@/core/commands";
import { documentStore } from "@/core/store/documentState";
import { useLayers } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { collectionsOf, inScope, scopeOfPath, type StyleSlot, type VariableType } from "@/core/tokens/tokens";

const run = (command: string, args: unknown) => void invokeCommand(command, args);

/** The properties a variable can be bound to from here, by the kind of variable. */
const BINDABLE: Record<VariableType, { path: string; label: string }[]> = {
  color: [
    { path: "appearance.background.color", label: "Fill" },
    { path: "typography.color", label: "Text colour" },
    { path: "appearance.border.color", label: "Border colour" },
    { path: "svg.fill", label: "Shape fill" },
    { path: "svg.stroke", label: "Stroke" },
  ],
  number: [
    { path: "appearance.radius", label: "Corner radius" },
    { path: "layout.gap", label: "Gap" },
    { path: "layout.padding", label: "Padding" },
    { path: "typography.fontSize", label: "Font size" },
    { path: "appearance.opacity", label: "Opacity" },
  ],
  string: [
    { path: "content.text", label: "Text" },
    { path: "typography.fontFamily", label: "Font family" },
  ],
  boolean: [{ path: "visible", label: "Visibility" }],
};

const SLOTS: { slot: StyleSlot; kind: string; label: string; none: string }[] = [
  { slot: "text", kind: "text", label: "Text style", none: "No text style" },
  { slot: "effect", kind: "effect", label: "Effect style", none: "No effect style" },
  { slot: "fill", kind: "paint", label: "Fill style", none: "No fill style" },
  { slot: "stroke", kind: "paint", label: "Stroke style", none: "No stroke style" },
  { slot: "grid", kind: "grid", label: "Grid style", none: "No grid style" },
];

const box: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, padding: "6px 8px", borderBottom: "1px solid var(--border-subtle, rgba(128,128,128,0.2))", fontSize: 11 };

export const BindingsPanel: React.FC = () => {
  const doc = documentStore((s) => s.document);
  const layers = useLayers();
  const ids = useSelectionStore((s) => s.selectedIds).filter((id) => layers[id]);
  const variables = Object.values(doc.variables ?? {});
  const styles = Object.values(doc.styles ?? {});
  const [variableId, setVariableId] = useState("");
  const [path, setPath] = useState("");
  if (ids.length === 0 || (variables.length === 0 && styles.length === 0)) return null;
  const first = layers[ids[0]];
  const bound = Object.entries(first.tokens ?? {});
  const chosen = doc.variables?.[variableId] ?? variables[0];
  // only the properties the chosen variable's scopes allow on this layer
  const options = chosen ? BINDABLE[chosen.type].filter((o) => inScope(chosen, scopeOfPath(o.path, first.archetype))) : [];
  const target = options.some((o) => o.path === path) ? path : (options[0]?.path ?? "");
  const refs = (first.styleRefs ?? {}) as Partial<Record<StyleSlot, string>>;
  const own = (first as { variableModes?: Record<string, string> }).variableModes ?? {};
  const collections = collectionsOf(doc).filter((c) => c.modes.length > 1 && variables.some((v) => (v.collection ?? "default") === c.id));
  return (
    <section aria-label="Tokens on the selection" style={box}>
      <strong>Variables &amp; styles</strong>
      {bound.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {bound.map(([p, b]) => {
            const v = doc.variables?.[b.variable];
            return (
              <li key={p} data-binding={p} data-detached={b.detached ? "true" : undefined} style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
                <span title={p}>
                  {p} <span style={{ opacity: 0.7 }}>{b.detached ? `detached from ${v?.name ?? "a deleted variable"}` : `→ ${v?.name ?? "missing variable"}`}</span>
                </span>
                <span style={{ display: "flex", gap: 4 }}>
                  {b.detached ? (
                    v && (
                      <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Re-link ${p}`} onClick={() => run("token.bind", { path: p, variable: b.variable, ids })}>
                        Re-link
                      </button>
                    )
                  ) : (
                    <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Detach ${p}`} onClick={() => run("token.detach", { path: p, ids })}>
                      Detach
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {variables.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
          <select aria-label="Variable" value={chosen?.id ?? ""} onChange={(e) => setVariableId(e.target.value)}>
            {variables.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <select aria-label="Bind to property" value={target} onChange={(e) => setPath(e.target.value)}>
            {options.map((o) => (
              <option key={o.path} value={o.path}>
                {o.label}
              </option>
            ))}
          </select>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Bind" disabled={!chosen || !target} onClick={() => chosen && run("token.bind", { path: target, variable: chosen.id, ids })}>
            Bind
          </button>
        </div>
      )}
      {SLOTS.map(({ slot, kind, label, none }) => {
        const list = styles.filter((st) => st.kind === kind);
        if (list.length === 0) return null;
        const current = refs[slot];
        return (
          <div key={slot} style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <select aria-label={label} value={current ?? ""} onChange={(e) => (e.target.value ? run("style.apply", { id: e.target.value, ids, slot }) : run("style.detach", { kind: slot, ids }))}>
              <option value="">{none}</option>
              {list.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
            {current && (
              <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Detach ${slot} style`} onClick={() => run("style.detach", { kind: slot, ids })}>
                Detach
              </button>
            )}
          </div>
        );
      })}
      {first.archetype === "container" &&
        collections.map((c) => (
          <label key={c.id} style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "space-between" }}>
            {c.name} mode
            <select aria-label={`${c.name} mode`} value={own[c.id] ?? ""} onChange={(e) => run("token.setLayerMode", { collection: c.id, mode: e.target.value || null, ids })}>
              <option value="">Auto</option>
              {c.modes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        ))}
    </section>
  );
};
