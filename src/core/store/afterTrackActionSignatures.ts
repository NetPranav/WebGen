/**
 * The After-track action method signatures (blueprints, databases, multi-page
 * CRUD, redirects, state variables), split out of `ProjectStoreState` so that
 * file stays close to the Verification Gate's line-count target (Sub-Phase
 * 41.1). `ProjectStoreState` mixes this in as `Partial<AfterTrackActionSignatures>`
 * — every method here is `undefined` on the live store unless the matching
 * `src/after/store/*.ts` module has registered it (imported only behind
 * `edition === "full"`, see `afterTrackPanels.tsx`).
 */

import type { Layer } from "../document/schema";
import type { CollectionSchema, DatabaseField } from "../types/database";
import type { RedirectRule } from "../types/routing";
import type { BlueprintGraph, BlueprintNodeInstance, BlueprintVariable, GraphValidationResult } from "../ast/ASTManager";
import type { StateVariable, DatabaseFunctionLatch, PageDefinition } from "./projectTypes";

export interface AfterTrackActionSignatures {
  // State Variable Management (`src/after/store/stateVariableActions.ts`)
  addStateVariable: (variable: StateVariable, actionLabel?: string) => void;
  updateStateVariable: (id: string, value: unknown, actionLabel?: string) => void;
  deleteStateVariable: (id: string, actionLabel?: string) => void;

  // Database Management (`src/after/store/databaseActions.ts`)
  addDatabaseCollection: (schema: CollectionSchema, actionLabel?: string) => void;
  deleteDatabaseCollection: (collectionName: string, actionLabel?: string) => void;
  addFieldToCollection: (collectionName: string, field: DatabaseField, actionLabel?: string) => void;
  deleteFieldFromCollection: (collectionName: string, fieldName: string, actionLabel?: string) => void;
  addDatabaseRecord: (collectionName: string, record: Record<string, unknown>, actionLabel?: string) => void;
  updateDatabaseRecord: (
    collectionName: string,
    recordIndex: number,
    updatedFields: Record<string, unknown>,
    actionLabel?: string
  ) => void;
  deleteDatabaseRecord: (collectionName: string, recordIndex: number, actionLabel?: string) => void;
  addDatabaseLatch: (latch: DatabaseFunctionLatch, actionLabel?: string) => void;
  removeDatabaseLatch: (targetKey: string, latchId: string, actionLabel?: string) => void;

  // Blueprint AST Management (`src/after/store/blueprintActions.ts`)
  createBlueprintGraph: (name: string, type?: "event" | "function" | "macro", actionLabel?: string) => string;
  setActiveBlueprintGraph: (graphId: string) => void;
  addBlueprintNode: (
    graphId: string,
    typeId: string,
    position: { x: number; y: number },
    customParams?: Record<string, unknown>,
    actionLabel?: string
  ) => BlueprintNodeInstance;
  removeBlueprintNode: (graphId: string, nodeId: string, actionLabel?: string) => void;
  moveBlueprintNode: (graphId: string, nodeId: string, position: { x: number; y: number }, actionLabel?: string) => void;
  connectBlueprintPins: (
    graphId: string,
    sourceNodeId: string,
    sourcePinId: string,
    targetNodeId: string,
    targetPinId: string,
    actionLabel?: string
  ) => { success: boolean; error?: string };
  disconnectBlueprintWire: (graphId: string, wireId: string, actionLabel?: string) => void;
  setBlueprintPinValue: (graphId: string, nodeId: string, pinId: string, value: unknown, actionLabel?: string) => void;
  addBlueprintVariable: (graphId: string, variable: Omit<BlueprintVariable, "id">, actionLabel?: string) => void;
  updateBlueprintVariable: (
    graphId: string,
    varId: string,
    updates: Partial<BlueprintVariable>,
    actionLabel?: string
  ) => void;
  removeBlueprintVariable: (graphId: string, varId: string, actionLabel?: string) => void;
  compileActiveBlueprintGraph: () => GraphValidationResult;
  loadBlueprintGraph: (graph: BlueprintGraph, actionLabel?: string) => void;

  // Multi-page CRUD (`src/after/store/pagesActions.ts`) — `setActivePage` is
  // core (Phase 2's single default page needs it in every edition) and stays
  // directly on `ProjectStoreState`, not here.
  addPage: (
    page: Omit<PageDefinition, "id" | "rootElementId"> & { id?: string; rootElementId?: string },
    rootElement?: Layer,
    actionLabel?: string
  ) => string;
  updatePage: (pageId: string, updates: Partial<PageDefinition>, actionLabel?: string) => void;
  deletePage: (pageId: string, actionLabel?: string) => void;
  duplicatePage: (pageId: string, actionLabel?: string) => string;
  detectRouteCollisions: () => string[];

  // Redirect Rule Management (`src/after/store/pagesActions.ts`)
  addRedirectRule: (rule: Omit<RedirectRule, "id"> & { id?: string }, actionLabel?: string) => string;
  updateRedirectRule: (id: string, updates: Partial<RedirectRule>, actionLabel?: string) => void;
  deleteRedirectRule: (id: string, actionLabel?: string) => void;
}
