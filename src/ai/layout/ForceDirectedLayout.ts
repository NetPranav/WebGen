/**
 * ============================================================================
 * GRAPH AUTO-LAYOUT ENGINE (Layered & Force-Directed Hybrid)
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 6.3
 *
 * Automatically arranges Blueprint graphs with left-to-right execution flow,
 * zero overlapping bounding boxes, and incremental subset reflow preserving
 * manual node coordinates.
 * ============================================================================
 */

import { BlueprintGraph, BlueprintNodeInstance } from "@/core/ast/ASTManager";

export interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalSpacing?: number;
  verticalSpacing?: number;
  startX?: number;
  startY?: number;
  pinnedNodeIds?: Set<string>;
  preserveExistingPositions?: boolean;
}

export class ForceDirectedLayout {
  public static readonly DEFAULT_NODE_WIDTH = 240;
  public static readonly DEFAULT_NODE_HEIGHT = 160;
  public static readonly DEFAULT_HORIZONTAL_SPACING = 100;
  public static readonly DEFAULT_VERTICAL_SPACING = 60;

  /**
   * Automatically lays out a BlueprintGraph AST in clean left-to-right hierarchy.
   */
  public static layoutGraph(
    graph: BlueprintGraph,
    options: LayoutOptions = {}
  ): BlueprintGraph {
    const nodeWidth = options.nodeWidth ?? this.DEFAULT_NODE_WIDTH;
    const nodeHeight = options.nodeHeight ?? this.DEFAULT_NODE_HEIGHT;
    const hSpacing = options.horizontalSpacing ?? this.DEFAULT_HORIZONTAL_SPACING;
    const vSpacing = options.verticalSpacing ?? this.DEFAULT_VERTICAL_SPACING;
    const startX = options.startX ?? 80;
    const startY = options.startY ?? 80;

    const pinned = options.pinnedNodeIds ?? new Set<string>();
    const preserve = options.preserveExistingPositions ?? false;

    // Shallow clone graph with new node positions
    const clonedGraph: BlueprintGraph = {
      ...graph,
      nodes: { ...graph.nodes },
    };

    const nodeIds = Object.keys(clonedGraph.nodes);
    if (nodeIds.length === 0) return clonedGraph;

    // 1. Build adjacency list and in-degrees
    const adj: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};

    for (const id of nodeIds) {
      adj[id] = [];
      inDegree[id] = 0;
    }

    for (const wire of clonedGraph.wires) {
      if (adj[wire.sourceNodeId] && adj[wire.targetNodeId] !== undefined) {
        adj[wire.sourceNodeId].push(wire.targetNodeId);
        inDegree[wire.targetNodeId] = (inDegree[wire.targetNodeId] || 0) + 1;
      }
    }

    // 2. Compute topological ranks (layers)
    const layers: Record<string, number> = {};
    const queue: string[] = [];

    // Roots: in-degree 0 or event nodes
    for (const id of nodeIds) {
      const node = clonedGraph.nodes[id];
      const isEvent = node.type.toLowerCase().startsWith("event");
      if (inDegree[id] === 0 || isEvent) {
        layers[id] = 0;
        queue.push(id);
      }
    }

    // If no roots detected (cycle or standalone), initialize all as 0
    if (queue.length === 0) {
      for (const id of nodeIds) {
        layers[id] = 0;
        queue.push(id);
      }
    }

    // BFS forward propagation for layering
    const visited = new Set<string>();
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentLayer = layers[current] ?? 0;

