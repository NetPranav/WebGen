/**
 * ============================================================================
 * FULL PROJECT SCAFFOLD GENERATOR
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 6.4
 *
 * Chains IntentParser (6.1), ConstrainedDecoder (6.2), and ForceDirectedLayout (6.3)
 * to generate a complete multi-domain application snapshot (Pages, Elements,
 * Database Models, Logic Blueprints, Animation Samples, and Data Bindings)
 * in a single unified pass with zero [BIND_ERR] or [DB_SCHEMA_ERR] diagnostics.
 * ============================================================================
 */

import { IntentParser } from "@/ai/intent/IntentParser";
import { StructuredIntent } from "@/ai/intent/intent-types";
import { ConstrainedDecoder } from "./ConstrainedDecoder";
import { ForceDirectedLayout } from "@/ai/layout/ForceDirectedLayout";
import { ProjectStateSnapshot, PageDefinition, StateVariable } from "@/core/store/useProjectStore";
import { CollectionSchema, DatabaseField } from "@/core/types/database";
import { AnimationSample } from "@/core/types/animations";
import { DataBindingDescriptor } from "@/core/types/data-binding";
import { BlueprintGraph } from "@/core/ast/ASTManager";
import { DiagnosticBus } from "@/core/engine/DiagnosticBus";
import type { Layer } from "@/core/document/schema";
import { createDocumentFromLayers } from "@/core/document/factories";
import { normalizeDocument } from "@/core/document/migrations";

export interface ScaffoldOptions {
  projectName?: string;
  autoLayout?: boolean;
}

export interface ProjectScaffoldResult {
  snapshot: ProjectStateSnapshot;
  intent: StructuredIntent;
  diagnostics: string[];
  hasErrors: boolean;
}

export class ProjectScaffolder {
  /**
   * Scaffolds a full project from a natural language prompt.
   */
  public static scaffoldProject(
    prompt: string,
    options: ScaffoldOptions = {}
  ): ProjectScaffoldResult {
    const diagnostics: string[] = [];

    // 1. Parse Intent (Sub-Phase 6.1)
    const intent = IntentParser.parse(prompt);

    const projectName =
      options.projectName ||
      this.generateProjectName(intent.primaryGoal || prompt);

    // 2. Generate Pages and UI Element Hierarchy
    const { pages, elements, activePageId } = this.generatePagesAndElements(intent);

    // 3. Generate Database Schemas and Seed Records
    const { databaseSchemas, databaseRecords } = this.generateDatabaseModels(intent);

    // 4. Generate Logic Blueprints (Sub-Phase 6.2) & Layout (Sub-Phase 6.3)
    const { blueprintGraphs, activeBlueprintGraphId } = this.generateBlueprints(
      intent,
      options.autoLayout ?? true
    );

    // 5. Generate State Variables & Animations
    const stateVariables = this.generateStateVariables(intent);
    const animationSamples = this.generateAnimationSamples();

    // 6. Generate Valid Data Bindings (Zero BIND_ERR)
    const bindings = this.generateDataBindings(elements, databaseSchemas);

    // 7. Assemble Complete Snapshot
    const snapshot: ProjectStateSnapshot = {
      projectName,
      activePageId,
      pages,
      document: normalizeDocument(createDocumentFromLayers(Object.values(elements))),
      databaseSchemas,
      databaseRecords,
      stateVariables,
      animationSamples,
      bindings,
      databaseLatches: {},
      blueprintGraphs,
      activeBlueprintGraphId,
      redirectRules: {},
    };

    // 8. Check for any active diagnostics from bus
    const bindErrors = DiagnosticBus.getHistoryByChannel("BIND_ERR");
    const dbErrors = DiagnosticBus.getHistoryByChannel("DB_SCHEMA_ERR");

    for (const b of bindErrors) diagnostics.push(`[BIND_ERR] ${b.message}`);
    for (const d of dbErrors) diagnostics.push(`[DB_SCHEMA_ERR] ${d.message}`);

    return {
      snapshot,
      intent,
      diagnostics,
      hasErrors: diagnostics.length > 0,
    };
  }

  // --------------------------------------------------------------------------
  // Generators
  // --------------------------------------------------------------------------

