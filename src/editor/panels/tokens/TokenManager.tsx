"use client";

/**
 * The token manager (ROADMAP Phase 45), the inspector's Tokens tab: modes, colour and number variables with a value
 * for each mode, and text and effect styles made from the selected layer. Every control runs a `token.*` or
 * `style.*` command.
 */

import React, { useState } from "react";
import { invokeCommand } from "@/core/commands";
import { documentStore } from "@/core/store/documentState";
import { useModeStore } from "@/core/store/useModeStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { groupVariables, modesOf, type StyleDef, type Variable } from "@/core/tokens/tokens";

const run = (command: string, args: unknown) => void invokeCommand(command, args);
const row: React.CSSProperties = { display: "flex", gap: 6, alignItems: "center", fontSize: 12 };

const VariableRow: React.FC<{ variable: Variable; modes: { id: string; name: string }[] }> = ({ variable, modes }) => (
  <li data-variable={variable.name} style={{ ...row, flexWrap: "wrap", padding: "3px 0" }}>
    <input
      aria-label={`Name of ${variable.name}`}
      key={variable.name}
      defaultValue={variable.name}
      style={{ flex: "1 1 90px", minWidth: 0 }}
      onBlur={(e) => e.target.value.trim() && e.target.value !== variable.name && run("token.updateVariable", { id: variable.id, name: e.target.value })}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
    {modes.map((m) =>
      variable.type === "color" ? (
        <input key={m.id} type="color" aria-label={`${variable.name} in ${m.name}`} title={m.name} value={/^#[0-9a-f]{6}$/i.test(String(variable.values[m.id])) ? String(variable.values[m.id]) : "#000000"} onChange={(e) => run("token.updateVariable", { id: variable.id, values: { [m.id]: e.target.value } })} />
      ) : (
        <input
          key={`${m.id}:${variable.values[m.id]}`}
          type="number"
          aria-label={`${variable.name} in ${m.name}`}
          title={m.name}
          defaultValue={Number(variable.values[m.id] ?? 0)}
          style={{ width: 56 }}
          onBlur={(e) => e.target.value !== "" && Number(e.target.value) !== variable.values[m.id] && run("token.updateVariable", { id: variable.id, values: { [m.id]: Number(e.target.value) } })}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      ),
    )}
    <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Delete ${variable.name}`} onClick={() => run("token.deleteVariable", { id: variable.id })}>
      Delete
    </button>
  </li>
);

const StyleRow: React.FC<{ style: StyleDef }> = ({ style }) => (
  <li data-style={style.name} style={{ ...row, justifyContent: "space-between", padding: "3px 0" }}>
    <span>{style.name}</span>
    <span style={row}>
      <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Apply ${style.name}`} onClick={() => run("style.apply", { id: style.id })}>
        Apply
      </button>
      <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Delete style ${style.name}`} onClick={() => run("style.delete", { id: style.id })}>
        Delete
      </button>
    </span>
  </li>
);

export const TokenManager: React.FC = () => {
  const doc = documentStore((s) => s.document);
  const activeMode = useModeStore((s) => s.activeModeId);
  const selected = useSelectionStore((s) => s.selectedIds);
  const modes = modesOf(doc);
  const variables = Object.values(doc.variables ?? {});
  const styles = Object.values(doc.styles ?? {});
  const [name, setName] = useState("");
  const [modeName, setModeName] = useState("");
  const create = (type: "color" | "number") => {
    if (!name.trim()) return;
    run("token.createVariable", { name: name.trim(), type, values: type === "color" ? { [modes[0].id]: "#6366f1" } : { [modes[0].id]: 8 } });
    setName("");
  };
  const makeStyle = (kind: "text" | "effect") => {
    if (!name.trim() || selected.length === 0) return;
    run("style.create", { kind, name: name.trim(), from: selected[0] });
    setName("");
  };
  return (
    <div className="token-manager" role="region" aria-label="Tokens" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 10, overflow: "auto", height: "100%" }}>
      <section aria-label="Modes">
        <strong style={{ fontSize: 11 }}>Modes</strong>
        <div style={{ ...row, flexWrap: "wrap", marginTop: 4 }}>
          {modes.map((m, i) => (
            <span key={m.id} style={row}>
              <button type="button" className="panel-icon-btn panel-text-btn" aria-pressed={(activeMode ?? modes[0].id) === m.id} aria-label={`View ${m.name}`} style={{ fontWeight: (activeMode ?? modes[0].id) === m.id ? 600 : 400 }} onClick={() => run("token.setMode", { id: i === 0 ? null : m.id })}>
                {m.name}
              </button>
              {i > 0 && (
                <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Remove mode ${m.name}`} onClick={() => run("token.removeMode", { id: m.id })}>
                  ×
                </button>
              )}
            </span>
          ))}
          <input aria-label="New mode" placeholder="New mode" value={modeName} style={{ width: 90 }} onChange={(e) => setModeName(e.target.value)} onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && modeName.trim()) {
              run("token.addMode", { name: modeName.trim() });
              setModeName("");
            }
          }} />
        </div>
      </section>

      <section aria-label="New token">
        <div style={{ ...row, flexWrap: "wrap" }}>
          <input aria-label="Token name" placeholder="Name (brand/primary)" value={name} style={{ flex: "1 1 120px", minWidth: 0 }} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="New colour variable" onClick={() => create("color")}>Colour</button>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="New number variable" onClick={() => create("number")}>Number</button>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="New text style from selection" disabled={selected.length === 0} onClick={() => makeStyle("text")}>Text style</button>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="New effect style from selection" disabled={selected.length === 0} onClick={() => makeStyle("effect")}>Effect style</button>
        </div>
      </section>

      <section aria-label="Variables">
        <strong style={{ fontSize: 11 }}>Variables {variables.length > 0 && <span style={{ opacity: 0.6 }}>{variables.length}</span>}</strong>
        {variables.length === 0 ? (
          <p style={{ fontSize: 11, opacity: 0.65, margin: "4px 0" }}>Name a colour or a number above, then bind layers to it in the Design tab: change it once and every layer follows, in every mode.</p>
        ) : (
          groupVariables(variables).map((g) => (
            <div key={g.group || "ungrouped"} style={{ marginTop: 6 }}>
              {g.group && <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase" }}>{g.group}</div>}
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {g.items.map((v) => (
                  <VariableRow key={v.id} variable={v} modes={modes} />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section aria-label="Styles">
        <strong style={{ fontSize: 11 }}>Styles {styles.length > 0 && <span style={{ opacity: 0.6 }}>{styles.length}</span>}</strong>
        {styles.length === 0 ? (
          <p style={{ fontSize: 11, opacity: 0.65, margin: "4px 0" }}>Select a layer, name a style above and choose Text style or Effect style.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {styles.map((s) => (
              <StyleRow key={s.id} style={s} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
