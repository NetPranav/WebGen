/**
 * ============================================================================
 * INTERACTION GRAPHS (MDM, ROADMAP Phase 7.5 — types only)
 * ============================================================================
 * The Interaction Blueprint model (Phases 72–74): a typed event graph of
 * nodes with exec and data pins, wires, variables and custom events. Simple
 * "When → Do" rules (grammar §13.7, §14.6) compile to fragments of the same
 * model, so one type serves both faces.
 *
 * The node vocabulary here is the grammar's event and action lists plus the
 * flow and pure nodes Blueprints need. Phase 72.2 adds per-node signatures
 * (which params and pins each type must have); until then each node declares
 * its pins and this module checks their wiring.
 * ============================================================================
 */

import { z } from "zod";
import { PropValueSchema, EventNameSchema } from "./motion";

const Id = z.string().min(1);
const Ident = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Must be an identifier (letters, digits, _).");

/** Events (grammar §13.7 `<Event>`, §14.6 additions). */
export const GRAPH_EVENTS = [
  "PointerEnter", "PointerLeave", "PointerDown", "PointerUp", "Click", "DoubleClick", "LongPress",
  "HoverStart", "HoverEnd", "Focus", "Blur", "Key", "ViewEnter", "ViewLeave", "ScrollCross", "Breakpoint",
  "Mount", "Marker", "StateEnter", "StateExit", "VarChanged", "SignalCross", "Custom", "Timer", "MediaEnded",
  "OverlapBegin", "OverlapStay", "OverlapEnd", "Hit", "FieldEnter", "FieldExit", "DragStart", "Drag", "DragEnd",
] as const;

/** Actions (grammar §13.7 `<Action>`, §14.6 additions). */
export const GRAPH_ACTIONS = [
  "Play", "Seek", "Reverse", "SetState", "SetInput", "SpringTo", "Set", "SetUniform", "Burst", "Impulse",
  "Pause", "Resume", "Show", "Hide", "SetVar", "Emit", "ScrollTo", "FocusLayer", "Wait", "OpenURL",
  "KeepOut", "SpringHome", "AddForce", "AddImpulse", "AddSpin", "SetVelocity", "Explode", "SetBody",
  "EnableCollider", "Spawn", "Despawn", "PlaySound", "StopSound",
] as const;

/** Actions that resume in a later frame (grammar §13.7 rule 1). */
export const LATENT_ACTIONS: ReadonlySet<string> = new Set(["Wait", "Play"]);

export const GRAPH_FLOW = ["Branch", "Sequence", "DoOnce", "Gate", "FlipFlop", "ForEach"] as const;

export const GRAPH_PURE = [
  "Literal", "GetVar", "GetProperty", "GetAttribute", "GetContact",
  "Add", "Subtract", "Multiply", "Divide", "Min", "Max", "Clamp", "RandomRange",
  "Compare", "And", "Or", "Not",
] as const;

export const NODE_TYPES = {
  event: GRAPH_EVENTS,
  action: GRAPH_ACTIONS,
  flow: GRAPH_FLOW,
  pure: GRAPH_PURE,
} as const;
export type NodeKind = keyof typeof NODE_TYPES;

export const DATA_TYPES = ["number", "bool", "string", "vec2", "color", "layer", "any"] as const;

export const GraphPinSchema = z
  .strictObject({
    id: Ident,
    direction: z.enum(["in", "out"]),
    kind: z.enum(["exec", "data"]),
    dataType: z.enum(DATA_TYPES).optional(),
    /** A data input with no wire uses this value. */
    default: PropValueSchema.optional(),
  })
  .refine((p) => (p.kind === "data") === (p.dataType !== undefined), "Data pins need a dataType; exec pins have none.");

const nodeOf = <K extends NodeKind>(kind: K) =>
  z.strictObject({
    id: Id,
    kind: z.literal(kind),
    type: z.enum(NODE_TYPES[kind] as unknown as [string, ...string[]]),
    /** Node settings (the grammar's arguments): `layer`, `name`, `margin`, … */
    params: z.record(Ident, PropValueSchema),
    pins: z.array(GraphPinSchema),
    /** Canvas position in the Pro graph. */
    position: z.tuple([z.number(), z.number()]).optional(),
  });

/** A node: its `type` must belong to its `kind` (listed in the JSON Schema, for the AI). */
export const GraphNodeSchema = z
  .discriminatedUnion("kind", [nodeOf("event"), nodeOf("action"), nodeOf("flow"), nodeOf("pure")])
  .superRefine((node, ctx) => {
    const issue = (message: string, path: (string | number)[] = []) => ctx.addIssue({ code: "custom", path, message });
    const ids = node.pins.map((p) => p.id);
    if (new Set(ids).size !== ids.length) issue("Duplicate pin id.", ["pins"]);
    const execIn = node.pins.filter((p) => p.kind === "exec" && p.direction === "in").length;
    const execOut = node.pins.filter((p) => p.kind === "exec" && p.direction === "out").length;
    if (node.kind === "event" && (execIn !== 0 || execOut !== 1)) issue("An event node has no exec input and one exec output.", ["pins"]);
    if (node.kind === "action" && (execIn !== 1 || execOut < 1)) issue("An action node has one exec input and at least one exec output.", ["pins"]);
    if (node.kind === "flow" && (execIn < 1 || execOut < 1)) issue("A flow node has exec inputs and outputs.", ["pins"]);
    if (node.kind === "pure" && execIn + execOut !== 0) issue("A pure node has no exec pins.", ["pins"]);
  });

