import { test } from "node:test";
import assert from "node:assert/strict";
import { useProjectStore } from "../../store/useProjectStore";
import { multiEngineAnimationRuntime } from "../../runtime/MultiEngineAnimationRuntime";
import { CrossFrameworkExporter } from "../../../compiler/export/CrossFrameworkExporter";
import { AnimationSample } from "../../types/animations";
import type { Layer } from "@/core/document/schema";
import { documentCommands } from "@/core/store/useDocumentStore";

test("Sub-Phase 8.1: Full Pipeline Integration — Interactive Family (Button)", () => {
  const store = useProjectStore.getState();

  // 1. Launcher: Initialize project with Button archetype
  const buttonElement: Layer = {
    id: "el_button_root",
    name: "CtaButton",
    archetype: "button",
    parentId: null,
    children: [],
    properties: {
      "content.label": "Get Started Now",
      "appearance.variant": "primary",
      "button.size": "lg",
    },
  };

  documentCommands.insertLayers([buttonElement]);
  assert.equal(useProjectStore.getState().document.layers["el_button_root"].archetype, "button");

  // 2. Sequencer: Choreograph Hover Bounce animation
  const hoverBounceSample: AnimationSample = {
    id: "sample_btn_bounce",
    name: "HoverBounce",
    duration: 350,
    easing: "back.out(2)",
    iterations: 1,
    direction: "normal",
    fillMode: "forwards",
    tracks: [
      {
        trackId: "scale",
        keyframes: [{ offset: 0, value: 1.0 }, { offset: 100, value: 1.06 }],
      },
      {
        trackId: "translateY",
        keyframes: [{ offset: 0, value: 0 }, { offset: 100, value: -2 }],
      },
    ],
  };

  // 3. Sandbox: Compile multi-engine runtime timeline
  const compiled = multiEngineAnimationRuntime.compileGsapTimeline(hoverBounceSample, {
    componentSelector: "#el_button_root",
  });
  assert.ok(compiled.includes("gsap.timeline"));
  assert.ok(compiled.includes("#el_button_root"));

  // 4. Export: Generate clean Next.js 15 Tailwind code
  const exported = CrossFrameworkExporter.exportElement(buttonElement, "nextjs-app", "tailwind");
  assert.ok(exported.files[0].content.includes("<button"));
  assert.ok(exported.files[0].content.includes("Get Started Now"));
  assert.ok(!exported.files[0].content.includes("@/core"));
});

test("Sub-Phase 8.1: Full Pipeline Integration — Media Family (Image)", () => {
  const store = useProjectStore.getState();

  // 1. Launcher: Initialize with Image archetype
  const imageElement: Layer = {
    id: "el_image_root",
    name: "ShowcaseImage",
    archetype: "image",
    parentId: null,
    children: [],
    properties: {
      "media.src": "https://images.unsplash.com/photo-nature",
      "media.alt": "Lush Forest",
      "media.objectFit": "cover",
    },
  };

  documentCommands.insertLayers([imageElement]);
  assert.equal(useProjectStore.getState().document.layers["el_image_root"].archetype, "image");

  // 2. Sequencer: Ken Burns Zoom + Blur-In
  const kenBurnsSample: AnimationSample = {
    id: "sample_ken_burns",
    name: "KenBurnsShowcase",
    duration: 1200,
    easing: "power2.out",
    iterations: 1,
    direction: "normal",
    fillMode: "forwards",
    tracks: [
      {
        trackId: "scale",
        keyframes: [{ offset: 0, value: 1.0 }, { offset: 100, value: 1.15 }],
      },
      {
        trackId: "filterBlur",
        keyframes: [{ offset: 0, value: 8 }, { offset: 100, value: 0 }],
      },
    ],
  };

  // 3. Sandbox: Compile
  const compiled = multiEngineAnimationRuntime.compileGsapTimeline(kenBurnsSample, {
    componentSelector: "#el_image_root",
  });
  assert.ok(compiled.includes("gsap.timeline"));
  assert.ok(compiled.includes("#el_image_root"));

  // 4. Export: Generate Next.js App Router code
  const exported = CrossFrameworkExporter.exportElement(imageElement, "nextjs-app", "tailwind");
  assert.ok(exported.files[0].content.includes("Image"));
  assert.ok(exported.files[0].content.includes("fill"));
  assert.ok(!exported.files[0].content.includes("@/core"));
});

