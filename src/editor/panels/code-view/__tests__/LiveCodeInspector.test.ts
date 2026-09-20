import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ReactComponentEmitter } from "../../../../compiler/emitters/ReactComponentEmitter";
import { StyleEmitter } from "../../../../compiler/emitters/StyleEmitter";
import { PrismaSchemaEmitter } from "../../../../compiler/emitters/PrismaSchemaEmitter";
import { ApiRouteEmitter } from "../../../../compiler/emitters/ApiRouteEmitter";
import { LogicFlowEmitter } from "../../../../compiler/emitters/LogicFlowEmitter";
import { GSAPAnimationEmitter } from "../../../../compiler/emitters/GSAPAnimationEmitter";
import { ProjectElement, PageDefinition } from "../../../../core/store/useProjectStore";
import { CollectionSchema } from "../../../../core/types/database";
import { AnimationSample } from "../../../../core/types/animations";
import { BlueprintGraph } from "../../../../core/ast/ASTManager";
import { DiagnosticBus } from "../../../../core/engine/DiagnosticBus";

describe("Sub-Phase 6.3: LiveCodeInspector Compilation & AST Mapping", () => {
  const mockPage: PageDefinition = {
    id: "p_home",
    name: "Home",
    slug: "/",
    rootElementId: "el_container",
  };

  const mockElements: Record<string, ProjectElement> = {
    el_container: {
      id: "el_container",
      name: "HeroContainer",
      archetype: "container",
      parentId: null,
      properties: { display: "flex", gap: 16 },
      children: ["el_btn"],
    },
    el_btn: {
      id: "el_btn",
      name: "ActionBtn",
      archetype: "button",
      parentId: "el_container",
      properties: { label: "Launch", ariaLabel: "Launch Application" },
      children: [],
    },
  };

  const mockSchema: CollectionSchema = {
    id: "col_items",
    name: "Items",
    displayName: "Items",
    fields: {
      id: { id: "f_id", name: "id", type: "String", isPrimaryKey: true },
      title: { id: "f_title", name: "title", type: "String" },
    },
  };

  const mockAnimation: AnimationSample = {
    id: "anim_fade",
    name: "FadeIn",
    duration: 500,
    easing: "power1.out",
    iterations: 1,
    direction: "normal",
    fillMode: "forwards",
    tracks: [{ trackId: "opacity", keyframes: [{ offset: 0, value: 0 }, { offset: 100, value: 1 }] }],
  };

  const mockGraph: BlueprintGraph = {
    id: "g_do_action",
    name: "DoAction",
    type: "function",
    nodes: {
      n_entry: { id: "n_entry", type: "event/entry", title: "Entry", position: { x: 0, y: 0 } },
      n_ret: { id: "n_ret", type: "flow/return", title: "Return", position: { x: 100, y: 0 }, pinValues: { value: 100 } },
    },
    wires: [
      { id: "w1", sourceNodeId: "n_entry", sourcePinId: "exec", targetNodeId: "n_ret", targetPinId: "exec", pinType: "exec", isExec: true },
    ],
    variables: [],
  };

  beforeEach(() => {
    DiagnosticBus.clearHistory();
  });

  // --------------------------------------------------------------------------
  // 1. Full Multi-Domain Compilation
  // --------------------------------------------------------------------------
  it("compiles visual AST across all 6 compiler domains without errors", () => {
    // 1. React JSX Page & Component
    const pageFile = ReactComponentEmitter.emitPage(mockPage, mockElements);
    assert.equal(pageFile.type, "page");
    assert.match(pageFile.content, /export default function HomePage/);

    const compFile = ReactComponentEmitter.emitComponent("el_container", mockElements);
    assert.equal(compFile.type, "component");
    assert.match(compFile.content, /export function HeroContainer/);

    // 2. Scoped CSS & Tokens
    const tokenFile = StyleEmitter.emitTokens({
      colors: { canvasBg: "#0F172A" } as any,
      wires: { exec: "#FFFFFF" } as any,
    });
    assert.equal(tokenFile.type, "styles");
    assert.match(tokenFile.content, /--color-canvas-bg/);

    const cssFile = StyleEmitter.emitProjectStyles(mockElements);
    assert.equal(cssFile.type, "styles");
    assert.match(cssFile.content, /\.herocontainer_contain/);

    // 3. GSAP Animation Hook
    const animFile = GSAPAnimationEmitter.emitHook(mockAnimation);
    assert.equal(animFile.type, "animation");
    assert.match(animFile.content, /export function useFadeInAnimation/);

    // 4. Prisma Schema & Migration
    const prismaFile = PrismaSchemaEmitter.emitSchema({ Items: mockSchema });
    assert.equal(prismaFile.type, "schema");
    assert.match(prismaFile.content, /model Items \{/);

    const sqlFile = PrismaSchemaEmitter.emitSqlMigration({ Items: mockSchema });
    assert.match(sqlFile.content, /CREATE TABLE "Items"/);

    // 5. API Routes
    const apiRouteFile = ApiRouteEmitter.emitCollectionRoute(mockSchema);
    assert.equal(apiRouteFile.type, "api");
    assert.match(apiRouteFile.content, /export async function GET/);

    // 6. Logic Flow
    const logicFile = LogicFlowEmitter.emitLogicFlow(mockGraph);
    assert.equal(logicFile.type, "logic");
    assert.match(logicFile.content, /export async function doAction/);
  });

  // --------------------------------------------------------------------------
  // 2. Bidirectional AST-to-Code Mapping
  // --------------------------------------------------------------------------
  it("identifies matching code line indices for active visual element selections", () => {
    const pageFile = ReactComponentEmitter.emitPage(mockPage, mockElements);
    const lines = pageFile.content.split("\n");

    // Search for button element
    const btnIdShort = "btn";
    const btnLineIndex = lines.findIndex((l) => l.includes(btnIdShort) || l.includes("Launch"));

    assert.ok(btnLineIndex >= 0, "Should locate button element in emitted JSX lines");
    assert.match(lines[btnLineIndex], /Launch/);
  });

  // --------------------------------------------------------------------------
  // 3. Bidirectional Code-to-AST Mapping
  // --------------------------------------------------------------------------
  it("maps clicked code line text back to the corresponding ProjectElement ID", () => {
    const cssFile = StyleEmitter.emitProjectStyles(mockElements);
    const lines = cssFile.content.split("\n");

    const headerLine = lines.find((l) => l.includes(".actionbtn_btn"));
    assert.ok(headerLine);

    // Match back to element ID
    let resolvedElementId: string | null = null;
    for (const el of Object.values(mockElements)) {
      const shortId = el.id.replace(/^el_/, "");
      if (headerLine.includes(shortId)) {
        resolvedElementId = el.id;
        break;
      }
    }

    assert.equal(resolvedElementId, "el_btn");
  });
});
