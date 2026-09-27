"use client";

/**
 * ============================================================================
 * AFTER-TRACK: STATE VARIABLE ACTIONS (ROADMAP Sub-Phase 41.1)
 * ============================================================================
 * `stateVariables` stays a plain (empty-by-default) field on `useProjectStore`
 * — `getDataContext()` and the Initial-edition property-binding UI
 * (`DataBindingEditor.tsx`, `PropertyBlueprintBindingControl.tsx`) read it in
 * every edition. Only the *mutation* actions are After-track: importing this
 * module attaches them to the live store. It is imported exactly once, as a
 * side effect, from `src/editor/shell/afterTrackPanels.tsx`'s
 * `edition === "full"` branch — never imported anywhere reachable from the
 * Initial edition, so it (and everything it pulls in) is absent from an
 * `edition=initial` production bundle (verified the same way panels are, see
 * `scripts/check-bundle-scope.mts`).
 * ============================================================================
 */

import { recordProjectChange, useProjectStore, type StateVariable } from "@/core/store/useProjectStore";
import { StateVariableValidator } from "@/core/engine/StateVariableValidator";
import { ConnectionPipeline } from "@/core/engine/ConnectionPipeline";
import { EventBus } from "@/core/events/EventBus";

// The Full edition's demo seed data (moved verbatim off `INITIAL_PROJECT_STATE`).
useProjectStore.setState({
  stateVariables: {
    cartTotal: {
      id: "cartTotal",
      name: "cartTotal",
      type: "number",
      value: 0,
      defaultValue: 0,
      scope: "global",
      description: "Total value of items in checkout",
    },
    isUserLoggedIn: {
      id: "isUserLoggedIn",
      name: "isUserLoggedIn",
      type: "boolean",
      value: false,
      defaultValue: false,
      scope: "global",
      description: "Current authentication status",
    },
  },
});

useProjectStore.setState({
  addStateVariable: (variable, actionLabel) => {
    // Validate value against declared type and dispatch diagnostic if mismatch
    const validated = StateVariableValidator.validateAndEmit(
      variable.name || variable.id,
      variable.type,
      variable.value,
      variable.scope
    );

    const sanitizedVar: StateVariable = {
      ...variable,
      value: validated.parsedValue,
      defaultValue: validated.parsedValue,
    };

    const snapshot = useProjectStore.getState().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    useProjectStore.setState((state) => ({
      stateVariables: {
        ...state.stateVariables,
        [sanitizedVar.id]: sanitizedVar,
      },
    }));

    EventBus.emit("state:changed", { variableId: sanitizedVar.id, value: sanitizedVar.value });

    // Trigger reactive evaluation on connection pipeline
    const ctx = useProjectStore.getState().getDataContext();
    ConnectionPipeline.evaluateAll(ctx);
  },

  updateStateVariable: (id, value, actionLabel) => {
    const current = useProjectStore.getState().stateVariables[id];
    let sanitizedValue = value;

    if (current) {
      const validated = StateVariableValidator.validateAndEmit(
        current.name || id,
        current.type,
        value,
        current.scope
      );
      sanitizedValue = validated.parsedValue;
    }

    const snapshot = useProjectStore.getState().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    useProjectStore.setState((state) => {
      const curr = state.stateVariables[id];
      if (!curr) return state;

      return {
        stateVariables: {
          ...state.stateVariables,
          [id]: {
            ...curr,
            value: sanitizedValue,
          },
        },
      };
    });

    EventBus.emit("state:changed", { variableId: id, value: sanitizedValue });

    // Trigger reactive evaluation on connection pipeline
    const ctx = useProjectStore.getState().getDataContext();
    ConnectionPipeline.evaluateAll(ctx);
  },

  deleteStateVariable: (id, actionLabel) => {
    const snapshot = useProjectStore.getState().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    useProjectStore.setState((state) => {
      const copy = { ...state.stateVariables };
      delete copy[id];
      return { stateVariables: copy };
    });
  },
});
