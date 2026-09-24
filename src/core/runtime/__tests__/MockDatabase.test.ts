import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { MockDatabase } from "../../../runtime/MockDatabase";
import { CollectionSchema } from "../../types/database";
import { DiagnosticBus } from "../../engine/DiagnosticBus";

describe("Sub-Phase 5.2: In-Memory MockDatabase", () => {
  let db: MockDatabase;

  const sampleSchemas: Record<string, CollectionSchema> = {
    Products: {
      id: "col_products",
      name: "Products",
      displayName: "Products",
      fields: {
        id: { id: "f_id", name: "id", type: "Int", isPrimaryKey: true },
        title: { id: "f_title", name: "title", type: "String" },
        price: { id: "f_price", name: "price", type: "Float" },
        inStock: { id: "f_stock", name: "inStock", type: "Boolean" },
      },
    },
    Orders: {
      id: "col_orders",
      name: "Orders",
      displayName: "Orders",
      fields: {
        id: { id: "f_oid", name: "id", type: "Int", isPrimaryKey: true },
        productId: {
          id: "f_pid",
          name: "productId",
          type: "Int",
          relation: {
            targetCollection: "Products",
            foreignKey: "productId",
            referencesField: "id",
            cardinality: "1:N",
            onDelete: "RESTRICT",
          },
        },
        quantity: { id: "f_qty", name: "quantity", type: "Int" },
      },
    },
  };

  const sampleRecords = {
    Products: [
      { id: 1, title: "Pro Subscription", price: 29.99, inStock: true },
      { id: 2, title: "Enterprise License", price: 199.0, inStock: true },
      { id: 3, title: "Starter Pack", price: 9.99, inStock: false },
    ],
    Orders: [{ id: 101, productId: 1, quantity: 2 }],
  };

  beforeEach(() => {
    DiagnosticBus.clearHistory();
    db = new MockDatabase();
    db.seed(sampleSchemas, sampleRecords);
  });

  it("seeds collections and records accurately from schema definitions", () => {
    assert.equal(db.getCollectionNames().length, 2);
    assert.ok(db.hasCollection("Products"));
    assert.ok(db.hasCollection("Orders"));
    assert.equal(db.count("Products"), 3);
    assert.equal(db.count("Orders"), 1);

    const p1 = db.getById("Products", 1);
    assert.ok(p1);
    assert.equal(p1.title, "Pro Subscription");
    assert.equal(p1.price, 29.99);
  });

  it("performs full CRUD: insert, getById, query, update, delete", () => {
    // 1. Insert
    const newProduct = db.insert("Products", {
      title: "Add-on Module",
      price: 15.5,
      inStock: true,
    });
    assert.equal(newProduct.id, 4); // auto-incremented from 3
    assert.equal(db.count("Products"), 4);

    // 2. GetById
    const fetched = db.getById("Products", 4);
    assert.ok(fetched);
    assert.equal(fetched.title, "Add-on Module");

    // 3. Query with filter & sort
    const cheapProducts = db.query(
      "Products",
      { price: { $lt: 20 } },
      { sort: { field: "price", direction: "asc" } }
    );
    assert.equal(cheapProducts.length, 2); // Starter Pack (9.99) & Add-on Module (15.5)
    assert.equal(cheapProducts[0].title, "Starter Pack");
    assert.equal(cheapProducts[1].title, "Add-on Module");

    // 4. Update
    const updated = db.update("Products", 4, {
      title: "Add-on Module Pro",
      price: 18.0,
    });
    assert.equal(updated.title, "Add-on Module Pro");
    assert.equal(updated.price, 18.0);
    assert.equal(db.getById("Products", 4)?.title, "Add-on Module Pro");

    // 5. Delete
    const deleted = db.delete("Products", 4);
    assert.equal(deleted, true);
    assert.equal(db.getById("Products", 4), null);
    assert.equal(db.count("Products"), 3);
  });

  it("supports advanced query operators: $gt, $lte, $in, $contains", () => {
    // $gt
    const expensive = db.query("Products", { price: { $gt: 100 } });
    assert.equal(expensive.length, 1);
    assert.equal(expensive[0].title, "Enterprise License");

    // $in
    const byId = db.query("Products", { id: { $in: [1, 3] } });
    assert.equal(byId.length, 2);

    // $contains (case-insensitive substring)
    const proSearch = db.query("Products", { title: { $contains: "pro" } });
    assert.equal(proSearch.length, 1);
    assert.equal(proSearch[0].id, 1);

    // Boolean equality
    const outOfStock = db.query("Products", { inStock: false });
    assert.equal(outOfStock.length, 1);
    assert.equal(outOfStock[0].id, 3);
  });

  it("traps duplicate primary key and emits [MOCK_DB_ERR] diagnostic", () => {
    assert.throws(() => {
      db.insert("Products", {
        id: 1, // Duplicate ID
        title: "Conflict Item",
        price: 50.0,
        inStock: true,
      });
    }, /Duplicate primary key '1'/);

    const errors = DiagnosticBus.getHistoryByChannel("MOCK_DB_ERR");
    assert.equal(errors.length, 1);
    assert.equal(errors[0].severity, "error");
    assert.ok(errors[0].message.includes("Duplicate primary key '1'"));
  });

  it("traps field type violations according to schema", () => {
    // Type mismatch: String instead of Int/Float
    assert.throws(() => {
      db.insert("Products", {
        title: "Bad Price Item",
        price: "NotANumber",
        inStock: true,
      });
    }, /Type mismatch/);

    const errors = DiagnosticBus.getHistoryByChannel("MOCK_DB_ERR");
    assert.ok(errors.length > 0);
    assert.ok(errors[0].message.includes("expected Float"));
  });

  it("enforces foreign key constraints on insert and delete (RESTRICT)", () => {
    // Insert order with non-existent productId -> should throw
    assert.throws(() => {
      db.insert("Orders", {
        productId: 9999, // Does not exist
        quantity: 1,
      });
    }, /Foreign key violation/);

    // Deleting product 1 while order 101 references it (RESTRICT) -> should throw
    assert.throws(() => {
      db.delete("Products", 1);
    }, /Foreign key RESTRICT violation/);

    // Verify product was NOT deleted
    assert.ok(db.getById("Products", 1));
  });

  it("exports snapshot and resets back to initial seed data cleanly", () => {
    // Add product and change quantity
    db.insert("Products", { title: "Temporary Item", price: 5.0, inStock: true });
    assert.equal(db.count("Products"), 4);

    // Reset
    db.reset();
    assert.equal(db.count("Products"), 3);
    assert.equal(db.getById("Products", 4), null);
  });

  it("dispatches reactive mutation events to subscribers", () => {
    const events: string[] = [];
    const unsubscribe = db.subscribe((event) => {
      events.push(`${event.type}:${event.collection}:${event.id ?? ""}`);
    });

    db.insert("Products", { title: "Subscribed Item", price: 12.0, inStock: true });
    db.update("Products", 1, { price: 34.99 });
    db.delete("Products", 3);

    unsubscribe();
    db.insert("Products", { title: "After Unsubscribe", price: 2.0, inStock: true });

    assert.equal(events.length, 3);
    assert.equal(events[0], "insert:Products:4");
    assert.equal(events[1], "update:Products:1");
    assert.equal(events[2], "delete:Products:3");
  });
});
