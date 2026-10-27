/**
 * ============================================================================
 * COMPONENTS IN THE EXPORT (ROADMAP Phase 49)
 * ============================================================================
 * For the React targets a design component (Phase 46, 47) becomes a component file with typed props: the variant
 * properties (`size`, `tone`), the exposed text, picture and visibility properties, and `className` for where the
 * instance sits. A use of it on a page (an instance, or the main component itself) is a call such as
 * `<Button size="M" label="Save" />`. An instance is called only when it is a plain use: it has changed nothing but
 * those properties and where it sits, and has no layers of its own inside. Anything else is written out in full where
 * it is, so the page always looks as the canvas does.
 * ============================================================================
 */

import { resolveNamePath, subtreeIds } from "../../components/instances";
import type { Layer, MotionDocument } from "../../document/schema";
import { decodeText } from "./markup";
import type { ENode } from "./markup";
import type { CssBlock } from "./css";
import type { ComponentPlan, ComponentProp, ComponentVariant } from "./plan";
import { PLACEMENT_CSS } from "./plan";
import type { Decl } from "./css";

/** What the plan needs to build a root again (the function that draws a component's main as a root of its own). */
export interface ComponentDef {
  id: string;
}

export type PlanRootFn = (rootId: string, kind: "page" | "component", fromRoute: string, hrefs: "files" | "routes", assets: Set<string>) => { tree: ENode[]; blocks: CssBlock[]; classOf: Map<string, string>; nodeOfLayer: Map<string, ENode> };

const PLACEMENT_PROPS = new Set(["frame.x", "frame.y", "positioning", "frame.rotation", "breakpoints.responsive", "layout.gridColumnStart", "layout.gridColumnSpan", "layout.gridRowStart", "layout.gridRowSpan", "constraints.horizontal", "constraints.vertical"]);
const PROP_KEY = { text: "content.text", image: "media.src", boolean: "visible", instance: "instance.swap" } as const;

const camel = (s: string): string => {
  const w = s.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(" ").filter(Boolean);
  const out = w.map((x, i) => (i === 0 ? x[0].toLowerCase() + x.slice(1) : x[0].toUpperCase() + x.slice(1))).join("");
  return /^[a-z]/.test(out) ? out : `p${out}`;
};
const pascal = (s: string): string => {
  const out = s.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(" ").filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1)).join("");
  return /^[A-Z]/.test(out) ? out : `C${out}`;
};

/** Is an instance a plain use of its component: nothing overridden but exposed properties and its place, and nothing of its own inside. */
export function isPlainInstance(doc: MotionDocument, rootId: string): boolean {
  const root = doc.layers[rootId];
  const comp = root?.instance ? doc.designComponents?.[root.instance.component] : undefined;
  if (!root?.instance?.root || !comp) return false;
  // the layers an exposed property sets, and the property key each one may override
  const allowed = new Map<string, Set<string>>();
  for (const p of comp.properties ?? []) {
    const l = resolveNamePath(doc.layers, rootId, p.path);
    if (!l) continue;
    const set = allowed.get(l.id) ?? new Set<string>();
    set.add(PROP_KEY[p.type]);
    allowed.set(l.id, set);
  }
  for (const id of subtreeIds(doc.layers, rootId)) {
    const l = doc.layers[id];
    if (!l?.instance || l.instance.component !== comp.id) return false; // a layer of its own (a slot's content)
    if (l.instance.swap) return false; // a nested instance swapped to another component (FigCraft port F9): drawn as it is
    const ok = new Set<string>([...(allowed.get(id) ?? []), ...(l.instance.root ? PLACEMENT_PROPS : [])]);
    for (const k of l.instance.overridden ?? []) if (!ok.has(k)) return false;
  }
  return true;
}

/** The exposed property's layer and node in a variant's markup. */
function nodeFor(doc: MotionDocument, mainId: string, path: readonly string[], nodeOfLayer: Map<string, ENode>): { layer: Layer; node: ENode } | null {
  const layer = resolveNamePath(doc.layers, mainId, path);
  const node = layer ? nodeOfLayer.get(layer.id) : undefined;
  return layer && node ? { layer, node } : null;
}

const firstText = (n: ENode): ENode | undefined => n.children.find((c) => c.tag === "#text");

/**
 * Finds the component uses on a page (instances, and main components) and turns them into calls, building each
 * component's file once. The CSS of what became a call is dropped from the page (the component carries it), except where
 * the call sits.
 */
