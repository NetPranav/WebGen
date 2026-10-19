import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderTree } from "@/core/render";
import { createShowcaseSnapshot } from "@/core/storage/DemoProjectSnapshot";

const root = process.cwd();
const stageDir = join(root, "src", "editor", "stage");
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((e) => {
    const full = join(dir, e);
    return statSync(full).isDirectory() ? (e === "__tests__" ? [] : files(full)) : /\.(ts|tsx)$/.test(e) ? [full] : [];
  });

describe("Phase 18: the stage host builds no HTML strings and runs no script", () => {
  it("nothing under src/editor/stage or the canvas uses srcDoc, innerHTML, document.write or dangerouslySetInnerHTML", () => {
    const banned = /srcDoc|innerHTML|outerHTML|insertAdjacentHTML|document\.write|dangerouslySetInnerHTML|new Function\(|eval\(/;
    const offenders = [...files(stageDir), ...files(join(root, "src", "editor", "canvas"))].filter((f) =>
      banned.test(readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")),
    );
    assert.deepEqual(offenders.map((f) => f.slice(root.length + 1)), []);
  });

  it("the design path no longer imports the sandbox, the HTML builders or the mock server", () => {
    const sources = [...files(stageDir), join(root, "src", "editor", "canvas", "WhiteboardCanvas.tsx")].map((f) => [f, readFileSync(f, "utf8")] as const);
    for (const [file, source] of sources) {
      assert.ok(!/from\s+["']@\/editor\/runtime\/SandboxHost["']/.test(source), `${file} imports SandboxHost directly`);
      assert.ok(!/buildSandboxDocument|generateElementMarkup|MockApiServer|HotReloadEngine/.test(source), `${file} uses the old HTML path`);
    }
  });

  it("the frame's static document has a doctype, one root and no script", () => {
    const html = readFileSync(join(root, "public", "stage-frame.html"), "utf8");
    assert.match(html, /^<!doctype html>/i);
    assert.equal((html.match(/id="stage-root"/g) ?? []).length, 1);
    assert.ok(!/<script/i.test(html), "no script in the frame document");
    assert.ok(!/<[^>]*\son[a-z]+\s*=/i.test(html.replace(/<!--[\s\S]*?-->/g, "")), "no inline handler");
  });

  it("the frame is a script-free same-origin sandbox: allow-same-origin and nothing else", () => {
    const frame = readFileSync(join(stageDir, "StageFrame.tsx"), "utf8");
    assert.match(frame, /sandbox="allow-same-origin"/);
    assert.ok(!/allow-scripts/.test(frame.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")));
  });
});

describe("Phase 18: the demo is drawn by the render definitions", () => {
  it("every layer of the showcase demo that the page reaches appears in the stage's markup with its archetype", () => {
    const snapshot = createShowcaseSnapshot();
    const layers = snapshot.document.layers;
    const page = Object.values(snapshot.pages)[0];
    const html = renderToStaticMarkup(createElement(RenderTree, { layers, rootIds: [page.rootElementId] }));
    const reachable: string[] = [];
    const walk = (id: string) => {
      reachable.push(id);
      layers[id]?.children.forEach(walk);
    };
    walk(page.rootElementId);
    assert.ok(reachable.length >= 3, "the demo has a container, a heading and a button");
    for (const id of reachable) {
      const layer = layers[id];
      assert.ok(html.includes(`data-element-id="${id}"`), `${id} (${layer.archetype}) is missing from the stage`);
    }
    assert.ok(!/<script|\son[a-z]+=/i.test(html));
  });
});
