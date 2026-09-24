import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ComponentGenerator } from "../ComponentGenerator";

describe("ComponentGenerator: Prompt-to-Component Synthesis", () => {
  it("synthesizes a pricing card from pricing intent", () => {
    const result = ComponentGenerator.generateComponent("Create a modern dark mode pricing card with badge and button");
    assert.equal(result.name, "Pricing Card");
    assert.ok(result.rootId.startsWith("elem_container_"));
    assert.ok(result.elements.length >= 6);

    const root = result.elements.find((e) => e.id === result.rootId);
    assert.ok(root);
    assert.equal(root.archetype, "container");
    assert.ok(root.children.length >= 5);

    // Verify presence of badge, button, text, divider
    const archetypes = result.elements.map((e) => e.archetype);
    assert.ok(archetypes.includes("badge"));
    assert.ok(archetypes.includes("button"));
    assert.ok(archetypes.includes("text"));
    assert.ok(archetypes.includes("divider"));
  });

  it("synthesizes a testimonial card from review intent", () => {
    const result = ComponentGenerator.generateComponent("Create a testimonial review card with avatar and quote");
    assert.equal(result.name, "Testimonial Card");
    assert.ok(result.elements.some((e) => e.archetype === "image"));
    assert.ok(result.elements.some((e) => e.archetype === "text"));
  });

  it("synthesizes an interactive toggle from switch intent", () => {
    const result = ComponentGenerator.generateComponent("Create a dark mode toggle switch");
    assert.equal(result.name, "Interactive Switch");
    assert.ok(result.elements.some((e) => e.archetype === "toggle"));
  });

  it("synthesizes a hero banner from headline intent", () => {
    const result = ComponentGenerator.generateComponent("Create a hero banner with headline and CTA");
    assert.equal(result.name, "Hero Headline & CTA");
    assert.ok(result.elements.some((e) => e.archetype === "button"));
    assert.ok(result.elements.some((e) => e.archetype === "text"));
  });

  it("synthesizes fallback custom card for general prompts", () => {
    const result = ComponentGenerator.generateComponent("Create an interactive settings widget");
    assert.ok(result.rootId);
    assert.ok(result.elements.length >= 3);
  });
});
