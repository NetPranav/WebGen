import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Core Stores and AST
import { useProjectStore, StateVariable } from "../../core/store/useProjectStore";
import { BlueprintGraph } from "../../core/ast/ASTManager";
import { CollectionSchema } from "../../core/types/database";
import { AnimationSample } from "../../core/types/animations";

// Core Engines and Validators
import { DatabaseValidator } from "../../core/engine/DatabaseValidator";
import { DataBindingValidator } from "../../core/engine/DataBindingValidator";
import { AnimationValidator } from "../../core/engine/AnimationValidator";
import { GSAPTimelineCompiler } from "../../core/engine/GSAPTimelineCompiler";

// Runtime Systems
import { PluginManagerEngine } from "../../runtime/PluginManagerEngine";
import { GlobalSearchEngine } from "../../runtime/GlobalSearchEngine";
import { ShortcutRegistry } from "../../runtime/ShortcutRegistry";
import { DeploymentEngine } from "../../runtime/DeploymentEngine";

// Compiler Emitters & Exporters
import { ReactComponentEmitter } from "../emitters/ReactComponentEmitter";
import { StyleEmitter } from "../emitters/StyleEmitter";
import { LogicFlowEmitter } from "../emitters/LogicFlowEmitter";
import { ApiRouteEmitter } from "../emitters/ApiRouteEmitter";
import { PrismaSchemaEmitter } from "../emitters/PrismaSchemaEmitter";
import { GSAPAnimationEmitter } from "../emitters/GSAPAnimationEmitter";
import { GitExporter } from "../export/GitExporter";
import type { Layer } from "@/core/document/schema";
import { loadDocument } from "@/core/document/migrations";

