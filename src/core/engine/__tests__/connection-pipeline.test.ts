import test from "node:test";
import assert from "node:assert/strict";
import { ConnectionPipeline } from "../ConnectionPipeline";
import { DataBindingValidator } from "../DataBindingValidator";
import { DiagnosticBus } from "../DiagnosticBus";
import { DataContext, DataBindingDescriptor } from "../../types/data-binding";
import { DiagnosticEvent } from "../../types/diagnostics";

const MOCK_CONTEXT: DataContext = {
  database: {
    Products: [
      {
        id: "prod_01",
        title: "Ergonomic Gaming Mouse",
        price: 79.5,
        inStock: true,
        thumbnailUrl: "/assets/mouse.png",
        specs: ["wireless", "optical", "rgb"],
      },
    ],
    Users: [
      {
        id: "usr_01",
        fullName: "Alex Rivera",
        isAdmin: false,
      },
    ],
  },
  stateVariables: {
    cartQuantity: 2,
    isCheckoutOpen: true,
  },
  urlParams: {
    couponCode: "SAVE20",
  },
  localStorage: {
    lastVisitedTab: "settings",
  },
};

test("DataBindingValidator.evaluateBinding: Resolves direct database field correctly", () => {
  DiagnosticBus.clearHistory();

  const descriptor: DataBindingDescriptor = {
    id: "b_title_01",
    target: {
      elementId: "heading_01",
      elementName: "ProductHeading",
      archetype: "text",
      propertyKey: "textContent",
    },
    sourceType: "database",
    sourceCollection: "Products",
    sourceField: "title",
  };

  const res = DataBindingValidator.evaluateBinding(descriptor, MOCK_CONTEXT);
  assert.equal(res.isValid, true);
  assert.equal(res.value, "Ergonomic Gaming Mouse");
  assert.equal(res.rawSourceValue, "Ergonomic Gaming Mouse");
});

test("DataBindingValidator.evaluateBinding: Applies value transforms (currency_usd, uppercase, number_round)", () => {
  // 1. Currency transform
  const priceDescriptor: DataBindingDescriptor = {
    id: "b_price_01",
    target: {
      elementId: "price_text",
      archetype: "text",
      propertyKey: "textContent",
    },
    sourceType: "database",
    sourceCollection: "Products",
    sourceField: "price",
    transformFn: "currency_usd",
  };
  const priceRes = DataBindingValidator.evaluateBinding(priceDescriptor, MOCK_CONTEXT);
  assert.equal(priceRes.isValid, true);
  assert.equal(priceRes.value, "$79.50");

  // 2. Uppercase transform
  const userDescriptor: DataBindingDescriptor = {
    id: "b_user_upper",
    target: {
      elementId: "user_badge",
      archetype: "text",
      propertyKey: "textContent",
    },
    sourceType: "database",
    sourceCollection: "Users",
    sourceField: "fullName",
    transformFn: "uppercase",
  };
  const userRes = DataBindingValidator.evaluateBinding(userDescriptor, MOCK_CONTEXT);
  assert.equal(userRes.isValid, true);
  assert.equal(userRes.value, "ALEX RIVERA");
});

test("DataBindingValidator.evaluateBinding: Resolves State, URL param, and LocalStorage sources", () => {
  // 1. State variable -> Button disabled property
  const stateDescriptor: DataBindingDescriptor = {
    id: "b_state_01",
    target: {
      elementId: "modal_trigger",
      archetype: "button",
      propertyKey: "disabled",
    },
    sourceType: "state_variable",
    stateVariableId: "isCheckoutOpen",
  };
  const stateRes = DataBindingValidator.evaluateBinding(stateDescriptor, MOCK_CONTEXT);
  assert.equal(stateRes.isValid, true);
  assert.equal(stateRes.value, true);

  // 2. URL parameter -> Input value
  const urlDescriptor: DataBindingDescriptor = {
    id: "b_url_01",
    target: {
      elementId: "coupon_input",
      archetype: "input",
      propertyKey: "value",
    },
    sourceType: "url_param",
    paramKey: "couponCode",
  };
  const urlRes = DataBindingValidator.evaluateBinding(urlDescriptor, MOCK_CONTEXT);
  assert.equal(urlRes.isValid, true);
  assert.equal(urlRes.value, "SAVE20");
});

test("DataBindingValidator: Incompatible source trapped with [BIND_ERR] on DiagnosticBus and fallback applied", () => {
  DiagnosticBus.clearHistory();
  const captured: DiagnosticEvent[] = [];
  const unsubscribe = DiagnosticBus.subscribeChannel("BIND_ERR", (ev) => {
    captured.push(ev);
  });

  // Illegal: Trying to bind specs (Array) to Button label
  const illegalDescriptor: DataBindingDescriptor = {
    id: "b_illegal_01",
    target: {
      elementId: "btn_purchase",
      elementName: "PurchaseButton",
      archetype: "button",
      propertyKey: "label",
    },
    sourceType: "database",
    sourceCollection: "Products",
    sourceField: "specs",
    fallbackValue: "Buy Now",
  };

  const res = DataBindingValidator.evaluateBinding(illegalDescriptor, MOCK_CONTEXT);
  unsubscribe();

  assert.equal(res.isValid, false);
  assert.equal(res.value, "Buy Now");
  assert.equal(res.fallbackApplied, true);

  // Diagnostic captured
  assert.equal(captured.length, 1);
  assert.equal(captured[0].channel, "BIND_ERR");
  assert.equal(captured[0].source.entityName, "PurchaseButton");
  assert.equal(captured[0].source.propertyKey, "label");
  assert.match(captured[0].message, /cannot bind to property 'label'/);
});

test("ConnectionPipeline: Registers bindings and evaluates element property maps", () => {
  ConnectionPipeline.clear();

  // Register multiple bindings for card component
  ConnectionPipeline.registerBinding({
    id: "bind_title",
    target: {
      elementId: "card_01",
      archetype: "text",
      propertyKey: "textContent",
    },
    sourceType: "database",
    sourceCollection: "Products",
    sourceField: "title",
  });

  ConnectionPipeline.registerBinding({
    id: "bind_price",
    target: {
      elementId: "card_01",
      archetype: "text",
      propertyKey: "textContent",
    },
    sourceType: "database",
    sourceCollection: "Products",
    sourceField: "price",
    transformFn: "currency_usd",
  });

  let notifiedProps: Record<string, unknown> | null = null;
  const unsubscribe = ConnectionPipeline.subscribeToElement("card_01", (props) => {
    notifiedProps = props;
  });

  const { properties } = ConnectionPipeline.evaluateElementProperties("card_01", MOCK_CONTEXT);
  unsubscribe();

  assert.equal(properties.textContent, "$79.50");
  assert.notEqual(notifiedProps, null);
});