  private static generatePagesAndElements(intent: StructuredIntent): {
    pages: Record<string, PageDefinition>;
    elements: Record<string, Layer>;
    activePageId: string;
  } {
    const pages: Record<string, PageDefinition> = {};
    const elements: Record<string, Layer> = {};

    // Determine required pages
    const pageSpecs: { id: string; name: string; slug: string }[] = [];

    const hasAuth =
      intent.authRequirements?.required ||
      intent.primaryGoal.toLowerCase().includes("auth") ||
      intent.primaryGoal.toLowerCase().includes("login");
    const hasPricing =
      intent.primaryGoal.toLowerCase().includes("pricing") ||
      intent.primaryGoal.toLowerCase().includes("saas");
    const hasDashboard =
      intent.primaryGoal.toLowerCase().includes("dashboard") ||
      intent.category === "dashboard" ||
      intent.primaryGoal.toLowerCase().includes("saas");

    if (hasAuth) {
      pageSpecs.push({ id: "page_auth", name: "Authentication", slug: "/login" });
    }
    if (hasPricing) {
      pageSpecs.push({ id: "page_pricing", name: "Pricing Plans", slug: "/pricing" });
    }
    if (hasDashboard || pageSpecs.length === 0) {
      pageSpecs.push({ id: "page_dashboard", name: "Dashboard", slug: "/dashboard" });
    }

    // Always ensure Home / Landing page exists as page 1
    pageSpecs.unshift({ id: "page_home", name: "Home", slug: "/" });

    const activePageId = pageSpecs[0].id;

    pageSpecs.forEach((spec, idx) => {
      const rootId = `root_${spec.id}`;
      pages[spec.id] = {
        id: spec.id,
        name: spec.name,
        slug: spec.slug,
        rootElementId: rootId,
        order: idx,
      };

      // Root element (container)
      elements[rootId] = {
        id: rootId,
        name: `${spec.name} Root`,
        archetype: "container",
        parentId: null,
        properties: {
          "layout.display": "flex",
          "layout.flexDirection": "column",
          "layout.minHeight": "100vh",
          "appearance.background.color": "#0B0F19",
          "typography.color": "#F8FAFC",
        },
        children: [],
      };

      // Header container
      const headerId = `header_${spec.id}`;
      elements[headerId] = {
        id: headerId,
        name: "Navbar",
        archetype: "container",
        parentId: rootId,
        properties: {
          "layout.display": "flex",
          "layout.justifyContent": "space-between",
          "layout.alignItems": "center",
          "layout.padding": "16px 24px",
          "appearance.border.bottom": "1px solid #1E293B",
        },
        children: [],
      };
      elements[rootId].children.push(headerId);

      // Title in header
      const titleId = `title_${spec.id}`;
      elements[titleId] = {
        id: titleId,
        name: "App Logo / Title",
        archetype: "text",
        parentId: headerId,
        properties: {
          "content.text": `${spec.name} - Studio Engine`,
          "typography.fontSize": "20px",
          "typography.fontWeight": "bold",
          "typography.color": "#38BDF8",
        },
        children: [],
      };
      elements[headerId].children.push(titleId);

      // Main content body
      const contentId = `content_${spec.id}`;
      elements[contentId] = {
        id: contentId,
        name: "Content Section",
        archetype: "container",
        parentId: rootId,
        properties: {
          "layout.display": "flex",
          "layout.flexDirection": "column",
          "layout.padding": "32px 24px",
          "layout.flex": 1,
        },
        children: [],
      };
      elements[rootId].children.push(contentId);

      // Page-specific elements
      if (spec.id === "page_auth") {
        const formId = "auth_form";
        elements[formId] = {
          id: formId,
          name: "Auth Form",
          archetype: "form",
          parentId: contentId,
          properties: { "layout.maxWidth": "400px", "layout.margin": "0 auto" },
          children: [],
        };
        elements[contentId].children.push(formId);

        const emailInput = "email_input";
        elements[emailInput] = {
          id: emailInput,
          name: "Email Input",
          archetype: "input",
          parentId: formId,
          properties: { "input.placeholder": "user@example.com", "input.type": "email" },
          children: [],
        };
        const passInput = "pass_input";
        elements[passInput] = {
          id: passInput,
          name: "Password Input",
          archetype: "input",
          parentId: formId,
          properties: { "input.placeholder": "••••••••", "input.type": "password" },
          children: [],
        };
        const loginBtn = "login_btn";
        elements[loginBtn] = {
          id: loginBtn,
          name: "Login Button",
          archetype: "button",
          parentId: formId,
          properties: { "content.label": "Sign In", "appearance.variant": "primary" },
          children: [],
        };

        elements[formId].children.push(emailInput, passInput, loginBtn);
      } else if (spec.id === "page_pricing") {
        const pricingGrid = "pricing_grid";
        elements[pricingGrid] = {
          id: pricingGrid,
          name: "Pricing Grid",
          archetype: "container",
          parentId: contentId,
          properties: { "layout.display": "flex", "layout.gap": "24px", "layout.justifyContent": "center" },
          children: [],
        };
        elements[contentId].children.push(pricingGrid);

        ["Starter", "Pro", "Enterprise"].forEach((tier) => {
          const cardId = `card_${tier.toLowerCase()}`;
          elements[cardId] = {
            id: cardId,
            name: `${tier} Card`,
            archetype: "container",
            parentId: pricingGrid,
            properties: { "layout.padding": "24px", "appearance.radius": "12px", "appearance.border": "1px solid #334155" },
            children: [],
          };
          elements[pricingGrid].children.push(cardId);

          const tierTitle = `title_${tier.toLowerCase()}`;
          elements[tierTitle] = {
            id: tierTitle,
            name: `${tier} Title`,
            archetype: "text",
            parentId: cardId,
            properties: { "content.text": `${tier} Plan`, "typography.fontSize": "18px", "typography.fontWeight": "600" },
            children: [],
          };
          const tierBtn = `btn_${tier.toLowerCase()}`;
          elements[tierBtn] = {
            id: tierBtn,
            name: `Select ${tier} Button`,
            archetype: "button",
            parentId: cardId,
            properties: { "content.label": `Choose ${tier}` },
            children: [],
          };
          elements[cardId].children.push(tierTitle, tierBtn);
        });
      } else if (spec.id === "page_dashboard") {
        const statsRow = "stats_row";
        elements[statsRow] = {
          id: statsRow,
          name: "Metrics Row",
          archetype: "container",
          parentId: contentId,
          properties: { "layout.display": "flex", "layout.gap": "16px", "layout.marginBottom": "24px" },
          children: [],
        };
        elements[contentId].children.push(statsRow);

        const statRev = "stat_revenue";
        elements[statRev] = {
          id: statRev,
          name: "Revenue Stat",
          archetype: "container",
          parentId: statsRow,
          properties: { "layout.padding": "16px", "appearance.background.color": "#1E293B", "appearance.radius": "8px" },
          children: [],
        };
        const statRevText = "stat_revenue_text";
        elements[statRevText] = {
          id: statRevText,
          name: "Revenue Text",
          archetype: "text",
          parentId: statRev,
          properties: { "content.text": "$124,500 MRR", "typography.fontSize": "24px", "typography.fontWeight": "bold" },
          children: [],
        };
        elements[statRev].children.push(statRevText);
        elements[statsRow].children.push(statRev);
      }
    });

    return { pages, elements, activePageId };
  }

