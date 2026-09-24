import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ReactComponentEmitter } from "../emitters/ReactComponentEmitter";
import { PageDefinition } from "../../core/store/useProjectStore";
import type { Layer } from "@/core/document/schema";

describe("Sub-Phase 6.1: ReactComponentEmitter (React 19 & Next.js 15 JSX)", () => {
  const sampleElements: Record<string, Layer> = {
    el_nav: {
      id: "el_nav",
      name: "MainNavbar",
      archetype: "container",
      parentId: null,
      properties: { display: "flex", gap: 16 },
      children: ["el_brand_title", "el_cta_button"],
    },
    el_brand_title: {
      id: "el_brand_title",
      name: "BrandTitle",
      archetype: "text",
      parentId: "el_nav",
      properties: { textContent: "Visual Studio", fontSize: 32 },
      children: [],
    },
    el_cta_button: {
      id: "el_cta_button",
      name: "CtaButton",
      archetype: "button",
      parentId: "el_nav",
      properties: { label: "Get Started", ariaLabel: "Get Started Free" },
      children: [],
    },
    el_avatar_img: {
      id: "el_avatar_img",
      name: "Avatar",
      archetype: "image",
      parentId: null,
      properties: { src: "/avatar.png", alt: "User profile avatar" },
      children: [],
    },
    el_email_input: {
      id: "el_email_input",
      name: "EmailInput",
      archetype: "input",
      parentId: null,
      properties: { type: "email", placeholder: "Enter your email", required: true },
      children: [],
    },
  };

  // --------------------------------------------------------------------------
  // 1. Semantic Tag Resolution
  // --------------------------------------------------------------------------
  it("resolves accessible HTML5 semantic tags based on archetype and attributes", () => {
    assert.equal(ReactComponentEmitter.resolveSemanticTag(sampleElements.el_nav), "nav");
    assert.equal(ReactComponentEmitter.resolveSemanticTag(sampleElements.el_brand_title), "h1");
    assert.equal(ReactComponentEmitter.resolveSemanticTag(sampleElements.el_cta_button), "button");
    assert.equal(ReactComponentEmitter.resolveSemanticTag(sampleElements.el_avatar_img), "img");
    assert.equal(ReactComponentEmitter.resolveSemanticTag(sampleElements.el_email_input), "input");

    // Container name heuristics
    const headerEl: Layer = {
      id: "el_h",
      name: "AppHeader",
      archetype: "container",
      parentId: null,
      properties: {},
      children: [],
    };
    assert.equal(ReactComponentEmitter.resolveSemanticTag(headerEl), "header");

    const footerEl: Layer = {
      id: "el_f",
      name: "SiteFooter",
      archetype: "container",
      parentId: null,
      properties: {},
      children: [],
    };
    assert.equal(ReactComponentEmitter.resolveSemanticTag(footerEl), "footer");

    // Explicit override
    const customEl: Layer = {
      id: "el_c",
      name: "CustomBox",
      archetype: "container",
      parentId: null,
      properties: { semanticTag: "aside" },
      children: [],
    };
    assert.equal(ReactComponentEmitter.resolveSemanticTag(customEl), "aside");
  });

  // --------------------------------------------------------------------------
  // 2. WCAG Accessibility Attributes
  // --------------------------------------------------------------------------
  it("emits mandatory accessibility attributes (alt, aria-label, aria-required)", () => {
    // Image alt
    const imgJsx = ReactComponentEmitter.emitJsxNode("el_avatar_img", sampleElements);
    assert.match(imgJsx, /<img\s+[^>]*alt="User profile avatar"/);
    assert.match(imgJsx, /loading="lazy"/);

    // Button aria-label and type
    const btnJsx = ReactComponentEmitter.emitJsxNode("el_cta_button", sampleElements);
    assert.match(btnJsx, /<button\s+[^>]*type="button"/);
    assert.match(btnJsx, /aria-label="Get Started Free"/);

    // Input aria-required
    const inputJsx = ReactComponentEmitter.emitJsxNode("el_email_input", sampleElements);
    assert.match(inputJsx, /<input\s+[^>]*type="email"/);
    assert.match(inputJsx, /placeholder="Enter your email"/);
    assert.match(inputJsx, /aria-required="true"/);
  });

  // --------------------------------------------------------------------------
  // 3. Nested Tree JSX Generation
  // --------------------------------------------------------------------------
  it("emits recursive nested element tree with clean indentation", () => {
    const navJsx = ReactComponentEmitter.emitJsxNode("el_nav", sampleElements);
    assert.match(navJsx, /<nav\s+[^>]*className="mainnavbar_nav">/);
    assert.match(navJsx, /<h1\s+[^>]*>Visual Studio<\/h1>/);
    assert.match(navJsx, /<button\s+[^>]*>Get Started<\/button>/);
    assert.match(navJsx, /<\/nav>/);
  });

  // --------------------------------------------------------------------------
  // 4. Component File Generation (TypeScript Props & Client Directive)
  // --------------------------------------------------------------------------
  it("generates production component file with typed props interface", () => {
    const file = ReactComponentEmitter.emitComponent("el_nav", sampleElements, {
      componentName: "MainNavbar",
    });

    assert.equal(file.language, "typescript");
    assert.equal(file.path, "components/MainNavbar.tsx");
    assert.match(file.content, /"use client";/); // Contains button child
    assert.match(file.content, /export interface MainNavbarProps/);
    assert.match(file.content, /export function MainNavbar\(props: MainNavbarProps\)/);
    assert.match(file.content, /<nav/);
    assert.match(file.content, /<\/nav>/);
  });

  // --------------------------------------------------------------------------
  // 5. Next.js 15 App Router Page Generation
  // --------------------------------------------------------------------------
  it("generates Next.js 15 App Router page.tsx file", () => {
    const page: PageDefinition = {
      id: "page_home",
      name: "Home",
      slug: "/",
      rootElementId: "el_nav",
    };

    const pageFile = ReactComponentEmitter.emitPage(page, sampleElements);
    assert.equal(pageFile.language, "typescript");
    assert.equal(pageFile.path, "app/page.tsx");
    assert.match(pageFile.content, /export default function HomePage\(\)/);
    assert.match(pageFile.content, /<nav/);
  });
});
