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

import {
  ProjectStateSnapshot,
  ProjectElement,
  PageDefinition,
  StateVariable,
} from "../store/useProjectStore";
import { DEFAULT_ENVIRONMENT_SETTINGS } from "../types/environment";

/**
 * Clean Blank Canvas Snapshot: Empty element hierarchy ready for AI creation.
 */
export function createBlankCanvasSnapshot(): ProjectStateSnapshot {
  const rootElement: ProjectElement = {
    id: "el_root_container",
    name: "CanvasRoot",
    archetype: "container",
    parentId: null,
    properties: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      padding: 32,
      minHeight: "100%",
      width: "100%",
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
    target: {
      framework: "nextjs-app",
      styling: "tailwind",
      animation: "gsap",
      language: "typescript",
    },
    activePageId: "page_home",
    pages: {
      page_home: homePage,
    },
    elements: {
      el_root_container: rootElement,
    },
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
        nodes: {},
        wires: [],
        variables: {},
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
  const elements: Record<string, ProjectElement> = {
    el_root_container: {
      id: "el_root_container",
      name: "RootContainer",
      archetype: "container",
      parentId: null,
      properties: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 24,
      },
      children: ["el_hero_heading", "el_buy_button"],
    },
    el_hero_heading: {
      id: "el_hero_heading",
      name: "HeroHeading",
      archetype: "text",
      parentId: "el_root_container",
      properties: {
        textContent: "Unreal Engine for Web Applications",
        fontSize: 32,
        fontWeight: 700,
        color: "#ffffff",
      },
      children: [],
    },
    el_buy_button: {
      id: "el_buy_button",
      name: "BuyButton",
      archetype: "button",
      parentId: "el_root_container",
      properties: {
        label: "Get Started Free",
        disabled: false,
        backgroundColor: "#206859",
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
    target: {
      framework: "nextjs-app",
      styling: "tailwind",
      animation: "gsap",
      language: "typescript",
    },
    activePageId: "page_home",
    pages,
    elements,
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
        elementId: "el_buy_button",
        duration: 1.0,
        tracks: [
          {
            id: "transform.scale",
            property: "transform.scale",
            keyframes: [
              { time: 0, value: 1, easing: "power2.out" },
              { time: 0.5, value: 1.05, easing: "power2.inOut" },
              { time: 1.0, value: 1, easing: "power2.out" },
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
        nodes: {},
        wires: [],
        variables: {},
      },
    },
    activeBlueprintGraphId: "graph_main_event",
    redirectRules: {},
    environment: DEFAULT_ENVIRONMENT_SETTINGS,
  };
}