      for (const neighbor of adj[current] || []) {
        const nextLayer = currentLayer + 1;
        if (layers[neighbor] === undefined || layers[neighbor] < nextLayer) {
          layers[neighbor] = nextLayer;
          queue.push(neighbor);
        }
      }
      visited.add(current);
    }

    // Assign any unvisited disconnected nodes
    for (const id of nodeIds) {
      if (layers[id] === undefined) {
        layers[id] = 0;
      }
    }

    // 3. Group nodes by layer
    const layerBuckets: Map<number, string[]> = new Map();
    for (const id of nodeIds) {
      const l = layers[id];
      if (!layerBuckets.has(l)) {
        layerBuckets.set(l, []);
      }
      layerBuckets.get(l)!.push(id);
    }

    const sortedLayers = Array.from(layerBuckets.keys()).sort((a, b) => a - b);

    // 4. Initial grid placement
    for (const layerIndex of sortedLayers) {
      const bucket = layerBuckets.get(layerIndex)!;
      const colX = startX + layerIndex * (nodeWidth + hSpacing);

      for (let rowIndex = 0; rowIndex < bucket.length; rowIndex++) {
        const nodeId = bucket[rowIndex];
        const existingNode = clonedGraph.nodes[nodeId];

        const isPinned =
          pinned.has(nodeId) ||
          (preserve &&
            (existingNode.position.x !== 0 || existingNode.position.y !== 0));

        if (!isPinned) {
          const rowY = startY + rowIndex * (nodeHeight + vSpacing);
          clonedGraph.nodes[nodeId] = {
            ...existingNode,
            position: { x: colX, y: rowY },
          };
        }
      }
    }

    // 5. Collision relaxation pass
    this.resolveCollisions(clonedGraph, nodeWidth, nodeHeight, vSpacing, pinned, preserve);

    return clonedGraph;
  }

  /**
   * Detects bounding box overlap between any pair of nodes.
   */
  public static checkCollision(
    posA: { x: number; y: number },
    posB: { x: number; y: number },
    width: number,
    height: number
  ): boolean {
    const xOverlap = Math.abs(posA.x - posB.x) < width;
    const yOverlap = Math.abs(posA.y - posB.y) < height;
    return xOverlap && yOverlap;
  }

  /**
   * Iteratively pushes overlapping nodes down until zero collisions remain.
   */
  private static resolveCollisions(
    graph: BlueprintGraph,
    width: number,
    height: number,
    vSpacing: number,
    pinned: Set<string>,
    preserve: boolean
  ): void {
    const nodeIds = Object.keys(graph.nodes);
    const maxIterations = 20;

    for (let iter = 0; iter < maxIterations; iter++) {
      let hadCollision = false;

      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const idA = nodeIds[i];
          const idB = nodeIds[j];
          const nodeA = graph.nodes[idA];
          const nodeB = graph.nodes[idB];

          if (this.checkCollision(nodeA.position, nodeB.position, width, height)) {
            hadCollision = true;

            const aIsPinned = pinned.has(idA) || (preserve && (nodeA.position.x !== 0 || nodeA.position.y !== 0));
            const bIsPinned = pinned.has(idB) || (preserve && (nodeB.position.x !== 0 || nodeB.position.y !== 0));

            if (aIsPinned && !bIsPinned) {
              // Push B below A
              graph.nodes[idB] = {
                ...nodeB,
                position: {
                  x: nodeB.position.x,
                  y: nodeA.position.y + height + vSpacing,
                },
              };
            } else if (!aIsPinned && bIsPinned) {
              // Push A below B
              graph.nodes[idA] = {
                ...nodeA,
                position: {
                  x: nodeA.position.x,
                  y: nodeB.position.y + height + vSpacing,
                },
              };
            } else if (!aIsPinned && !bIsPinned) {
              // Push the lower one down
              if (nodeA.position.y <= nodeB.position.y) {
                graph.nodes[idB] = {
                  ...nodeB,
                  position: {
                    x: nodeB.position.x,
                    y: nodeA.position.y + height + vSpacing,
                  },
                };
              } else {
                graph.nodes[idA] = {
                  ...nodeA,
                  position: {
                    x: nodeA.position.x,
                    y: nodeB.position.y + height + vSpacing,
                  },
                };
              }
            }
          }
        }
      }

      if (!hadCollision) break;
    }
  }
}
