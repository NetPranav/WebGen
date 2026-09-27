"use client";

/**
 * ============================================================================
 * AFTER-TRACK: DATABASE ACTIONS (ROADMAP Sub-Phase 41.1)
 * ============================================================================
 * `databaseSchemas`/`databaseRecords`/`databaseLatches` stay plain
 * (empty-by-default) fields on `useProjectStore` — `getDataContext()` and the
 * Initial-edition property-binding UI (`DataBindingEditor.tsx`) read them in
 * every edition. Only the *mutation* actions are After-track: importing this
 * module attaches them to the live store. It is imported exactly once, as a
 * side effect, from `src/editor/shell/afterTrackPanels.tsx`'s
 * `edition === "full"` branch — never imported anywhere reachable from the
 * Initial edition, so it (and everything it pulls in) is absent from an
 * `edition=initial` production bundle (verified the same way panels are, see
 * `scripts/check-bundle-scope.mts`).
 * ============================================================================
 */

import { recordProjectChange, useProjectStore } from "@/core/store/useProjectStore";
import { ConnectionPipeline } from "@/core/engine/ConnectionPipeline";
import { EventBus } from "@/core/events/EventBus";

// The Full edition's demo seed data (moved verbatim off `INITIAL_PROJECT_STATE`).
useProjectStore.setState({
  databaseSchemas: {
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
  },
  databaseRecords: {
    Products: [
      { id: 1, title: "Pro Subscription", price: 29.99, inStock: true },
      { id: 2, title: "Enterprise License", price: 199.0, inStock: true },
    ],
  },
});

useProjectStore.setState({
  addDatabaseCollection: (schema, actionLabel) => {
    const snapshot = useProjectStore.getState().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    useProjectStore.setState((state) => ({
      databaseSchemas: {
        ...state.databaseSchemas,
        [schema.name]: schema,
      },
    }));

    EventBus.emit("database:updated", { collectionName: schema.name });
  },

  deleteDatabaseCollection: (collectionName, actionLabel) => {
    const snapshot = useProjectStore.getState().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    useProjectStore.setState((state) => {
      const schemas = { ...state.databaseSchemas };
      delete schemas[collectionName];
      const records = { ...state.databaseRecords };
      delete records[collectionName];
      return { databaseSchemas: schemas, databaseRecords: records };
    });

    EventBus.emit("database:updated", { collectionName });
  },

  addFieldToCollection: (collectionName, field, actionLabel) => {
    const snapshot = useProjectStore.getState().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    useProjectStore.setState((state) => {
      const schema = state.databaseSchemas[collectionName];
      if (!schema) return state;

      return {
        databaseSchemas: {
          ...state.databaseSchemas,
          [collectionName]: {
            ...schema,
            fields: {
              ...schema.fields,
              [field.name]: field,
            },
          },
        },
      };
    });

    EventBus.emit("database:updated", { collectionName });
  },

  deleteFieldFromCollection: (collectionName, fieldName, actionLabel) => {
    const snapshot = useProjectStore.getState().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    useProjectStore.setState((state) => {
      const schema = state.databaseSchemas[collectionName];
      if (!schema) return state;

      const fields = { ...schema.fields };
      delete fields[fieldName];

      return {
        databaseSchemas: {
          ...state.databaseSchemas,
          [collectionName]: {
            ...schema,
            fields,
          },
        },
      };
    });

    EventBus.emit("database:updated", { collectionName });
  },

  addDatabaseRecord: (collectionName, record, actionLabel) => {
    const snapshot = useProjectStore.getState().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    useProjectStore.setState((state) => {
      const existing = state.databaseRecords[collectionName] || [];
      return {
        databaseRecords: {
          ...state.databaseRecords,
          [collectionName]: [...existing, record],
        },
      };
    });

    EventBus.emit("database:updated", { collectionName });

    // Trigger reactive evaluation
    const ctx = useProjectStore.getState().getDataContext();
    ConnectionPipeline.evaluateAll(ctx);
  },

  updateDatabaseRecord: (collectionName, recordIndex, updatedFields, actionLabel) => {
    const snapshot = useProjectStore.getState().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    useProjectStore.setState((state) => {
      const existing = [...(state.databaseRecords[collectionName] || [])];
      if (!existing[recordIndex]) return state;

      existing[recordIndex] = {
        ...existing[recordIndex],
        ...updatedFields,
      };

      return {
        databaseRecords: {
          ...state.databaseRecords,
          [collectionName]: existing,
        },
      };
    });

    EventBus.emit("database:updated", { collectionName });

    // Trigger reactive evaluation
    const ctx = useProjectStore.getState().getDataContext();
    ConnectionPipeline.evaluateAll(ctx);
  },

  deleteDatabaseRecord: (collectionName, recordIndex, actionLabel) => {
    const snapshot = useProjectStore.getState().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    useProjectStore.setState((state) => {
      const existing = [...(state.databaseRecords[collectionName] || [])];
      existing.splice(recordIndex, 1);

      return {
        databaseRecords: {
          ...state.databaseRecords,
          [collectionName]: existing,
        },
      };
    });

    EventBus.emit("database:updated", { collectionName });

    // Trigger reactive evaluation
    const ctx = useProjectStore.getState().getDataContext();
    ConnectionPipeline.evaluateAll(ctx);
  },

  addDatabaseLatch: (latch, actionLabel) => {
    const snapshot = useProjectStore.getState().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    useProjectStore.setState((state) => ({
      databaseLatches: {
        ...state.databaseLatches,
        [latch.targetKey]: [...(state.databaseLatches[latch.targetKey] || []), latch],
      },
    }));
    EventBus.emit("database:latched", { targetKey: latch.targetKey, latch });
  },

  removeDatabaseLatch: (targetKey, latchId, actionLabel) => {
    const snapshot = useProjectStore.getState().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    useProjectStore.setState((state) => ({
      databaseLatches: {
        ...state.databaseLatches,
        [targetKey]: (state.databaseLatches[targetKey] || []).filter((l) => l.id !== latchId),
      },
    }));
    EventBus.emit("database:unlatched", { targetKey, latchId });
  },
});
