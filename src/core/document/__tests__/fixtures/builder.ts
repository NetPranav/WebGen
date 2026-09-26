/**
 * A small builder for hand-written reference documents (Phase 7 gate). It
 * only assembles plain data: every document it builds is checked by the real
 * validator, so the builder can't hide an escape hatch.
 */

import { createEmptyDocument, type MotionDocument, type Layer, type Clip, type Behaviour } from "../../schema";
import { getDefaultProps, type ArchetypeId, type LayerProps, type PropValue } from "../../registry";
import { parseBinding, resolveLayerRefs } from "../../signals";
import { splitGraphemes, type Component, type Generator } from "../../kinetics";
import type { Surface, InputTape, EffectInstance } from "../../effects";
import type { InteractionGraph, GraphNode } from "../../graph";
import type { LayerState, Transition, Sequence } from "../../motion";
import { syncCompositions } from "../../compositions";

type Draft<T> = T extends unknown ? Omit<T, "id" | "layerId"> : never;

export class DocBuilder {
  readonly doc: MotionDocument = createEmptyDocument();
  private counter = 0;
  private readonly byName = new Map<string, string>();

  id(prefix: string): string {
    return `${prefix}_${(this.counter++).toString(16).padStart(8, "0")}`;
  }

  /** Adds a layer with its archetype's defaults plus `props`. Returns its id. */
  layer(
    archetype: ArchetypeId,
    name: string,
    parentId: string | null,
    props: LayerProps = {},
    extra: Pick<Layer, "tags" | "pins" | "visible"> = {}
  ): string {
    const id = this.id(archetype.slice(0, 6).toLowerCase());
    this.doc.layers[id] = { id, name, archetype, parentId, children: [], properties: { ...getDefaultProps(archetype), ...props }, ...extra };
    if (parentId) this.doc.layers[parentId].children.push(id);
    this.byName.set(name, id);
    return id;
  }

  ref(name: string): string {
    const id = this.byName.get(name);
    if (!id) throw new Error(`No layer named "${name}".`);
    return id;
  }

  clip(layerId: string, clip: Omit<Clip, "id" | "layerId" | "enabled"> & { enabled?: boolean }): string {
    const id = this.id("clip");
    this.doc.clips[id] = { id, layerId, enabled: true, ...clip };
    return id;
  }

  state(layerId: string, name: string, props: Record<string, PropValue>): string {
    const id = this.id("state");
    this.doc.states[id] = { id, layerId, name, props } satisfies LayerState;
    return id;
  }

  transition(layerId: string, t: Omit<Transition, "id" | "layerId">): string {
    const id = this.id("tr");
    this.doc.transitions[id] = { id, layerId, ...t };
    return id;
  }

  sequence(s: Omit<Sequence, "id">): string {
    const id = this.id("seq");
    this.doc.sequences[id] = { id, ...s };
    return id;
  }

  behaviour(layerId: string, b: Draft<Behaviour>): string {
    const id = this.id("beh");
    this.doc.behaviours[id] = { id, layerId, ...b } as Behaviour;
    return id;
  }

  /** Adds a binding from its text form; layer names in the text resolve to ids. */
  binding(ownerLayerId: string, text: string, name?: string): string {
    const id = this.id("bind");
    const draft = resolveLayerRefs(parseBinding(text), (n) => this.byName.get(n));
    this.doc.bindings[id] = { id, ownerLayerId, enabled: true, ...(name ? { name } : {}), ...draft };
    return id;
  }

  surface(layerId: string, s: Omit<Surface, "id" | "layerId">): string {
    const id = this.id("surf");
    this.doc.surfaces[id] = { id, layerId, ...s };
    return id;
  }

  component(layerId: string, c: Draft<Component>): string {
    const id = this.id("cmp");
    this.doc.components[id] = { id, layerId, ...c } as Component;
    return id;
  }

  effect(layerId: string, e: Omit<EffectInstance, "id" | "layerId">): string {
    const id = this.id("fxi");
    this.doc.effects[id] = { id, layerId, ...e };
    return id;
  }

