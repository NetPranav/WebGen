/**
 * ============================================================================
 * SPATIAL INDEX (DYNAMIC 2D QUADTREE FOR NODE & WIRE HIT-TESTING)
 * ============================================================================
 * Implements high-performance spatial indexing for visual graph nodes & wires:
 * - Incremental updates avoiding full rebuild on each frame
 * - O(log N) hit testing for clicks, marquee drag select, and viewport culling
 * - Fast point queries and AABB bounding range queries
 * ============================================================================
 */

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type SpatialItemType = "node" | "pin" | "wire" | "comment";

export interface SpatialItem {
  id: string;
  type: SpatialItemType;
  bounds: AABB;
  zIndex: number;
}

export class QuadtreeNode {
  public static readonly MAX_ITEMS = 8;
  public static readonly MAX_DEPTH = 8;

  public bounds: AABB;
  public depth: number;
  public isSubdivided: boolean = false;
  public items: SpatialItem[] = [];
  public children: [QuadtreeNode, QuadtreeNode, QuadtreeNode, QuadtreeNode] | null = null;

  constructor(bounds: AABB, depth: number = 0) {
    this.bounds = bounds;
    this.depth = depth;
  }

  public static containsPoint(bounds: AABB, x: number, y: number): boolean {
    return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
  }

  public static intersects(a: AABB, b: AABB): boolean {
    return !(a.minX > b.maxX || a.maxX < b.minX || a.minY > b.maxY || a.maxY < b.minY);
  }

  public subdivide(): void {
    const xMid = (this.bounds.minX + this.bounds.maxX) * 0.5;
    const yMid = (this.bounds.minY + this.bounds.maxY) * 0.5;
    const d = this.depth + 1;

    this.children = [
      new QuadtreeNode({ minX: this.bounds.minX, minY: this.bounds.minY, maxX: xMid, maxY: yMid }, d), // NW
      new QuadtreeNode({ minX: xMid, minY: this.bounds.minY, maxX: this.bounds.maxX, maxY: yMid }, d), // NE
      new QuadtreeNode({ minX: this.bounds.minX, minY: yMid, maxX: xMid, maxY: this.bounds.maxY }, d), // SW
      new QuadtreeNode({ minX: xMid, minY: yMid, maxX: this.bounds.maxX, maxY: this.bounds.maxY }, d), // SE
    ];
    this.isSubdivided = true;

    const remaining: SpatialItem[] = [];
    for (const item of this.items) {
      let placed = false;
      for (const child of this.children) {
        if (
          QuadtreeNode.containsPoint(child.bounds, item.bounds.minX, item.bounds.minY) &&
          QuadtreeNode.containsPoint(child.bounds, item.bounds.maxX, item.bounds.maxY)
        ) {
          child.insert(item);
          placed = true;
          break;
        }
      }
      if (!placed) {
        remaining.push(item);
      }
    }
    this.items = remaining;
  }

  public insert(item: SpatialItem): boolean {
    if (!QuadtreeNode.intersects(this.bounds, item.bounds)) {
      return false;
    }

    if (this.isSubdivided && this.children) {
      for (const child of this.children) {
        if (
          QuadtreeNode.containsPoint(child.bounds, item.bounds.minX, item.bounds.minY) &&
          QuadtreeNode.containsPoint(child.bounds, item.bounds.maxX, item.bounds.maxY)
        ) {
          return child.insert(item);
        }
      }
      this.items.push(item);
      return true;
    }

    this.items.push(item);

    if (this.items.length > QuadtreeNode.MAX_ITEMS && this.depth < QuadtreeNode.MAX_DEPTH) {
      this.subdivide();
    }

    return true;
  }

  public remove(id: string): boolean {
    const idx = this.items.findIndex((item) => item.id === id);
    let found = false;
    if (idx !== -1) {
      this.items.splice(idx, 1);
      found = true;
    }

    if (this.isSubdivided && this.children) {
      for (const child of this.children) {
        if (child.remove(id)) {
          found = true;
        }
      }
    }

    return found;
  }

  public queryRange(range: AABB, results: SpatialItem[]): void {
    if (!QuadtreeNode.intersects(this.bounds, range)) {
      return;
    }

    for (const item of this.items) {
      if (QuadtreeNode.intersects(item.bounds, range)) {
        results.push(item);
      }
    }

    if (this.isSubdivided && this.children) {
      for (const child of this.children) {
        child.queryRange(range, results);
      }
    }
  }

  public queryPoint(x: number, y: number, results: SpatialItem[]): void {
    if (!QuadtreeNode.containsPoint(this.bounds, x, y)) {
      return;
    }

    for (const item of this.items) {
      if (QuadtreeNode.containsPoint(item.bounds, x, y)) {
        results.push(item);
      }
    }

    if (this.isSubdivided && this.children) {
      for (const child of this.children) {
        child.queryPoint(x, y, results);
      }
    }
  }

  public clear(): void {
    this.items = [];
    this.isSubdivided = false;
    this.children = null;
  }

  public totalItemCount(): number {
    let count = this.items.length;
    if (this.isSubdivided && this.children) {
      for (const child of this.children) {
        count += child.totalItemCount();
      }
    }
    return count;
  }
}

export class SpatialIndex {
  private worldBounds: AABB;
  private root: QuadtreeNode;
  private registry: Map<string, SpatialItem> = new Map();

  constructor(worldBounds: AABB) {
    this.worldBounds = worldBounds;
    this.root = new QuadtreeNode(worldBounds, 0);
  }

  public insert(id: string, type: SpatialItemType, bounds: AABB, zIndex: number = 0): void {
    if (this.registry.has(id)) {
      this.root.remove(id);
    }
    const item: SpatialItem = { id, type, bounds, zIndex };
    this.registry.set(id, item);
    this.root.insert(item);
  }

  public update(id: string, newBounds: AABB): void {
    const existing = this.registry.get(id);
    if (existing) {
      existing.bounds = newBounds;
      this.root.remove(id);
      this.root.insert(existing);
    }
  }

  public remove(id: string): boolean {
    if (this.registry.has(id)) {
      this.registry.delete(id);
      return this.root.remove(id);
    }
    return false;
  }

  public queryRange(range: AABB): SpatialItem[] {
    const results: SpatialItem[] = [];
    this.root.queryRange(range, results);
    return results;
  }

  public queryPoint(x: number, y: number): SpatialItem[] {
    const results: SpatialItem[] = [];
    this.root.queryPoint(x, y, results);
    // Sort descending by z-index (topmost first)
    results.sort((a, b) => b.zIndex - a.zIndex);
    return results;
  }

  public hitTestTopmost(x: number, y: number): SpatialItem | null {
    const items = this.queryPoint(x, y);
    return items.length > 0 ? items[0] : null;
  }

  public clear(): void {
    this.registry.clear();
    this.root.clear();
  }

  public size(): number {
    return this.registry.size;
  }
}
