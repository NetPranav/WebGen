import test from "node:test";
import assert from "node:assert/strict";
import {
  CollectionSchema,
  DatabaseField,
  getFieldCategory,
} from "../../types/database";
import { DatabaseValidator } from "../DatabaseValidator";
import { DiagnosticBus } from "../DiagnosticBus";
import { DiagnosticEvent } from "../../types/diagnostics";

test("Database Property Categories: Resolves correct category for field types", () => {
  const strField: DatabaseField = { id: "f1", name: "title", type: "String" };
  const numField: DatabaseField = { id: "f2", name: "price", type: "Float" };
  const boolField: DatabaseField = { id: "f3", name: "isPublished", type: "Boolean" };
  const dateField: DatabaseField = { id: "f4", name: "createdAt", type: "DateTime" };
  const mediaField: DatabaseField = { id: "f5", name: "heroImageUrl", type: "String" };
  const jsonField: DatabaseField = { id: "f6", name: "config", type: "JSON" };
  const relField: DatabaseField = { id: "f7", name: "orderItems", type: "Relation" };

  assert.equal(getFieldCategory(strField), "TEXTUAL_SCALAR");
  assert.equal(getFieldCategory(numField), "NUMERIC");
  assert.equal(getFieldCategory(boolField), "BOOLEAN_FLAG");
  assert.equal(getFieldCategory(dateField), "TEMPORAL");
  assert.equal(getFieldCategory(mediaField), "MEDIA_URL");
  assert.equal(getFieldCategory(jsonField), "STRUCTURED_DOCUMENT");
  assert.equal(getFieldCategory(relField), "RELATIONAL_COLLECTION");
});

test("DatabaseValidator.validateSchema: Valid schema with PK passes", () => {
  DiagnosticBus.clearHistory();

  const userSchema: CollectionSchema = {
    id: "col_users",
    name: "User",
    displayName: "Users",
    fields: {
      id: { id: "f_id", name: "id", type: "Int", isPrimaryKey: true },
      email: { id: "f_email", name: "email", type: "String", isUnique: true },
    },
  };

  const res = DatabaseValidator.validateSchema(userSchema, [userSchema]);
  assert.equal(res.isValid, true);
  assert.equal(res.errors.length, 0);
});

test("DatabaseValidator.validateSchema: Missing PK is trapped and dispatches [DB_SCHEMA_ERR]", () => {
  DiagnosticBus.clearHistory();

  const invalidSchema: CollectionSchema = {
    id: "col_invalid",
    name: "InvalidTable",
    displayName: "Invalid Table",
    fields: {
      title: { id: "f_title", name: "title", type: "String" },
    },
  };

  const res = DatabaseValidator.validateSchema(invalidSchema, [invalidSchema]);
  assert.equal(res.isValid, false);
  assert.equal(res.errors.length, 1);
  assert.match(res.errors[0], /does not declare a Primary Key/);

  const history = DiagnosticBus.getHistoryByChannel("DB_SCHEMA_ERR");
  assert.equal(history.length, 1);
  assert.equal(history[0].channel, "DB_SCHEMA_ERR");
  assert.equal(history[0].severity, "error");
});

test("DatabaseValidator.validatePropertyBinding: Compatible bindings pass without errors", () => {
  DiagnosticBus.clearHistory();

  // 1. Text element -> String field
  const textRes = DatabaseValidator.validatePropertyBinding({
    elementId: "txt_01",
    elementName: "Heading",
    archetype: "text",
    propertyKey: "textContent",
    sourceField: { id: "f1", name: "productName", type: "String" },
    sourceCollectionName: "Products",
  });
  assert.equal(textRes.isValid, true);

  // 2. Button element -> Boolean field (for disabled property)
  const btnDisabledRes = DatabaseValidator.validatePropertyBinding({
    elementId: "btn_01",
    elementName: "SubmitBtn",
    archetype: "button",
    propertyKey: "disabled",
    sourceField: { id: "f2", name: "isOutOfStock", type: "Boolean" },
    sourceCollectionName: "Products",
  });
  assert.equal(btnDisabledRes.isValid, true);

  // 3. Image element -> Media URL field
  const imgRes = DatabaseValidator.validatePropertyBinding({
    elementId: "img_01",
    elementName: "Thumbnail",
    archetype: "image",
    propertyKey: "src",
    sourceField: { id: "f3", name: "coverImageUrl", type: "String" },
    sourceCollectionName: "Articles",
  });
  assert.equal(imgRes.isValid, true);

  // No errors emitted to DiagnosticBus
  assert.equal(DiagnosticBus.getHistoryByChannel("BIND_ERR").length, 0);
});

test("DatabaseValidator.validatePropertyBinding: Incompatible bindings are trapped, logged, and return safe fallback", () => {
  DiagnosticBus.clearHistory();
  const capturedEvents: DiagnosticEvent[] = [];
  const unsubscribe = DiagnosticBus.subscribeChannel("BIND_ERR", (ev) => {
    capturedEvents.push(ev);
  });

  // 1. Illegal: Binding Relation collection array to Button label
  const btnIllegal = DatabaseValidator.validatePropertyBinding({
    elementId: "btn_checkout",
    elementName: "CheckoutBtn",
    archetype: "button",
    propertyKey: "label",
    sourceField: { id: "f_items", name: "orderItems", type: "Relation" },
    sourceCollectionName: "Orders",
  });

  assert.equal(btnIllegal.isValid, false);
  assert.equal(btnIllegal.fallbackValue, "Button");
  assert.match(btnIllegal.error!, /Incompatible Binding/);

  // 2. Illegal: Binding Numeric price to Image src
  const imgIllegal = DatabaseValidator.validatePropertyBinding({
    elementId: "img_hero",
    elementName: "HeroImg",
    archetype: "image",
    propertyKey: "src",
    sourceField: { id: "f_price", name: "price", type: "Float" },
    sourceCollectionName: "Products",
  });

  assert.equal(imgIllegal.isValid, false);
  assert.equal(imgIllegal.fallbackValue, "/placeholder.png");

  // 3. Illegal: Binding String title to Checkbox checked property
  const toggleIllegal = DatabaseValidator.validatePropertyBinding({
    elementId: "chk_active",
    elementName: "ActiveToggle",
    archetype: "input",
    propertyKey: "disabled",
    sourceField: { id: "f_desc", name: "description", type: "String" },
    sourceCollectionName: "Products",
  });

  assert.equal(toggleIllegal.isValid, false);
  assert.equal(toggleIllegal.fallbackValue, false);

  unsubscribe();

  // Verify that DiagnosticBus captured all 3 errors with full context
  assert.equal(capturedEvents.length, 3);
  assert.equal(capturedEvents[0].channel, "BIND_ERR");
  assert.equal(capturedEvents[0].source.entityName, "CheckoutBtn");
  assert.equal(capturedEvents[0].source.propertyKey, "label");
  assert.equal(capturedEvents[1].source.entityName, "HeroImg");
  assert.equal(capturedEvents[1].source.propertyKey, "src");
});