  tape(t: Omit<InputTape, "id">): string {
    const id = this.id("tape");
    this.doc.inputTapes[id] = { id, ...t };
    return id;
  }

  /**
   * Splits a text layer into letter pieces inside a new Split group (grammar
   * 3.G.1): the source is kept hidden and editable, the group carries the
   * accessible label, pieces sit at seeded homes on one line.
   */
  splitLetters(sourceId: string, groupName: string, opts: { tags?: string[]; advance?: number; seed?: number } = {}): { groupId: string; pieceIds: string[]; generatorId: string } {
    const source = this.doc.layers[sourceId];
    const text = String(source.properties["content.text"]);
    source.visible = false;
    const groupId = this.layer("container", groupName, source.parentId, { "a11y.label": text, "layout.display": "flex" });
    const chars = splitGraphemes(text).filter((c) => c.trim() !== "");
    const advance = opts.advance ?? 28;
    let seed = opts.seed ?? 1;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return Math.round((seed / 2147483647) * 1000) / 1000;
    };
    const pieceIds = chars.map((char, i) =>
      this.layer("text", `${groupName} ${char} ${i}`, groupId, { "content.text": char, "a11y.role": "presentation" }, opts.tags ? { tags: opts.tags } : {})
    );
    const generatorId = this.id("gen");
    const generator: Generator = {
      id: generatorId,
      kind: "split",
      groupLayerId: groupId,
      sourceLayerId: sourceId,
      mode: "letters",
      detached: false,
      pieces: pieceIds.map((layerId, index) => ({ layerId, index, char: chars[index], wordIndex: 0, lineIndex: 0, home: [index * advance, 0], random: random() })),
      overrides: { byIndex: {}, byChar: {} },
    };
    this.doc.generators[generatorId] = generator;
    return { groupId, pieceIds, generatorId };
  }

  graph(g: Omit<InteractionGraph, "id">): string {
    const id = this.id("graph");
    this.doc.graphs[id] = { id, ...g };
    return id;
  }

  /** Places every clip in a composition, as the store does on every write (Phase 46). */
  build(): MotionDocument {
    syncCompositions(this.doc);
    return this.doc;
  }
}

// ---------------------------------------------------------------------------
// Graph helpers
// ---------------------------------------------------------------------------

const execIn = { id: "exec", direction: "in" as const, kind: "exec" as const };
const execOut = { id: "then", direction: "out" as const, kind: "exec" as const };

export function eventNode(id: string, type: string, params: GraphNode["params"], dataOut: GraphNode["pins"] = []): GraphNode {
  return { id, kind: "event", type, params, pins: [execOut, ...dataOut] };
}

export function actionNode(id: string, type: string, params: GraphNode["params"], dataIn: GraphNode["pins"] = []): GraphNode {
  return { id, kind: "action", type, params, pins: [execIn, execOut, ...dataIn] };
}

export const layerOut = (id: string) => ({ id, direction: "out" as const, kind: "data" as const, dataType: "layer" as const });
export const layerIn = (id: string) => ({ id, direction: "in" as const, kind: "data" as const, dataType: "layer" as const });
export const numberIn = (id: string, dflt?: number) => ({ id, direction: "in" as const, kind: "data" as const, dataType: "number" as const, ...(dflt !== undefined ? { default: dflt } : {}) });
export const numberOut = (id: string) => ({ id, direction: "out" as const, kind: "data" as const, dataType: "number" as const });

let wireCount = 0;
export function wire(from: string, fromPin: string, to: string, toPin: string) {
  return { id: `wire_${(wireCount++).toString(16).padStart(8, "0")}`, from: { node: from, pin: fromPin }, to: { node: to, pin: toPin } };
}

/** A "When → Do" rule (grammar §13.7): one event node, then its actions chained by exec wires. */
export function rule(event: GraphNode, actions: GraphNode[]): { nodes: GraphNode[]; wires: ReturnType<typeof wire>[] } {
  const nodes = [event, ...actions];
  const wires = actions.map((a, i) => wire(nodes[i].id, "then", a.id, "exec"));
  return { nodes, wires };
}
