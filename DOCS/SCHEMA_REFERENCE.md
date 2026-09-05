# JSON SCHEMA CONTRACTS REFERENCE

## Project Name: Visual Web Application Engine
**Internal Codename:** "Unreal Engine for Web Applications"  
**Document Version:** 1.0.0  
**Status:** Production-Ready Reference  
**File Location:** `DOCS/SCHEMA_REFERENCE.md`  

---

## 1. Purpose

This document defines the **exact JSON schema contracts** for every file type in the user's application project. These schemas serve as:
- The compile-time validation contract for the Blueprint Compiler
- The serialization/deserialization format for the AST Manager
- The API contract between the editor UI and the core engine
- The migration baseline for future schema version upgrades

---

## 2. Project Manifest (`project.json`)

The root file of every application project. Equivalent to Unreal's `.uproject`.

```json
{
  "$schema": "https://visual-engine.dev/schemas/project-v1.json",
  "id": "proj_98a7df8a",
  "name": "MyShop",
  "description": "A modern e-commerce store for sneakers",
  "version": "1.0.0",
  "engineVersion": "0.1.0",
  "createdAt": "2026-09-05T18:00:00Z",
  "lastModified": "2026-09-05T18:30:00Z",
  "settings": {
    "framework": "nextjs",
    "styling": "vanilla-css",
    "defaultTheme": "light",
    "defaultLocale": "en",
    "defaultPage": "page_home"
  },
  "plugins": [
    {
      "id": "plug_stripe_01",
      "name": "Stripe Payments",
      "version": "1.0.0",
      "enabled": true
    }
  ]
}
```

**Required Fields:** `id`, `name`, `version`, `engineVersion`, `settings`  
**Optional Fields:** `description`, `plugins`, `createdAt`, `lastModified`

---

## 3. Page Layout (`*.page.json`)

Defines the component tree for a single page.

```json
{
  "$schema": "https://visual-engine.dev/schemas/page-v1.json",
  "id": "page_home",
  "name": "Home",
  "route": "/",
  "layoutRef": "cdef_main_layout",
  "guards": [],
  "seo": {
    "title": "Home | MyShop",
    "description": "Discover the latest sneakers at MyShop",
    "ogImage": "assets/images/og-home.png"
  },
  "componentTree": {
    "rootId": "comp_root_01",
    "instances": [
      {
        "id": "comp_root_01",
        "definitionId": "cdef_container",
        "name": "PageRoot",
        "parentId": null,
        "children": ["comp_hero_01", "comp_grid_01", "comp_footer_01"],
        "properties": {
          "display": "flex",
          "flexDirection": "column",
          "gap": "0px",
          "minHeight": "100vh"
        },
        "bindings": {},
        "events": {},
        "motionRefs": [],
        "isVisible": true,
        "isLocked": false
      },
      {
        "id": "comp_hero_01",
        "definitionId": "cdef_section",
        "name": "HeroSection",
        "parentId": "comp_root_01",
        "children": ["comp_title_01", "comp_cta_01"],
        "properties": {
          "display": "flex",
          "flexDirection": "column",
          "alignItems": "center",
          "justifyContent": "center",
          "padding": "80px 24px",
          "backgroundColor": "#F8FAFC"
        },
        "bindings": {},
        "events": {},
        "motionRefs": ["motion_hero_entrance"],
        "isVisible": true,
        "isLocked": false
      },
      {
        "id": "comp_cta_01",
        "definitionId": "cdef_button",
        "name": "ShopNowButton",
        "parentId": "comp_hero_01",
        "children": [],
        "properties": {
          "text": "Shop Now",
          "variant": "primary",
          "width": "200px",
          "height": "48px"
        },
        "bindings": {
          "disabled": "var_isLoading"
        },
        "events": {
          "onClick": "graph_navigate_products"
        },
        "motionRefs": [],
        "isVisible": true,
        "isLocked": false
      }
    ]
  }
}
```

---

