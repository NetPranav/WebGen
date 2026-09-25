"use client";

/**
 * ============================================================================
 * DEMO PROJECT SNAPSHOT & STASH REGISTRY
 * ============================================================================
 * Stashes the complete showcase demo so that it can be mounted or unmounted
 * on-demand with 1 click, allowing users to demonstrate the full application
 * capabilities while keeping a pristine blank canvas default for AI creation.
 * ============================================================================
 */

import { ProjectStateSnapshot, PageDefinition, StateVariable } from "../store/useProjectStore";
import { DEFAULT_ENVIRONMENT_SETTINGS } from "../types/environment";
import type { Layer } from "@/core/document/schema";
import { createDocumentFromLayers } from "../document/factories";

/**
 * Clean Blank Canvas Snapshot: Empty element hierarchy ready for AI creation.
 */
export function createBlankCanvasSnapshot(): ProjectStateSnapshot {
  const rootElement: Layer = {
    id: "el_root_container",
    name: "CanvasRoot",
    archetype: "container",
    parentId: null,
    properties: {
      "layout.display": "flex",
      "layout.flexDirection": "column",
      "layout.alignItems": "center",
      "layout.justifyContent": "center",
      "layout.gap": 20,
      "layout.padding": 32,
      "layout.minHeight": "100%",
      "frame.width": 100,
      "frame.widthUnit": "%",
    },
    children: [],
  };

  const homePage: PageDefinition = {
    id: "page_home",
    name: "Home",
    slug: "/",
    rootElementId: "el_root_container",
  };

  return {
    projectId: "project_blank_canvas",
    projectName: "New Component Project",
    scope: "element",
    rootArchetype: "container",
    activePageId: "page_home",
    pages: {
      page_home: homePage,
    },
    document: createDocumentFromLayers([rootElement]),
    databaseSchemas: {},
    databaseRecords: {},
    stateVariables: {},
    animationSamples: {},
    bindings: {},
    databaseLatches: {},
    blueprintGraphs: {
      graph_main_event: {
        id: "graph_main_event",
        name: "Main Event Graph",
        type: "event",
        nodes: {},
        wires: [],
        variables: [],
      },
    },
    activeBlueprintGraphId: "graph_main_event",
    redirectRules: {},
    environment: DEFAULT_ENVIRONMENT_SETTINGS,
  };
}

/**
 * Stashed Showcase Demo Snapshot: Complete presentation demo with hero container,
 * interactive button, typography, database collections, and animation timeline.
 */
export function createShowcaseSnapshot(): ProjectStateSnapshot {
  const elements: Record<string, Layer> = {
    el_root_container: {
      id: "el_root_container",
      name: "RootContainer",
      archetype: "container",
      parentId: null,
      properties: {
        "layout.display": "flex",
        "layout.flexDirection": "column",
        "layout.gap": 16,
        "layout.padding": 24,
      },
      children: ["el_hero_heading", "el_buy_button"],
    },
    el_hero_heading: {
      id: "el_hero_heading",
      name: "HeroHeading",
      archetype: "text",
      parentId: "el_root_container",
      properties: {
        "content.text": "Unreal Engine for Web Applications",
        "typography.fontSize": 32,
        "typography.fontWeight": 700,
        "typography.color": "#0F172A",
      },
      children: [],
    },
    el_buy_button: {
      id: "el_buy_button",
      name: "BuyButton",
      archetype: "button",
      parentId: "el_root_container",
      properties: {
        "content.label": "Get Started Free",
        "interaction.disabled": false,
        "appearance.background.color": "#206859",
      },
      children: [],
    },
  };

  const pages: Record<string, PageDefinition> = {
    page_home: {
      id: "page_home",
      name: "Home",
      slug: "/",
      rootElementId: "el_root_container",
    },
  };

  const stateVariables: Record<string, StateVariable> = {
    cartTotal: {
      id: "cartTotal",
      name: "cartTotal",
      type: "number",
      value: 0,
      defaultValue: 0,
      scope: "global",
      description: "Total value of items in checkout",
    },
    isUserLoggedIn: {
      id: "isUserLoggedIn",
      name: "isUserLoggedIn",
      type: "boolean",
      value: false,
      defaultValue: false,
      scope: "global",
      description: "Current authentication status",
    },
  };

  return {
    projectId: "project_showcase_demo",
    projectName: "Showcase Demo",
    scope: "element",
    rootArchetype: "container",
    activePageId: "page_home",
    pages,
    document: createDocumentFromLayers(Object.values(elements)),
    databaseSchemas: {
      Products: {
        id: "col_products",
        name: "Products",
        displayName: "Products",
        fields: {
          id: { id: "f_id", name: "id", type: "Int", isPrimaryKey: true },
          title: { id: "f_title", name: "title", type: "String" },
          price: { id: "f_price", name: "price", type: "Float" },
          inStock: { id: "f_stock", name: "inStock", type: "Boolean" },
        },
      },
    },
    databaseRecords: {
      Products: [
        { id: 1, title: "Pro Subscription", price: 29.99, inStock: true },
        { id: 2, title: "Enterprise License", price: 199.0, inStock: true },
      ],
    },
    stateVariables,
    animationSamples: {
      sample_btn_pulse: {
        id: "sample_btn_pulse",
        name: "Buy Button Pulse",
        duration: 1000,
        easing: "power2.inOut",
        iterations: 1,
        direction: "normal",
        fillMode: "forwards",
        tracks: [
          {
            trackId: "scale",
            keyframes: [
              { offset: 0, value: 1, easing: "power2.out" },
              { offset: 50, value: 1.05, easing: "power2.inOut" },
              { offset: 100, value: 1, easing: "power2.out" },
            ],
          },
        ],
      },
    },
    bindings: {},
    databaseLatches: {},
    blueprintGraphs: {
      graph_main_event: {
        id: "graph_main_event",
        name: "Main Event Graph",
        type: "event",
        nodes: {},
        wires: [],
        variables: [],
      },
    },
    activeBlueprintGraphId: "graph_main_event",
    redirectRules: {},
    environment: DEFAULT_ENVIRONMENT_SETTINGS,
  };
}
