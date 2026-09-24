import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { useProjectStore } from "../../store/useProjectStore";
import { ComponentGenerator } from "../../../ai/component/ComponentGenerator";
import { multiEngineAnimationRuntime } from "../../runtime/MultiEngineAnimationRuntime";
import { CrossFrameworkExporter } from "../../../compiler/export/CrossFrameworkExporter";
import { AnimationSample } from "../../types/animations";

describe("ComponentAnimationHandoff: AI Creation to Full Animation & Export Loop", () => {
  it("clears to blank canvas, generates a pricing card, attaches motion, and compiles timelines", () => {
    // 1. Clear to pristine blank canvas
    useProjectStore.getState().clearToBlankCanvas();
    const blankState = useProjectStore.getState();
    const blankRoot = blankState.elements[blankState.pages[blankState.activePageId].rootElementId];
    assert.equal(blankRoot.children.length, 0);

    // 2. Synthesize a complete pricing card from prompt
    const prompt = "Create a modern dark mode pricing card with badge, price, and subscribe button";
    const generated = ComponentGenerator.generateComponent(prompt);
    assert.equal(generated.name, "Pricing Card");
    assert.ok(generated.elements.length >= 6);

    // 3. Insert generated component into store
    useProjectStore.getState().insertGeneratedComponent(generated.elements, generated.rootId);
    const updatedState = useProjectStore.getState();
    const updatedRoot = updatedState.elements[updatedState.pages[updatedState.activePageId].rootElementId];
    assert.ok(updatedRoot.children.includes(generated.rootId));
    assert.ok(updatedState.elements[generated.rootId]);

    // 4. Find the button and card elements
    const buttonElement = generated.elements.find((e) => e.archetype === "button");
    const containerElement = generated.elements.find((e) => e.archetype === "container");
    assert.ok(buttonElement);
    assert.ok(containerElement);

    // 5. Author motion tracks on button (elastic tap scale)
    const buttonSample: AnimationSample = {
      id: "sample_btn_elastic",
      name: "Elastic Button Tap",
      duration: 600,
      easing: "power2.out",
      iterations: 1,
      direction: "normal",
      fillMode: "forwards",
      tracks: [
        {
          trackId: "scale",
          keyframes: [
            { offset: 0, value: 1, easing: "power2.out" },
            { offset: 40, value: 0.94, easing: "power2.inOut" },
            { offset: 100, value: 1, easing: "elastic.out(1, 0.3)" },
          ],
        },
      ],
    };

    const timelineCode = multiEngineAnimationRuntime.compileGsapTimeline(buttonSample, {
      componentSelector: `#${buttonElement.id}`,
    });

    assert.ok(timelineCode.length > 0);
    assert.ok(timelineCode.includes("gsap.timeline"));
    assert.ok(timelineCode.includes(`#${buttonElement.id}`));
    assert.ok(timelineCode.includes("scale"));

    // 6. Export the component across all 4 frameworks cleanly
    const frameworks = ["nextjs-app", "react-vite", "vue", "vanilla"] as const;
    for (const fw of frameworks) {
      const exportResult = CrossFrameworkExporter.exportElement(buttonElement, fw, "tailwind");
      assert.equal(exportResult.framework, fw);
      assert.ok(exportResult.files.length > 0);
      for (const file of exportResult.files) {
        assert.ok(!file.content.includes("@/core/store"), `Leak in ${file.filename}`);
        assert.ok(!file.content.includes("@/core/engine"), `Leak in ${file.filename}`);
      }
    }

    // 7. Stash & Mount verification: Mount Showcase Demo
    useProjectStore.getState().mountDemoProject();
    const showcaseState = useProjectStore.getState();
    assert.ok(showcaseState.elements["el_hero_heading"]);
    assert.ok(showcaseState.elements["el_buy_button"]);
    assert.ok(showcaseState.databaseSchemas["Products"]);

    // 8. Clear back to blank canvas
    useProjectStore.getState().clearToBlankCanvas();
    const clearedState = useProjectStore.getState();
    const clearedRoot = clearedState.elements[clearedState.pages[clearedState.activePageId].rootElementId];
    assert.equal(clearedRoot.children.length, 0);
    assert.equal(Object.keys(clearedState.databaseSchemas).length, 0);
  });
});