## 4. Component Definition (`*.component.json`)

Defines a reusable, drag-and-drop component template.

```json
{
  "$schema": "https://visual-engine.dev/schemas/component-v1.json",
  "id": "cdef_product_card",
  "name": "ProductCard",
  "category": "Display",
  "description": "A card displaying product image, name, price, and add-to-cart button",
  "defaultProps": {
    "width": "280px",
    "padding": "16px",
    "borderRadius": "12px",
    "backgroundColor": "#FFFFFF",
    "boxShadow": "0 2px 8px rgba(0,0,0,0.06)"
  },
  "propSchema": {
    "productName": { "type": "string", "label": "Product Name", "default": "Product" },
    "price": { "type": "number", "label": "Price", "default": 0 },
    "imageUrl": { "type": "string", "label": "Image URL", "default": "" },
    "inStock": { "type": "boolean", "label": "In Stock", "default": true }
  },
  "slots": [
    { "name": "footer", "label": "Footer Slot", "allowedTypes": ["cdef_button", "cdef_text"] }
  ],
  "variants": [
    { "name": "compact", "overrides": { "width": "200px", "padding": "8px" } },
    { "name": "featured", "overrides": { "width": "400px", "boxShadow": "0 8px 24px rgba(0,0,0,0.12)" } }
  ],
  "localGraphId": "graph_product_card_logic",
  "localMotionId": "motion_product_card_hover"
}
```

---

## 5. Logic Blueprint Graph (`*.bp.json`)

Defines a visual logic graph with nodes, edges, variables, and functions.

```json
{
  "$schema": "https://visual-engine.dev/schemas/graph-v1.json",
  "id": "graph_checkout_flow",
  "name": "Checkout Workflow",
  "type": "logic",
  "ownerType": "standalone",
  "ownerId": null,
  "variables": [
    {
      "name": "cartTotal",
      "type": "number",
      "defaultValue": 0,
      "isExposed": true
    },
    {
      "name": "isProcessing",
      "type": "boolean",
      "defaultValue": false,
      "isExposed": false
    }
  ],
  "functions": [
    {
      "name": "validateCart",
      "inputs": [
        { "name": "items", "type": "array" }
      ],
      "outputs": [
        { "name": "isValid", "type": "boolean" },
        { "name": "errorMessage", "type": "string" }
      ],
      "subGraphId": "graph_validate_cart_impl"
    }
  ],
  "eventDispatchers": [
    {
      "name": "onCheckoutComplete",
      "payload": [
        { "name": "orderId", "type": "string" },
        { "name": "total", "type": "number" }
      ]
    }
  ],
  "nodes": [
    {
      "id": "node_01",
      "type": "events/onClick",
      "category": "event",
      "position": { "x": 100, "y": 200 },
      "size": "auto",
      "data": {
        "targetComponentId": "comp_checkout_btn"
      },
      "inputPins": [],
      "outputPins": [
        { "id": "pin_01_exec", "name": "execOut", "type": "execution" },
        { "id": "pin_01_target", "name": "target", "dataType": "component" }
      ],
      "isCollapsed": false,
      "commentText": null,
      "debugBreakpoint": false
    },
    {
      "id": "node_02",
      "type": "variables/set",
      "category": "variable",
      "position": { "x": 380, "y": 200 },
      "size": "auto",
      "data": {
        "variableName": "isProcessing",
        "value": true
      },
      "inputPins": [
        { "id": "pin_02_exec", "name": "execIn", "type": "execution" }
      ],
      "outputPins": [
        { "id": "pin_02_exec_out", "name": "execOut", "type": "execution" }
      ],
      "isCollapsed": false,
      "commentText": null,
      "debugBreakpoint": false
    },
    {
      "id": "node_03",
      "type": "database/query",
      "category": "database",
      "position": { "x": 660, "y": 200 },
      "size": "auto",
      "data": {
        "collectionId": "col_products",
        "filters": [],
        "sort": { "field": "price", "direction": "asc" },
        "limit": 50
      },
      "inputPins": [
        { "id": "pin_03_exec", "name": "execIn", "type": "execution" }
      ],
      "outputPins": [
        { "id": "pin_03_exec_out", "name": "execOut", "type": "execution" },
        { "id": "pin_03_results", "name": "results", "dataType": "array" },
        { "id": "pin_03_count", "name": "count", "dataType": "number" }
      ],
      "isCollapsed": false,
      "commentText": "Fetch all products sorted by price",
      "debugBreakpoint": false
    }
  ],
  "edges": [
    {
      "id": "edge_01",
      "fromNodeId": "node_01",
      "fromPinId": "pin_01_exec",
      "toNodeId": "node_02",
      "toPinId": "pin_02_exec",
      "wireType": "execution"
    },
    {
      "id": "edge_02",
      "fromNodeId": "node_02",
      "fromPinId": "pin_02_exec_out",
      "toNodeId": "node_03",
      "toPinId": "pin_03_exec",
      "wireType": "execution"
    }
  ],
  "commentBoxes": [
    {
      "id": "cbox_01",
      "position": { "x": 60, "y": 140 },
      "size": { "width": 900, "height": 200 },
      "color": "#DBEAFE",
      "title": "Checkout Initialization",
      "containedNodeIds": ["node_01", "node_02", "node_03"]
    }
  ]
}
```

