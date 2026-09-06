"use client";

/**
 * ============================================================================
 * DATABASE LATCH PICKER MODAL (UNREAL-STYLE BIND / REFERENCE PICKER)
 * ============================================================================
 * UI Element: Searchable Target Selection Dialog
 * Screen / Scope: Database Studio (Details Panel & Viewport Drill-Down)
 * Role: Allows developers to pick exactly which Logic Blueprint function, API endpoint,
 *       or UI component they want to latch a database collection/field into.
 * Architecture: Modeled after Unreal Engine's Class/Function Picker & Reference Viewer.
 * ============================================================================
 */

import React, { useState, useMemo } from "react";
import {
  Search,
  Workflow,
  Server,
  Layers,
  Plus,
  Check,
  X,
  Zap,
  ArrowRight,
  Filter,
  ShieldAlert,
} from "lucide-react";
import { DatabaseFunctionLatch } from "@/core/store/useProjectStore";

export interface LatchCandidate {
  id: string;
  category: "blueprint" | "api" | "component";
  groupTitle: string;
  functionName: string;
  sourceFile: string;
  operation: "READ" | "CREATE" | "UPDATE" | "DELETE";
  description: string;
  paramSignature: string;
  relevantFields?: string[];
}

interface DatabaseLatchPickerModalProps {
  isOpen: boolean;
  targetCollection: string;
  targetField?: string | null;
  existingLatches?: DatabaseFunctionLatch[];
  onSelectLatch: (candidate: LatchCandidate) => void;
  onClose: () => void;
}

