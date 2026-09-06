"use client";

/**
 * ============================================================================
 * DATABASE SCHEMA & PROPERTY BINDING VALIDATOR
 * ============================================================================
 * Evaluates relational schema integrity (primary keys, foreign keys, cascades)
 * and verifies element property-to-database field binding legality.
 * Dispatches structured diagnostic events directly via DiagnosticBus.
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.1 & SCHEMA_REFERENCE.md §13
 * ============================================================================
 */

import { ElementType } from "../types/element-sections";
import {
  CollectionSchema,
  DatabaseField,
  DatabasePropertyCategory,
  getFieldCategory,
  ARCHETYPE_PROPERTY_BINDING_MATRIX,
  PropertyBindingRule,
} from "../types/database";
import { DiagnosticBus } from "./DiagnosticBus";
import { DiagnosticEvent } from "../types/diagnostics";

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BindingValidationResult {
  isValid: boolean;
  category: DatabasePropertyCategory;
  error?: string;
  fallbackValue?: unknown;
  diagnostic?: DiagnosticEvent;
}

export class DatabaseValidatorService {
  /**
   * Validates a single collection schema against the complete schema catalog.
   * Traps missing primary keys, orphaned relations, and circular cascades.
   */
  public validateSchema(
    schema: CollectionSchema,
    allSchemas: CollectionSchema[] = []
  ): SchemaValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const schemaMap = new Map<string, CollectionSchema>(
      allSchemas.map((s) => [s.name.toLowerCase(), s])
    );

    // 1. Check for Primary Key
    const fields = Object.values(schema.fields || {});
    const primaryKeys = fields.filter((f) => f.isPrimaryKey);

    if (primaryKeys.length === 0) {
      const msg = `Collection '${schema.name}' does not declare a Primary Key. Every collection must define a unique PK.`;
      errors.push(msg);
      DiagnosticBus.emit({
        channel: "DB_SCHEMA_ERR",
        severity: "error",
        source: {
          panel: "Panel 10: Database Designer",
          entityId: schema.id,
          entityName: schema.name,
        },
        message: msg,
        suggestion: "Add an 'id' field with type Int (auto-increment) or String (UUID/CUID) and set isPrimaryKey to true.",
        isFixable: true,
      });
    }

    // 2. Validate Relations
    for (const field of fields) {
      if (field.type === "Relation" && field.relation) {
        const targetName = field.relation.targetCollection.toLowerCase();
        const targetSchema = schemaMap.get(targetName);

        if (!targetSchema && allSchemas.length > 0) {
          const msg = `Field '${schema.name}.${field.name}' references non-existent collection '${field.relation.targetCollection}'.`;
          errors.push(msg);
          DiagnosticBus.emit({
            channel: "DB_SCHEMA_ERR",
            severity: "error",
            source: {
              panel: "Panel 10: Database Designer",
              entityId: schema.id,
              entityName: schema.name,
              propertyKey: field.name,
            },
            message: msg,
            suggestion: `Create collection '${field.relation.targetCollection}' or update the targetCollection property.`,
            isFixable: true,
          });
        } else if (targetSchema) {
          // Verify target field exists
          const refFieldName = field.relation.referencesField;
          const refField = Object.values(targetSchema.fields || {}).find(
            (f) => f.name.toLowerCase() === refFieldName.toLowerCase()
          );

          if (!refField) {
            const msg = `Field '${schema.name}.${field.name}' references non-existent field '${refFieldName}' in collection '${targetSchema.name}'.`;
            errors.push(msg);
            DiagnosticBus.emit({
              channel: "DB_SCHEMA_ERR",
              severity: "error",
              source: {
                panel: "Panel 10: Database Designer",
                entityId: schema.id,
                entityName: schema.name,
                propertyKey: field.name,
              },
              message: msg,
              suggestion: `Verify target collection '${targetSchema.name}' contains a primary or unique key field named '${refFieldName}'.`,
              isFixable: true,
            });
          }

          // Check for circular CASCADE delete
          if (field.relation.onDelete === "CASCADE") {
            const targetFields = Object.values(targetSchema.fields || {});
            const returnCascade = targetFields.find(
              (tf) =>
                tf.type === "Relation" &&
                tf.relation?.targetCollection.toLowerCase() === schema.name.toLowerCase() &&
                tf.relation?.onDelete === "CASCADE"
            );

            if (returnCascade) {
              const msg = `Mutual CASCADE delete detected between '${schema.name}.${field.name}' and '${targetSchema.name}.${returnCascade.name}'.`;
              warnings.push(msg);
              DiagnosticBus.emit({
                channel: "DB_SCHEMA_ERR",
                severity: "warning",
                source: {
                  panel: "Panel 10: Database Designer",
                  entityId: schema.id,
                  entityName: schema.name,
                  propertyKey: field.name,
                },
                message: msg,
                suggestion: "Change one side to SET_NULL or RESTRICT to avoid infinite delete cascade loops.",
                isFixable: true,
              });
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates if a DatabaseField can legally bind to an element's property.
   * Traps incompatible bindings, dispatches [BIND_ERR] to DiagnosticBus,
   * and returns a safe fallback value to prevent UI crash.
   */
  public validatePropertyBinding(options: {
    elementId: string;
    elementName?: string;
    archetype: ElementType;
    propertyKey: string;
    sourceField: DatabaseField;
    sourceCollectionName: string;
  }): BindingValidationResult {
    const {
      elementId,
      elementName,
      archetype,
      propertyKey,
      sourceField,
      sourceCollectionName,
    } = options;

    const fieldCategory = getFieldCategory(sourceField);
    const archetypeRules = ARCHETYPE_PROPERTY_BINDING_MATRIX[archetype];

    // Check if archetype or property rule exists
    let rule: PropertyBindingRule | undefined;
    if (archetypeRules && archetypeRules[propertyKey]) {
      rule = archetypeRules[propertyKey];
    } else {
      // Fallback rule for undefined or custom props: allow scalar & numeric
      rule = {
        propertyKey,
        allowedCategories: ["TEXTUAL_SCALAR", "NUMERIC"],
        description: "Generic property value",
        safeFallback: "",
      };
    }

    // Evaluate compatibility
    const isAllowed = rule.allowedCategories.includes(fieldCategory);

    if (isAllowed) {
      return {
        isValid: true,
        category: fieldCategory,
      };
    }

    // Incompatible binding trapped!
    const msg = `Incompatible Binding: Database field '${sourceCollectionName}.${sourceField.name}' (${fieldCategory}) cannot bind to property '${propertyKey}' on element '${elementName || elementId}' (${archetype}).`;
    const suggestion = `Property '${propertyKey}' requires: [${rule.allowedCategories.join(
      ", "
    )}]. Select a compatible field or use a data transform expression.`;

    const diagnostic = DiagnosticBus.emit({
      channel: "BIND_ERR",
      severity: "error",
      source: {
        panel: "Panel 03: Inspector / Details",
        entityId: elementId,
        entityName: elementName,
        archetype,
        propertyKey,
      },
      message: msg,
      suggestion,
      targetInspectorSection: "variables",
      isFixable: true,
      fallbackApplied: rule.safeFallback,
    });

    return {
      isValid: false,
      category: fieldCategory,
      error: msg,
      fallbackValue: rule.safeFallback,
      diagnostic,
    };
  }
}

// Export singleton instance
export const DatabaseValidator = new DatabaseValidatorService();
