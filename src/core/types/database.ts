"use client";

/**
 * ============================================================================
 * DATABASE CORE SCHEMAS, PROPERTY CATEGORIES & BINDING MATRIX
 * ============================================================================
 * Pure TypeScript database definitions conforming to Prisma & relational standards.
 * Defines the 7 Database Property Categories and the formal Archetype-to-Property
 * Binding Compatibility Matrix.
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.1 & SCHEMA_REFERENCE.md §13
 * ============================================================================
 */

import type { ArchetypeId } from "../document/registry";

// ----------------------------------------------------------------------------
// 1. Primitive & Relational Field Types (Prisma-Aligned)
// ----------------------------------------------------------------------------

export type DatabaseFieldType =
  | "String"
  | "Int"
  | "Float"
  | "Boolean"
  | "DateTime"
  | "JSON"
  | "Enum"
  | "Relation";

export type Cardinality = "1:1" | "1:N" | "N:M";

export type DeleteRule = "CASCADE" | "SET_NULL" | "RESTRICT";

export interface RelationDefinition {
  targetCollection: string;
  foreignKey: string;
  referencesField: string;
  cardinality: Cardinality;
  onDelete: DeleteRule;
}

export interface DatabaseField {
  id: string;
  name: string;
  type: DatabaseFieldType;
  isPrimaryKey?: boolean;
  isUnique?: boolean;
  isNullable?: boolean;
  isAutoIncrement?: boolean;
  defaultValue?: unknown;
  enumValues?: string[];
  relation?: RelationDefinition;
  description?: string;
}

export interface DatabaseIndex {
  name: string;
  fields: string[];
  isUnique: boolean;
}

export interface CollectionSchema {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  fields: Record<string, DatabaseField>;
  indexes?: DatabaseIndex[];
}

// ----------------------------------------------------------------------------
// 2. The 7 Database Property Categories
// ----------------------------------------------------------------------------

export type DatabasePropertyCategory =
  | "TEXTUAL_SCALAR"       // String, Enum (names, titles, statuses, labels)
  | "NUMERIC"              // Int, Float (prices, quantities, metrics, percentages)
  | "BOOLEAN_FLAG"         // Boolean (isPublished, inStock, hasDiscount, active)
  | "TEMPORAL"             // DateTime (createdAt, updatedAt, expiryDate)
  | "MEDIA_URL"            // String with CDN/URL format (image src, video link, asset)
  | "STRUCTURED_DOCUMENT"  // JSON (unstructured configs, metadata blobs)
  | "RELATIONAL_COLLECTION" // Relation (1:1 profiles, 1:N items, N:M tags)
  | "PATH_DATA"            // SVG Path command definitions (M, L, C, Z commands)
  | "STROKE_CONFIG";       // SVG Stroke styling definitions (width, dashes, caps)

/**
 * Resolves the functional property category for a given database field.
 */
export function getFieldCategory(field: DatabaseField): DatabasePropertyCategory {
  switch (field.type) {
    case "Enum":
      return "TEXTUAL_SCALAR";
    case "String":
      // Detect media URLs from naming heuristic or format
      if (
        field.name.toLowerCase().includes("image") ||
        field.name.toLowerCase().includes("url") ||
        field.name.toLowerCase().includes("src") ||
        field.name.toLowerCase().includes("avatar") ||
        field.name.toLowerCase().includes("thumbnail")
      ) {
        return "MEDIA_URL";
      }
      return "TEXTUAL_SCALAR";
    case "Int":
    case "Float":
      return "NUMERIC";
    case "Boolean":
      return "BOOLEAN_FLAG";
    case "DateTime":
      return "TEMPORAL";
    case "JSON":
      return "STRUCTURED_DOCUMENT";
    case "Relation":
      return "RELATIONAL_COLLECTION";
    default:
      return "TEXTUAL_SCALAR";
  }
}

// ----------------------------------------------------------------------------
// 3. Archetype Property Binding Compatibility Matrix
// ----------------------------------------------------------------------------

export interface PropertyBindingRule {
  propertyKey: string;
  allowedCategories: DatabasePropertyCategory[];
  description: string;
  safeFallback: unknown;
}

export interface ArchetypeBindingRules {
  archetype: ArchetypeId;
  properties: Record<string, PropertyBindingRule>;
}

/**
 * ARCHETYPE_PROPERTY_BINDING_MATRIX
 * Formal engine truth specifying which property of each element archetype
 * can legally bind to which database property categories.
 */
export const ARCHETYPE_PROPERTY_BINDING_MATRIX: Record<
  ArchetypeId,
  Record<string, PropertyBindingRule>
