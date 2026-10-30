/**
 * Variables import and export (FigCraft port F10): a file's collections as the local variables JSON (the shape
 * Figma's REST API writes, so exports round-trip and Figma exports read in) or as CSS custom properties, and such JSON
 * read back. An import joins collections by name (values by mode name; new modes and variables are added, a variable
 * of another type is skipped with a warning, an alias that would loop is left out), in one undo step.
 *
 * Translated from FigCraft (`crates/engine/src/cmd/variables_io.rs`, `variables_io_tests.rs`), commit 6ea44e9.
 * MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 */

import type { MotionDocument } from "../document/schema";
import { documentCommands } from "../store/useDocumentStore";
import { parseCss, toCss } from "../paint/color";
import { DEFAULT_COLLECTION, MAX_VARIABLES, aliasRefused, codeSyntaxOf, collectionOf, collectionsOf, isAlias, modesOf, normalizeScopes, type Collection, type Variable, type VariableType, type VariableValue } from "./tokens";

type Doc = MotionDocument & { collections?: Collection[] };

const TYPE_OUT: Record<VariableType, string> = { color: "COLOR", number: "FLOAT", string: "STRING", boolean: "BOOLEAN" };
const TYPE_IN: Record<string, VariableType> = { COLOR: "color", FLOAT: "number", STRING: "string", BOOLEAN: "boolean" };

/** A value as the JSON writes it: colours as 0–1 RGBA, aliases as `VARIABLE_ALIAS`. */
function valueOut(v: VariableValue, type: VariableType): unknown {
  if (isAlias(v)) return { type: "VARIABLE_ALIAS", id: v.alias };
  if (type === "color" && typeof v === "string") {
    const c = parseCss(v);
    return c ? { r: c.r, g: c.g, b: c.b, a: c.a } : { r: 0, g: 0, b: 0, a: 1 };
  }
  return v;
}

/** The file's collections (all, or those named or with these ids) as the local variables JSON. */
export function exportVariablesJson(doc: Doc, only?: readonly string[]): { meta: { variableCollections: Record<string, unknown>; variables: Record<string, unknown> } } {
  const colls = collectionsOf(doc).filter((c) => !only || only.includes(c.id) || only.includes(c.name));
  const ids = new Set(colls.map((c) => c.id));
  const variableCollections: Record<string, unknown> = {};
  const variables: Record<string, unknown> = {};
  for (const c of colls) {
    const mine = (Object.values(doc.variables ?? {}) as Variable[]).filter((v) => collectionOf(doc, v).id === c.id);
    variableCollections[c.id] = { id: c.id, name: c.name, modes: c.modes.map((m) => ({ modeId: m.id, name: m.name })), defaultModeId: c.modes[0]?.id, variableIds: mine.map((v) => v.id) };
  }
  for (const v of Object.values(doc.variables ?? {}) as Variable[]) {
    const c = collectionOf(doc, v);
    if (!ids.has(c.id)) continue;
    variables[v.id] = {
      id: v.id,
      name: v.name,
      variableCollectionId: c.id,
      resolvedType: TYPE_OUT[v.type],
      valuesByMode: Object.fromEntries(Object.entries(v.values).map(([m, x]) => [m, valueOut(x, v.type)])),
      description: v.description ?? "",
      scopes: v.scopes ?? ["ALL_SCOPES"],
      codeSyntax: v.codeSyntax ?? {},
      hiddenFromPublishing: v.hidden === true,
    };
  }
  return { meta: { variableCollections, variables } };
}

