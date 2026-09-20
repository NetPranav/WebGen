"use client";

/**
 * ============================================================================
 * DEPENDENCY ANALYSIS ENGINE
 * ============================================================================
 * Traverses cross-domain project AST states, generates directed dependency
 * graphs, detects orphan assets, and traps circular reference loops.
 * Architecture Ref: ROADMAP.md §Sub-Phase 8.3 & PANELS.md §Panel 26
 * ============================================================================
 */

import { ProjectStateSnapshot } from "../store/useProjectStore";
import {
  DependencyGraphData,
  DependencyNode,
  DependencyEdge,
  CircularDependencyChain,
  DependencyGraphMetrics,
} from "../types/dependencies";
import { DiagnosticBus } from "./DiagnosticBus";

export class DependencyAnalysisEngine {
  /**
   * Computes byte footprint of an entity safely.
   */
  private static computeSize(entity: unknown): number {
    try {
      const str = JSON.stringify(entity || {});
      if (typeof Buffer !== "undefined") {
        return Buffer.byteLength(str, "utf8");
      }
      return new TextEncoder().encode(str).length;
    } catch {
      return 0;
    }
  }

  /**
   * Analyzes a ProjectStateSnapshot and constructs a complete DependencyGraphData.
   */
  public static buildGraph(snapshot: ProjectStateSnapshot): DependencyGraphData {
    if (!snapshot || typeof snapshot !== "object") {
      return {
        nodes: {},
        edges: [],
        orphanNodes: [],
        circularChains: [],
        metrics: {
          totalNodes: 0,
          totalEdges: 0,
          orphanCount: 0,
          cycleCount: 0,
          totalSizeBytes: 0,
        },
      };
    }

    const nodes: Record<string, DependencyNode> = {};
    const edges: DependencyEdge[] = [];
    let edgeCounter = 0;

    const addEdge = (
      sourceId: string,
      targetId: string,
      relationType: DependencyEdge["relationType"],
      description: string
    ) => {
      // Avoid duplicate edges
      const exists = edges.some(
        (e) => e.sourceId === sourceId && e.targetId === targetId && e.relationType === relationType
      );
      if (!exists && sourceId !== targetId) {
        edgeCounter++;
        edges.push({
          id: `edge_${edgeCounter}_${sourceId}_${targetId}`,
          sourceId,
          targetId,
          relationType,
          description,
        });
      }
    };

    // 1. EXTRACT NODES
    // A. Pages
    const pages = snapshot.pages || {};
    for (const [pageId, page] of Object.entries(pages)) {
      nodes[pageId] = {
        id: pageId,
        name: page.name || pageId,
        type: "page",
        sizeBytes: this.computeSize(page),
        referenceCount: 0,
        dependencyCount: 0,
        isOrphan: false,
        metadata: { slug: page.slug },
      };
    }

    // B. Visual Canvas Elements
    const elements = snapshot.elements || {};
    for (const [elId, el] of Object.entries(elements)) {
      nodes[elId] = {
        id: elId,
        name: el.name || elId,
        type: "element",
        sizeBytes: this.computeSize(el),
        referenceCount: 0,
        dependencyCount: 0,
        isOrphan: false,
        metadata: { archetype: el.archetype },
      };
    }

    // C. Database Schemas
    const schemas = snapshot.databaseSchemas || {};
    for (const [schemaId, schema] of Object.entries(schemas)) {
      nodes[schemaId] = {
        id: schemaId,
        name: schema.name || schema.displayName || schemaId,
        type: "schema",
        sizeBytes: this.computeSize(schema),
        referenceCount: 0,
        dependencyCount: 0,
        isOrphan: false,
        metadata: { fieldsCount: Object.keys(schema.fields || {}).length },
      };
    }

    // D. State Variables
    const stateVars = snapshot.stateVariables || {};
    for (const [varId, v] of Object.entries(stateVars)) {
      nodes[varId] = {
        id: varId,
        name: v.name || varId,
        type: "variable",
        sizeBytes: this.computeSize(v),
        referenceCount: 0,
        dependencyCount: 0,
        isOrphan: false,
        metadata: { variableType: v.type },
      };
    }

    // E. Blueprint Graphs
    const graphs = snapshot.blueprintGraphs || {};
    for (const [graphId, g] of Object.entries(graphs)) {
      nodes[graphId] = {
        id: graphId,
        name: g.name || graphId,
        type: "blueprint",
        sizeBytes: this.computeSize(g),
        referenceCount: 0,
        dependencyCount: 0,
        isOrphan: false,
        metadata: { graphType: g.type },
      };
    }

    // F. Redirect Rules
    const redirectRules = snapshot.redirectRules || {};
    for (const [ruleId, r] of Object.entries(redirectRules)) {
      nodes[ruleId] = {
        id: ruleId,
        name: `Redirect ${r.sourcePattern || ruleId}`,
        type: "redirect",
        sizeBytes: this.computeSize(r),
        referenceCount: 0,
        dependencyCount: 0,
        isOrphan: false,
        metadata: { targetUrl: r.targetPattern },
      };
    }

    // 2. EXTRACT EDGES & RELATIONSHIPS
    // A. Page -> RootElement containment
    for (const page of Object.values(pages)) {
      if (page.rootElementId && nodes[page.rootElementId]) {
        addEdge(
          page.id,
          page.rootElementId,
          "contains",
          `Page "${page.name}" contains root element "${nodes[page.rootElementId].name}"`
        );
      }
    }

    // B. Element -> ChildElement containment
    for (const el of Object.values(elements)) {
      if (Array.isArray(el.children)) {
        for (const childId of el.children) {
          if (nodes[childId]) {
            addEdge(
              el.id,
              childId,
              "contains",
              `Element "${el.name}" contains child "${nodes[childId].name}"`
            );
          }
        }
      }
    }

    // C. Data-Bindings: Element -> StateVariable or Schema
    const bindings = snapshot.bindings || {};
    for (const b of Object.values(bindings)) {
      const elementId = b.target?.elementId;
      const propertyKey = b.target?.propertyKey || "value";
      if (elementId && nodes[elementId]) {
        if (b.stateVariableId && nodes[b.stateVariableId]) {
          addEdge(
            elementId,
            b.stateVariableId,
            "binds_to",
            `Element "${nodes[elementId].name}" property "${propertyKey}" binds to state "${nodes[b.stateVariableId].name}"`
          );
        }
        if (b.sourceCollection && nodes[b.sourceCollection]) {
          addEdge(
            elementId,
            b.sourceCollection,
            "binds_to",
            `Element "${nodes[elementId].name}" binds to database collection "${nodes[b.sourceCollection].name}"`
          );
        }
      }
    }

    // Property bindings from template strings e.g. {{state.counter}}
    for (const el of Object.values(elements)) {
      for (const [propKey, val] of Object.entries(el.properties || {})) {
        if (typeof val === "string") {
          for (const v of Object.values(stateVars)) {
            if (val.includes(`state.${v.name}`) || val.includes(`{{${v.name}}}`) || val.includes(v.id)) {
              addEdge(
                el.id,
                v.id,
                "binds_to",
                `Element "${el.name}" property "${propKey}" references state "${v.name}"`
              );
            }
          }
        }
      }
    }

    // D. Element -> Blueprint trigger (Event Handlers)
    for (const el of Object.values(elements)) {
      const graphId = (el.properties as Record<string, unknown>)?.blueprintGraphId;
      if (typeof graphId === "string" && nodes[graphId]) {
        addEdge(
          el.id,
          graphId,
          "triggers",
          `Element "${el.name}" triggers blueprint graph "${nodes[graphId].name}"`
        );
      }
    }

    // E. Blueprint -> Database queries and Page navigation
    for (const g of Object.values(graphs)) {
      for (const node of Object.values(g.nodes || {})) {
        // Check if node queries a database collection
        const colId =
          (node.customParams?.collectionId as string) ||
          (node.pinValues?.collectionId as string);
        if (typeof colId === "string" && nodes[colId]) {
          addEdge(
            g.id,
            colId,
            "queries",
            `Blueprint "${g.name}" node "${node.title || node.id}" queries collection "${nodes[colId].name}"`
          );
        }

        // Check if node navigates to a page
        const targetPageId =
          (node.customParams?.pageId as string) ||
          (node.pinValues?.pageId as string);
        if (typeof targetPageId === "string" && nodes[targetPageId]) {
          addEdge(
            g.id,
            targetPageId,
            "navigates_to",
            `Blueprint "${g.name}" navigates to page "${nodes[targetPageId].name}"`
          );
        }
      }
    }

    // F. RedirectRule -> Page navigation
    for (const r of Object.values(redirectRules)) {
      for (const page of Object.values(pages)) {
        if (page.slug === r.targetPattern || r.targetPattern === `/${page.slug}`) {
          addEdge(
            r.id,
            page.id,
            "navigates_to",
            `Redirect rule "${r.sourcePattern}" navigates to page "${page.name}"`
          );
        }
      }
      // Redirect to redirect loop chaining
      for (const otherR of Object.values(redirectRules)) {
        if (r.id !== otherR.id && r.targetPattern === otherR.sourcePattern) {
          addEdge(
            r.id,
            otherR.id,
            "navigates_to",
            `Redirect "${r.sourcePattern}" redirects into "${otherR.sourcePattern}"`
          );
        }
      }
    }

    // 3. COMPUTE REFERENCE AND DEPENDENCY COUNTS
    for (const edge of edges) {
      if (nodes[edge.sourceId]) {
        nodes[edge.sourceId].dependencyCount++;
      }
      if (nodes[edge.targetId]) {
        nodes[edge.targetId].referenceCount++;
      }
    }

    // 4. ORPHAN ASSET DETECTION
    // Compute set of all elements reachable from ANY page root element
    const reachableElementIds = new Set<string>();
    const traverseElementTree = (elId: string) => {
      if (!elId || reachableElementIds.has(elId)) return;
      reachableElementIds.add(elId);
      const el = elements[elId];
      if (el && Array.isArray(el.children)) {
        el.children.forEach(traverseElementTree);
      }
    };

    for (const page of Object.values(pages)) {
      if (page.rootElementId) {
        traverseElementTree(page.rootElementId);
      }
    }

    const orphanNodes: DependencyNode[] = [];

    for (const node of Object.values(nodes)) {
      let isOrphan = false;

      if (node.type === "element") {
        // Element not reachable from any active page
        if (!reachableElementIds.has(node.id)) {
          isOrphan = true;
        }
      } else if (node.type === "variable") {
        // State variable with no incoming bindings or references
        if (node.referenceCount === 0) {
          isOrphan = true;
        }
      } else if (node.type === "blueprint") {
        // Blueprint with no triggers and no references
        if (node.referenceCount === 0) {
          isOrphan = true;
        }
      } else if (node.type === "schema") {
        // Database schema with no queries and no bindings
        if (node.referenceCount === 0) {
          isOrphan = true;
        }
      }

      if (isOrphan) {
        node.isOrphan = true;
        orphanNodes.push(node);
      }
    }

    if (orphanNodes.length > 0) {
      DiagnosticBus.emit({
        channel: "ORPHAN_ASSET_WARN",
        severity: "warning",
        source: { panel: "Panel 26: Reference Viewer", entityId: "orphan_detector" },
        message: `Found ${orphanNodes.length} orphan asset(s) with zero active references (unused components, dead variables, or unqueried schemas).`,
        suggestion: "Review orphan assets in Panel 26 Reference Viewer to clean up project state.",
      });
    }

    // 5. CIRCULAR DEPENDENCY DETECTION (DFS)
    const circularChains: CircularDependencyChain[] = [];
    const visited: Record<string, boolean> = {};
    const recStack: Record<string, boolean> = {};

    // Build adjacency list
    const adj: Record<string, string[]> = {};
    for (const nodeId of Object.keys(nodes)) {
      adj[nodeId] = [];
    }
    for (const edge of edges) {
      if (adj[edge.sourceId]) {
        adj[edge.sourceId].push(edge.targetId);
      }
    }

    const currentPath: string[] = [];

    const dfsCycle = (u: string) => {
      visited[u] = true;
      recStack[u] = true;
      currentPath.push(u);

      for (const v of adj[u] || []) {
        if (!visited[v]) {
          dfsCycle(v);
        } else if (recStack[v]) {
          // Cycle found!
          const cycleStartIndex = currentPath.indexOf(v);
          const cycleNodes = currentPath.slice(cycleStartIndex).concat(v);
          const cycleDesc = cycleNodes.map((id) => nodes[id]?.name || id).join(" ➔ ");

          circularChains.push({
            cycleId: `cycle_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            nodeIds: cycleNodes,
            description: `Circular loop: ${cycleDesc}`,
          });
        }
      }

      currentPath.pop();
      recStack[u] = false;
    };

    for (const nodeId of Object.keys(nodes)) {
      if (!visited[nodeId]) {
        dfsCycle(nodeId);
      }
    }

    if (circularChains.length > 0) {
      DiagnosticBus.emit({
        channel: "CIRCULAR_REF_ERR",
        severity: "error",
        source: { panel: "Panel 26: Reference Viewer", entityId: "cycle_detector" },
        message: `Circular reference detected in dependency graph: ${circularChains[0].description}`,
        suggestion: "Break the cycle by removing the circular redirect or recursive binding wire.",
      });
    }

    const totalSizeBytes = Object.values(nodes).reduce((acc, n) => acc + n.sizeBytes, 0);

    const metrics: DependencyGraphMetrics = {
      totalNodes: Object.keys(nodes).length,
      totalEdges: edges.length,
      orphanCount: orphanNodes.length,
      cycleCount: circularChains.length,
      totalSizeBytes,
    };

    return {
      nodes,
      edges,
      orphanNodes,
      circularChains,
      metrics,
    };
  }

  /**
   * Retrieves forward references (outgoing dependencies): nodes that nodeId depends on.
   */
  public static getForwardReferences(graph: DependencyGraphData, nodeId: string): DependencyNode[] {
    const targetIds = graph.edges.filter((e) => e.sourceId === nodeId).map((e) => e.targetId);
    return targetIds.map((id) => graph.nodes[id]).filter(Boolean);
  }

  /**
   * Retrieves backward references (incoming referencers): nodes that depend on nodeId.
   */
  public static getBackwardReferences(graph: DependencyGraphData, nodeId: string): DependencyNode[] {
    const sourceIds = graph.edges.filter((e) => e.targetId === nodeId).map((e) => e.sourceId);
    return sourceIds.map((id) => graph.nodes[id]).filter(Boolean);
  }

  /**
   * Computes the complete connected dependency chain (transitive upstream and downstream).
   */
  public static getDependencyChain(
    graph: DependencyGraphData,
    nodeId: string
  ): { nodes: DependencyNode[]; edges: DependencyEdge[] } {
    const includedNodeIds = new Set<string>([nodeId]);
    const includedEdges: DependencyEdge[] = [];

    // Forward walk
    const queueForward = [nodeId];
    while (queueForward.length > 0) {
      const curr = queueForward.shift()!;
      for (const e of graph.edges) {
        if (e.sourceId === curr && !includedNodeIds.has(e.targetId)) {
          includedNodeIds.add(e.targetId);
          includedEdges.push(e);
          queueForward.push(e.targetId);
        }
      }
    }

    // Backward walk
    const queueBackward = [nodeId];
    while (queueBackward.length > 0) {
      const curr = queueBackward.shift()!;
      for (const e of graph.edges) {
        if (e.targetId === curr && !includedNodeIds.has(e.sourceId)) {
          includedNodeIds.add(e.sourceId);
          includedEdges.push(e);
          queueBackward.push(e.sourceId);
        }
      }
    }

    return {
      nodes: Array.from(includedNodeIds).map((id) => graph.nodes[id]).filter(Boolean),
      edges: includedEdges,
    };
  }
}
