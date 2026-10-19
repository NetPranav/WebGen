import type { Layer } from "../document/schema";
import { getDefaultProps } from "../document/registry";
import type { ResolvedProps } from "./types";

/** The layer's own properties over its archetype's defaults. Pure: the same layer gives the same answer. */
export function resolveProps(layer: Pick<Layer, "archetype" | "properties">): ResolvedProps {
  const bag = { ...getDefaultProps(layer.archetype), ...layer.properties };
  const get = (path: string) => bag[path];
  return {
    get,
    str: (path, fallback) => {
      const v = bag[path];
      return typeof v === "string" && v !== "" ? v : fallback;
    },
    num: (path, fallback) => {
      const v = bag[path];
      return typeof v === "number" && Number.isFinite(v) ? v : fallback;
    },
    bool: (path, fallback) => {
      const v = bag[path];
      return typeof v === "boolean" ? v : fallback;
    },
  };
}
