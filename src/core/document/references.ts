/**
 * ============================================================================
 * REFERENTIAL VALIDATION (MDM v4)
 * ============================================================================
 * The checks a structural schema can't make: every entity is stored under its
 * id and owned by a layer that exists, and every property path, state, pin,
 * tag, surface uniform, clip, generator piece and graph reference resolves.
 * Called from `MotionDocumentSchema` (schema.ts).
 *
 * Kept to what the *model* guarantees. Policy (budgets, conflicts, touch and
 * accessibility rules, the Reactive category's grammar) is the Phase 8 rules
 * engine's job; where a line is drawn here it cites the rule it anticipates.
 * ============================================================================
 */

import type { MotionDocument, Layer } from "./schema";
import { getLegalStates, type ArchetypeId, type PropValue } from "./registry";
import { getPropertyDefinition, isPropertyLegalFor, suggestPropertyPath, valueFitsProperty } from "./properties";

export { valueFitsProperty };
import { PIN_PRESETS, bindingLayerRefs, type BindingDraft, type TargetSet, type SignalExpr } from "./signals";
import { REPEATABLE_COMPONENTS, cloneCount, splitGraphemes } from "./kinetics";
import { LAYER_PARAMS } from "./graph";
import { MAIN_COMPOSITION_ID, clipFits } from "./compositions";

type Issue = (path: (string | number)[], message: string) => void;

/** Archetypes that can't be dynamic bodies (grammar 14.4: the Input family). */
const INPUT_FAMILY: readonly ArchetypeId[] = ["input", "form"];