/** A name as a CSS custom property or attribute: lower case, words joined by `-`. */
const cssName = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "var";
const cssSafe = (s: string) => s.replace(/\*\//g, "* /").replace(/["\\\n]/g, " ");

/**
 * The collections as CSS custom properties: the default mode's values on `:root`, every other mode's on
 * `[data-<collection>="<mode>"]`; aliases are `var(--name)`; numbers are px unless the variable is scoped to opacity or
 * font weight.
 */
export function exportVariablesCss(doc: Doc, only?: readonly string[]): string {
  const colls = collectionsOf(doc).filter((c) => !only || only.includes(c.id) || only.includes(c.name));
  const all = Object.values(doc.variables ?? {}) as Variable[];
  const nameOf = (id: string) => {
    const v = doc.variables?.[id] as Variable | undefined;
    return v ? codeSyntaxOf(v).replace(/^var\((.*)\)$/, "$1") : `--${cssName(id)}`;
  };
  const bare = (v: Variable) => !!v.scopes && v.scopes.length > 0 && v.scopes.every((s) => s === "OPACITY" || s === "FONT_WEIGHT");
  const valueCss = (v: Variable, x: VariableValue | undefined): string => {
    if (x === undefined) return "initial";
    if (isAlias(x)) return `var(${nameOf(x.alias)})`;
    if (v.type === "number") return bare(v) ? String(x) : `${x}px`;
    if (v.type === "string") return `"${cssSafe(String(x))}"`;
    if (v.type === "boolean") return x ? "1" : "0";
    return String(x);
  };
  let out = "";
  for (const c of colls) {
    const mine = all.filter((v) => collectionOf(doc, v).id === c.id);
    if (mine.length === 0) continue;
    c.modes.forEach((m, i) => {
      out += `${i === 0 ? ":root" : `[data-${cssName(c.name)}="${cssSafe(m.name)}"]`} {\n`;
      for (const v of mine) out += `  ${nameOf(v.id)}: ${valueCss(v, v.values[m.id] ?? v.values[c.modes[0].id])};\n`;
      out += "}\n";
    });
  }
  return out;
}

export interface ImportResult {
  collections: number;
  variables: number;
  updated: number;
  warnings: string[];
}

/** Is this the local variables JSON (with collections and variables, under `meta` or at the top)? */
export function isVariablesJson(v: unknown): boolean {
  const o = v && typeof v === "object" ? ((v as { meta?: unknown }).meta ?? v) : null;
  return !!o && typeof o === "object" && typeof (o as Record<string, unknown>).variables === "object" && typeof (o as Record<string, unknown>).variableCollections === "object";
}

/** Two colours that are the same once parsed (an import keeps how the file wrote it). */
function sameColor(a: VariableValue | undefined, b: VariableValue): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const [x, y] = [parseCss(a), parseCss(b)];
  return !!x && !!y && [x.r - y.r, x.g - y.g, x.b - y.b, x.a - y.a].every((d) => Math.abs(d) < 1e-3);
}

/** A value from the JSON for a variable of `type` (an alias by the JSON's id, to be mapped). */
function valueIn(x: unknown, type: VariableType): VariableValue | null {
  if (x && typeof x === "object" && (x as { type?: unknown }).type === "VARIABLE_ALIAS" && typeof (x as { id?: unknown }).id === "string") return { alias: (x as { id: string }).id };
  if (type === "color") {
    if (typeof x === "string") return parseCss(x) ? x : null;
    const o = x as Record<string, unknown> | null;
    if (o && typeof o.r === "number" && typeof o.g === "number" && typeof o.b === "number") {
      const c = (n: unknown) => Math.min(1, Math.max(0, typeof n === "number" && Number.isFinite(n) ? n : 0));
      return toCss({ r: c(o.r), g: c(o.g), b: c(o.b), a: typeof o.a === "number" ? c(o.a) : 1 });
    }
    return null;
  }
  if (type === "number") return typeof x === "number" && Number.isFinite(x) ? x : null;
  if (type === "string") return typeof x === "string" ? x.slice(0, 2000) : null;
  return typeof x === "boolean" ? x : null;
}

/**
 * Reads the local variables JSON into the file (one undo step). Collections join the one of the same name (the default
 * collection is "Tokens"), modes by name, variables by name; returns what was added and updated, with warnings. Throws
 * when the input isn't variables JSON.
 */