> = {
  text: {
    textContent: {
      propertyKey: "textContent",
      allowedCategories: ["TEXTUAL_SCALAR", "NUMERIC", "TEMPORAL"],
      description: "Direct text value displayed inside the text component",
      safeFallback: "",
    },
  },
  image: {
    src: {
      propertyKey: "src",
      allowedCategories: ["MEDIA_URL", "TEXTUAL_SCALAR"],
      description: "Image source URL or asset path",
      safeFallback: "/placeholder.png",
    },
    alt: {
      propertyKey: "alt",
      allowedCategories: ["TEXTUAL_SCALAR"],
      description: "Accessible alternate text description",
      safeFallback: "Image",
    },
  },
  button: {
    label: {
      propertyKey: "label",
      allowedCategories: ["TEXTUAL_SCALAR", "NUMERIC"],
      description: "Text label displayed on the button surface",
      safeFallback: "Button",
    },
    disabled: {
      propertyKey: "disabled",
      allowedCategories: ["BOOLEAN_FLAG"],
      description: "Flag indicating whether button is disabled / non-interactive",
      safeFallback: false,
    },
  },
  input: {
    value: {
      propertyKey: "value",
      allowedCategories: ["TEXTUAL_SCALAR", "NUMERIC"],
      description: "Current value of the input element",
      safeFallback: "",
    },
    placeholder: {
      propertyKey: "placeholder",
      allowedCategories: ["TEXTUAL_SCALAR"],
      description: "Placeholder text displayed when empty",
      safeFallback: "Enter value...",
    },
    disabled: {
      propertyKey: "disabled",
      allowedCategories: ["BOOLEAN_FLAG"],
      description: "Flag disabling user interaction",
      safeFallback: false,
    },
  },
  container: {
    itemsSource: {
      propertyKey: "itemsSource",
      allowedCategories: ["RELATIONAL_COLLECTION"],
      description: "1:N or N:M Relational collection driving repeater items",
      safeFallback: [],
    },
  },
  form: {
    initialValues: {
      propertyKey: "initialValues",
      allowedCategories: ["STRUCTURED_DOCUMENT"],
      description: "JSON record containing initial form values",
      safeFallback: {},
    },
  },
  generic: {
    content: {
      propertyKey: "content",
      allowedCategories: ["TEXTUAL_SCALAR", "NUMERIC", "BOOLEAN_FLAG", "TEMPORAL"],
      description: "Generic stringified value representation",
      safeFallback: "",
    },
  },
  svgPath: {
    d: {
      propertyKey: "d",
      allowedCategories: ["PATH_DATA", "TEXTUAL_SCALAR"],
      description: "SVG Path definition data commands (d attribute)",
      safeFallback: "M0,0 L10,10 Z",
    },
    fill: {
      propertyKey: "fill",
      allowedCategories: ["TEXTUAL_SCALAR"],
      description: "SVG Path fill color or paint server",
      safeFallback: "currentColor",
    },
    stroke: {
      propertyKey: "stroke",
      allowedCategories: ["TEXTUAL_SCALAR", "STROKE_CONFIG"],
      description: "SVG Path stroke color or paint server",
      safeFallback: "none",
    },
    strokeWidth: {
      propertyKey: "strokeWidth",
      allowedCategories: ["NUMERIC", "STROKE_CONFIG"],
      description: "SVG Path stroke line width",
      safeFallback: 1,
    },
    strokeDasharray: {
      propertyKey: "strokeDasharray",
      allowedCategories: ["TEXTUAL_SCALAR", "STROKE_CONFIG"],
      description: "SVG Path stroke dash pattern",
      safeFallback: "none",
    },
    strokeDashoffset: {
      propertyKey: "strokeDashoffset",
      allowedCategories: ["NUMERIC", "STROKE_CONFIG"],
      description: "SVG Path stroke dash offset (used for line drawing)",
      safeFallback: 0,
    },
  },
  svgGroup: {
    transform: {
      propertyKey: "transform",
      allowedCategories: ["TEXTUAL_SCALAR"],
      description: "SVG transform matrix, translate, scale or rotate",
      safeFallback: "",
    },
    opacity: {
      propertyKey: "opacity",
      allowedCategories: ["NUMERIC"],
      description: "Group opacity factor (0.0 to 1.0)",
      safeFallback: 1,
    },
  },
  svgUse: {
    href: {
      propertyKey: "href",
      allowedCategories: ["TEXTUAL_SCALAR", "MEDIA_URL"],
      description: "Target element IRI or external SVG sprite symbol",
      safeFallback: "",
    },
    x: {
      propertyKey: "x",
      allowedCategories: ["NUMERIC"],
      description: "X coordinate offset",
      safeFallback: 0,
    },
    y: {
      propertyKey: "y",
      allowedCategories: ["NUMERIC"],
      description: "Y coordinate offset",
      safeFallback: 0,
    },
  },
  svgText: {
    text: {
      propertyKey: "text",
      allowedCategories: ["TEXTUAL_SCALAR", "NUMERIC", "TEMPORAL"],
      description: "Text content rendered inside SVG text element",
      safeFallback: "",
    },
    fontSize: {
      propertyKey: "fontSize",
      allowedCategories: ["NUMERIC", "TEXTUAL_SCALAR"],
      description: "Font size of the SVG text",
      safeFallback: 14,
    },
    fill: {
      propertyKey: "fill",
      allowedCategories: ["TEXTUAL_SCALAR"],
      description: "SVG text fill color",
      safeFallback: "currentColor",
    },
  },
  // Archetypes with no database-bindable properties yet.
  toggle: {},
  badge: {},
  fab: {},
  icon: {},
  divider: {},
  background: {},
  object3D: {},
  camera3D: {},
  light3D: {},
};