  private static generateDatabaseModels(intent: StructuredIntent): {
    databaseSchemas: Record<string, CollectionSchema>;
    databaseRecords: Record<string, Record<string, unknown>[]>;
  } {
    const databaseSchemas: Record<string, CollectionSchema> = {};
    const databaseRecords: Record<string, Record<string, unknown>[]> = {};

    // 1. Users collection
    const usersFields: Record<string, DatabaseField> = {
      id: { id: "id", name: "id", type: "String", isPrimaryKey: true },
      email: { id: "email", name: "email", type: "String", isUnique: true },
      role: { id: "role", name: "role", type: "String", defaultValue: "user" },
      createdAt: { id: "createdAt", name: "createdAt", type: "DateTime" },
    };

    databaseSchemas["users"] = {
      id: "col_users",
      name: "users",
      displayName: "Users",
      description: "User accounts and authentication credentials",
      fields: usersFields,
    };

    databaseRecords["users"] = [
      { id: "usr_1", email: "alex@company.com", role: "admin", createdAt: "2026-01-15T08:00:00Z" },
      { id: "usr_2", email: "sarah@company.com", role: "user", createdAt: "2026-02-10T12:30:00Z" },
    ];

    // 2. Subscriptions collection
    const subFields: Record<string, DatabaseField> = {
      id: { id: "id", name: "id", type: "String", isPrimaryKey: true },
      userId: {
        id: "userId",
        name: "userId",
        type: "String",
        relation: {
          targetCollection: "users",
          foreignKey: "userId",
          referencesField: "id",
          cardinality: "1:N",
          onDelete: "CASCADE",
        },
      },
      plan: { id: "plan", name: "plan", type: "String", defaultValue: "Pro" },
      status: { id: "status", name: "status", type: "String", defaultValue: "active" },
      createdAt: { id: "createdAt", name: "createdAt", type: "DateTime" },
    };

    databaseSchemas["subscriptions"] = {
      id: "col_subscriptions",
      name: "subscriptions",
      displayName: "Subscriptions",
      description: "Customer SaaS plan billing records",
      fields: subFields,
    };

    databaseRecords["subscriptions"] = [
      { id: "sub_1", userId: "usr_1", plan: "Pro", status: "active", createdAt: "2026-01-15T08:00:00Z" },
    ];

    // 3. Any additional entities from intent
    for (const ent of intent.entities) {
      const colName = ent.name.toLowerCase() + "s";
      if (!databaseSchemas[colName]) {
        const fields: Record<string, DatabaseField> = {
          id: { id: "id", name: "id", type: "String", isPrimaryKey: true },
          createdAt: { id: "createdAt", name: "createdAt", type: "DateTime" },
        };

        for (const f of ent.fields) {
          let fieldType: DatabaseField["type"] = "String";
          if (f.type === "number") fieldType = "Float";
          else if (f.type === "boolean") fieldType = "Boolean";
          else if (f.type === "date") fieldType = "DateTime";

          fields[f.name] = {
            id: f.name,
            name: f.name,
            type: fieldType,
          };
        }

        databaseSchemas[colName] = {
          id: `col_${colName}`,
          name: colName,
          displayName: ent.name,
          fields,
        };

        databaseRecords[colName] = [
          { id: "row_1", createdAt: "2026-01-01T00:00:00Z" },
        ];
      }
    }

    return { databaseSchemas, databaseRecords };
  }

