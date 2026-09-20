/**
 * ============================================================================
 * AI PROMPT INTENT PARSER & AMBIGUITY DETECTION ENGINE
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 6.1
 *
 * Deterministic natural-language parser extracting structured intents:
 * entities, fields, actions, pages, relationships, and authentication rules.
 * Flags ambiguous or incomplete prompts with targeted clarifying questions.
 * ============================================================================
 */

import {
  AmbiguityReport,
  AuthRequirement,
  FieldDataType,
  IntentAction,
  IntentCategory,
  IntentContext,
  IntentEntity,
  IntentField,
  IntentPage,
  IntentRelationship,
  StructuredIntent,
} from "./intent-types";

export class IntentParser {
  /**
   * Parses a natural-language user prompt into a structured intent schema.
   */
  public static parse(prompt: string, context?: IntentContext): StructuredIntent {
    const cleanPrompt = prompt.trim();
    const lower = cleanPrompt.toLowerCase();

    // 1. Ambiguity Detection (Check first to avoid guessing)
    const ambiguity = this.detectAmbiguity(cleanPrompt, lower);

    // 2. Category Classification
    const category = this.classifyCategory(lower);

    // 3. Entity & Field Extraction
    const entities = this.extractEntities(cleanPrompt, lower, category);

    // 4. Action Extraction
    const actions = this.extractActions(cleanPrompt, lower, category, entities);

    // 5. Page & Route Extraction
    const pages = this.extractPages(lower, category);

    // 6. Relationship Extraction
    const relationships = this.extractRelationships(cleanPrompt, lower);

    // 7. Auth Requirements Extraction
    const authRequirements = this.extractAuthRequirements(lower, pages);

    // 8. Primary Goal Formulation
    const primaryGoal = this.summarizeGoal(cleanPrompt, category, entities, actions);

    // Calculate confidence score (higher if specific fields and actions found)
    let confidence = 0.85;
    if (ambiguity?.isAmbiguous) {
      confidence = 0.45;
    } else if (entities.length > 0 && entities[0].fields.length > 0) {
      confidence = 0.95;
    }

    return {
      rawPrompt: cleanPrompt,
      primaryGoal,
      category,
      pages,
      entities,
      actions,
      relationships,
      authRequirements,
      ambiguity,
      confidence,
    };
  }

  // --------------------------------------------------------------------------
  // 1. Ambiguity Detection
  // --------------------------------------------------------------------------

  private static detectAmbiguity(
    raw: string,
    lower: string
  ): AmbiguityReport | undefined {
    // Case A: Generic "add a database" / "create a database" with no entity name or fields
    if (
      /^(?:add|create|make|build|setup|set up)\s+(?:a\s+)?(?:new\s+)?(?:database|db|backend)\s*$/i.test(
        raw
      ) ||
      lower === "add a database" ||
      lower === "create database" ||
      lower === "setup a db"
    ) {
      return {
        isAmbiguous: true,
        missingFields: ["entity", "fields"],
        clarifyingQuestion:
          "What kind of data would you like to store in this database? (e.g., Users, Products, Tasks)",
        suggestedOptions: ["Users", "Products", "Tasks", "Blog Posts"],
      };
    }

    // Case B: Entity named, but zero fields provided
    // e.g. "create a collection for invoices", "add a table for books", "create tasks table"
    const missingFieldsMatch = raw.match(
      /(?:create|add|make|build)\s+(?:a\s+)?(?:collection|table|model|database)\s+(?:for|named|called)?\s*([a-zA-Z0-9_]+)\s*$/i
    );
    if (missingFieldsMatch) {
      const entityName = missingFieldsMatch[1].toLowerCase();
      // Only trigger if no mention of "with" or fields anywhere in prompt
      if (!lower.includes("with") && !lower.includes("having") && !lower.includes("containing")) {
        const plural = entityName.endsWith("s") ? entityName : `${entityName}s`;
        return {
          isAmbiguous: true,
          missingFields: ["fields"],
          clarifyingQuestion: `Which fields should the '${plural}' collection contain? (e.g., name, title, description, price, status)`,
          suggestedOptions: [
            `name (string)`,
            `description (string)`,
            `status (string)`,
            `createdAt (date)`,
          ],
        };
      }
    }

    // Case C: Vague "build an app" without any functional spec
    if (/^(?:build|create|make)\s+(?:an?\s+)?(?:app|web app|application|website)\s*$/i.test(raw)) {
      return {
        isAmbiguous: true,
        missingFields: ["category", "features"],
        clarifyingQuestion:
          "What type of web application would you like to build? (e.g., E-commerce store, Task manager, Dashboard, SaaS portal)",
        suggestedOptions: [
          "Task Manager with CRUD",
          "E-commerce Product Catalog",
          "Analytics Dashboard",
          "User Authentication Portal",
        ],
      };
    }

    return undefined;
  }