---

## 6. Database Schema (`database/schema.json`)

Defines all collections, fields, indexes, and relationships.

```json
{
  "$schema": "https://visual-engine.dev/schemas/database-v1.json",
  "collections": [
    {
      "id": "col_users",
      "name": "Users",
      "fields": [
        { "name": "id", "type": "string", "isPrimaryKey": true, "isRequired": true, "isUnique": true, "defaultValue": null },
        { "name": "email", "type": "string", "isPrimaryKey": false, "isRequired": true, "isUnique": true, "defaultValue": null },
        { "name": "name", "type": "string", "isPrimaryKey": false, "isRequired": true, "isUnique": false, "defaultValue": null },
        { "name": "passwordHash", "type": "string", "isPrimaryKey": false, "isRequired": true, "isUnique": false, "defaultValue": null },
        { "name": "role", "type": "enum", "isPrimaryKey": false, "isRequired": true, "isUnique": false, "defaultValue": "customer", "enumValues": ["admin", "editor", "customer"] },
        { "name": "createdAt", "type": "datetime", "isPrimaryKey": false, "isRequired": true, "isUnique": false, "defaultValue": "now()" }
      ],
      "indexes": [
        { "fields": ["email"], "isUnique": true, "type": "btree" },
        { "fields": ["role"], "isUnique": false, "type": "btree" }
      ]
    },
    {
      "id": "col_products",
      "name": "Products",
      "fields": [
        { "name": "id", "type": "string", "isPrimaryKey": true, "isRequired": true, "isUnique": true, "defaultValue": null },
        { "name": "name", "type": "string", "isPrimaryKey": false, "isRequired": true, "isUnique": false, "defaultValue": null },
        { "name": "price", "type": "number", "isPrimaryKey": false, "isRequired": true, "isUnique": false, "defaultValue": 0 },
        { "name": "stock", "type": "number", "isPrimaryKey": false, "isRequired": true, "isUnique": false, "defaultValue": 0 },
        { "name": "imageUrl", "type": "string", "isPrimaryKey": false, "isRequired": false, "isUnique": false, "defaultValue": null }
      ],
      "indexes": []
    },
    {
      "id": "col_orders",
      "name": "Orders",
      "fields": [
        { "name": "id", "type": "string", "isPrimaryKey": true, "isRequired": true, "isUnique": true, "defaultValue": null },
        { "name": "userId", "type": "string", "isPrimaryKey": false, "isRequired": true, "isUnique": false, "defaultValue": null },
        { "name": "totalAmount", "type": "number", "isPrimaryKey": false, "isRequired": true, "isUnique": false, "defaultValue": 0 },
        { "name": "status", "type": "enum", "isPrimaryKey": false, "isRequired": true, "isUnique": false, "defaultValue": "pending", "enumValues": ["pending", "processing", "shipped", "delivered", "cancelled"] },
        { "name": "createdAt", "type": "datetime", "isPrimaryKey": false, "isRequired": true, "isUnique": false, "defaultValue": "now()" }
      ],
      "indexes": [
        { "fields": ["userId"], "isUnique": false, "type": "btree" },
        { "fields": ["status"], "isUnique": false, "type": "btree" }
      ]
    }
  ],
  "relations": [
    {
      "id": "rel_user_orders",
      "fromCollection": "col_users",
      "fromField": "id",
      "toCollection": "col_orders",
      "toField": "userId",
      "cardinality": "1:N",
      "onDelete": "cascade"
    }
  ]
}
```