  private static generateBlueprints(
    intent: StructuredIntent,
    autoLayout: boolean
  ): {
    blueprintGraphs: Record<string, BlueprintGraph>;
    activeBlueprintGraphId: string;
  } {
    const blueprintGraphs: Record<string, BlueprintGraph> = {};

    // Synthesize via ConstrainedDecoder
    const scaffoldRes = ConstrainedDecoder.generateFromIntent(intent);
    let graph = scaffoldRes.graph!;

    if (autoLayout) {
      graph = ForceDirectedLayout.layoutGraph(graph);
    }

    blueprintGraphs[graph.id] = graph;
    const activeBlueprintGraphId = graph.id;

    return { blueprintGraphs, activeBlueprintGraphId };
  }

  private static generateStateVariables(
    intent: StructuredIntent
  ): Record<string, StateVariable> {
    const stateVariables: Record<string, StateVariable> = {
      userEmail: {
        id: "var_userEmail",
        name: "userEmail",
        type: "string",
        value: "",
        defaultValue: "",
        scope: "global",
      },
      isAuthenticated: {
        id: "var_isAuthenticated",
        name: "isAuthenticated",
        type: "boolean",
        value: false,
        defaultValue: false,
        scope: "global",
      },
      cartTotal: {
        id: "var_cartTotal",
        name: "cartTotal",
        type: "number",
        value: 0,
        defaultValue: 0,
        scope: "global",
      },
    };

    return stateVariables;
  }

  private static generateAnimationSamples(): Record<string, AnimationSample> {
    return {
      fadeIn: {
        id: "anim_fadeIn",
        name: "Fade In",
        description: "Smooth fade in opacity",
        duration: 300,
        easing: "ease-out",
        delay: 0,
        iterations: 1,
        direction: "normal",
        fillMode: "forwards",
        tracks: [
          {
            trackId: "opacity",
            keyframes: [
              { offset: 0, value: 0 },
              { offset: 100, value: 1 },
            ],
          },
        ],
        trigger: "onMount",
      },
      slideUp: {
        id: "anim_slideUp",
        name: "Slide Up",
        description: "Subtle slide up entrance",
        duration: 400,
        easing: "ease-out",
        delay: 50,
        iterations: 1,
        direction: "normal",
        fillMode: "forwards",
        tracks: [
          {
            trackId: "translateY",
            keyframes: [
              { offset: 0, value: 20 },
              { offset: 100, value: 0 },
            ],
          },
          {
            trackId: "opacity",
            keyframes: [
              { offset: 0, value: 0 },
              { offset: 100, value: 1 },
            ],
          },
        ],
        trigger: "onMount",
      },
    };
  }

  private static generateDataBindings(
    elements: Record<string, Layer>,
    databaseSchemas: Record<string, CollectionSchema>
  ): Record<string, DataBindingDescriptor> {
    const bindings: Record<string, DataBindingDescriptor> = {};

    // Safely create a verified binding if element exists
    if (elements["stat_revenue_text"]) {
      bindings["bind_revenue"] = {
        id: "bind_revenue",
        target: {
          elementId: "stat_revenue_text",
          elementName: "Revenue Text",
          archetype: "text",
          propertyKey: "content",
        },
        sourceType: "database",
        sourceCollection: "subscriptions",
        sourceField: "plan",
        fallbackValue: "$0",
      };
    }

    return bindings;
  }

  private static generateProjectName(goal: string): string {
    const cleaned = goal
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .split(" ")
      .slice(0, 3)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");
    return cleaned ? `${cleaned}App` : "SaaSStudioApp";
  }
}