export function componentize(
  doc: MotionDocument,
  plan: { tree: ENode[]; blocks: CssBlock[]; classOf: Map<string, string>; nodeOfLayer: Map<string, ENode> },
  pageId: string,
  _defs: Map<string, ComponentDef>,
  components: Map<string, ComponentPlan>,
  planRoot: PlanRootFn,
  siteAssets: Set<string>,
  warnings: string[],
): void {
  const taken = new Set<string>([...components.values()].map((c) => c.name));
  const build = (componentId: string): ComponentPlan | null => {
    const hit = components.get(componentId);
    if (hit) return hit;
    const comp = doc.designComponents?.[componentId];
    if (!comp) return null;
    let name = pascal(comp.name);
    for (let n = 2; taken.has(name); n++) name = `${pascal(comp.name)}${n}`;
    taken.add(name);
    const variantProps = (comp.variantProps ?? []).map((p) => ({ name: p.name, prop: camel(p.name), values: p.values }));
    const reserved = new Set(["className", "children", ...variantProps.map((v) => v.prop)]);
    const props: ComponentProp[] = [];
    for (const p of comp.properties ?? []) {
      // an instance-swap property (FigCraft port F9) isn't a prop of the exported component: a swapped instance is drawn as it is
      if (p.type === "instance") continue;
      let pn = camel(p.name);
      for (let n = 2; reserved.has(pn); n++) pn = `${camel(p.name)}${n}`;
      reserved.add(pn);
      props.push({ name: pn, type: p.type, id: p.id, fallback: p.type === "boolean" ? true : "" });
    }
    const mains = comp.variants && comp.variants.length > 0 ? comp.variants : [{ mainId: comp.mainId, values: {} as Record<string, string> }];
    const variants: ComponentVariant[] = [];
    const used = { fallbacks: false };
    for (const v of mains) {
      if (!doc.layers[v.mainId]) continue;
      const assets = new Set<string>();
      const rp = planRoot(v.mainId, "component", "/", "routes", assets);
      for (const a of assets) siteAssets.add(a);
      // the root takes a class from the caller too
      const rootNode = rp.nodeOfLayer.get(v.mainId);
      if (!rootNode) continue;
      rootNode.mergeClass = true;
      // each exposed property reads its prop
      comp.properties?.forEach((p, i) => {
        const target = nodeFor(doc, v.mainId, p.path, rp.nodeOfLayer);
        if (!target) return;
        const prop = props[i];
        if (p.type === "text") {
          const t = firstText(target.node);
          if (!t) return;
          const fallback = decodeText(t.text ?? "");
          if (prop.fallback === "" || prop.fallback === undefined) prop.fallback = fallback;
          t.expr = `props.${prop.name} ?? ${JSON.stringify(fallback)}`;
        } else if (p.type === "image") {
          const src = target.node.attrs.src;
          if (src === undefined) return;
          if (prop.fallback === "") prop.fallback = src;
          target.node.attrExprs = { ...(target.node.attrExprs ?? {}), src: `props.${prop.name} ?? ${JSON.stringify(src)}` };
        } else {
          target.node.showIf = `props.${prop.name} !== false`;
        }
      });
      used.fallbacks = true;
      variants.push({ mainId: v.mainId, values: v.values, tree: rp.tree, blocks: rp.blocks });
    }
    if (variants.length === 0) return null;
    const plan2: ComponentPlan = { id: componentId, name, variantProps, props, variants, uses: 0 };
    components.set(componentId, plan2);
    return plan2;
  };

  const classesUnder = (n: ENode): string[] => {
    const out: string[] = [];
    const visit = (x: ENode) => {
      if (x.attrs.class) out.push(x.attrs.class);
      x.children.forEach(visit);
    };
    n.children.forEach(visit);
    return out;
  };

  const visit = (layerId: string) => {
    const layer = doc.layers[layerId];
    if (!layer) return;
    const isInstance = layer.instance?.root === true;
    const isMain = !!layer.componentMain;
    if ((isInstance && isPlainInstance(doc, layerId)) || (isMain && !isInstance)) {
      const cid = isInstance ? layer.instance!.component : layer.componentMain!;
      const node = plan.nodeOfLayer.get(layerId);
      const comp = node ? build(cid) : null;
      if (node && comp) {
        // the props of this call
        const call: Record<string, string | number | boolean> = {};
        const dc = doc.designComponents![cid];
        const meta = layer.instance;
        const chosen = isInstance ? (meta?.variant ?? {}) : (dc.variants?.find((v) => v.mainId === layerId)?.values ?? {});
        for (const vp of comp.variantProps) {
          const value = chosen[vp.name];
          if (value !== undefined && value !== vp.values[0]) call[vp.prop] = value;
        }
        if (isInstance) {
          dc.properties?.forEach((p) => {
            const target = resolveNamePath(doc.layers, layerId, p.path);
            const prop = comp.props.find((x) => x.id === p.id);
            if (!target || !prop) return;
            if (p.type === "boolean") {
              if (target.visible === false) call[prop.name] = false;
            } else {
              const v = target.properties[PROP_KEY[p.type]];
              if (typeof v === "string" && v !== prop.fallback) {
                const resolved = p.type === "image" && v.startsWith("asset:") ? `{{asset:${v.slice(6)}}}` : v;
                if (p.type === "image" && v.startsWith("asset:")) siteAssets.add(v.slice(6));
                if (resolved !== prop.fallback) call[prop.name] = resolved;
              }
            }
          });
        }
        // the page keeps only where the call sits: the rules of everything inside it go to the component
        const inner = new Set(classesUnder(node));
        const rootClass = node.attrs.class;
        for (const b of plan.blocks) {
          b.rules = b.rules
            .filter((r) => !inner.has(r.selector.replace(/^\[data-mode="[^"]+"\] /, "").slice(1)))
            .map((r) => (rootClass && r.selector.replace(/^\[data-mode="[^"]+"\] /, "") === `.${rootClass}` ? { ...r, decls: r.decls.filter(([k]: Decl) => PLACEMENT_CSS.has(k)) } : r));
        }
        node.tag = "#component";
        node.children = [];
        node.attrExprs = undefined;
        node.component = { name: comp.name, props: call };
        node.mergeClass = undefined;
        comp.uses++;
        return;
      }
      if (isInstance && !comp) warnings.push(`The instance ${layer.name} could not be exported as a component and is written out in full.`);
    } else if (isInstance) {
      warnings.push(`The instance ${layer.name} of a component has changes of its own and is written out in full.`);
    }
    for (const k of layer.children) visit(k);
  };
  visit(pageId);
}