test("Sub-Phase 8.1: Full Pipeline Integration — Structural Family (Divider)", () => {
  const store = useProjectStore.getState();

  // 1. Launcher: Initialize with Divider archetype
  const dividerElement: Layer = {
    id: "el_divider_root",
    name: "GradientDivider",
    archetype: "divider",
    parentId: null,
    children: [],
    properties: {
      "divider.orientation": "horizontal",
      "divider.style": "gradient",
      "divider.thickness": 2,
    },
  };

  documentCommands.insertLayers([dividerElement]);
  assert.equal(useProjectStore.getState().document.layers["el_divider_root"].archetype, "divider");

  // 2. Sequencer: Stroke draw-in
  const drawSample: AnimationSample = {
    id: "sample_divider_draw",
    name: "DividerDrawIn",
    duration: 600,
    easing: "power3.inOut",
    iterations: 1,
    direction: "normal",
    fillMode: "forwards",
    tracks: [
      {
        trackId: "strokeDashoffset",
        keyframes: [{ offset: 0, value: 100 }, { offset: 100, value: 0 }],
      },
    ],
  };

  // 3. Sandbox: Compile
  const compiled = multiEngineAnimationRuntime.compileGsapTimeline(drawSample, {
    componentSelector: "#el_divider_root",
  });
  assert.ok(compiled.includes("gsap.timeline"));
  assert.ok(compiled.includes("#el_divider_root"));

  // 4. Export: Generate clean code
  const exported = CrossFrameworkExporter.exportElement(dividerElement, "nextjs-app", "tailwind");
  assert.ok(exported.files[0].content.includes("<hr") || exported.files[0].content.includes("<div"));
  assert.ok(!exported.files[0].content.includes("@/core"));
});

test("Sub-Phase 8.1: Full Pipeline Integration — Text Family (Text)", () => {
  const store = useProjectStore.getState();

  // 1. Launcher: Initialize with Text archetype
  const textElement: Layer = {
    id: "el_text_root",
    name: "HeroHeading",
    archetype: "text",
    parentId: null,
    children: [],
    properties: {
      "content.text": "Visual Motion Engine",
      "typography.fontSize": 48,
      "typography.fontWeight": 800,
    },
  };

  documentCommands.insertLayers([textElement]);
  assert.equal(useProjectStore.getState().document.layers["el_text_root"].archetype, "text");

  // 2. Sequencer: Staggered reveal
  const textSample: AnimationSample = {
    id: "sample_text_reveal",
    name: "FadeUpEditorial",
    duration: 800,
    easing: "power4.out",
    iterations: 1,
    direction: "normal",
    fillMode: "forwards",
    tracks: [
      {
        trackId: "opacity",
        keyframes: [{ offset: 0, value: 0 }, { offset: 100, value: 1 }],
      },
      {
        trackId: "translateY",
        keyframes: [{ offset: 0, value: 24 }, { offset: 100, value: 0 }],
      },
      {
        trackId: "letterSpacing",
        keyframes: [{ offset: 0, value: 4 }, { offset: 100, value: -1 }],
      },
    ],
  };

  // 3. Sandbox: Compile
  const compiled = multiEngineAnimationRuntime.compileGsapTimeline(textSample, {
    componentSelector: "#el_text_root",
  });
  assert.ok(compiled.includes("gsap.timeline"));
  assert.ok(compiled.includes("#el_text_root"));

  // 4. Export: Generate clean code with semantic heading
  const exported = CrossFrameworkExporter.exportElement(textElement, "nextjs-app", "tailwind");
  assert.ok(exported.files[0].content.includes("<h1") || exported.files[0].content.includes("<h2") || exported.files[0].content.includes("<p"));
  assert.ok(exported.files[0].content.includes("Visual Motion Engine"));
  assert.ok(!exported.files[0].content.includes("@/core"));
});
