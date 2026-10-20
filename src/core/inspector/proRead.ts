import type { Layer } from "../document/schema";
import type { PropValue } from "../document/registry";
import { isPropertyLegalFor, type PropertyDefinition } from "../document/properties";
import { resolveProps } from "../render/resolve";

export interface ProValue {
  /** What the layers share, or `null` ("Mixed") when they differ. `undefined` when no selected layer has the property. */
  value: PropValue | null | undefined;
  /** Some layer has its own value set (so there is something to reset). */
  explicit: boolean;
}

const same = (a: PropValue, b: PropValue) => a === b || JSON.stringify(a) === JSON.stringify(b);

/** A property's value across the selected layers that can carry it: their own value, else the archetype's default, else the registry's. */
export function proValue(layers: Record<string, Layer>, ids: readonly string[], path: string, def: PropertyDefinition): ProValue {
  const values: PropValue[] = [];
  let explicit = false;
  for (const id of ids) {
    const layer = layers[id];
    if (!layer || !isPropertyLegalFor(path, layer.archetype)) continue;
    if (layer.properties[path] !== undefined) explicit = true;
    const v = resolveProps(layer).get(path);
    values.push(v === undefined ? def.default : v);
  }
  if (values.length === 0) return { value: undefined, explicit };
  return { value: values.every((v) => same(v, values[0])) ? values[0] : null, explicit };
}