export const GraphWireSchema = z.strictObject({
  id: Id,
  from: z.strictObject({ node: Id, pin: Ident }),
  to: z.strictObject({ node: Id, pin: Ident }),
});

export const GraphVariableSchema = z.strictObject({
  name: Ident,
  type: z.enum(DATA_TYPES),
  default: PropValueSchema,
});

export const InteractionGraphSchema = z
  .strictObject({
    id: Id,
    name: z.string().min(1),
    /** The layer the graph belongs to (`self` in its nodes), or null for a frame-wide graph. */
    ownerLayerId: Id.nullable(),
    variables: z.array(GraphVariableSchema),
    customEvents: z.array(z.strictObject({ name: EventNameSchema })),
    nodes: z.array(GraphNodeSchema),
    wires: z.array(GraphWireSchema),
  })
  .superRefine((graph, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
    const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
    if (nodes.size !== graph.nodes.length) issue(["nodes"], "Duplicate node id.");
    const vars = new Set(graph.variables.map((v) => v.name));
    if (vars.size !== graph.variables.length) issue(["variables"], "Duplicate variable name.");
    const events = new Set(graph.customEvents.map((e) => e.name));
    if (events.size !== graph.customEvents.length) issue(["customEvents"], "Duplicate custom event.");

    // Names a node refers to must be declared on the graph.
    graph.nodes.forEach((node, i) => {
      const name = node.params.name;
      const needsEvent = (node.kind === "event" && node.type === "Custom") || (node.kind === "action" && node.type === "Emit");
      const needsVar = ["VarChanged", "SetVar", "GetVar"].includes(node.type);
      if (needsEvent && (typeof name !== "string" || !events.has(name))) issue(["nodes", i, "params", "name"], `Custom event "${String(name)}" is not declared on the graph.`);
      if (needsVar && (typeof name !== "string" || !vars.has(name))) issue(["nodes", i, "params", "name"], `Variable "${String(name)}" is not declared on the graph.`);
    });

    const execOutUsed = new Set<string>();
    const dataInUsed = new Set<string>();
    graph.wires.forEach((wire, i) => {
      const at = ["wires", i];
      const from = nodes.get(wire.from.node);
      const to = nodes.get(wire.to.node);
      if (!from || !to) return issue(at, `Wire ${wire.id} connects a node that does not exist.`);
      const out = from.pins.find((p) => p.id === wire.from.pin);
      const inp = to.pins.find((p) => p.id === wire.to.pin);
      if (!out || !inp) return issue(at, `Wire ${wire.id} connects a pin that does not exist.`);
      if (out.direction !== "out" || inp.direction !== "in") return issue(at, `Wire ${wire.id} must go from an output to an input.`);
      if (out.kind !== inp.kind) return issue(at, `Wire ${wire.id} connects an ${out.kind} pin to a ${inp.kind} pin.`);
      if (out.kind === "data" && out.dataType !== inp.dataType && out.dataType !== "any" && inp.dataType !== "any") {
        issue(at, `Wire ${wire.id} connects ${out.dataType} to ${inp.dataType}.`);
      }
      // Unreal semantics: one wire per exec output (use Sequence to fan out), one per data input.
      const key = `${wire.from.node}.${wire.from.pin}`;
      if (out.kind === "exec") {
        if (execOutUsed.has(key)) issue(at, `Exec output ${key} has more than one wire; use a Sequence node.`);
        execOutUsed.add(key);
      } else {
        const inKey = `${wire.to.node}.${wire.to.pin}`;
        if (dataInUsed.has(inKey)) issue(at, `Data input ${inKey} has more than one wire.`);
        dataInUsed.add(inKey);
      }
    });

    // Pure nodes are evaluated on demand, so a data cycle has no value.
    const edges = new Map<string, string[]>();
    for (const w of graph.wires) {
      const pin = nodes.get(w.from.node)?.pins.find((p) => p.id === w.from.pin);
      if (pin?.kind === "data") edges.set(w.from.node, [...(edges.get(w.from.node) ?? []), w.to.node]);
    }
    const state = new Map<string, 1 | 2>();
    const visit = (id: string): boolean => {
      if (state.get(id) === 1) return true;
      if (state.get(id) === 2) return false;
      state.set(id, 1);
      const cyclic = (edges.get(id) ?? []).some(visit);
      state.set(id, 2);
      return cyclic;
    };
    if ([...nodes.keys()].some(visit)) issue(["wires"], "Data wires form a cycle.");
  });
export type InteractionGraph = z.infer<typeof InteractionGraphSchema>;
export type GraphNode = z.infer<typeof GraphNodeSchema>;

/** Node params that name layers; the document checks they resolve (references.ts). */
export const LAYER_PARAMS = ["layer", "target", "collider", "other"] as const;