---

## 7. Motion Timeline (`*.motion.json`)

Defines a GSAP-powered animation timeline.

```json
{
  "$schema": "https://visual-engine.dev/schemas/motion-v1.json",
  "id": "motion_hero_entrance",
  "name": "Hero Entrance",
  "duration": 1.2,
  "loop": false,
  "autoPlay": true,
  "triggerType": "load",
  "scrollTrigger": null,
  "tracks": [
    {
      "targetComponentId": "comp_hero_01",
      "property": "opacity",
      "keyframes": [
        { "time": 0.0, "value": 0, "easing": "none", "controlPoints": null },
        { "time": 0.8, "value": 1, "easing": "power3.out", "controlPoints": null }
      ]
    },
    {
      "targetComponentId": "comp_hero_01",
      "property": "translateY",
      "keyframes": [
        { "time": 0.0, "value": 60, "easing": "none", "controlPoints": null },
        { "time": 0.8, "value": 0, "easing": "power3.out", "controlPoints": null }
      ]
    },
    {
      "targetComponentId": "comp_cta_01",
      "property": "opacity",
      "keyframes": [
        { "time": 0.0, "value": 0, "easing": "none", "controlPoints": null },
        { "time": 0.4, "value": 0, "easing": "none", "controlPoints": null },
        { "time": 1.0, "value": 1, "easing": "power2.out", "controlPoints": null }
      ]
    },
    {
      "targetComponentId": "comp_cta_01",
      "property": "scale",
      "keyframes": [
        { "time": 0.4, "value": 0.8, "easing": "none", "controlPoints": null },
        { "time": 1.0, "value": 1.0, "easing": "back.out(1.7)", "controlPoints": null }
      ]
    }
  ]
}
```

---

## 8. API Integration (`*.api.json`)

Defines an external API connection with endpoints.

```json
{
  "$schema": "https://visual-engine.dev/schemas/api-v1.json",
  "id": "api_stripe_01",
  "name": "Stripe Payments",
  "baseUrl": "${env.STRIPE_API_URL}",
  "authType": "bearer",
  "authConfig": {
    "tokenSource": "${env.STRIPE_SECRET_KEY}",
    "headerName": "Authorization",
    "prefix": "Bearer"
  },
  "endpoints": [
    {
      "id": "ep_create_session",
      "name": "Create Checkout Session",
      "method": "POST",
      "path": "/v1/checkout/sessions",
      "queryParams": [],
      "requestBody": {
        "type": "object",
        "properties": {
          "line_items": { "type": "array" },
          "mode": { "type": "string", "default": "payment" },
          "success_url": { "type": "string" },
          "cancel_url": { "type": "string" }
        }
      },
      "responseSchema": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "url": { "type": "string" },
          "status": { "type": "string" }
        }
      },
      "headers": {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  ]
}
```

---

## 9. State Variables (`*.state.json`)

Defines reactive state variables.

