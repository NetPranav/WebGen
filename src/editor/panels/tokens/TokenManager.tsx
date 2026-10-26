"use client";

/**
 * The token manager (ROADMAP Phase 45), the inspector's Tokens tab: modes, colour and number variables with a value
 * for each mode, and text and effect styles made from the selected layer. Every control runs a `token.*` or
 * `style.*` command. FigCraft port F10: string and boolean variables, a value that is an alias of another variable,
 * a description, scopes and code syntax per variable; collections, each with its own modes; paint and grid styles.
 */

import React, { useState } from "react";
import { invokeCommand } from "@/core/commands";
import { documentStore } from "@/core/store/documentState";
import { useModeStore } from "@/core/store/useModeStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { DEFAULT_COLLECTION, SCOPES, collectionOf, collectionsOf, groupVariables, isAlias, modesOf, type Collection, type StyleDef, type Variable, type VariableType } from "@/core/tokens/tokens";

const run = (command: string, args: unknown) => void invokeCommand(command, args);
const row: React.CSSProperties = { display: "flex", gap: 6, alignItems: "center", fontSize: 12 };
const stop = (e: React.KeyboardEvent) => e.stopPropagation();
const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
  e.stopPropagation();
  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
};

/** One mode's value: a literal editor for the variable's type, or the variable it aliases. */
const ValueCell: React.FC<{ variable: Variable; mode: { id: string; name: string }; others: Variable[] }> = ({ variable, mode, others }) => {
  const v = variable.values[mode.id];
  const label = `${variable.name} in ${mode.name}`;
  const set = (value: unknown) => run("token.updateVariable", { id: variable.id, values: { [mode.id]: value } });
  const aliasSelect = (
    <select
      aria-label={`Alias for ${variable.name} (${mode.name})`}
      value={isAlias(v) ? v.alias : ""}
      style={{ maxWidth: 90 }}
      onChange={(e) => (e.target.value ? run("token.setAlias", { id: variable.id, mode: mode.id, alias: e.target.value }) : undefined)}
    >
      <option value="">{isAlias(v) ? "Alias…" : "→"}</option>
      {others.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
  if (isAlias(v)) {
    return (
      <span style={row} title={mode.name}>
        {aliasSelect}
        <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Detach alias of ${variable.name} (${mode.name})`} onClick={() => set(variable.type === "color" ? "#000000" : variable.type === "number" ? 0 : variable.type === "string" ? "" : true)}>
          ×
        </button>
      </span>
    );
  }
  let editor: React.ReactNode;
  if (variable.type === "color") editor = <input type="color" aria-label={label} title={mode.name} value={/^#[0-9a-f]{6}$/i.test(String(v)) ? String(v) : "#000000"} onChange={(e) => set(e.target.value)} />;
  else if (variable.type === "boolean") editor = <input type="checkbox" aria-label={label} title={mode.name} checked={v === true} onChange={(e) => set(e.target.checked)} />;
  else if (variable.type === "string")
    editor = <input key={`${mode.id}:${String(v)}`} aria-label={label} title={mode.name} defaultValue={String(v ?? "")} style={{ width: 80 }} onBlur={(e) => e.target.value !== v && set(e.target.value)} onKeyDown={blurOnEnter} />;
  else
    editor = (
      <input
        key={`${mode.id}:${String(v)}`}
        type="number"
        aria-label={label}
        title={mode.name}
        defaultValue={Number(v ?? 0)}
        style={{ width: 56 }}
        onBlur={(e) => e.target.value !== "" && Number(e.target.value) !== v && set(Number(e.target.value))}
        onKeyDown={blurOnEnter}
      />
    );
  return (
    <span style={{ ...row, gap: 2 }}>
      {editor}
      {others.length > 0 && aliasSelect}
    </span>
  );
};

/** Description, scopes and code syntax of a variable. */
const VariableDetails: React.FC<{ variable: Variable; collections: Collection[] }> = ({ variable, collections }) => {
  const scopes = SCOPES[variable.type];
  const on = (id: string) => !variable.scopes || variable.scopes.includes(id) || variable.scopes.includes("ALL_SCOPES");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", padding: "4px 0 4px 8px", borderLeft: "2px solid var(--border-subtle, rgba(128,128,128,0.3))" }}>
      <input
        key={`d:${variable.description ?? ""}`}
        aria-label={`Description of ${variable.name}`}
        placeholder="Description"
        defaultValue={variable.description ?? ""}
        onBlur={(e) => e.target.value.trim() !== (variable.description ?? "") && run("token.updateVariable", { id: variable.id, description: e.target.value })}
        onKeyDown={blurOnEnter}
      />
      {scopes.length > 0 && (
        <fieldset style={{ border: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: "2px 8px", fontSize: 11 }} aria-label={`Scopes of ${variable.name}`}>
          {scopes.map(([id, label]) => (
            <label key={id} style={{ display: "flex", gap: 3, alignItems: "center" }}>
              <input
                type="checkbox"
                aria-label={`${variable.name} scope ${label}`}
                checked={on(id)}
                onChange={(e) => {
                  const now = scopes.map(([k]) => k).filter((k) => (k === id ? e.target.checked : on(k)));
                  run("token.updateVariable", { id: variable.id, scopes: now });
                }}
              />
              {label}
            </label>
          ))}
        </fieldset>
      )}
      <label style={row}>
        Web code
        <input
          key={`c:${variable.codeSyntax?.WEB ?? ""}`}
          aria-label={`Web code syntax of ${variable.name}`}
          placeholder="var(--name)"
          defaultValue={variable.codeSyntax?.WEB ?? ""}
          style={{ flex: 1, minWidth: 0 }}
          onBlur={(e) => e.target.value.trim() !== (variable.codeSyntax?.WEB ?? "") && run("token.updateVariable", { id: variable.id, codeSyntax: { WEB: e.target.value } })}
          onKeyDown={blurOnEnter}
        />
      </label>
      {collections.length > 1 && (
        <label style={row}>
          Collection
          <select aria-label={`Collection of ${variable.name}`} value={variable.collection ?? DEFAULT_COLLECTION} onChange={(e) => run("token.moveVariable", { id: variable.id, collection: e.target.value })}>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
};

const VariableRow: React.FC<{ variable: Variable; modes: { id: string; name: string }[]; all: Variable[]; collections: Collection[] }> = ({ variable, modes, all, collections }) => {
  const [open, setOpen] = useState(false);
  const others = all.filter((o) => o.id !== variable.id && o.type === variable.type);
  return (
    <li data-variable={variable.name} style={{ ...row, flexWrap: "wrap", padding: "3px 0" }}>
      <input
        aria-label={`Name of ${variable.name}`}
        key={variable.name}
        defaultValue={variable.name}
        title={variable.description}
        style={{ flex: "1 1 90px", minWidth: 0 }}
        onBlur={(e) => e.target.value.trim() && e.target.value !== variable.name && run("token.updateVariable", { id: variable.id, name: e.target.value })}
        onKeyDown={blurOnEnter}
      />
      {modes.map((m) => (
        <ValueCell key={m.id} variable={variable} mode={m} others={others} />
      ))}
      <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`More about ${variable.name}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        …
      </button>
      <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Delete ${variable.name}`} onClick={() => run("token.deleteVariable", { id: variable.id })}>
        Delete
      </button>
      {open && <VariableDetails variable={variable} collections={collections} />}
    </li>
  );
};

const StyleRow: React.FC<{ style: StyleDef }> = ({ style }) => (
  <li data-style={style.name} style={{ ...row, justifyContent: "space-between", padding: "3px 0" }}>
    <span title={style.description}>
      {style.name} <span style={{ opacity: 0.55, fontSize: 10 }}>{style.kind}</span>
    </span>
    <span style={row}>
      <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Apply ${style.name}`} onClick={() => run("style.apply", { id: style.id })}>
        Apply
      </button>
      {style.kind === "paint" && (
        <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Use ${style.name} as stroke`} onClick={() => run("style.apply", { id: style.id, slot: "stroke" })}>
          Stroke
        </button>
      )}
      <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Delete style ${style.name}`} onClick={() => run("style.delete", { id: style.id })}>
        Delete
      </button>
    </span>
  </li>
);

/** A collection's modes: view (the default collection only), add, rename by name, remove. */
const ModeList: React.FC<{ collection: Collection; activeMode: string | null }> = ({ collection, activeMode }) => {
  const [modeName, setModeName] = useState("");
  const isDefault = collection.id === DEFAULT_COLLECTION;
  const label = isDefault ? "New mode" : `New mode in ${collection.name}`;
  return (
    <div style={{ ...row, flexWrap: "wrap", marginTop: 4 }}>
      {collection.modes.map((m, i) => (
        <span key={m.id} style={row}>
          {isDefault ? (
            <button type="button" className="panel-icon-btn panel-text-btn" aria-pressed={(activeMode ?? collection.modes[0].id) === m.id} aria-label={`View ${m.name}`} style={{ fontWeight: (activeMode ?? collection.modes[0].id) === m.id ? 600 : 400 }} onClick={() => run("token.setMode", { id: i === 0 ? null : m.id })}>
              {m.name}
            </button>
          ) : (
            <span>{m.name}</span>
          )}
          {i > 0 && (
            <button type="button" className="panel-icon-btn panel-text-btn" aria-label={isDefault ? `Remove mode ${m.name}` : `Remove mode ${m.name} from ${collection.name}`} onClick={() => run("token.removeMode", { id: m.id, ...(isDefault ? {} : { collection: collection.id }) })}>
              ×
            </button>
          )}
        </span>
      ))}
      <input
        aria-label={label}
        placeholder="New mode"
        value={modeName}
        style={{ width: 90 }}
        onChange={(e) => setModeName(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter" && modeName.trim()) {
            run("token.addMode", { name: modeName.trim(), ...(isDefault ? {} : { collection: collection.id }) });
            setModeName("");
          }
        }}
      />
    </div>
  );
};

export const TokenManager: React.FC = () => {
  const doc = documentStore((s) => s.document);
  const activeMode = useModeStore((s) => s.activeModeId);
  const selected = useSelectionStore((s) => s.selectedIds);
  const collections = collectionsOf(doc);
  const variables = Object.values(doc.variables ?? {}) as Variable[];
  const styles = Object.values(doc.styles ?? {}) as StyleDef[];
  const [name, setName] = useState("");
  const [collection, setCollection] = useState(DEFAULT_COLLECTION);
  const [collectionName, setCollectionName] = useState("");
  const target = collections.find((c) => c.id === collection) ?? collections[0];
  const create = (type: VariableType) => {
    if (!name.trim()) return;
    const first = target.modes[0].id;
    const value = type === "color" ? "#6366f1" : type === "number" ? 8 : type === "string" ? name.trim() : true;
    run("token.createVariable", { name: name.trim(), type, values: { [first]: value }, ...(target.id === DEFAULT_COLLECTION ? {} : { collection: target.id }) });
    setName("");
  };
  const makeStyle = (kind: "text" | "effect" | "paint" | "grid") => {
    if (!name.trim() || selected.length === 0) return;
    run("style.create", { kind, name: name.trim(), from: selected[0] });
    setName("");
  };
  return (
    <div className="token-manager" role="region" aria-label="Tokens" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 10, overflow: "auto", height: "100%" }}>
      <section aria-label="Modes">
        <strong style={{ fontSize: 11 }}>Modes</strong>
        <ModeList collection={collections[0]} activeMode={activeMode} />
      </section>

      <section aria-label="Collections">
        <strong style={{ fontSize: 11 }}>Collections</strong>
        {collections.slice(1).map((c) => (
          <div key={c.id} data-collection={c.name} style={{ marginTop: 6 }}>
            <div style={{ ...row, justifyContent: "space-between" }}>
              <input
                key={c.name}
                aria-label={`Name of collection ${c.name}`}
                defaultValue={c.name}
                style={{ flex: 1, minWidth: 0 }}
                onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && run("token.renameCollection", { id: c.id, name: e.target.value })}
                onKeyDown={blurOnEnter}
              />
              <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Delete collection ${c.name}`} onClick={() => run("token.deleteCollection", { id: c.id })}>
                Delete
              </button>
            </div>
            <ModeList collection={c} activeMode={null} />
          </div>
        ))}
        <div style={{ ...row, marginTop: 4 }}>
          <input aria-label="New collection" placeholder="New collection" value={collectionName} style={{ flex: 1, minWidth: 0 }} onChange={(e) => setCollectionName(e.target.value)} onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && collectionName.trim()) {
              run("token.createCollection", { name: collectionName.trim() });
              setCollectionName("");
            }
          }} />
        </div>
      </section>

      <section aria-label="New token">
        <div style={{ ...row, flexWrap: "wrap" }}>
          <input aria-label="Token name" placeholder="Name (brand/primary)" value={name} style={{ flex: "1 1 120px", minWidth: 0 }} onChange={(e) => setName(e.target.value)} onKeyDown={stop} />
          {collections.length > 1 && (
            <select aria-label="New variable collection" value={target.id} onChange={(e) => setCollection(e.target.value)}>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="New colour variable" onClick={() => create("color")}>Colour</button>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="New number variable" onClick={() => create("number")}>Number</button>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="New string variable" onClick={() => create("string")}>String</button>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="New boolean variable" onClick={() => create("boolean")}>Boolean</button>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="New text style from selection" disabled={selected.length === 0} onClick={() => makeStyle("text")}>Text style</button>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="New effect style from selection" disabled={selected.length === 0} onClick={() => makeStyle("effect")}>Effect style</button>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="New paint style from selection" disabled={selected.length === 0} onClick={() => makeStyle("paint")}>Paint style</button>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="New grid style from selection" disabled={selected.length === 0} onClick={() => makeStyle("grid")}>Grid style</button>
        </div>
      </section>

      <section aria-label="Variables">
        <strong style={{ fontSize: 11 }}>Variables {variables.length > 0 && <span style={{ opacity: 0.6 }}>{variables.length}</span>}</strong>
        {variables.length === 0 ? (
          <p style={{ fontSize: 11, opacity: 0.65, margin: "4px 0" }}>Name a colour or a number above, then bind layers to it in the Design tab: change it once and every layer follows, in every mode.</p>
        ) : (
          collections.map((c) => {
            const mine = variables.filter((v) => collectionOf(doc, v).id === c.id);
            if (mine.length === 0) return null;
            return (
              <div key={c.id}>
                {collections.length > 1 && <div style={{ fontSize: 11, fontWeight: 600, marginTop: 6 }}>{c.name}</div>}
                {groupVariables(mine).map((g) => (
                  <div key={g.group || "ungrouped"} style={{ marginTop: 6 }}>
                    {g.group && <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase" }}>{g.group}</div>}
                    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                      {g.items.map((v) => (
                        <VariableRow key={v.id} variable={v} modes={c.id === DEFAULT_COLLECTION ? modesOf(doc) : c.modes} all={variables} collections={collections} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })
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