export const DatabaseLatchPickerModal: React.FC<DatabaseLatchPickerModalProps> = ({
  isOpen,
  targetCollection,
  targetField,
  existingLatches = [],
  onSelectLatch,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "blueprint" | "api" | "component">("all");
  const [selectedOperation, setSelectedOperation] = useState<"all" | "READ" | "CREATE" | "UPDATE" | "DELETE">("all");

  const targetKey = targetField ? `${targetCollection}.${targetField}` : targetCollection;

  // Comprehensive Unreal-style candidate catalog
  const CANDIDATES: LatchCandidate[] = useMemo(() => [
    // 1. Cart & Checkout Logic Blueprints
    {
      id: "cart_add_item",
      category: "blueprint",
      groupTitle: "Cart Operations (src/blueprints/cart.bp)",
      functionName: "addToCart",
      paramSignature: `(productId: Int, quantity: Int, unitPrice: Float)`,
      sourceFile: "src/blueprints/cart.bp",
      operation: "CREATE",
      description: `Appends item to customer cart state, validating ${targetCollection} inventory and unit price.`,
      relevantFields: ["id", "price", "title", "inventory"],
    },
    {
      id: "cart_update_qty",
      category: "blueprint",
      groupTitle: "Cart Operations (src/blueprints/cart.bp)",
      functionName: "updateCartQuantity",
      paramSignature: `(productId: Int, newQuantity: Int)`,
      sourceFile: "src/blueprints/cart.bp",
      operation: "UPDATE",
      description: `Mutates active line item quantity and recalibrates line subtotal against ${targetCollection}.`,
      relevantFields: ["id", "inventory"],
    },
    {
      id: "checkout_calc_subtotal",
      category: "blueprint",
      groupTitle: "Checkout Workflow (src/blueprints/checkout.bp)",
      functionName: "calculateOrderSubtotal",
      paramSignature: `(cartItems: CartItem[])`,
      sourceFile: "src/blueprints/checkout.bp",
      operation: "READ",
      description: `Queries ${targetCollection} unit prices to compute final checkout order total with taxes.`,
      relevantFields: ["id", "price"],
    },
    {
      id: "checkout_validate_stock",
      category: "blueprint",
      groupTitle: "Checkout Workflow (src/blueprints/checkout.bp)",
      functionName: "validateStockAvailability",
      paramSignature: `(productId: Int, quantityRequired: Int)`,
      sourceFile: "src/blueprints/checkout.bp",
      operation: "READ",
      description: `Verifies ${targetCollection} stock inventory before dispatching payment authorization.`,
      relevantFields: ["id", "inventory"],
    },
    {
      id: "checkout_deduct_inventory",
      category: "blueprint",
      groupTitle: "Checkout Workflow (src/blueprints/checkout.bp)",
      functionName: "deductInventoryOnOrderSuccess",
      paramSignature: `(orderId: String, items: OrderItem[])`,
      sourceFile: "src/blueprints/checkout.bp",
      operation: "UPDATE",
      description: `Executes database transaction decrementing ${targetCollection} inventory upon payment confirmation.`,
      relevantFields: ["id", "inventory"],
    },

    // 2. Catalog & Discovery Blueprints
    {
      id: "catalog_filter",
      category: "blueprint",
      groupTitle: "Catalog Discovery (src/blueprints/catalog.bp)",
      functionName: "filterCatalogByCategory",
      paramSignature: `(category: String, minPrice: Float, maxPrice: Float)`,
      sourceFile: "src/blueprints/catalog.bp",
      operation: "READ",
      description: `Filter query extracting records from ${targetCollection} matching filter predicates.`,
      relevantFields: ["category", "price", "title"],
    },
    {
      id: "catalog_search",
      category: "blueprint",
      groupTitle: "Catalog Discovery (src/blueprints/catalog.bp)",
      functionName: "searchCatalogByKeywords",
      paramSignature: `(searchTerm: String, limit: Int)`,
      sourceFile: "src/blueprints/catalog.bp",
      operation: "READ",
      description: `Full-text search query querying ${targetCollection} title and description columns.`,
      relevantFields: ["title", "description"],
    },
    {
      id: "catalog_single_product",
      category: "blueprint",
      groupTitle: "Catalog Discovery (src/blueprints/catalog.bp)",
      functionName: "fetchProductDetailById",
      paramSignature: `(id: Int)`,
      sourceFile: "src/blueprints/catalog.bp",
      operation: "READ",
      description: `findUnique query loading full record for single-page view.`,
      relevantFields: ["id"],
    },

    // 3. Admin CMS & CRUD Workflows
    {
      id: "admin_create_record",
      category: "blueprint",
      groupTitle: "Admin Management (src/blueprints/admin-cms.bp)",
      functionName: `create${targetCollection}Record`,
      paramSignature: `(data: Record<string, any>)`,
      sourceFile: "src/blueprints/admin-cms.bp",
      operation: "CREATE",
      description: `Inserts a new record row into ${targetCollection} with schema validation.`,
    },
    {
      id: "admin_update_record",
      category: "blueprint",
      groupTitle: "Admin Management (src/blueprints/admin-cms.bp)",
      functionName: `update${targetCollection}Field`,
      paramSignature: `(id: Int, fieldKey: String, newValue: any)`,
      sourceFile: "src/blueprints/admin-cms.bp",
      operation: "UPDATE",
      description: `Mutates column value in ${targetCollection} with admin audit logging.`,
      relevantFields: ["price", "title", "inventory"],
    },
    {
      id: "admin_delete_record",
      category: "blueprint",
      groupTitle: "Admin Management (src/blueprints/admin-cms.bp)",
      functionName: `delete${targetCollection}Record`,
      paramSignature: `(id: Int, cascade: Boolean)`,
      sourceFile: "src/blueprints/admin-cms.bp",
      operation: "DELETE",
      description: `Deletes row from ${targetCollection} and executes referential constraint triggers.`,
      relevantFields: ["id"],
    },

    // 4. API Endpoints & Server Handlers
    {
      id: "api_post_cart",
      category: "api",
      groupTitle: "REST Endpoints (src/app/api/cart/route.ts)",
      functionName: "POST /api/cart",
      paramSignature: `Request { productId, qty }`,
      sourceFile: "src/app/api/cart/route.ts",
      operation: "CREATE",
      description: `REST endpoint linking client cart items to ${targetCollection} database records.`,
      relevantFields: ["id", "price"],
    },
    {
      id: "api_get_products",
      category: "api",
      groupTitle: "REST Endpoints (src/app/api/products/route.ts)",
      functionName: `GET /api/${targetCollection.toLowerCase()}`,
      paramSignature: `Query { page, limit, sort }`,
      sourceFile: `src/app/api/${targetCollection.toLowerCase()}/route.ts`,
      operation: "READ",
      description: `Next.js Route Handler querying paginated ${targetCollection} rows.`,
    },
    {
      id: "api_put_products",
      category: "api",
      groupTitle: "REST Endpoints (src/app/api/products/[id]/route.ts)",
      functionName: `PUT /api/${targetCollection.toLowerCase()}/[id]`,
      paramSignature: `Body { ...fields }`,
      sourceFile: `src/app/api/${targetCollection.toLowerCase()}/[id]/route.ts`,
      operation: "UPDATE",
      description: `Server Action updating ${targetCollection} attributes based on client payload.`,
      relevantFields: ["price", "title", "inventory"],
    },

    // 5. UI Component Data Bindings
    {
      id: "ui_grid_datasource",
      category: "component",
      groupTitle: "UI Component Bindings (src/editor/canvas)",
      functionName: `${targetCollection}Grid.dataSource`,
      paramSignature: `Array<${targetCollection}Record>`,
      sourceFile: "src/components/ProductGrid.tsx",
      operation: "READ",
      description: `Reactive data feed streaming ${targetCollection} records directly to UI component cards.`,
    },
    {
      id: "ui_price_display",
      category: "component",
      groupTitle: "UI Component Bindings (src/editor/canvas)",
      functionName: `${targetCollection}Card.priceText`,
      paramSignature: `formattedPrice: String`,
      sourceFile: "src/components/ProductCard.tsx",
      operation: "READ",
      description: `Binds formatted ${targetCollection}.price to rendered text label.`,
      relevantFields: ["price"],
    },
    {
      id: "ui_add_to_cart_btn",
      category: "component",
      groupTitle: "UI Component Bindings (src/editor/canvas)",
      functionName: "AddToCartButton.onClick",
      paramSignature: `Event: MouseClick(payload: ${targetCollection})`,
      sourceFile: "src/components/AddToCartButton.tsx",
      operation: "CREATE",
      description: `Dispatches active record row into the Logic Blueprint event stream.`,
      relevantFields: ["id", "price"],
    },
  ], [targetCollection]);

  // Filtered candidate list based on user search and filter tabs
  const filteredCandidates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return CANDIDATES.filter((c) => {
      // Category filter
      if (selectedCategory !== "all" && c.category !== selectedCategory) return false;

      // Operation filter
      if (selectedOperation !== "all" && c.operation !== selectedOperation) return false;

      // Search query
      if (!q) return true;
      return (
        c.functionName.toLowerCase().includes(q) ||
        c.groupTitle.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.paramSignature.toLowerCase().includes(q) ||
        (c.relevantFields && c.relevantFields.some((f) => f.toLowerCase().includes(q)))
      );
    });
  }, [CANDIDATES, searchQuery, selectedCategory, selectedOperation]);

  if (!isOpen) return null;

  const isAlreadyLatched = (candidate: LatchCandidate) => {
    return existingLatches.some(
      (l) => l.functionName === candidate.functionName && l.sourceFile === candidate.sourceFile
    );
  };

  const getOperationBadgeStyle = (op: "READ" | "CREATE" | "UPDATE" | "DELETE") => {
    switch (op) {
      case "READ":
        return { bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" };
      case "CREATE":
        return { bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" };
      case "UPDATE":
        return { bg: "#FEF3C7", color: "#D97706", border: "#FDE68A" };
      case "DELETE":
        return { bg: "#FEE2E2", color: "#DC2626", border: "#FECACA" };
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 680,
          maxHeight: "85vh",
          backgroundColor: "#FFFFFF",
          borderRadius: "var(--radius-lg, 12px)",
          border: "1px solid rgba(15, 23, 42, 0.12)",
          boxShadow: "0 24px 48px -12px rgba(15, 23, 42, 0.2), 0 4px 16px -2px rgba(15, 23, 42, 0.08)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header (Unreal Engine Style Reference Picker) */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#F8FAFC",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: "#EFF6FF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563EB",
              }}
            >
              <Workflow size={17} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: 6 }}>
                <span>Select Latch Target (Bind / Reference Picker)</span>
              </div>
              <div style={{ fontSize: 11, color: "#64748B" }}>
                Target: <strong style={{ color: "#0F172A" }}>{targetKey}</strong> • Pick a function, blueprint, or API route to attach this entity to.
              </div>
            </div>
          </div>

          <button
            type="button"
            className="panel-icon-btn"
            onClick={onClose}
            title="Close (Esc)"
            style={{ width: 26, height: 26 }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: "12px 18px 8px 18px", backgroundColor: "#FFFFFF" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 12px",
              backgroundColor: "#F8FAFC",
              border: "1px solid rgba(15, 23, 42, 0.12)",
              borderRadius: "var(--radius-sm, 6px)",
            }}
          >
            <Search size={14} style={{ color: "#64748B", flexShrink: 0 }} />
            <input
              type="text"
              autoFocus
              placeholder="Search functions, blueprints, API routes, or components (e.g. cart, checkout, price)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 12,
                color: "#0F172A",
                width: "100%",
                fontFamily: "var(--font-sans)",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", padding: 0 }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Filters Strip (Category Tabs & Operation Badges) */}
        <div
          style={{
            padding: "4px 18px 10px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
          }}
        >
          {/* Category Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className="db-view-btn"
              style={{
                padding: "3px 8px",
                fontSize: 11,
                fontWeight: selectedCategory === "all" ? 600 : 400,
                backgroundColor: selectedCategory === "all" ? "#EFF6FF" : "transparent",
                color: selectedCategory === "all" ? "#2563EB" : "#64748B",
              }}
            >
              All ({CANDIDATES.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("blueprint")}
              className="db-view-btn"
              style={{
                padding: "3px 8px",
                fontSize: 11,
                fontWeight: selectedCategory === "blueprint" ? 600 : 400,
                backgroundColor: selectedCategory === "blueprint" ? "#EFF6FF" : "transparent",
                color: selectedCategory === "blueprint" ? "#2563EB" : "#64748B",
              }}
            >
              <Workflow size={10} />
              <span>Blueprints</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("api")}
              className="db-view-btn"
              style={{
                padding: "3px 8px",
                fontSize: 11,
                fontWeight: selectedCategory === "api" ? 600 : 400,
                backgroundColor: selectedCategory === "api" ? "#EFF6FF" : "transparent",
                color: selectedCategory === "api" ? "#2563EB" : "#64748B",
              }}
            >
              <Server size={10} />
              <span>API Routes</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("component")}
              className="db-view-btn"
              style={{
                padding: "3px 8px",
                fontSize: 11,
                fontWeight: selectedCategory === "component" ? 600 : 400,
                backgroundColor: selectedCategory === "component" ? "#EFF6FF" : "transparent",
                color: selectedCategory === "component" ? "#2563EB" : "#64748B",
              }}
            >
              <Layers size={10} />
              <span>UI Components</span>
            </button>
          </div>

          {/* Operation Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            {(["all", "READ", "CREATE", "UPDATE", "DELETE"] as const).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => setSelectedOperation(op)}
                style={{
                  fontSize: 9.5,
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: selectedOperation === op ? "#2563EB" : "rgba(15, 23, 42, 0.08)",
                  backgroundColor: selectedOperation === op ? "#EFF6FF" : "transparent",
                  color: selectedOperation === op ? "#2563EB" : "#64748B",
                  cursor: "pointer",
                }}
              >
                {op}
              </button>
            ))}
          </div>
        </div>

        {/* Candidate List Scroll Area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredCandidates.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "#64748B" }}>
              <Filter size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>No matching functions or blueprints found.</p>
              <p style={{ margin: "4px 0 0 0", fontSize: 11, color: "#94A3B8" }}>Try adjusting your search query or filters.</p>
            </div>
          ) : (
            filteredCandidates.map((candidate) => {
              const latched = isAlreadyLatched(candidate);
              const badgeStyle = getOperationBadgeStyle(candidate.operation);

              return (
                <div
                  key={candidate.id}
                  style={{
                    backgroundColor: latched ? "#F8FAFC" : "#FFFFFF",
                    border: `1px solid ${latched ? "#BFDBFE" : "rgba(15, 23, 42, 0.08)"}`,
                    borderRadius: "var(--radius-sm, 8px)",
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {candidate.category === "blueprint" && <Workflow size={13} style={{ color: "#2563EB" }} />}
                      {candidate.category === "api" && <Server size={13} style={{ color: "#D97706" }} />}
                      {candidate.category === "component" && <Layers size={13} style={{ color: "#16A34A" }} />}

                      <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                        {candidate.functionName}
                      </span>

                      <span
                        style={{
                          fontSize: 8.5,
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: 3,
                          backgroundColor: badgeStyle.bg,
                          color: badgeStyle.color,
                          border: `1px solid ${badgeStyle.border}`,
                        }}
                      >
                        {candidate.operation}
                      </span>
                    </div>

                    {latched ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: "#16A34A",
                          backgroundColor: "#F0FDF4",
                          padding: "2px 8px",
                          borderRadius: 4,
                          border: "1px solid #BBF7D0",
                        }}
                      >
                        <Check size={11} />
                        <span>Attached</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="details-add-button"
                        onClick={() => onSelectLatch(candidate)}
                        style={{ height: 24, padding: "0 10px", fontSize: 11 }}
                      >
                        <Plus size={11} className="details-add-button__icon" />
                        <span>Attach Latch</span>
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: 10, color: "#64748B", fontFamily: "var(--font-mono)" }}>
                    {candidate.groupTitle} • Signature: <code>{candidate.paramSignature}</code>
                  </div>

                  <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    {candidate.description}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "10px 18px",
            borderTop: "1px solid rgba(15, 23, 42, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#F8FAFC",
            fontSize: 11,
            color: "#64748B",
          }}
        >
          <span>Tip: Selecting a function connects AST data flow and unlocks 1-click navigation in the inspector.</span>
          <button
            type="button"
            className="db-view-btn"
            onClick={onClose}
            style={{ padding: "4px 12px", fontSize: 11 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
