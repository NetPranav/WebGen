/**
 * ROADMAP Phase 19: what the editor can ask of the drawn stage. A `StageRenderer` holds the
 * `LayerNodeRegistry` (layer id → element) and measures layers: `measure(layerIds)` returns
 * document-space rectangles, batched into one read pass per animation frame, and cached until
 * something could have moved a layer (a `ResizeObserver` on every registered element, a
 * `MutationObserver` on the stage root, a window resize).
 *
 * Browser APIs are injected so the batching and caching are unit-tested without a browser.
 */
import { LayerNodeRegistry } from "./LayerNodeRegistry";
import { frameScheduler } from "../time/scheduler";

/** A layer's box in document space: the frame document's own pixels, unaffected by the canvas' pan and zoom. */
export interface LayerRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FrameLike {
  window: { scrollX: number; scrollY: number; addEventListener: (type: "resize", l: () => void) => void; removeEventListener: (type: "resize", l: () => void) => void };
  root: Element;
}

interface ObserverLike {
  observe: (target: Element, options?: unknown) => void;
  unobserve?: (target: Element) => void;
  disconnect: () => void;
}

export interface StageRendererEnv {
  createResizeObserver?: (callback: () => void) => ObserverLike;
  createMutationObserver?: (callback: () => void) => ObserverLike;
  requestFrame?: (callback: () => void) => unknown;
}

type Pending = { ids: string[]; resolve: (rects: (LayerRect | null)[]) => void };

export class StageRenderer {
  readonly registry = new LayerNodeRegistry();

  private frame: FrameLike | null = null;
  private resizeObserver: ObserverLike | null = null;
  private mutationObserver: ObserverLike | null = null;
  private epoch = 0;
  private readonly cache = new Map<string, { epoch: number; rect: LayerRect }>();
  private queue: Pending[] = [];
  private scheduled = false;
  /** Layout read passes performed, for the batching test. */
  passes = 0;
  private readonly onResize = () => {
    this.epoch++;
  };

  constructor(private readonly env: StageRendererEnv = {}) {
    // Keep the resize observer in step with the registry: every drawn layer is watched.
    this.registry.subscribe((id, element) => {
      this.cache.delete(id);
      this.epoch++;
      if (!this.resizeObserver) return;
      if (element) this.resizeObserver.observe(element);
    });
  }

  /** Starts measuring against a stage frame. Call again when the frame reloads. */
  attach(frame: FrameLike): void {
    this.detach();
    this.frame = frame;
    const bump = () => {
      this.epoch++;
    };
    const makeResize = this.env.createResizeObserver ?? (typeof ResizeObserver === "undefined" ? undefined : (cb: () => void) => new ResizeObserver(cb) as unknown as ObserverLike);
    const makeMutation = this.env.createMutationObserver ?? (typeof MutationObserver === "undefined" ? undefined : (cb: () => void) => new MutationObserver(cb) as unknown as ObserverLike);
    this.resizeObserver = makeResize?.(bump) ?? null;
    this.mutationObserver = makeMutation?.(bump) ?? null;
    this.mutationObserver?.observe(frame.root, { attributes: true, childList: true, subtree: true, characterData: true });
    for (const id of this.registry.ids()) {
      const el = this.registry.get(id);
      if (el) this.resizeObserver?.observe(el);
    }
    frame.window.addEventListener("resize", this.onResize);
    this.epoch++;
  }

  detach(): void {
    this.frame?.window.removeEventListener("resize", this.onResize);
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.resizeObserver = null;
    this.mutationObserver = null;
    this.frame = null;
    this.cache.clear();
    this.epoch++;
  }

  /** Reads the rectangles now (one pass, no writes in between). A layer that isn't drawn gives `null`. Uses the cache while nothing has moved. */
  measureNow(layerIds: readonly string[]): (LayerRect | null)[] {
    this.passes++;
    const scroll = this.frame ? { x: this.frame.window.scrollX, y: this.frame.window.scrollY } : { x: 0, y: 0 };
    return layerIds.map((id) => {
      const cached = this.cache.get(id);
      if (cached && cached.epoch === this.epoch) return cached.rect;
      const element = this.registry.get(id);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      const rect: LayerRect = { id, x: box.left + scroll.x, y: box.top + scroll.y, width: box.width, height: box.height };
      this.cache.set(id, { epoch: this.epoch, rect });
      return rect;
    });
  }

  /**
   * `renderer.measure(layerIds)`: document-space rectangles. Calls made in the same animation frame are
   * answered from one read pass, so asking for 100 layers from 100 places costs one layout, not 100.
   */
  measure(layerIds: readonly string[]): Promise<(LayerRect | null)[]> {
    return new Promise((resolve) => {
      this.queue.push({ ids: [...layerIds], resolve });
      if (this.scheduled) return;
      this.scheduled = true;
      (this.env.requestFrame ?? runOnNextFrame)(() => this.flush());
    });
  }

  private flush(): void {
    this.scheduled = false;
    const batch = this.queue;
    this.queue = [];
    const unique = Array.from(new Set(batch.flatMap((p) => p.ids)));
    const results = this.measureNow(unique); // one read pass for everything asked this frame
    const measured = new Map(unique.map((id, i) => [id, results[i]] as const));
    for (const pending of batch) pending.resolve(pending.ids.map((id) => measured.get(id) ?? null));
  }
}

/**
 * Runs `callback` once, in the next frame's `overlay` phase (after rendering, when layout can be read),
 * through the studio's frame scheduler: nothing else in the editor owns its own animation-frame loop (Law 12).
 */
function runOnNextFrame(callback: () => void): void {
  if (typeof window === "undefined") {
    setTimeout(callback, 0);
    return;
  }
  const off = frameScheduler.register("overlay", () => {
    off();
    callback();
  });
}

let active: StageRenderer | null = null;

/** The renderer of the stage that is on screen (there is one), or null. Phase 57 reads node positions and writes values through it. */
export function getStageRenderer(): StageRenderer | null {
  return active;
}

export function setStageRenderer(renderer: StageRenderer | null): void {
  active = renderer;
}
