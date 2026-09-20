"use client";

/**
 * ============================================================================
 * DEPENDENCY GRAPH & REFERENCE VIEWER STORE
 * ============================================================================
 * Reactive state store for dependency graph traversal, active node selection,
 * filtering, orphan inspection, and size map analysis.
 * Architecture Ref: ROADMAP.md §Sub-Phase 8.3 & PANELS.md §Panel 26
 * ============================================================================
 */

import { create } from "zustand";
import {
  DependencyGraphData,
  DependencyNodeType,
  DependencyNode,
  DependencyEdge,
} from "../types/dependencies";
import { DependencyAnalysisEngine } from "../engine/DependencyAnalysisEngine";
import { useProjectStore } from "./useProjectStore";

export interface DependencyState {
  graphData: DependencyGraphData | null;
  selectedNodeId: string | null;
  activeFilterType: DependencyNodeType | "all";
  searchQuery: string;
  viewMode: "canvas" | "tree" | "orphans" | "sizemap";
  zoomLevel: number;

  // Actions
  refreshGraph: () => DependencyGraphData;
  selectNode: (nodeId: string | null) => void;
  setActiveFilterType: (type: DependencyNodeType | "all") => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: "canvas" | "tree" | "orphans" | "sizemap") => void;
  setZoomLevel: (zoom: number) => void;
  getSelectedNode: () => DependencyNode | null;
  getForwardReferences: () => DependencyNode[];
  getBackwardReferences: () => DependencyNode[];
  getHighlightedChain: () => { nodes: DependencyNode[]; edges: DependencyEdge[] } | null;
}

export const useDependencyStore = create<DependencyState>((set, get) => ({
  graphData: null,
  selectedNodeId: null,
  activeFilterType: "all",
  searchQuery: "",
  viewMode: "canvas",
  zoomLevel: 1,

  refreshGraph: (): DependencyGraphData => {
    const projectSnapshot = useProjectStore.getState().getSnapshot();
    const graphData = DependencyAnalysisEngine.buildGraph(projectSnapshot);

    set({ graphData });
    return graphData;
  },

  selectNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId });
  },

  setActiveFilterType: (type: DependencyNodeType | "all") => {
    set({ activeFilterType: type });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setViewMode: (mode: "canvas" | "tree" | "orphans" | "sizemap") => {
    set({ viewMode: mode });
  },

  setZoomLevel: (zoom: number) => {
    set({ zoomLevel: Math.max(0.2, Math.min(2.5, zoom)) });
  },

  getSelectedNode: (): DependencyNode | null => {
    const { graphData, selectedNodeId } = get();
    if (!graphData || !selectedNodeId) return null;
    return graphData.nodes[selectedNodeId] || null;
  },

  getForwardReferences: (): DependencyNode[] => {
    const { graphData, selectedNodeId } = get();
    if (!graphData || !selectedNodeId) return [];
    return DependencyAnalysisEngine.getForwardReferences(graphData, selectedNodeId);
  },

  getBackwardReferences: (): DependencyNode[] => {
    const { graphData, selectedNodeId } = get();
    if (!graphData || !selectedNodeId) return [];
    return DependencyAnalysisEngine.getBackwardReferences(graphData, selectedNodeId);
  },

  getHighlightedChain: (): { nodes: DependencyNode[]; edges: DependencyEdge[] } | null => {
    const { graphData, selectedNodeId } = get();
    if (!graphData || !selectedNodeId) return null;
    return DependencyAnalysisEngine.getDependencyChain(graphData, selectedNodeId);
  },
}));
