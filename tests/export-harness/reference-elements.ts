/**
 * ROADMAP Phase 4.2 — the small, fixed set of elements the export build
 * harness compiles into every fixture app. One per emitter family
 * (Interactive/Media/Structural/Text) covered by `CrossFrameworkExporter`
 * (see `src/compiler/export/CrossFrameworkExporter.ts`), so a change to any
 * family's emitter is exercised by every framework target.
 */
import type { Layer } from "@/core/document/schema";

export const referenceElements: Layer[] = [
  {
    id: "harness_btn_reveal",
    name: "HarnessRevealButton",
    archetype: "button",
    parentId: null,
    children: [],
    properties: { label: "Get Started" },
  },
  {
    id: "harness_img_hero",
    name: "HarnessHeroImage",
    archetype: "image",
    parentId: null,
    children: [],
    properties: { src: "https://images.unsplash.com/photo-1", alt: "Hero" },
  },
  {
    id: "harness_divider_accent",
    name: "HarnessAccentDivider",
    archetype: "divider",
    parentId: null,
    children: [],
    properties: { orientation: "horizontal" },
  },
  {
    id: "harness_text_title",
    name: "HarnessTitleText",
    archetype: "text",
    parentId: null,
    children: [],
    properties: { text: "Export Harness" },
  },
];
