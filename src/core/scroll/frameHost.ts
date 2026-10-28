import type { LayerNodeRegistry } from "../render/LayerNodeRegistry";
import type { MotionDocument } from "../document/schema";
import type { ScrollHost } from "./ScrollDriver";

/**
 * The scroll driver's view of a real stage frame: the frame window's scroll, each layer's layout box (from
 * `offsetTop` and `offsetHeight`, which ignore transforms, so a reveal that moves a layer can't move its own range),
 * and the CSS `translate` property for pinning (separate from `transform`, so the animation keeps the transform).
 */
export function createFrameScrollHost(registry: LayerNodeRegistry, getDocument: () => MotionDocument): ScrollHost {
  const originals = new Map<string, string>();
  const element = (id: string) => registry.get(id) as HTMLElement | undefined;
  return {
    getDocument,
    metrics() {
      for (const id of registry.ids()) {
        const win = element(id)?.ownerDocument?.defaultView;
        if (win) return { scrollY: win.scrollY, viewportHeight: win.innerHeight };
      }
      return null;
    },
    box(id) {
      const el = element(id);
      if (!el || !el.isConnected) return null;
      let top = 0;
      for (let node: HTMLElement | null = el; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop;
      return { top, height: el.offsetHeight };
    },
    setPin(id, px) {
      const el = element(id);
      if (!el) return;
      if (px === null) {
        const original = originals.get(id);
        if (original) el.style.setProperty("translate", original);
        else el.style.removeProperty("translate");
        originals.delete(id);
        return;
      }
      if (!originals.has(id)) originals.set(id, el.style.getPropertyValue("translate"));
      el.style.setProperty("translate", `0 ${px}px`);
    },
  };
}
