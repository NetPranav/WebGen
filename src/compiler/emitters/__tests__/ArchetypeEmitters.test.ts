import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { InteractiveEmitter } from "../react/InteractiveEmitter";
import { MediaEmitter } from "../react/MediaEmitter";
import { StructuralEmitter } from "../react/StructuralEmitter";
import { TextEmitter } from "../react/TextEmitter";
import type { Layer } from "@/core/document/schema";

describe("Phase 6: Professional Clean Code Emitter & Exporter", () => {
  // ==========================================================================
  // SUB-PHASE 6.1 & 6.2: INTERACTIVE EMITTER
  // ==========================================================================
  describe("Sub-Phase 6.2: InteractiveEmitter", () => {
    it("emits semantic <button> with Tailwind CSS classes", () => {
      const buttonElement: Layer = {
        id: "btn-1",
        name: "Primary Button",
        archetype: "button",
        properties: { label: "Get Started", variant: "primary", size: "md" },
        children: [],
        parentId: null,
      };

      const result = InteractiveEmitter.emit(buttonElement, {
        stylingSystem: "tailwind",
        framework: "nextjs",
      });

      assert.equal(result.componentName, "PrimaryButton");
      assert.ok(result.tsxCode.includes("<button"));
      assert.ok(result.tsxCode.includes("type=\"button\""));
      assert.ok(result.tsxCode.includes("bg-emerald-600"));
      assert.ok(result.requiredPackages.includes("react"));
      assert.ok(!result.tsxCode.includes("@/core/store")); // Zero proprietary imports
    });

    it("emits semantic <button> with Scoped CSS Modules", () => {
      const buttonElement: Layer = {
        id: "btn-2",
        name: "Secondary Button",
        archetype: "button",
        properties: { label: "Learn More", variant: "secondary", size: "sm" },
        children: [],
        parentId: null,
      };

      const result = InteractiveEmitter.emit(buttonElement, {
        stylingSystem: "css-modules",
      });

      assert.ok(result.tsxCode.includes('import styles from "./SecondaryButton.module.css"'));
      assert.ok(result.cssCode);
      assert.ok(result.cssCode.includes(".button {"));
      assert.ok(result.cssCode.includes(".secondary {"));
    });

    it("emits accessible <div role=\"switch\"> for Toggle archetype", () => {
      const toggleElement: Layer = {
        id: "toggle-1",
        name: "Theme Toggle",
        archetype: "toggle",
        properties: { label: "Dark Mode", defaultChecked: true },
        children: [],
        parentId: null,
      };

      const result = InteractiveEmitter.emit(toggleElement, {
        stylingSystem: "tailwind",
      });

      assert.ok(result.tsxCode.includes('role="switch"'));
      assert.ok(result.tsxCode.includes("aria-checked={isChecked}"));
      assert.ok(result.tsxCode.includes("handleToggle"));
    });

    it("emits Badge chip element", () => {
      const badgeElement: Layer = {
        id: "badge-1",
        name: "Status Pill",
        archetype: "badge",
        properties: { label: "Active", variant: "success" },
        children: [],
        parentId: null,
      };

      const result = InteractiveEmitter.emit(badgeElement);
      assert.ok(result.tsxCode.includes("<span"));
      assert.ok(result.tsxCode.includes("Active"));
    });
  });

  // ==========================================================================
  // SUB-PHASE 6.1 & 6.2: MEDIA EMITTER
  // ==========================================================================
  describe("Sub-Phase 6.2: MediaEmitter", () => {
    it("emits Next.js <Image /> component with fill and aspect ratio wrapper", () => {
      const imageElement: Layer = {
        id: "img-1",
        name: "Hero Cover",
        archetype: "image",
        properties: {
          src: "https://example.com/hero.jpg",
          alt: "Hero Banner",
          width: 1200,
          height: 600,
          objectFit: "cover",
        },
        children: [],
        parentId: null,
      };

      const result = MediaEmitter.emit(imageElement, {
        framework: "nextjs",
        stylingSystem: "tailwind",
      });

      assert.ok(result.tsxCode.includes('import Image from "next/image"'));
      assert.ok(result.tsxCode.includes("<Image"));
      assert.ok(result.tsxCode.includes("fill"));
      assert.ok(result.tsxCode.includes('aspectRatio: "1200 / 600"'));
      assert.ok(result.requiredPackages.includes("next"));
    });

    it("emits standard React <img loading=\"lazy\"> for Vite / CRA targets", () => {
      const imageElement: Layer = {
        id: "img-2",
        name: "Thumbnail Image",
        archetype: "image",
        properties: {
          src: "https://example.com/thumb.jpg",
          width: 300,
          height: 200,
        },
        children: [],
        parentId: null,
      };

      const result = MediaEmitter.emit(imageElement, {
        framework: "react",
      });

      assert.ok(!result.tsxCode.includes("next/image"));
      assert.ok(result.tsxCode.includes('<img'));
      assert.ok(result.tsxCode.includes('loading="lazy"'));
    });

    it("emits vector <svg> and <path> for Icon archetype", () => {
      const iconElement: Layer = {
        id: "icon-1",
        name: "Checkmark Icon",
        archetype: "icon",
        properties: {
          d: "M5 13l4 4L19 7",
          viewBox: "0 0 24 24",
          size: 20,
        },
        children: [],
        parentId: null,
      };

      const result = MediaEmitter.emit(iconElement);
      assert.ok(result.tsxCode.includes("<svg"));
      assert.ok(result.tsxCode.includes('viewBox="0 0 24 24"'));
      assert.ok(result.tsxCode.includes('d="M5 13l4 4L19 7"'));
    });
  });

  // ==========================================================================
  // SUB-PHASE 6.1 & 6.2: STRUCTURAL EMITTER
  // ==========================================================================
  describe("Sub-Phase 6.2: StructuralEmitter", () => {
    it("emits semantic <hr> for solid Divider", () => {
      const dividerElement: Layer = {
        id: "div-1",
        name: "Section Divider",
        archetype: "divider",
        properties: {
          orientation: "horizontal",
          styleType: "solid",
          thickness: 2,
        },
        children: [],
        parentId: null,
      };

      const result = StructuralEmitter.emit(dividerElement);
      assert.ok(result.tsxCode.includes("<hr"));
      assert.ok(result.tsxCode.includes("aria-orientation={orientation}"));
      assert.ok(result.tsxCode.includes('borderWidth: "2px"'));
    });

    it("emits separator <div> with gradient for gradient Divider", () => {
      const dividerElement: Layer = {
        id: "div-2",
        name: "Glow Divider",
        archetype: "divider",
        properties: {
          styleType: "gradient",
          thickness: 1,
        },
        children: [],
        parentId: null,
      };

      const result = StructuralEmitter.emit(dividerElement);
      assert.ok(result.tsxCode.includes('role="separator"'));
      assert.ok(result.tsxCode.includes("bg-gradient-to-r"));
    });

    it("emits backdrop container for Background Layer archetype", () => {
      const bgElement: Layer = {
        id: "bg-1",
        name: "Ambient Backdrop",
        archetype: "background",
        properties: {
          blendMode: "overlay",
        },
        children: [],
        parentId: null,
      };

      const result = StructuralEmitter.emit(bgElement);
      assert.ok(result.tsxCode.includes('aria-hidden="true"'));
      assert.ok(result.tsxCode.includes('mixBlendMode: "overlay"'));
    });
  });

  // ==========================================================================
  // SUB-PHASE 6.1 & 6.2: TEXT EMITTER
  // ==========================================================================
  describe("Sub-Phase 6.2: TextEmitter", () => {
    it("infers <h1> tag for large font size >= 32px", () => {
      const headingElement: Layer = {
        id: "txt-1",
        name: "Main Title",
        archetype: "text",
        properties: {
          content: "Welcome to LazyLayout",
          fontSize: 36,
        },
        children: [],
        parentId: null,
      };

      const result = TextEmitter.emit(headingElement);
      assert.ok(result.tsxCode.includes("<h1"));
      assert.ok(result.tsxCode.includes("Welcome to LazyLayout"));
      assert.ok(result.tsxCode.includes("text-4xl font-bold"));
    });

    it("infers <p> tag for standard body font size", () => {
      const pElement: Layer = {
        id: "txt-2",
        name: "Body Text",
        archetype: "text",
        properties: {
          content: "This is production-ready text.",
          fontSize: 16,
        },
        children: [],
        parentId: null,
      };

      const result = TextEmitter.emit(pElement);
      assert.ok(result.tsxCode.includes("<p"));
      assert.ok(result.tsxCode.includes("This is production-ready text."));
    });

    it("generates character/word tokens for SplitText stagger reveals", () => {
      const splitElement: Layer = {
        id: "txt-3",
        name: "Hero Reveal Heading",
        archetype: "text",
        properties: {
          content: "Hello World",
          fontSize: 32,
        },
        children: [],
        parentId: null,
      };

      const resultWords = TextEmitter.emit(splitElement, { splitTextMode: "words" });
      assert.ok(resultWords.tsxCode.includes('text.split(" ").map'));

      const resultChars = TextEmitter.emit(splitElement, { splitTextMode: "chars" });
      assert.ok(resultChars.tsxCode.includes('text.split("").map'));
    });
  });

  // ==========================================================================
  // VERIFICATION GATE (PHASE 6): ALL 4 ARCHETYPE FAMILIES
  // ==========================================================================
  describe("Phase 6 Verification Gate: All 4 Element Families", () => {
    it("verifies clean drop-in output for Button, Image, Divider, Background, and Text", () => {
      const elements: Layer[] = [
        { id: "e1", name: "Primary Button", archetype: "button", properties: { label: "Submit" }, parentId: null, children: [] },
        { id: "e2", name: "Featured Image", archetype: "image", properties: { src: "/img.jpg" }, parentId: null, children: [] },
        { id: "e3", name: "Thin Divider", archetype: "divider", properties: { thickness: 1 }, parentId: null, children: [] },
        { id: "e4", name: "Dark Background", archetype: "background", properties: {}, parentId: null, children: [] },
        { id: "e5", name: "Section Title", archetype: "text", properties: { content: "Header", fontSize: 28 }, parentId: null, children: [] },
      ];

      for (const el of elements) {
        let res;
        if (el.archetype === "button") res = InteractiveEmitter.emit(el);
        else if (el.archetype === "image") res = MediaEmitter.emit(el);
        else if (el.archetype === "divider" || el.archetype === "background") res = StructuralEmitter.emit(el);
        else res = TextEmitter.emit(el);

        // Guarantees
        assert.ok(res.componentName.length > 0);
        assert.ok(res.tsxCode.startsWith('"use client";'));
        assert.ok(res.tsxCode.includes(`export const ${res.componentName}`));
        assert.ok(res.tsxCode.includes(`export default ${res.componentName}`));
        assert.ok(!res.tsxCode.includes("@/core/store")); // Zero engine leaks
        assert.ok(!res.tsxCode.includes("@/core/engine"));
      }
    });
  });
});
