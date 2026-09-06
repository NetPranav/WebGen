import test from "node:test";
import assert from "node:assert/strict";
import { useProjectStore } from "../useProjectStore";
import { DatabaseValidator } from "../../engine/DatabaseValidator";
import { CollectionSchema, DatabaseField } from "../../types/database";

test("Database Studio: Schema creation, relational foreign keys, and validation", () => {
  const store = useProjectStore.getState();

  // 1. Create a new collection 'Orders' with a Foreign Key to 'Users'
  const ordersSchema: CollectionSchema = {
    id: "col_orders",
    name: "Orders",
    displayName: "Customer Orders",
    fields: {
      id: {
        id: "fld_order_id",
        name: "id",
        type: "Int",
        isPrimaryKey: true,
        isNullable: false,
        isUnique: true,
      },
      userId: {
        id: "fld_user_id",
        name: "userId",
        type: "Int",
        isNullable: false,
        relation: {
          targetCollection: "Users",
          foreignKey: "userId",
          referencesField: "id",
          cardinality: "1:N",
          onDelete: "CASCADE",
        },
      },
      totalAmount: {
        id: "fld_total_amount",
        name: "totalAmount",
        type: "Float",
        isNullable: false,
        defaultValue: 0.0,
      },
    },
  };

  store.addDatabaseCollection(ordersSchema);

  // Verify the collection exists in store
  const state = useProjectStore.getState();
  assert.ok(state.databaseSchemas["Orders"], "Orders collection should exist in store");
  assert.equal(state.databaseSchemas["Orders"].fields["userId"].relation?.targetCollection, "Users");

  // Validate the schema with DatabaseValidator
  const allSchemas = Object.values(state.databaseSchemas);
  const validation = DatabaseValidator.validateSchema(ordersSchema, allSchemas);
  assert.equal(validation.isValid, true, "Orders schema with FK to Users should validate cleanly");

  // 2. Add a new column to Orders
  const statusField: DatabaseField = {
    id: "fld_status",
    name: "status",
    type: "String",
    isNullable: false,
    defaultValue: "pending",
  };
  store.addFieldToCollection("Orders", statusField);
  assert.ok(useProjectStore.getState().databaseSchemas["Orders"].fields["status"]);

  // 3. Add a mock record
  store.addDatabaseRecord("Orders", { id: 101, userId: 1, totalAmount: 49.99, status: "completed" });
  assert.equal(useProjectStore.getState().databaseRecords["Orders"].length, 1);
  assert.equal(useProjectStore.getState().databaseRecords["Orders"][0]["totalAmount"], 49.99);

  // 4. Delete the collection
  store.deleteDatabaseCollection("Orders");
  assert.equal(useProjectStore.getState().databaseSchemas["Orders"], undefined, "Orders collection should be deleted");
});
