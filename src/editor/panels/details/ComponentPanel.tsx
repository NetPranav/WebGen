"use client";

/**
 * Components on the selection (ROADMAP Phase 46), in the Design inspector: for a main component its name, how many
 * instances it has and a way to make a component from a plain frame; for a layer of an instance, what it came from, the
 * properties it overrides (each can be reset), and reset, swap, detach and "go to main component". FigCraft port F9
 * adds a description, Combine as variants (two or more mains selected) and Push changes to main.
 */

import React, { useState } from "react";
import { invokeCommand } from "@/core/commands";
import { instanceRootOf, subtreeIds } from "@/core/components/instances";
import { readProperty } from "@/core/components/variantOps";
import { innerComponentOf, mainAround } from "@/core/components/componentExtras";
import { documentStore } from "@/core/store/documentState";
import { useLayers } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";

const run = (command: string, args?: unknown) => void invokeCommand(command, args);
const box: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, padding: "6px 8px", borderBottom: "1px solid var(--border-subtle, rgba(128,128,128,0.2))", fontSize: 11 };

/** The main component layer above a layer (not the layer itself), or null. */
function mainAbove(layers: Record<string, { parentId: string | null; componentMain?: string }>, id: string) {
  let cur = layers[id]?.parentId ? layers[layers[id].parentId!] : undefined;
  let guard = 0;
  while (cur && guard++ < 10_000) {
    if (cur.componentMain) return cur;
    cur = cur.parentId ? layers[cur.parentId] : undefined;
  }
  return null;
}