  // --------------------------------------------------------------------------
  // 2. Category Classification
  // --------------------------------------------------------------------------

  private static classifyCategory(lower: string): IntentCategory {
    if (
      /\b(login|signup|sign\s+up|sign\s+in|register|authentication|auth|password|oauth|jwt)\b/i.test(
        lower
      )
    ) {
      return "auth";
    }

    if (
      lower.includes("checkout") ||
      lower.includes("cart") ||
      lower.includes("stripe") ||
      lower.includes("payment") ||
      lower.includes("order") ||
      lower.includes("shop") ||
      lower.includes("e-commerce") ||
      lower.includes("ecommerce") ||
      lower.includes("product") ||
      lower.includes("catalog") ||
      lower.includes("store")
    ) {
      return "e-commerce";
    }

    if (
      lower.includes("dashboard") ||
      lower.includes("analytics") ||
      lower.includes("metrics") ||
      lower.includes("chart") ||
      lower.includes("kpi")
    ) {
      return "dashboard";
    }

    if (
      lower.includes("form") ||
      lower.includes("contact us") ||
      lower.includes("feedback") ||
      lower.includes("survey")
    ) {
      return "form";
    }

    if (
      lower.includes("crud") ||
      lower.includes("database") ||
      lower.includes("table") ||
      lower.includes("collection") ||
      lower.includes("manage") ||
      lower.includes("tasks") ||
      lower.includes("todos") ||
      lower.includes("inventory") ||
      lower.includes("items") ||
      lower.includes("records")
    ) {
      return "crud";
    }

    if (
      lower.includes("navigate") ||
      lower.includes("route") ||
      lower.includes("redirect")
    ) {
      return "navigation";
    }

    return "utility";
  }

  // --------------------------------------------------------------------------
  // 3. Entity & Field Extraction
  // --------------------------------------------------------------------------

  private static extractEntities(
    raw: string,
    lower: string,
    category: IntentCategory
  ): IntentEntity[] {
    const entities: IntentEntity[] = [];

    // 1. Try postfix regex: "[a|an|the|new] <Name> [catalog|management|store] (collection|table|entity|model) with <fields>"
    const postfixMatch = raw.match(
      /(?:(?:a|an|the|new)\s+)*([a-zA-Z0-9_]+)(?:\s+(?:catalog|management|store|system|data))?\s+(?:collection|table|model|entity|database)\s+(?:with|having|containing)\s+([^.]*)/i
    );

    if (postfixMatch && !["new", "a", "an", "the", "my"].includes(postfixMatch[1].toLowerCase())) {
      const entityName = this.capitalize(this.toSingular(postfixMatch[1]));
      const rawFields = postfixMatch[2] || "";
      const fields = this.parseFieldList(rawFields);

      entities.push({
        name: entityName,
        pluralName: `${entityName}s`,
        fields,
        isNew: true,
      });
      return entities;
    }

    // 2. Try prefix regex: "(collection|table|entity|model) (for|called|named) <Name> with <fields>"
    const explicitMatch = raw.match(
      /(?:collection|table|model|entity|database)\s+(?:for|named|called)\s+([a-zA-Z0-9_]+)(?:\s+(?:with|having|containing)\s+([^.]*))?/i
    );

    if (explicitMatch) {
      const entityName = this.capitalize(this.toSingular(explicitMatch[1]));
      const rawFields = explicitMatch[2] || "";
      const fields = this.parseFieldList(rawFields);

      entities.push({
        name: entityName,
        pluralName: `${entityName}s`,
        fields,
        isNew: true,
      });
      return entities;
    }

    // 2. Keyword-based Archetype Fallbacks
    if (lower.includes("task") || lower.includes("todo")) {
      const fields = this.extractFieldsFromSentence(raw, ["title", "description", "dueDate", "status", "priority", "isCompleted"]);
      entities.push({
        name: "Task",
        pluralName: "Tasks",
        fields: fields.length > 0 ? fields : [
          { name: "title", type: "string", required: true },
          { name: "status", type: "string", defaultValue: "pending" },
          { name: "isCompleted", type: "boolean", defaultValue: false },
        ],
        isNew: true,
      });
    } else if (lower.includes("product") || category === "e-commerce") {
      const fields = this.extractFieldsFromSentence(raw, ["name", "title", "price", "description", "sku", "inStock", "category"]);
      entities.push({
        name: "Product",
        pluralName: "Products",
        fields: fields.length > 0 ? fields : [
          { name: "name", type: "string", required: true },
          { name: "price", type: "number", required: true },
          { name: "inStock", type: "boolean", defaultValue: true },
        ],
        isNew: true,
      });
    } else if (lower.includes("order")) {
      entities.push({
        name: "Order",
        pluralName: "Orders",
        fields: [
          { name: "orderNumber", type: "string", required: true },
          { name: "total", type: "number", required: true },
          { name: "status", type: "string", defaultValue: "pending" },
          { name: "createdAt", type: "date" },
        ],
        isNew: true,
      });
    } else if (category === "auth" || lower.includes("user")) {
      entities.push({
        name: "User",
        pluralName: "Users",
        fields: [
          { name: "email", type: "string", required: true },
          { name: "password", type: "string", required: true },
          { name: "name", type: "string" },
          { name: "role", type: "string", defaultValue: "user" },
        ],
        isNew: true,
      });
    } else if (category === "form" || lower.includes("contact")) {
      entities.push({
        name: "ContactSubmission",
        pluralName: "ContactSubmissions",
        fields: [
          { name: "name", type: "string", required: true },
          { name: "email", type: "string", required: true },
          { name: "message", type: "string", required: true },
        ],
        isNew: true,
      });
    }

    return entities;
  }

