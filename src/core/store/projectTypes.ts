/**
 * Plain data types for `useProjectStore.ts`'s `ProjectStateSnapshot`, split out
 * so the store file itself stays close to the Verification Gate's line-count
 * target (Sub-Phase 41.1). Re-exported from `useProjectStore.ts` for the many
 * existing `import { StateVariable, ... } from "./useProjectStore"` call sites.
 */

import { RouteParameter, RouteGuard } from "../types/routing";

export type StateVariableScope = "global" | "page" | "component";
export type StateVariableType = "string" | "number" | "boolean" | "json" | "array" | "color";

export interface StateVariable {
  id: string;
  name: string;
  type: StateVariableType;
  value: unknown;
  defaultValue: unknown;
  scope: StateVariableScope;
  componentId?: string; // for component-scoped variables
  description?: string;
  isPersistent?: boolean;
}

export interface DatabaseFunctionLatch {
  id: string;
  targetKey: string; // e.g. "Products.id" or "Products"
  functionName: string;
  category: "blueprint" | "api" | "component" | "action";
  sourceFile: string;
  operation: "READ" | "CREATE" | "UPDATE" | "DELETE";
  description: string;
}

export interface PageDefinition {
  id: string;
  name: string;
  slug: string;
  rootElementId: string;
  isDynamic?: boolean;
  parameters?: RouteParameter[];
  guard?: RouteGuard;
  metaTitle?: string;
  metaDescription?: string;
  layoutId?: string;
  isCustom404?: boolean;
  order?: number;
}

export interface ProjectTargetConfig {
  framework?: string;
  styling?: string;
  animation?: string;
  language?: string;
}