export function checkReferences(doc: MotionDocument, issue: Issue): void {
  const layers = doc.layers;
  const layer = (id: string): Layer | undefined => (Object.prototype.hasOwnProperty.call(layers, id) ? layers[id] : undefined);

  // --- Stored under their id, owned by a layer that exists -------------------
  const keyed = (collection: keyof MotionDocument, owner?: string, nullableOwner = false) => {
    for (const [key, entity] of Object.entries(doc[collection] as Record<string, Record<string, unknown>>)) {
      if (entity.id !== key) issue([collection, key, "id"], `Stored under "${key}" but has id "${String(entity.id)}".`);
      if (!owner) continue;
      const ref = entity[owner];
      if (ref === null && nullableOwner) continue;
      if (typeof ref !== "string" || !layer(ref)) issue([collection, key, owner], `Layer "${String(ref)}" does not exist.`);
    }
  };
  keyed("clips", "layerId");
  keyed("states", "layerId");
  keyed("behaviours", "layerId");
  keyed("transitions", "layerId");
  keyed("surfaces", "layerId");
  keyed("effects", "layerId");
  keyed("components", "layerId");
  keyed("bindings", "ownerLayerId");
  keyed("generators", "groupLayerId");
  keyed("graphs", "ownerLayerId", true);
  keyed("sequences");
  keyed("inputTapes");
  keyed("compositions");

  // --- Property paths (Phase 42): canonical, legal, typed --------------------
  const checkPath = (at: (string | number)[], path: string, archetype: ArchetypeId, opts: { animatable?: boolean; value?: PropValue } = {}) => {
    const def = getPropertyDefinition(path);
    if (!def) {
      const suggestion = suggestPropertyPath(path);
      issue(at, `Unknown property "${path}".${suggestion ? ` Did you mean "${suggestion}"?` : ""}`);
      return undefined;
    }
    if (!isPropertyLegalFor(path, archetype)) {
      issue(at, `"${path}" is not a property of ${archetype}.`);
      return undefined;
    }
    if (opts.animatable && !def.animatable) issue(at, `"${path}" can't be animated.`);
    if (opts.value !== undefined && !valueFitsProperty(def, opts.value)) issue(at, `${JSON.stringify(opts.value)} is not a valid ${def.valueType} for "${path}".`);
    return def;
  };

  for (const [key, l] of Object.entries(layers)) {
    for (const prop of Object.keys(l.properties)) checkPath(["layers", key, "properties", prop], prop, l.archetype);
    if (l.tags && new Set(l.tags).size !== l.tags.length) issue(["layers", key, "tags"], "Duplicate tag.");
  }
  const statesOf = (layerId: string) => Object.values(doc.states).filter((s) => s.layerId === layerId);
  for (const [key, state] of Object.entries(doc.states)) {
    const l = layer(state.layerId);
    if (l) for (const [prop, value] of Object.entries(state.props)) checkPath(["states", key, "props", prop], prop, l.archetype, { value });
  }
  for (const [key, clip] of Object.entries(doc.clips)) {
    const l = layer(clip.layerId);
    if (!l) continue;
    clip.tracks.forEach((track, i) => {
      const at = ["clips", key, "tracks", i, "property"];
      const def = checkPath(at, track.property, l.archetype, { animatable: true });
      if (def) {
        track.keyframes.forEach((kf, k) => {
          if (!valueFitsProperty(def, kf.value)) issue(["clips", key, "tracks", i, "keyframes", k, "value"], `${JSON.stringify(kf.value)} is not a valid ${def.valueType} for "${track.property}".`);
        });
      }
    });
    if (clip.stagger?.targets && typeof clip.stagger.targets === "object" && !tagged(clip.stagger.targets.tag).length) {
      issue(["clips", key, "stagger", "targets"], `No layer has the tag "${clip.stagger.targets.tag}".`);
    }
  }

  // --- Sequences and transitions (7.2, 7.3) ------------------------------------
  for (const [key, seq] of Object.entries(doc.sequences)) {
    if (new Set(seq.items.map((i) => i.id)).size !== seq.items.length) issue(["sequences", key, "items"], "Duplicate item id.");
    seq.items.forEach((item, i) => {
      if (!doc.clips[item.clipId]) issue(["sequences", key, "items", i, "clipId"], `Clip "${item.clipId}" does not exist.`);
    });
  }
  for (const [key, tr] of Object.entries(doc.transitions)) {
    const l = layer(tr.layerId);
    if (!l) continue;
    for (const end of ["from", "to"] as const) {
      const id = tr[end];
      if (id === "*") continue;
      const state = doc.states[id];
      if (!state) issue(["transitions", key, end], `State "${id}" does not exist.`);
      else if (state.layerId !== tr.layerId) issue(["transitions", key, end], `State "${id}" belongs to another layer.`);
    }
    if (tr.from === tr.to) issue(["transitions", key, "to"], "A transition goes to a different state.");
    (tr.overrides ?? []).forEach((o, i) => checkPath(["transitions", key, "overrides", i, "property"], o.property, l.archetype, { animatable: true }));
  }

  // --- Behaviours (7.3) --------------------------------------------------------
  const surfaceOf = (layerId: string) => Object.values(doc.surfaces).find((s) => s.layerId === layerId);
  for (const [key, b] of Object.entries(doc.behaviours)) {
    const l = layer(b.layerId);
    if (!l) continue;
    const at = ["behaviours", key, "params"];
    switch (b.type) {
      case "proximity":
        checkPath([...at, "property"], b.params.property, l.archetype, { animatable: true, value: b.params.near });
        checkPath([...at, "property"], b.params.property, l.archetype, { value: b.params.far });
        break;
      case "spring-to":
        checkPath([...at, "property"], b.params.property, l.archetype, { animatable: true, value: b.params.value });
        break;
      case "loop":
        checkPath([...at, "property"], b.params.property, l.archetype, { animatable: true, value: b.params.from });
        checkPath([...at, "property"], b.params.property, l.archetype, { value: b.params.to });
        break;
      case "noise":
        b.params.targets.forEach((t, i) => checkPath([...at, "targets", i, "property"], t.property, l.archetype, { animatable: true }));
        break;
      case "shader-uniform": {
        const surface = surfaceOf(b.layerId);
        if (!surface) issue(at, `Layer "${b.layerId}" has no surface to drive a uniform on.`);
        else if (surface.uniforms && !surface.uniforms.some((u) => u.name === b.params.uniform)) issue([...at, "uniform"], `The surface declares no uniform "${b.params.uniform}".`);
        break;
      }
    }
  }

  // --- Surfaces and effect instances (7.4, 7.5) --------------------------------
  const surfaceLayers = new Set<string>();
  for (const [key, s] of Object.entries(doc.surfaces)) {
    const l = layer(s.layerId);
    if (!l) continue;
    if (l.archetype !== "effectSurface") issue(["surfaces", key, "layerId"], `Surfaces are drawn by effectSurface layers, not ${l.archetype}.`);
    if (surfaceLayers.has(s.layerId)) issue(["surfaces", key, "layerId"], `Layer "${s.layerId}" already has a surface.`);
    surfaceLayers.add(s.layerId);
    if (s.role === "background" && l.parentId === null) issue(["surfaces", key, "role"], "A background surface fills its parent, so it can't be a top-level layer (grammar 3.F.1).");
  }

  // --- Layer references (bindings, components, graphs, tapes) ------------------
  const groups = new Map(Object.values(doc.generators).map((g) => [g.groupLayerId, g]));
  function tagged(tag: string): Layer[] {
    return Object.values(layers).filter((l) => l.tags?.includes(tag));
  }
  /** Resolves a layer ref against an owner; returns the layer or reports why not. */
  const resolveRef = (at: (string | number)[], ref: string, owner: Layer | undefined): Layer | undefined => {
    if (ref === "self") {
      if (!owner) issue(at, "`self` needs an owner layer.");
      return owner;
    }
    if (ref === "parent") {
      const parent = owner?.parentId ? layer(owner.parentId) : undefined;
      if (!parent) issue(at, "`parent` has no layer: the owner is top-level.");
      return parent;
    }
    const l = layer(ref);
    if (!l) issue(at, `Layer "${ref}" does not exist.`);
    return l;
  };
  /** The layers a target set addresses. */
  const resolveSet = (at: (string | number)[], set: TargetSet, owner: Layer | undefined): Layer[] => {
    if (set.kind === "tag") {
      const found = tagged(set.tag);
      if (!found.length) issue(at, `No layer has the tag "${set.tag}".`);
      return found;
    }
    const l = resolveRef(at, set.ref, owner);
    if (!l) return [];
    if (set.kind === "layer") return [l];
    const g = groups.get(l.id);
    if (!g) {
      issue(at, `"${l.id}" is not a Split or Clone group, so it has no [*] pieces.`);
      return [];
    }
    return g.pieces.map((p) => layer(p.layerId)).filter((p): p is Layer => Boolean(p));
  };
  const pinExists = (l: Layer, pin: string) => (PIN_PRESETS as readonly string[]).includes(pin) || Boolean(l.pins && Object.prototype.hasOwnProperty.call(l.pins, pin));
  const stateNames = (l: Layer) => new Set<string>([...getLegalStates(l.archetype), ...statesOf(l.id).map((s) => s.name)]);
  const graphVars = new Set(Object.values(doc.graphs).flatMap((g) => g.variables.map((v) => v.name)));

  const checkSignalExpr = (at: (string | number)[], e: SignalExpr, owner: Layer | undefined) => {
    const s = e.signal;
    if ("layer" in s) resolveRef([...at, "signal", "layer"], s.layer, owner);
    if (s.kind === "state" && owner && !stateNames(owner).has(s.name)) issue([...at, "signal", "name"], `"${owner.id}" has no state "${s.name}".`);
    if (s.kind === "var" && !graphVars.has(s.name)) issue([...at, "signal", "name"], `No graph declares the variable "${s.name}".`);
    e.operators.forEach((op, i) => {
      const o = [...at, "operators", i];
      if (op.op === "sampleHold") checkSignalExpr([...o, "trigger"], op.trigger, owner);
      if (op.op === "mix") checkSignalExpr([...o, "with"], op.with, owner);
      if (op.op === "distance" || op.op === "angleTo") checkSignalExpr([...o, "to"], op.to, owner);
      if (op.op === "select") {
        checkSignalExpr([...o, "whenTrue"], op.whenTrue, owner);
        checkSignalExpr([...o, "whenFalse"], op.whenFalse, owner);
      }
    });
  };

  const checkBinding = (at: (string | number)[], b: BindingDraft, owner: Layer | undefined) => {
    checkSignalExpr([...at, "expr"], b.expr, owner);
    b.guard?.conditions.forEach((c, i) => {
      if (c.kind === "compare") checkSignalExpr([...at, "guard", "conditions", i, "expr"], c.expr, owner);
      if (c.kind === "state" && owner && !stateNames(owner).has(c.name)) issue([...at, "guard", "conditions", i, "name"], `"${owner.id}" has no state "${c.name}".`);
    });
    const t = b.target;
    if (t.kind === "event") return;
    const targets = resolveSet([...at, "target", "on"], t.on, owner);
    for (const target of targets) {
      if (t.kind === "property") {
        const def = checkPath([...at, "target", "path"], t.path, target.archetype, { animatable: true });
        if (def && (def.compositing === "layout" || def.compositing === "none")) {
          issue([...at, "target", "path"], `[SIG_LAYOUT] Continuous bindings can't drive "${t.path}" (${def.compositing}); bind transform.* instead (decision 0003).`);
        }
        if (def && def.interpolation === "discrete" && b.blend && b.blend !== "replace") issue([...at, "blend"], `"${t.path}" is discrete, so it only accepts blend replace (grammar 6.9).`);
      } else if (t.kind === "uniform" || t.kind === "param") {
        const surface = surfaceOf(target.id);
        const decls = t.kind === "uniform" ? surface?.uniforms : surface?.params;
        if (!surface) issue([...at, "target"], `"${target.id}" has no surface, so it has no ${t.kind}s.`);
        else if (decls && !decls.some((d) => d.name === t.name)) issue([...at, "target", "name"], `The surface on "${target.id}" declares no ${t.kind} "${t.name}".`);
      } else if (t.kind === "position") {
        if (!pinExists(target, t.pin)) issue([...at, "target", "pin"], `"${target.id}" has no pin "${t.pin}".`);
      }
    }
  };

  for (const [key, b] of Object.entries(doc.bindings)) {
    checkBinding(["bindings", key], b, layer(b.ownerLayerId));
    for (const r of bindingLayerRefs(b)) if (r.ref === "other") issue(["bindings", key], "`other` exists only in contact events, not in bindings.");
  }

  for (const [key, tape] of Object.entries(doc.inputTapes)) {
    tape.channels.forEach((ch, i) => {
      if ("layer" in ch.signal) resolveRef(["inputTapes", key, "channels", i, "signal", "layer"], ch.signal.layer, undefined);
    });
  }

  // --- Components (Track K) --------------------------------------------------
  const componentsByLayer = new Map<string, string[]>();
  for (const [key, c] of Object.entries(doc.components)) {
    const l = layer(c.layerId);
    if (!l) continue;
    const at = ["components", key];
    const seen = componentsByLayer.get(c.layerId) ?? [];
    if (!REPEATABLE_COMPONENTS.has(c.type) && seen.includes(c.type)) issue([...at, "type"], `"${c.layerId}" already has a ${c.type}.`);
    componentsByLayer.set(c.layerId, [...seen, c.type]);
    if (l.archetype === "object3D" || l.archetype === "camera3D" || l.archetype === "light3D") issue([...at, "layerId"], "Kinetic components are for 2D layers.");
    switch (c.type) {
      case "follow":
        if (!pinExists(l, c.pin)) issue([...at, "pin"], `"${l.id}" has no pin "${c.pin}".`);
        if (c.target.kind === "pin") {
          const t = resolveRef([...at, "target", "layer"], c.target.layer, l);
          if (t && !pinExists(t, c.target.pin)) issue([...at, "target", "pin"], `"${t.id}" has no pin "${c.target.pin}".`);
        }
        if (c.target.kind === "path") {
          const t = resolveRef([...at, "target", "layer"], c.target.layer, l);
          if (t && t.archetype !== "svgPath" && t.archetype !== "line") issue([...at, "target", "layer"], "A follow path is an SVG path or line layer.");
        }
        if (c.scale.kind === "bySpeed" && c.scale.min > c.scale.max) issue([...at, "scale"], "min must be ≤ max.");
        break;
      case "field":
        if (c.outer < c.inner) issue([...at, "outer"], "outer must be ≥ inner.");
        break;
      case "effector": {
        const hasField = Object.values(doc.components).some((o) => o.type === "field" && o.layerId === c.layerId);
        if (!hasField) issue([...at, "layerId"], `An effector needs a field on the same layer (grammar 14.4); "${c.layerId}" has none.`);
        const targets = resolveSet([...at, "targets"], c.targets, l);
        if (c.effect.kind === "custom") for (const t of targets) checkPath([...at, "effect", "property"], c.effect.property, t.archetype, { animatable: true });
        break;
      }
      case "body":
        if (c.body === "dynamic" && INPUT_FAMILY.includes(l.archetype)) issue([...at, "body"], `${l.archetype} layers can't be dynamic bodies (grammar 14.4).`);
        break;
    }
  }

  // --- Generators (Split / Clone groups) --------------------------------------
  const groupOwners = new Set<string>();
  for (const [key, g] of Object.entries(doc.generators)) {
    const at = ["generators", key];
    const group = layer(g.groupLayerId);
    if (!group) continue;
    if (groupOwners.has(g.groupLayerId)) issue([...at, "groupLayerId"], `"${g.groupLayerId}" is already a generator group.`);
    groupOwners.add(g.groupLayerId);

    const source = layer(g.sourceLayerId);
    if (!source) issue([...at, "sourceLayerId"], `Layer "${g.sourceLayerId}" does not exist.`);
    else if (group.children.includes(source.id) || source.id === group.id) issue([...at, "sourceLayerId"], "The source can't be the group or one of its pieces.");

    const ids = g.pieces.map((p) => p.layerId);
    if (JSON.stringify(ids) !== JSON.stringify(group.children)) issue([...at, "pieces"], "A group's children are exactly its pieces, in order (grammar 3.G).");
    g.pieces.forEach((p, i) => {
      if (p.index !== i) issue([...at, "pieces", i, "index"], `Piece ${i} has index ${p.index}; indices run 0…count−1 in order.`);
    });

    const pieceLayers = g.pieces.map((p) => layer(p.layerId));
    const overrideCheck = (bucket: Record<string, Record<string, PropValue>>, byIndex: boolean, name: string) => {
      for (const [k, props] of Object.entries(bucket)) {
        if (byIndex && !(/^\d+$/.test(k) && Number(k) < g.pieces.length)) issue([...at, "overrides", name, k], `No piece ${k}.`);
        const sample = byIndex ? pieceLayers[Number(k)] : pieceLayers.find((pl) => pl);
        if (sample) for (const [prop, value] of Object.entries(props)) checkPath([...at, "overrides", name, k, prop], prop, sample.archetype, { value });
      }
    };

    if (g.kind === "split") {
      if (source && source.archetype !== "text" && source.archetype !== "svgText") issue([...at, "sourceLayerId"], `Split works on text, not ${source.archetype}.`);
      pieceLayers.forEach((pl, i) => {
        if (pl && pl.archetype !== "text") issue([...at, "pieces", i, "layerId"], "Split pieces are text layers.");
        if (pl && pl.properties["content.text"] !== g.pieces[i].char) issue([...at, "pieces", i, "char"], `Piece ${i} shows ${JSON.stringify(pl.properties["content.text"])} but records ${JSON.stringify(g.pieces[i].char)}.`);
      });
      const text = source?.properties["content.text"];
      if (typeof text === "string" && !g.detached) {
        const expected =
          g.mode === "letters" ? splitGraphemes(text).filter((c) => c.trim() !== "") : g.mode === "words" ? text.split(/\s+/).filter(Boolean) : null;
        if (expected && JSON.stringify(expected) !== JSON.stringify(g.pieces.map((p) => p.char))) {
          issue([...at, "pieces"], `The pieces don't spell the source text ${JSON.stringify(text)} (re-split, or detach the group).`);
        }
      }
      overrideCheck(g.overrides.byIndex, true, "byIndex");
      overrideCheck(g.overrides.byChar, false, "byChar");
    } else {
      if (g.pieces.length !== cloneCount(g.layout)) issue([...at, "pieces"], `The ${g.layout.kind} layout makes ${cloneCount(g.layout)} clones; there are ${g.pieces.length}.`);
      if (g.layout.kind === "grid") g.pieces.forEach((p, i) => {
        if (p.u === undefined || p.v === undefined) issue([...at, "pieces", i], "Grid clones carry u and v.");
      });
      if (g.layout.kind === "path") {
        const path = layer(g.layout.pathLayerId);
        if (!path) issue([...at, "layout", "pathLayerId"], `Layer "${g.layout.pathLayerId}" does not exist.`);
      }
      pieceLayers.forEach((pl, i) => {
        if (pl && source && pl.archetype !== source.archetype) issue([...at, "pieces", i, "layerId"], `Clones share their source's archetype (${source.archetype}).`);
      });
      overrideCheck(g.overrides.byIndex, true, "byIndex");
    }
  }

  // --- Compositions (Phase 46) -------------------------------------------------
  const comps = doc.compositions;
  const mains = Object.values(comps).filter((c) => c.kind === "main");
  if (!comps[MAIN_COMPOSITION_ID] || comps[MAIN_COMPOSITION_ID].kind !== "main") issue(["compositions"], `Every document has a main composition "${MAIN_COMPOSITION_ID}".`);
  if (mains.length > 1) issue(["compositions"], "Only one composition can be the main one.");
  const placements = new Map<string, string[]>();
  for (const [key, comp] of Object.entries(comps)) {
    const at = ["compositions", key];
    for (const layerId of Object.keys(comp.layers)) if (!layer(layerId)) issue([...at, "layers", layerId], `Layer "${layerId}" does not exist.`);
    if (comp.trigger && !layer(comp.trigger.layerId)) issue([...at, "trigger", "layerId"], `Layer "${comp.trigger.layerId}" does not exist.`);
    comp.clips.forEach((p, i) => {
      const clip = doc.clips[p.clipId];
      if (!clip) return issue([...at, "clips", i, "clipId"], `Clip "${p.clipId}" does not exist.`);
      placements.set(p.clipId, [...(placements.get(p.clipId) ?? []), key]);
      if (!clipFits(comp, clip)) {
        issue([...at, "clips", i], `Clip "${clip.id}" (trigger ${clip.trigger}) doesn't belong in the ${comp.kind} composition "${key}"${comp.trigger ? ` (trigger ${comp.trigger.on})` : ""}.`);
      }
    });
    comp.nested.forEach((n, i) => {
      const child = comps[n.compositionId];
      if (!child) issue([...at, "nested", i, "compositionId"], `Composition "${n.compositionId}" does not exist.`);
      else if (child.kind !== "precomp") issue([...at, "nested", i, "compositionId"], `Only precomps can be nested; "${n.compositionId}" is ${child.kind}.`);
    });
  }
  for (const clipId of Object.keys(doc.clips)) {
    const where = placements.get(clipId) ?? [];
    if (where.length === 0) issue(["clips", clipId], `Clip "${clipId}" isn't placed in any composition.`);
    if (where.length > 1) issue(["clips", clipId], `Clip "${clipId}" is placed in ${where.length} compositions (${where.join(", ")}).`);
  }
  // Nesting must not loop: a composition can't contain itself, directly or through others.
  const visiting = new Set<string>();
  const done = new Set<string>();
  const cyclic = (id: string): boolean => {
    if (done.has(id)) return false;
    if (visiting.has(id)) return true;
    visiting.add(id);
    const loops = (comps[id]?.nested ?? []).some((n) => cyclic(n.compositionId));
    visiting.delete(id);
    done.add(id);
    return loops;
  };
  for (const key of Object.keys(comps)) if (cyclic(key)) {
    issue(["compositions", key, "nested"], "Nested compositions form a loop.");
    break;
  }
  for (const [key, fx] of Object.entries(doc.effects)) {
    if (fx.time && !comps[fx.time.compositionId]) issue(["effects", key, "time", "compositionId"], `Composition "${fx.time.compositionId}" does not exist.`);
  }

  // --- Interaction graphs -------------------------------------------------------
  for (const [key, graph] of Object.entries(doc.graphs)) {
    const owner = graph.ownerLayerId ? layer(graph.ownerLayerId) : undefined;
    graph.nodes.forEach((node, i) => {
      for (const param of LAYER_PARAMS) {
        const value = node.params[param];
        if (typeof value !== "string" || value === "other") continue;
        const at = ["graphs", key, "nodes", i, "params", param];
        if (value.startsWith("tag:")) resolveSet(at, { kind: "tag", tag: value.slice(4) }, owner);
        else if (value.endsWith("[*]")) resolveSet(at, { kind: "group", ref: value.slice(0, -3) }, owner);
        else resolveRef(at, value, owner);
      }
      const clip = node.params.clip;
      if (typeof clip === "string" && !doc.clips[clip] && !doc.sequences[clip]) issue(["graphs", key, "nodes", i, "params", "clip"], `No clip or sequence "${clip}".`);
      const composition = node.params.composition;
      if (typeof composition === "string" && !doc.compositions[composition]) issue(["graphs", key, "nodes", i, "params", "composition"], `No composition "${composition}".`);
      const tape = node.params.tape;
      if (typeof tape === "string" && !doc.inputTapes[tape]) issue(["graphs", key, "nodes", i, "params", "tape"], `No input tape "${tape}".`);
    });
  }
}