  private static parseFieldList(fieldString: string): IntentField[] {
    if (!fieldString.trim()) return [];

    // Split on commas, "and", or semicolons
    const tokens = fieldString
      .split(/[,;\n]|(?:\s+and\s+)/i)
      .map((t) => t.trim())
      .filter(Boolean);

    return tokens.map((token) => {
      // Handles "price: number", "name (string)", or bare "dueDate"
      const match = token.match(/^([a-zA-Z0-9_]+)(?:\s*[:(]\s*([a-zA-Z0-9_]+)\)?)?/);
      const fieldName = match ? match[1] : token;
      const explicitType = match && match[2] ? match[2].toLowerCase() : undefined;

      const type = (explicitType as FieldDataType) || this.inferFieldType(fieldName);
      return {
        name: fieldName,
        type,
        required: true,
      };
    });
  }

  private static extractFieldsFromSentence(raw: string, candidateNames: string[]): IntentField[] {
    const fields: IntentField[] = [];
    const lower = raw.toLowerCase();

    for (const name of candidateNames) {
      if (lower.includes(name.toLowerCase())) {
        fields.push({
          name,
          type: this.inferFieldType(name),
          required: true,
        });
      }
    }

    return fields;
  }

  private static inferFieldType(fieldName: string): FieldDataType {
    const fn = fieldName.toLowerCase();
    if (
      fn.includes("price") ||
      fn.includes("amount") ||
      fn.includes("total") ||
      fn.includes("cost") ||
      fn.includes("count") ||
      fn.includes("quantity") ||
      fn.includes("rating") ||
      fn.includes("age") ||
      fn.includes("retries")
    ) {
      return "number";
    }

    if (
      fn.includes("date") ||
      fn.includes("time") ||
      fn.includes("createdat") ||
      fn.includes("updatedat") ||
      fn.includes("due")
    ) {
      return "date";
    }

    if (
      fn.startsWith("is") ||
      fn.startsWith("has") ||
      fn.includes("active") ||
      fn.includes("completed") ||
      fn.includes("instock") ||
      fn.includes("verified") ||
      fn.includes("published")
    ) {
      return "boolean";
    }

    if (fn.includes("items") || fn.includes("tags") || fn.includes("roles")) {
      return "array";
    }

    return "string";
  }

  // --------------------------------------------------------------------------
  // 4. Action Extraction
  // --------------------------------------------------------------------------

  private static extractActions(
    raw: string,
    lower: string,
    category: IntentCategory,
    entities: IntentEntity[]
  ): IntentAction[] {
    const actions: IntentAction[] = [];
    const mainEntity = entities[0]?.name || "Item";

    if (category === "auth") {
      actions.push({
        name: "submitLogin",
        trigger: "submit",
        flowType: "auth",
        description: "Validates credentials and establishes user session",
      });
      if (lower.includes("register") || lower.includes("sign up")) {
        actions.push({
          name: "submitRegister",
          trigger: "submit",
          flowType: "create",
          targetEntity: "User",
          description: "Creates user account and initiates onboarding",
        });
      }
    } else if (category === "crud") {
      actions.push({
        name: `create${mainEntity}`,
        trigger: "submit",
        flowType: "create",
        targetEntity: mainEntity,
        description: `Inserts a new ${mainEntity} record into the database`,
      });
      actions.push({
        name: `load${mainEntity}List`,
        trigger: "pageLoad",
        flowType: "read",
        targetEntity: mainEntity,
        description: `Fetches active ${mainEntity} records for display`,
      });
    } else if (category === "e-commerce") {
      actions.push({
        name: "addToCart",
        trigger: "click",
        flowType: "custom",
        targetEntity: "Product",
        description: "Appends selected product item into reactive cart state",
      });
      actions.push({
        name: "processCheckout",
        trigger: "click",
        flowType: "custom",
        targetEntity: "Order",
        description: "Initiates payment provider checkout flow",
      });
    } else if (category === "form") {
      actions.push({
        name: "submitForm",
        trigger: "submit",
        flowType: "create",
        targetEntity: mainEntity,
        description: "Validates form fields and records response",
      });
    }

    return actions;
  }

