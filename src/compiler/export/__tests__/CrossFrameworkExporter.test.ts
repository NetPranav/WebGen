import { test } from "node:test";
import assert from "node:assert/strict";
import { CrossFrameworkExporter } from "../CrossFrameworkExporter";
import type { Layer } from "@/core/document/schema";

test("Sub-Phase 8.2: Interactive Family (Button) exports cleanly across all 4 frameworks", () => {
  const buttonEl: Layer = {
    id: "btn_action",
    name: "ActionButton",
    archetype: "button",
    parentId: null,
    children: [],
    properties: { label: "Subscribe Now" },
  };

  // 1. Next.js 15
  const nextRes = CrossFrameworkExporter.exportElement(buttonEl, "nextjs-app", "tailwind");
  assert.equal(nextRes.framework, "nextjs-app");
  assert.ok(nextRes.files[0].content.includes("<button"));
  assert.ok(!nextRes.files[0].content.includes("@/core"));

  // 2. React 19 Vite
  const reactRes = CrossFrameworkExporter.exportElement(buttonEl, "react-vite", "css-modules");
  assert.equal(reactRes.framework, "react-vite");
  assert.ok(reactRes.files.some((f) => f.filename.endsWith(".module.css")));

  // 3. Vue 3
  const vueRes = CrossFrameworkExporter.exportElement(buttonEl, "vue", "tailwind");
  assert.equal(vueRes.framework, "vue");
  assert.ok(vueRes.files[0].filename.endsWith(".vue"));
  assert.ok(vueRes.files[0].content.includes("<template>"));
  assert.ok(vueRes.files[0].content.includes("<script setup lang=\"ts\">"));

  // 4. Vanilla HTML/JS
  const vanillaRes = CrossFrameworkExporter.exportElement(buttonEl, "vanilla");
  assert.equal(vanillaRes.framework, "vanilla");
  assert.equal(vanillaRes.files.length, 3);
  assert.ok(vanillaRes.files.some((f) => f.filename === "index.html"));
  assert.ok(vanillaRes.files.some((f) => f.filename === "style.css"));
  assert.ok(vanillaRes.files.some((f) => f.filename === "main.js"));
});

test("Sub-Phase 8.2: Media Family (Image) exports cleanly across all 4 frameworks", () => {
  const imageEl: Layer = {
    id: "img_hero",
    name: "HeroCover",
    archetype: "image",
    parentId: null,
    children: [],
    properties: { src: "https://images.unsplash.com/photo-1", alt: "Hero Banner" },
  };

  const frameworks: ("nextjs-app" | "react-vite" | "vue" | "vanilla")[] = [
    "nextjs-app",
    "react-vite",
    "vue",
    "vanilla",
  ];

  for (const fw of frameworks) {
    const res = CrossFrameworkExporter.exportElement(imageEl, fw);
    assert.equal(res.framework, fw);
    assert.ok(res.files.length >= 1);
    for (const f of res.files) {
      assert.ok(!f.content.includes("@/core"), `Framework ${fw} file ${f.filename} contains internal engine import`);
      assert.ok(!f.content.includes("@/editor"), `Framework ${fw} file ${f.filename} contains internal editor import`);
    }
  }
});

test("Sub-Phase 8.2: Structural Family (Divider) exports cleanly across all 4 frameworks", () => {
  const dividerEl: Layer = {
    id: "div_accent",
    name: "SectionDivider",
    archetype: "divider",
    parentId: null,
    children: [],
    properties: { orientation: "horizontal" },
  };

  const frameworks: ("nextjs-app" | "react-vite" | "vue" | "vanilla")[] = [
    "nextjs-app",
    "react-vite",
    "vue",
    "vanilla",
  ];

  for (const fw of frameworks) {
    const res = CrossFrameworkExporter.exportElement(dividerEl, fw);
    assert.equal(res.framework, fw);
    assert.ok(res.files.length >= 1);
  }
});

test("Sub-Phase 8.2: Text Family (Text) exports cleanly across all 4 frameworks", () => {
  const textEl: Layer = {
    id: "text_title",
    name: "TitleHeading",
    archetype: "text",
    parentId: null,
    children: [],
    properties: { textContent: "Designed with Precision" },
  };

  const frameworks: ("nextjs-app" | "react-vite" | "vue" | "vanilla")[] = [
    "nextjs-app",
    "react-vite",
    "vue",
    "vanilla",
  ];

  for (const fw of frameworks) {
    const res = CrossFrameworkExporter.exportElement(textEl, fw);
    assert.equal(res.framework, fw);
    assert.ok(res.files.length >= 1);
  }
});