/** Add a variant property to a component: a name and its values, comma separated. */
const VariantEditor: React.FC<{ componentId: string; props: { name: string; values: string[] }[]; count: number }> = ({ componentId, props, count }) => {
  const [name, setName] = useState("");
  const [values, setValues] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {props.length > 0 && (
        <span data-testid="variant-summary">
          Variants: {props.map((p) => `${p.name} (${p.values.join(", ")})`).join(" × ")} · {count}
        </span>
      )}
      <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <input aria-label="Variant property name" placeholder="Property (Size)" value={name} style={{ width: 90 }} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
        <input aria-label="Variant values" placeholder="S, M, L" value={values} style={{ width: 90 }} onChange={(e) => setValues(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
        <button
          type="button"
          className="panel-icon-btn panel-text-btn"
          aria-label="Add variant property"
          disabled={!name.trim() || !values.trim()}
          onClick={() => {
            run("component.addVariantProperty", { component: componentId, name: name.trim(), values: values.split(",").map((v) => v.trim()).filter(Boolean) });
            setName("");
            setValues("");
          }}
        >
          Add variants
        </button>
      </span>
    </div>
  );
};

const PropertyList: React.FC<{ componentId: string; properties: { id: string; name: string; type: string }[] }> = ({ componentId, properties }) =>
  properties.length === 0 ? null : (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {properties.map((p) => (
        <li key={p.id} data-property={p.name} style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
          <span>
            {p.name} <span style={{ opacity: 0.6 }}>{p.type}</span>
          </span>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Remove property ${p.name}`} onClick={() => run("component.removeProperty", { component: componentId, property: p.id })}>
            Remove
          </button>
        </li>
      ))}
    </ul>
  );

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
    const separate = new Set(ids.map((id) => layers[id]?.componentMain).filter((cid): cid is string => !!cid && !!doc.designComponents?.[cid] && !doc.designComponents[cid].variantProps));
    const description = (comp as { description?: string }).description ?? "";
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
          {separate.size > 1 && (
            <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Combine as variants" onClick={() => run("component.combineAsVariants", { ids })}>
              Combine as variants
            </button>
          )}
        </span>
        <textarea
          key={`${comp.id}:${description}`}
          aria-label="Component description"
          placeholder="Description"
          defaultValue={description}
          rows={2}
          style={{ resize: "vertical", font: "inherit" }}
          onBlur={(e) => e.target.value.trim() !== description && run("component.setDescription", { component: comp.id, description: e.target.value })}
          onKeyDown={(e) => e.stopPropagation()}
        />
        <VariantEditor componentId={comp.id} props={comp.variantProps ?? []} count={comp.variants?.length ?? 1} />
        <PropertyList componentId={comp.id} properties={comp.properties ?? []} />
      </section>
    );
  }

  // a layer inside a main component: expose a property of it, or make it a slot
  const insideMain = !first.instance && !first.componentMain ? mainAbove(doc.layers, first.id) : null;
  if (insideMain) {
    const kinds: { kind: "text" | "image" | "boolean"; label: string; ok: boolean }[] = [
      { kind: "text", label: "Expose text", ok: first.archetype === "text" },
      { kind: "image", label: "Expose image", ok: first.archetype === "image" },
      { kind: "boolean", label: "Expose visibility", ok: true },
    ];
    return (
      <section aria-label="Component layer" style={box}>
        <strong>In {doc.designComponents?.[insideMain.componentMain!]?.name ?? "a component"}</strong>
        <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {kinds
            .filter((k) => k.ok)
            .map((k) => (
              <button key={k.kind} type="button" className="panel-icon-btn panel-text-btn" aria-label={k.label} onClick={() => run("component.exposeProperty", { kind: k.kind, layer: first.id })}>
                {k.label}
              </button>
            ))}
          {first.archetype === "container" && (
            <button type="button" className="panel-icon-btn panel-text-btn" aria-label={first.componentSlot ? "Remove slot" : "Make slot"} onClick={() => run("component.markSlot", { on: !first.componentSlot, layer: first.id })}>
              {first.componentSlot ? "Remove slot" : "Make slot"}
            </button>
          )}
        </span>
      </section>
    );
  }

  if (first.instance && comp) {
    const rootId = instanceRootOf(doc.layers, first.id);
    const overridden = raw?.instance?.overridden ?? [];
    const pushable = (first.instance.root && rootId ? subtreeIds(doc.layers, rootId) : [first.id]).some((id) => (doc.layers[id]?.instance?.overridden ?? []).some((k) => !["frame.x", "frame.y", "positioning"].includes(k)));
    return (
      <section aria-label="Instance" style={box}>
        <strong>Instance of {comp.name}</strong>
        {(() => {
          // FigCraft port F9: a nested instance shows its own component, and one inside a main can be exposed as a swap property
          const inner = innerComponentOf(doc, first.id);
          const around = first.instance?.root ? mainAround(doc.layers, first.id) : null;
          return (
            <>
              {inner && <span data-nested-of={inner}>Nested: {doc.designComponents?.[inner]?.name ?? "a component"}</span>}
              {around && around !== comp.id && (
                <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Expose as swap property" onClick={() => run("component.exposeProperty", { kind: "instance", layer: first.id })}>
                  Expose swap
                </button>
              )}
            </>
          );
        })()}
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
        {comp.variantProps?.map((p) => (
          <label key={p.name} style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "space-between" }}>
            {p.name}
            <select aria-label={p.name} value={doc.layers[rootId ?? ""]?.instance?.variant?.[p.name] ?? p.values[0]} onChange={(e) => run("component.setVariant", { values: { [p.name]: e.target.value }, ids: [first.id] })}>
              {p.values.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        ))}
        {rootId &&
          comp.properties?.map((p) => {
            const value = readProperty(rootId, p.id);
            if (p.type === "instance")
              return (
                <label key={p.id} style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "space-between" }}>
                  {p.name}
                  <select aria-label={p.name} value={typeof value === "string" ? value : ""} onChange={(e) => run("component.setProperty", { property: p.id, value: e.target.value, id: rootId })}>
                    {comps.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              );
            return p.type === "boolean" ? (
              <label key={p.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" aria-label={p.name} checked={value !== false} onChange={(e) => run("component.setProperty", { property: p.id, value: e.target.checked, id: rootId })} />
                {p.name}
              </label>
            ) : (
              <label key={p.id} style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "space-between" }}>
                {p.name}
                <input
                  key={String(value)}
                  aria-label={p.name}
                  defaultValue={typeof value === "string" ? value : ""}
                  style={{ flex: 1, minWidth: 0 }}
                  onBlur={(e) => e.target.value !== value && run("component.setProperty", { property: p.id, value: e.target.value, id: rootId })}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </label>
            );
          })}
        {first.componentSlot && ids.length > 1 && (
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Put the other selected layers in this slot" onClick={() => run("component.fillSlot", { slot: first.id, ids: ids.slice(1) })}>
            Fill slot
          </button>
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
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Push changes to main component" disabled={!pushable} onClick={() => run("component.pushChanges", { ids: [first.id] })}>
            Push changes
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