```json
{
  "$schema": "https://visual-engine.dev/schemas/state-v1.json",
  "globalVariables": [
    {
      "name": "currentUser",
      "type": "object",
      "defaultValue": null,
      "isPersisted": true,
      "scope": "global"
    },
    {
      "name": "cartItems",
      "type": "array",
      "defaultValue": [],
      "isPersisted": true,
      "scope": "session"
    },
    {
      "name": "themeMode",
      "type": "string",
      "defaultValue": "light",
      "isPersisted": true,
      "scope": "global"
    },
    {
      "name": "isLoading",
      "type": "boolean",
      "defaultValue": false,
      "isPersisted": false,
      "scope": "global"
    }
  ],
  "computedVariables": [
    {
      "name": "cartTotal",
      "type": "number",
      "dependencies": ["cartItems"],
      "expression": "cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)"
    },
    {
      "name": "cartItemCount",
      "type": "number",
      "dependencies": ["cartItems"],
      "expression": "cartItems.length"
    },
    {
      "name": "isAuthenticated",
      "type": "boolean",
      "dependencies": ["currentUser"],
      "expression": "currentUser !== null"
    }
  ]
}
```

---

## 10. Theme & Design Tokens (`config/theme.json`)

Defines the application's visual design system.

```json
{
  "$schema": "https://visual-engine.dev/schemas/theme-v1.json",
  "colors": {
    "primary": "#3B82F6",
    "primaryHover": "#2563EB",
    "secondary": "#64748B",
    "success": "#10B981",
    "warning": "#F59E0B",
    "error": "#EF4444",
    "background": "#FFFFFF",
    "surface": "#F8FAFC",
    "text": "#0F172A",
    "textMuted": "#64748B",
    "border": "#E2E8F0"
  },
  "typography": {
    "fontFamily": "'Inter', -apple-system, sans-serif",
    "fontFamilyMono": "'JetBrains Mono', monospace",
    "scale": {
      "xs": "12px",
      "sm": "14px",
      "base": "16px",
      "lg": "18px",
      "xl": "20px",
      "2xl": "24px",
      "3xl": "30px",
      "4xl": "36px"
    },
    "weights": {
      "regular": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700
    }
  },
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px",
    "2xl": "48px",
    "3xl": "64px"
  },
  "radii": {
    "sm": "4px",
    "md": "8px",
    "lg": "12px",
    "xl": "16px",
    "full": "9999px"
  },
  "shadows": {
    "sm": "0 1px 2px rgba(0, 0, 0, 0.05)",
    "md": "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    "lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    "xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
  }
}
```

---

## 11. Authentication Config (`config/auth.json`)

```json
{
  "$schema": "https://visual-engine.dev/schemas/auth-v1.json",
  "provider": "credentials",
  "oauthProviders": [
    { "name": "google", "clientId": "${env.GOOGLE_CLIENT_ID}", "clientSecret": "${env.GOOGLE_CLIENT_SECRET}" }
  ],
  "roles": [
    { "name": "admin", "permissions": ["*"] },
    { "name": "editor", "permissions": ["read:products", "write:products", "read:orders"] },
    { "name": "customer", "permissions": ["read:products", "write:orders", "read:orders:own"] }
  ],
  "protectedRoutes": {
    "page_dashboard": ["admin", "editor"],
    "page_checkout": ["customer", "admin"]
  },
  "session": {
    "strategy": "jwt",
    "maxAge": 2592000,
    "updateAge": 86400
  }
}
```

---

## 12. Schema Versioning Strategy

All schemas include a `$schema` URL with a version suffix (e.g., `project-v1.json`). When breaking changes are introduced:

1. The schema version increments (e.g., `project-v2.json`)
2. A migration function is implemented in `src/core/ast/migrations/`
3. On project load, the engine checks the schema version and auto-migrates if needed
4. The migration is logged in the console and a snapshot is created before migration

```
project-v1.json  →  migration_v1_to_v2()  →  project-v2.json
```

This ensures backward compatibility and prevents data loss during engine upgrades.
