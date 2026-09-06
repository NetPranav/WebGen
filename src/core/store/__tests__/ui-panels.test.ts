import test from "node:test";
import assert from "node:assert/strict";
import { useProjectStore } from "../useProjectStore";
import { ConnectionPipeline } from "../../engine/ConnectionPipeline";
import { AnimationValidator } from "../../engine/AnimationValidator";
import { DatabaseValidator } from "../../engine/DatabaseValidator";
import { DiagnosticBus } from "../../engine/DiagnosticBus";
import { DataBindingDescriptor } from "../../types/data-binding";
import { DatabaseField } from "../../types/database";
import { AnimationSample } from "../../types/animations";

test("Sub-Phase 2.5: DataBinding Store Integration & ConnectionPipeline live evaluation", () => {
  const store = useProjectStore.getState();

  // Create a binding descriptor for comp_hero: bind 'text' to Products.title
  const titleBinding: DataBindingDescriptor = {
    id: "bind_test_title",
    target: {
      elementId: "comp_hero",
      archetype: "text",
      propertyKey: "text",
    },
    sourceType: "database",
    sourceCollection: "Products",
    sourceField: "title",
    fallbackValue: "Default Title",
  };

  store.registerBinding(titleBinding);

  // Evaluate bindings using current project store data context
  const evalResults = ConnectionPipeline.evaluateAll(store.getDataContext());
  assert.ok(evalResults.get("comp_hero"), "Hero element should be evaluated");
  assert.equal(evalResults.get("comp_hero")?.["text"] as string, "Pro Subscription");

  // Create another binding for comp_hero: bind 'subtitle' to Products.price with currency_usd
  const priceBinding: DataBindingDescriptor = {
    id: "bind_test_price",
    target: {
      elementId: "comp_hero",
      archetype: "text",
      propertyKey: "subtitle",
    },
    sourceType: "database",
    sourceCollection: "Products",
    sourceField: "price",
    fallbackValue: "$0.00",
    transformFn: "currency_usd",
  };

  store.registerBinding(priceBinding);
  const evalPrice = ConnectionPipeline.evaluateElementProperties("comp_hero", store.getDataContext());
  assert.equal(evalPrice.properties["subtitle"] as string, "$29.99");

  // Inside-Out Live Propagation: Update mock database record in store (record index 0 is first product)
  store.updateDatabaseRecord("Products", 0, { price: 349.5 });
  const updatedProps = ConnectionPipeline.evaluateElementProperties("comp_hero", store.getDataContext());
  assert.equal(updatedProps.properties["subtitle"] as string, "$349.50", "Live database record update must reflect in element properties");
});

test("Sub-Phase 2.5: Animation Editor Keyframe & Bezier validation", () => {
  DiagnosticBus.clearHistory();

  // Test valid animation track on Button
  const validButtonAnimation: AnimationSample = {
    id: "anim_btn_hover",
    name: "ButtonHoverPulse",
    duration: 300,
    easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    iterations: 1,
    direction: "normal",
    fillMode: "forwards",
    tracks: [
      {
        trackId: "opacity",
        keyframes: [
          { offset: 0, value: 1 },
          { offset: 100, value: 0.85, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
        ],
      },
      {
        trackId: "scale",
        keyframes: [
          { offset: 0, value: 1 },
          { offset: 100, value: 1.05, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
        ],
      },
    ],
  };

  const validation = AnimationValidator.validateSampleForElement(
    validButtonAnimation,
    {
      elementId: "comp_button",
      elementName: "CTAButton",
      archetype: "button",
    }
  );
  assert.equal(validation.isValid, true, "Valid button animation tracks should pass validation");
  assert.equal(validation.allowedTracks.length, 2);
  assert.equal(validation.rejectedTracks.length, 0);

  // Incompatible property test: letterSpacing on Image
  const invalidImageAnimation: AnimationSample = {
    id: "anim_img_bad",
    name: "InvalidImageAnimation",
    duration: 500,
    easing: "ease",
    iterations: 1,
    direction: "normal",
    fillMode: "forwards",
    tracks: [
      {
        trackId: "letterSpacing",
        keyframes: [
          { offset: 0, value: 0 },
          { offset: 100, value: 10 },
        ],
      },
    ],
  };

  const badValidation = AnimationValidator.validateSampleForElement(
    invalidImageAnimation,
    {
      elementId: "comp_logo",
      elementName: "BrandLogo",
      archetype: "image",
    }
  );
  assert.equal(badValidation.isValid, false, "letterSpacing on Image should fail validation");
  assert.equal(badValidation.rejectedTracks.length, 1);
});

test("Sub-Phase 2.5: Database Designer Schema & Collection Store mutations", () => {
  const store = useProjectStore.getState();

  // Add new field to Products collection
  const ratingField: DatabaseField = {
    id: "fld_rating",
    name: "rating",
    type: "Float",
    isNullable: false,
    defaultValue: 5.0,
  };

  store.addFieldToCollection("Products", ratingField);

  const updatedSchema = useProjectStore.getState().databaseSchemas["Products"];
  assert.ok(updatedSchema.fields["rating"], "Rating field should exist in Products schema");
  assert.equal(updatedSchema.fields["rating"].type, "Float");

  // Validate the schema
  const schemaValidation = DatabaseValidator.validateSchema(updatedSchema);
  assert.equal(schemaValidation.isValid, true, "Updated schema should pass validation");

  // Delete field from collection
  store.deleteFieldFromCollection("Products", "rating");
  assert.equal(useProjectStore.getState().databaseSchemas["Products"].fields["rating"], undefined, "Rating field should be removed");
});