export function importVariablesJson(input: unknown): ImportResult {
  let data = input;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      throw new Error("The variables aren't JSON.");
    }
  }
  if (!isVariablesJson(data)) throw new Error("This isn't variables JSON (it needs `variableCollections` and `variables`).");
  const src = ((data as { meta?: unknown }).meta ?? data) as { variableCollections: Record<string, unknown>; variables: Record<string, unknown> };
  const warnings: string[] = [];
  const result: ImportResult = { collections: 0, variables: 0, updated: 0, warnings };
  documentCommands.mutate("Import variables", (dd) => {
    const d = dd as Doc;
    // collections: the file's by name, or new
    const collMap = new Map<string, { id: string; modeByName: Map<string, string> }>();
    const modeIdMap = new Map<string, string>(); // JSON mode id → ours
    for (const [cid, raw] of Object.entries(src.variableCollections)) {
      const c = raw as { id?: string; name?: unknown; modes?: unknown };
      if (typeof c?.name !== "string" || !Array.isArray(c.modes) || c.modes.length === 0) {
        warnings.push(`Collection \`${cid}\` is malformed: skipped.`);
        continue;
      }
      const modes = (c.modes as { modeId?: unknown; name?: unknown }[]).filter((m) => typeof m?.modeId === "string" && typeof m.name === "string").slice(0, 8) as { modeId: string; name: string }[];
      if (modes.length === 0) continue;
      let ours = collectionsOf(d).find((x) => x.name.toLowerCase() === c.name!.toString().toLowerCase());
      if (!ours) {
        const id = c.name.toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "collection";
        let uid = id;
        for (let k = 2; collectionsOf(d).some((x) => x.id === uid); k++) uid = `${id}-${k}`;
        ours = { id: uid, name: c.name.toString().slice(0, 60), modes: modes.map((m) => ({ id: m.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) || "mode", name: m.name.slice(0, 40) })) };
        ours.modes.forEach((m, i, list) => {
          for (let k = 2; list.slice(0, i).some((x) => x.id === m.id); k++) m.id = `${m.id}-${k}`;
        });
        (d.collections ??= []).push(ours);
        result.collections++;
      }
      // modes the file doesn't have yet are added (variables take the first mode's value there)
      for (const m of modes) {
        const coll = collectionsOf(d).find((x) => x.id === ours!.id)!;
        let mine = coll.modes.find((x) => x.name.toLowerCase() === m.name.toLowerCase());
        if (!mine && coll.modes.length < 8) {
          let id = m.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) || "mode";
          for (let k = 2; coll.modes.some((x) => x.id === id); k++) id = `${id}-${k}`;
          mine = { id, name: m.name.slice(0, 40) };
          if (coll.id === DEFAULT_COLLECTION) d.modes = [...modesOf(d), mine];
          else d.collections!.find((x) => x.id === coll.id)!.modes.push(mine);
          const first = coll.modes[0].id;
          for (const v of Object.values(d.variables ?? {})) if ((v.collection ?? DEFAULT_COLLECTION) === coll.id && v.values[first] !== undefined) v.values[mine.id] = structuredClone(v.values[first]);
        }
        if (mine) modeIdMap.set(`${cid}\u0000${m.modeId}`, mine.id);
      }
      collMap.set(cid, { id: ours.id, modeByName: new Map() });
    }
    // variables: by name in their collection, or new; aliases are mapped once every variable has an id
    const varMap = new Map<string, string>(); // JSON variable id → ours
    const pending: { ours: string; jsonCid: string; values: Record<string, unknown>; type: VariableType }[] = [];
    for (const [vid, raw] of Object.entries(src.variables)) {
      const v = raw as { name?: unknown; variableCollectionId?: unknown; resolvedType?: unknown; valuesByMode?: unknown; description?: unknown; scopes?: unknown; codeSyntax?: unknown; hiddenFromPublishing?: unknown };
      const coll = typeof v?.variableCollectionId === "string" ? collMap.get(v.variableCollectionId) : undefined;
      const type = typeof v?.resolvedType === "string" ? TYPE_IN[v.resolvedType] : undefined;
      if (typeof v?.name !== "string" || !coll || !type || !v.valuesByMode || typeof v.valuesByMode !== "object") {
        warnings.push(`Variable \`${typeof v?.name === "string" ? v.name : vid}\` is malformed: skipped.`);
        continue;
      }
      const existing = (Object.values(d.variables ?? {}) as Variable[]).find((x) => x.name === v.name && (x.collection ?? DEFAULT_COLLECTION) === coll.id);
      if (existing && existing.type !== type) {
        warnings.push(`\`${v.name}\` is a ${existing.type} variable here: the ${type} one wasn't imported.`);
        continue;
      }
      let id = existing?.id;
      if (!id) {
        if (Object.keys(d.variables ?? {}).length >= MAX_VARIABLES) {
          warnings.push("The file has as many variables as it can hold: the rest weren't imported.");
          break;
        }
        id = `var_${Math.random().toString(36).slice(2, 10)}`;
        (d.variables ??= {})[id] = { id, name: v.name.slice(0, 120), type, values: {}, ...(coll.id !== DEFAULT_COLLECTION ? { collection: coll.id } : {}) };
        result.variables++;
      } else result.updated++;
      const t = d.variables![id];
      if (typeof v.description === "string" && v.description.trim()) t.description = v.description.trim().slice(0, 2000);
      if (Array.isArray(v.scopes)) {
        const s = normalizeScopes(type, v.scopes.filter((x): x is string => typeof x === "string"));
        if (s) t.scopes = s;
        else delete t.scopes;
      }
      if (v.codeSyntax && typeof v.codeSyntax === "object") {
        const cs: Record<string, string> = {};
        for (const k of ["WEB", "iOS", "ANDROID"]) {
          const x = (v.codeSyntax as Record<string, unknown>)[k];
          if (typeof x === "string" && x.trim()) cs[k] = x.trim().slice(0, 200);
        }
        if (Object.keys(cs).length > 0) t.codeSyntax = cs;
      }
      if (v.hiddenFromPublishing === true) t.hidden = true;
      varMap.set(vid, id);
      pending.push({ ours: id, jsonCid: v.variableCollectionId as string, values: v.valuesByMode as Record<string, unknown>, type });
    }
    for (const p of pending) {
      const t = d.variables![p.ours];
      for (const [jm, x] of Object.entries(p.values)) {
        const mode = modeIdMap.get(`${p.jsonCid}\u0000${jm}`);
        if (!mode) continue;
        const val = valueIn(x, p.type);
        if (val === null) {
          warnings.push(`\`${t.name}\` has a value that isn't a ${p.type}: skipped.`);
          continue;
        }
        if (isAlias(val)) {
          const target = varMap.get(val.alias) ?? (d.variables?.[val.alias] ? val.alias : undefined);
          if (!target || aliasRefused(d, p.ours, target)) {
            warnings.push(`\`${t.name}\` would refer back to itself (or to a variable that isn't there): that value was left out.`);
            continue;
          }
          t.values[mode] = { alias: target };
        } else if (!(p.type === "color" && sameColor(t.values[mode], val))) t.values[mode] = val;
      }
      // every mode of its collection gets a value
      const coll = collectionOf(d, t);
      const first = coll.modes.map((m) => t.values[m.id]).find((x) => x !== undefined) ?? (p.type === "color" ? "#000000" : p.type === "number" ? 0 : p.type === "string" ? "" : true);
      for (const m of coll.modes) if (t.values[m.id] === undefined) t.values[m.id] = structuredClone(first);
    }
  });
  if (result.variables + result.updated === 0) warnings.push("The JSON holds no variables this file could take.");
  return result;
}