  // --------------------------------------------------------------------------
  // 5. Page & Route Extraction
  // --------------------------------------------------------------------------

  private static extractPages(lower: string, category: IntentCategory): IntentPage[] {
    const pages: IntentPage[] = [];

    if (category === "auth") {
      pages.push({
        name: "Login",
        route: "/login",
        purpose: "Authentication login portal",
      });
      pages.push({
        name: "Dashboard",
        route: "/dashboard",
        purpose: "Protected user application area",
        isProtected: true,
      });
    } else if (category === "e-commerce") {
      pages.push({
        name: "Catalog",
        route: "/products",
        purpose: "Product catalog listing",
      });
      pages.push({
        name: "Checkout",
        route: "/checkout",
        purpose: "Cart review and payment entry",
      });
    } else if (category === "dashboard") {
      pages.push({
        name: "Dashboard",
        route: "/dashboard",
        purpose: "Metrics and analytics visual overview",
      });
    } else {
      pages.push({
        name: "Home",
        route: "/",
        purpose: "Primary application landing page",
      });
    }

    return pages;
  }

  // --------------------------------------------------------------------------
  // 6. Relationship Extraction
  // --------------------------------------------------------------------------

  private static extractRelationships(
    raw: string,
    lower: string
  ): IntentRelationship[] {
    const relationships: IntentRelationship[] = [];

    // Check for "User has many Orders" pattern
    const hasManyMatch = raw.match(/([a-zA-Z0-9_]+)\s+has\s+many\s+([a-zA-Z0-9_]+)/i);
    if (hasManyMatch) {
      relationships.push({
        fromEntity: this.capitalize(this.toSingular(hasManyMatch[1])),
        toEntity: this.capitalize(this.toSingular(hasManyMatch[2])),
        relationType: "one-to-many",
      });
    }

    // Check for "Order belongs to User" pattern
    const belongsToMatch = raw.match(/([a-zA-Z0-9_]+)\s+belongs\s+to\s+([a-zA-Z0-9_]+)/i);
    if (belongsToMatch) {
      relationships.push({
        fromEntity: this.capitalize(this.toSingular(belongsToMatch[2])),
        toEntity: this.capitalize(this.toSingular(belongsToMatch[1])),
        relationType: "one-to-many",
      });
    }

    return relationships;
  }

  // --------------------------------------------------------------------------
  // 7. Auth Requirements Extraction
  // --------------------------------------------------------------------------

  private static extractAuthRequirements(
    lower: string,
    pages: IntentPage[]
  ): AuthRequirement {
    const isAuthRelated =
      /\b(login|signup|sign\s+in|sign\s+up|register|authentication|auth|protect|secure|oauth|account)\b/i.test(
        lower
      );

    let provider: "email-password" | "oauth" | "magic-link" = "email-password";
    if (lower.includes("google") || lower.includes("github") || lower.includes("oauth")) {
      provider = "oauth";
    } else if (lower.includes("magic link") || lower.includes("passwordless")) {
      provider = "magic-link";
    }

    const protectedPages = pages.filter((p) => p.isProtected).map((p) => p.route);

    return {
      required: isAuthRelated,
      provider: isAuthRelated ? provider : undefined,
      roles: lower.includes("admin") ? ["admin", "user"] : ["user"],
      protectedPages: protectedPages.length > 0 ? protectedPages : undefined,
    };
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private static summarizeGoal(
    raw: string,
    category: IntentCategory,
    entities: IntentEntity[],
    actions: IntentAction[]
  ): string {
    if (raw.length <= 60) return raw;
    const entityNames = entities.map((e) => e.name).join(", ");
    return `Implement ${category} workflow for ${entityNames || "system"}`;
  }

  private static capitalize(str: string): string {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private static toSingular(word: string): string {
    if (word.endsWith("ies")) return word.slice(0, -3) + "y";
    if (word.endsWith("es") && !word.endsWith("tes") && !word.endsWith("ses")) {
      return word.slice(0, -2);
    }
    if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
    return word;
  }
}
