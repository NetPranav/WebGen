/**
 * ============================================================================
 * AI PROMPT INTENT PARSER SCHEMA TYPES
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 6.1
 *
 * Defines the structured schema for natural-language prompt parsing,
 * entity extraction, relationship modeling, action planning, and ambiguity
 * detection across the AI scaffolding engine.
 * ============================================================================
 */

export type IntentCategory =
  | "crud"
  | "auth"
  | "e-commerce"
  | "dashboard"
  | "form"
  | "navigation"
  | "utility"
  | "unknown";

export type FieldDataType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "object"
  | "array";

export interface IntentField {
  name: string;
  type: FieldDataType;
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
}

export interface IntentEntity {
  name: string;
  pluralName?: string;
  fields: IntentField[];
  isNew?: boolean;
  description?: string;
}

export type ActionTrigger = "click" | "submit" | "pageLoad" | "timer" | "custom";
export type ActionFlowType =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "navigate"
  | "auth"
  | "custom";

export interface IntentAction {
  name: string;
  trigger: ActionTrigger;
  flowType: ActionFlowType;
  targetEntity?: string;
  targetRoute?: string;
  description: string;
}

export interface IntentPage {
  name: string;
  route: string;
  purpose: string;
  isProtected?: boolean;
}

export interface IntentRelationship {
  fromEntity: string;
  toEntity: string;
  relationType: "one-to-many" | "many-to-many" | "one-to-one";
}

export interface AuthRequirement {
  required: boolean;
  provider?: "email-password" | "oauth" | "magic-link";
  roles?: string[];
  protectedPages?: string[];
}

export interface AmbiguityReport {
  isAmbiguous: boolean;
  missingFields: string[];
  clarifyingQuestion: string;
  suggestedOptions?: string[];
}

export interface StructuredIntent {
  rawPrompt: string;
  primaryGoal: string;
  category: IntentCategory;
  pages: IntentPage[];
  entities: IntentEntity[];
  actions: IntentAction[];
  relationships: IntentRelationship[];
  authRequirements: AuthRequirement;
  ambiguity?: AmbiguityReport;
  confidence: number;
}

export interface IntentContext {
  existingPages?: string[];
  existingEntities?: string[];
  currentRoute?: string;
}
