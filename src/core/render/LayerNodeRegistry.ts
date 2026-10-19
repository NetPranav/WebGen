/**
 * ROADMAP Phase 19, Law 9 (Hot Path): the DOM element each layer is drawn into. Per-frame values
 * (a playhead position, a pointer) are written straight to these nodes, never through React state or
 * the document store; Phase 57 puts the evaluation kernel's output here.
 *
 * Pure bookkeeping: no React and no DOM calls, so it is tested with plain objects.
 */
export type NodeListener = (layerId: string, element: Element | null) => void;

export class LayerNodeRegistry {
  private readonly nodes = new Map<string, Element>();
  private readonly listeners = new Set<NodeListener>();

  /** Records the element a layer is drawn into. A layer drawn into a new element replaces the old one. */
  register(layerId: string, element: Element): void {
    if (this.nodes.get(layerId) === element) return;
    this.nodes.set(layerId, element);
    for (const listener of this.listeners) listener(layerId, element);
  }

  /** Forgets a layer's element. When `element` is given it only counts if it is still the registered one (a late cleanup must not remove a newer registration). */
  unregister(layerId: string, element?: Element): void {
    const current = this.nodes.get(layerId);
    if (!current || (element && current !== element)) return;
    this.nodes.delete(layerId);
    for (const listener of this.listeners) listener(layerId, null);
  }

  get(layerId: string): Element | undefined {
    return this.nodes.get(layerId);
  }

  has(layerId: string): boolean {
    return this.nodes.has(layerId);
  }

  ids(): string[] {
    return Array.from(this.nodes.keys());
  }

  get size(): number {
    return this.nodes.size;
  }

  /** Calls `listener` whenever a layer's element appears, changes or goes. Returns an unsubscribe. */
  subscribe(listener: NodeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
