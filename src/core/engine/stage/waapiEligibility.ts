import { getPropertyDefinition } from "../../document/properties";
import { routeAnimation } from "../../rules/routing";

/**
 * ROADMAP Phase 58: which layers run as Web Animations. A layer qualifies when the rules route every property it
 * animates to the `css` backend (Phase 8) and every one of them is a number, length, angle or colour with a CSS
 * property, or part of the transform. Anything else (SVG path morphs, 3D, strings that switch) stays on the kernel.
 */
const INTERPOLABLE = new Set(["number", "length", "angle", "color"]);

const isTransformPath = (path: string) => (path.startsWith("transform.") && path !== "transform.motionPath") || path === "frame.rotation";

export function canRunOnWaapi(paths: Iterable<string>): boolean {
  const list = Array.from(paths);
  if (list.length === 0) return false;
  if (routeAnimation({ properties: list }).backend !== "css") return false;
  return list.every((path) => {
    if (isTransformPath(path)) return true;
    const def = getPropertyDefinition(path);
    return !!def?.css && INTERPOLABLE.has(def.valueType);
  });
}