describe("Sub-Phase 7.5: Final Integration Testing & Production Verification (E2E)", () => {
  // Stage 1: Blank Project Initialization & Dynamic Route Setup
  it("Stage 1: initializes a fresh visual project with dynamic route architecture", () => {
    useProjectStore.setState({
      projectName: "Enterprise Commerce Studio",
      activePageId: "page_home",
      pages: {
        page_home: {
          id: "page_home",
          name: "Storefront Home",
          slug: "/",
          rootElementId: "el_home_root",
          metaTitle: "Enterprise Commerce | Home",
          metaDescription: "Welcome to our high-performance storefront",
          parameters: [],
        },
        page_product: {
          id: "page_product",
          name: "Product Detail",
          slug: "/products/[productId]",
          rootElementId: "el_product_root",
          metaTitle: "Product View",
          parameters: [{ name: "productId", type: "string", required: true }],
        },
        page_checkout: {
          id: "page_checkout",
          name: "Secure Checkout",
          slug: "/checkout",
          rootElementId: "el_checkout_root",
          metaTitle: "Checkout",
          parameters: [],
        },
      },
      document: loadDocument({ elements: {} }),
      stateVariables: {},
      databaseSchemas: {},
      blueprintGraphs: {},
    });

    const store = useProjectStore.getState();
    assert.strictEqual(store.projectName, "Enterprise Commerce Studio");
    assert.strictEqual(Object.keys(store.pages).length, 3);
    assert.strictEqual(store.pages.page_product.parameters?.[0].name, "productId");

    // Verify route collisions check passes with 0 collisions
    const collisions = store.detectRouteCollisions();
    assert.strictEqual(collisions.length, 0);
  });

  // Stage 2: Visual Canvas Element Hierarchy & Responsive Layout Tree
  it("Stage 2: populates structured visual elements with responsive properties and styles", () => {
    const homeElements: Record<string, Layer> = {
      el_home_root: {
        id: "el_home_root",
        name: "Home Page Root Container",
        archetype: "container",
        parentId: null,
        children: ["el_hero_section", "el_featured_products"],
        properties: {
          "layout.display": "flex",
          "layout.flexDirection": "column",
          "layout.minHeight": "100vh",
          "appearance.background.color": "#0B0F17",
          "typography.color": "#F8FAFC",
        },
      },
      el_hero_section: {
        id: "el_hero_section",
        name: "Hero Section",
        archetype: "container",
        parentId: "el_home_root",
        children: ["el_hero_headline", "el_cta_btn"],
        properties: {
          "layout.padding": "64px 24px",
          "typography.textAlign": "center",
          "layout.display": "flex",
          "layout.flexDirection": "column",
          "layout.alignItems": "center",
        },
      },
      el_hero_headline: {
        id: "el_hero_headline",
        name: "Hero Headline Text",
        archetype: "text",
        parentId: "el_hero_section",
        children: [],
        properties: {
          "typography.fontSize": "48px",
          "typography.fontWeight": "700",
          "typography.color": "#FFFFFF",
          "content.text": "Next-Gen Intelligent Commerce",
        },
      },
      el_cta_btn: {
        id: "el_cta_btn",
        name: "Shop Now Button",
        archetype: "button",
        parentId: "el_hero_section",
        children: [],
        properties: {
          "layout.padding": "12px 28px",
          "appearance.background.color": "#6366F1",
          "appearance.radius": "8px",
          "typography.color": "#FFFFFF",
          "content.label": "Explore Collection",
          "interaction.disabled": false,
        },
      },
      el_featured_products: {
        id: "el_featured_products",
        name: "Featured Products Grid",
        archetype: "container",
        parentId: "el_home_root",
        children: [],
        properties: {
          "layout.display": "grid",
          "layout.gridTemplateColumns": "repeat(3, 1fr)",
          "layout.gap": "24px",
          "layout.padding": "32px",
          itemsSource: "products",
        },
      },
    };

    useProjectStore.setState({ document: loadDocument({ elements: homeElements }) });
    const count = Object.keys(useProjectStore.getState().document.layers).length;
    assert.strictEqual(count, 5);
  });

  // Stage 3: Database ER Modeling & Schema Validation
  it("Stage 3: establishes relational database collections and validates integrity", () => {
    const schemas: Record<string, CollectionSchema> = {
      users: {
        id: "col_users",
        name: "users",
        displayName: "User Accounts",
        fields: {
          id: { id: "f_uid", name: "id", type: "String", isPrimaryKey: true, isNullable: false },
          email: { id: "f_email", name: "email", type: "String", isUnique: true, isNullable: false },
          name: { id: "f_name", name: "name", type: "String", isNullable: false },
          createdAt: { id: "f_createdAt", name: "createdAt", type: "DateTime", isNullable: false },
        },
      },
      products: {
        id: "col_products",
        name: "products",
        displayName: "Catalog Products",
        fields: {
          id: { id: "f_pid", name: "id", type: "String", isPrimaryKey: true, isNullable: false },
          title: { id: "f_pname", name: "title", type: "String", isNullable: false },
          price: { id: "f_price", name: "price", type: "Float", isNullable: false },
          stock: { id: "f_stock", name: "stock", type: "Int", isNullable: false },
        },
      },
      orders: {
        id: "col_orders",
        name: "orders",
        displayName: "Customer Orders",
        fields: {
          id: { id: "f_oid", name: "id", type: "String", isPrimaryKey: true, isNullable: false },
          userId: {
            id: "f_userId",
            name: "userId",
            type: "Relation",
            isNullable: false,
            relation: {
              targetCollection: "users",
              foreignKey: "userId",
              referencesField: "id",
              cardinality: "1:N",
              onDelete: "CASCADE",
            },
          },
          totalAmount: { id: "f_total", name: "totalAmount", type: "Float", isNullable: false },
          orderStatus: { id: "f_status", name: "orderStatus", type: "String", isNullable: false },
        },
      },
    };

    useProjectStore.setState({ databaseSchemas: schemas });

    // Validate database schemas with DatabaseValidator
    const allSchemasList = Object.values(schemas);
    for (const schema of allSchemasList) {
      const validation = DatabaseValidator.validateSchema(schema, allSchemasList);
      assert.strictEqual(validation.isValid, true);
      assert.strictEqual(validation.errors.length, 0);
    }
  });

  // Stage 4: Reactive State Atoms & Property Data-Binding
  it("Stage 4: connects reactive state variables and evaluates binding legality", () => {
    const stateVars: Record<string, StateVariable> = {
      cartCount: {
        id: "var_cart_count",
        name: "cartCount",
        type: "number",
        value: 0,
        defaultValue: 0,
        scope: "global",
      },
      currentCurrency: {
        id: "var_currency",
        name: "currentCurrency",
        type: "string",
        value: "USD",
        defaultValue: "USD",
        scope: "global",
      },
    };

    useProjectStore.setState({ stateVariables: stateVars });

    const context = {
      database: {},
      stateVariables: { var_currency: "USD", var_cart_count: 3 },
      urlParams: {},
      localStorage: {},
    };

    // Test legal binding (Text element textContent bound to currentCurrency)
    const legalResult = DataBindingValidator.evaluateBinding(
      {
        id: "bind_currency",
        target: {
          elementId: "el_hero_headline",
          propertyKey: "textContent",
          archetype: "text",
        },
        sourceType: "state_variable",
        stateVariableId: "var_currency",
      },
      context
    );
    assert.strictEqual(legalResult.isValid, true);
    assert.strictEqual(legalResult.value, "USD");

    // Test illegal binding trapped (Button disabled bound to array of objects)
    const illegalResult = DataBindingValidator.evaluateBinding(
      {
        id: "bind_illegal",
        target: {
          elementId: "el_cta_btn",
          propertyKey: "disabled",
          archetype: "button",
        },
        sourceType: "state_variable",
        stateVariableId: "var_items_array",
      },
      {
        ...context,
        stateVariables: { var_items_array: [{ id: 1 }, { id: 2 }] },
      }
    );
    assert.strictEqual(illegalResult.isValid, false);
    assert.strictEqual(illegalResult.fallbackApplied, true);
  });

  // Stage 5: Animation Curve Compilation & Motion Samples
  it("Stage 5: compiles valid GSAP animation tracks for UI elements", () => {
    const heroAnimation: AnimationSample = {
      id: "anim_fade_in_hero",
      name: "Hero Entrance Fade",
      duration: 1200,
      easing: "power2.out",
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
        {
          trackId: "translateY",
          keyframes: [
            { offset: 0, value: 30 },
            { offset: 100, value: 0 },
          ],
        },
      ],
    };

    // Verify track-to-archetype compatibility via AnimationValidator
    const compatResult = AnimationValidator.validateSampleForElement(heroAnimation, {
      elementId: "el_hero_section",
      archetype: "container",
    });
    assert.strictEqual(compatResult.isValid, true);
    assert.strictEqual(compatResult.allowedTracks.length, 2);

    // Compile to GSAP timeline and CSS @keyframes
    const compiled = GSAPTimelineCompiler.compile(heroAnimation);
    assert.ok(compiled.cssKeyframes.includes("@keyframes"));
    assert.ok(compiled.name.includes("hero_entrance_fade"));
  });

  // Stage 6: Logic Blueprint AST Scripting with Custom Plugin Node
  it("Stage 6: scripts business logic DAG with Stripe Checkout plugin node and database action", () => {
    const checkoutBlueprint: BlueprintGraph = {
      id: "bp_checkout_flow",
      name: "Initiate Checkout Flow",
      type: "event",
      nodes: {
        node_on_click: {
          id: "node_on_click",
          type: "event/on_click",
          title: "On CTA Click",
          position: { x: 50, y: 100 },
          customParams: { elementId: "el_cta_btn" },
        },
        node_check_auth: {
          id: "node_check_auth",
          type: "flow/branch",
          title: "Check Authenticated",
          position: { x: 260, y: 100 },
        },
        node_stripe_checkout: {
          id: "node_stripe_checkout",
          type: "stripe/create_checkout_session",
          title: "Create Checkout Session",
          position: { x: 500, y: 80 },
        },
      },
      wires: [
        {
          id: "wire_1",
          sourceNodeId: "node_on_click",
          sourcePinId: "out_exec",
          targetNodeId: "node_check_auth",
          targetPinId: "in_exec",
          pinType: "exec",
          isExec: true,
        },
        {
          id: "wire_2",
          sourceNodeId: "node_check_auth",
          sourcePinId: "out_true",
          targetNodeId: "node_stripe_checkout",
          targetPinId: "p_exec",
          pinType: "exec",
          isExec: true,
        },
      ],
      variables: [],
    };

    useProjectStore.setState({
      blueprintGraphs: { bp_checkout_flow: checkoutBlueprint },
      activeBlueprintGraphId: "bp_checkout_flow",
    });

    assert.strictEqual(Object.keys(useProjectStore.getState().blueprintGraphs).length, 1);
    assert.strictEqual(Object.keys(checkoutBlueprint.nodes).length, 3);
    assert.strictEqual(checkoutBlueprint.wires.length, 2);
  });

  // Stage 7: Plugin Security Capabilities & Sandboxed Extension Execution
  it("Stage 7: enforces security sandboxing on the Stripe plugin node", () => {
    // Check network permission for Stripe plugin
    const perm = PluginManagerEngine.checkCapability("plugin.stripe", "network");
    assert.strictEqual(perm.allowed, true);

    // Revoke and check security blockage
    PluginManagerEngine.revokeCapability("plugin.stripe", "network");
    const blocked = PluginManagerEngine.checkCapability("plugin.stripe", "network");
    assert.strictEqual(blocked.allowed, false);

    // Restore permission
    PluginManagerEngine.grantCapability("plugin.stripe", "network");
    const restored = PluginManagerEngine.checkCapability("plugin.stripe", "network");
    assert.strictEqual(restored.allowed, true);
  });

  // Stage 8: Global Cross-Domain Inverted Index Search
  it("Stage 8: builds inverted search index and accurately finds cross-domain entities", () => {
    GlobalSearchEngine.rebuildIndex();

    // Find Page
    const pageResults = GlobalSearchEngine.search({ query: "Storefront", category: "all" });
    assert.ok(pageResults.length > 0);
    assert.strictEqual(pageResults[0].entityType, "page");

    // Find Visual Element
    const elementResults = GlobalSearchEngine.search({ query: "Hero Headline", category: "all" });
    assert.ok(elementResults.length > 0);
    assert.strictEqual(elementResults[0].entityType, "element");

    // Find Database Collection
    const dbResults = GlobalSearchEngine.search({ query: "products", category: "all" });
    assert.ok(dbResults.length > 0);
    assert.strictEqual(dbResults[0].entityType, "database_collection");

    // Find Blueprint Node
    const bpResults = GlobalSearchEngine.search({ query: "Checkout Session", category: "all" });
    assert.ok(bpResults.length > 0);
    assert.strictEqual(bpResults[0].entityType, "blueprint_node");
  });

  // Stage 9: Keyboard Shortcuts & Studio Commands
  it("Stage 9: dispatches and executes registered studio keyboard commands", () => {
    let triggeredPalette = false;
    const testCommand = {
      id: "test.verify.cmd",
      title: "Verify E2E Command",
      category: "Navigation" as const,
      defaultShortcut: "Ctrl+Alt+V",
      action: () => {
        triggeredPalette = true;
      },
    };

    const regResult = ShortcutRegistry.registerCommand(testCommand);
    assert.strictEqual(regResult.success, true);

    // Execute registered command
    ShortcutRegistry.executeCommand("test.verify.cmd");
    assert.strictEqual(triggeredPalette, true);
  });

  // Stage 10: Full AST Multi-Domain Compilation Emitters
  it("Stage 10: compiles complete visual AST across all 6 compiler domains", () => {
    const store = useProjectStore.getState();

    // 10.1 React 19 JSX Component Emitter
    const rootEl = store.document.layers["el_home_root"];
    const componentFile = ReactComponentEmitter.emitComponent(rootEl.id, store.document.layers, {
      componentName: "StorefrontHome",
      exportType: "default",
    });
    assert.ok(componentFile.content.includes("export default function StorefrontHome"));
    assert.ok(componentFile.content.includes("Next-Gen Intelligent Commerce"));
    assert.ok(componentFile.content.includes("Explore Collection"));

    // 10.2 Scoped CSS Emitter
    const stylesFile = StyleEmitter.emitProjectStyles(store.document.layers);
    assert.ok(stylesFile.content.toLowerCase().includes("#0b0f17"));

    // 10.3 Logic Flow Blueprint Emitter
    const bp = store.blueprintGraphs["bp_checkout_flow"];
    const logicFile = LogicFlowEmitter.emitLogicFlow(bp);
    assert.ok(logicFile.content.includes("export async function initiateCheckoutFlow"));

    // 10.4 API Route Emitter
    const apiFile = ApiRouteEmitter.emitCollectionRoute(store.databaseSchemas["products"]);
    assert.ok(apiFile.content.includes("export async function GET"));
    assert.ok(apiFile.content.includes("export async function POST"));

    // 10.5 Prisma Schema Emitter
    const prismaFile = PrismaSchemaEmitter.emitSchema(store.databaseSchemas, { provider: "postgresql" });
    assert.ok(prismaFile.content.includes("model users"));
    assert.ok(prismaFile.content.includes("model products"));
    assert.ok(prismaFile.content.includes("model orders"));
    assert.ok(prismaFile.content.includes("@relation(fields: [userId], references: [id]"));

    // 10.6 GSAP Animation Emitter
    const animFile = GSAPAnimationEmitter.emitHook({
      id: "anim_fade_in_hero",
      name: "Hero Entrance Fade",
      duration: 1200,
      easing: "power2.out",
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
    });
    assert.ok(animFile.content.includes("export function useHeroEntranceFadeAnimation"));
  });

  // Stage 11: Build Pipeline Visualizer, Pre-flight Validation & Cloud Deploy Execution
  it("Stage 11: executes 6-stage build & deployment pipeline cleanly across cloud targets", async () => {
    // Run pre-flight check on populated project
    const preflight = DeploymentEngine.validatePreflight();
    assert.strictEqual(preflight.valid, true);
    assert.strictEqual(preflight.errors.length, 0);

    // Execute full cloud deployment to Vercel target
    const deployment = await DeploymentEngine.triggerDeploy({
      target: "vercel",
      environment: "production",
      productionDomain: "store.enterprise-preview.app",
    });

    assert.strictEqual(deployment.status, "ready");
    assert.strictEqual(deployment.steps.length, 6);
    assert.ok(deployment.steps.every((s) => s.status === "completed"));
    assert.ok(deployment.url?.includes("store.enterprise-preview.app"));

    // Verify deployment history record
    const history = DeploymentEngine.getHistory();
    assert.ok(history.length >= 2);
    assert.strictEqual(history[0].id, deployment.id);
  });

  // Stage 12: Zero-Dependency Standalone Git Project Bundle Export
  it("Stage 12: generates production-ready PKZIP standalone Git repository with file integrity", () => {
    const store = useProjectStore.getState();
    const bundle = GitExporter.packageProject(
      {
        pages: store.pages,
        elements: store.document.layers,
        databaseSchemas: store.databaseSchemas,
        blueprintGraphs: store.blueprintGraphs,
      },
      {
        projectName: "enterprise-storefront",
        version: "1.0.0",
      }
    );

    const zipBuffer = bundle.toZipBuffer();
    assert.ok(zipBuffer instanceof Uint8Array);
    assert.ok(zipBuffer.length > 500);

    // Verify PKZIP Magic Bytes (0x50, 0x4B, 0x03, 0x04)
    assert.strictEqual(zipBuffer[0], 0x50);
    assert.strictEqual(zipBuffer[1], 0x4b);
    assert.strictEqual(zipBuffer[2], 0x03);
    assert.strictEqual(zipBuffer[3], 0x04);
  });
});
