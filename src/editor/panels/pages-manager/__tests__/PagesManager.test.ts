import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { useProjectStore } from "../../../../core/store/useProjectStore";
import {
  extractRouteParameters,
  normalizeRouteSlug,
} from "../../../../core/types/routing";
import { DiagnosticBus } from "../../../../core/engine/DiagnosticBus";

describe("Sub-Phase 6.5: Pages & Routing Manager (Panel 30)", () => {
  describe("Route Slug & Parameter Extraction Utilities", () => {
    it("normalizes route slugs to standard App Router format", () => {
      assert.strictEqual(normalizeRouteSlug(""), "/");
      assert.strictEqual(normalizeRouteSlug("   "), "/");
      assert.strictEqual(normalizeRouteSlug("/"), "/");
      assert.strictEqual(normalizeRouteSlug("about"), "/about");
      assert.strictEqual(normalizeRouteSlug("/products/"), "/products");
      assert.strictEqual(normalizeRouteSlug("blog/posts/"), "/blog/posts");
    });

    it("extracts dynamic parameters from Next.js [param] slugs", () => {
      const staticParams = extractRouteParameters("/about/contact");
      assert.strictEqual(staticParams.length, 0);

      const singleParams = extractRouteParameters("/products/[id]");
      assert.strictEqual(singleParams.length, 1);
      assert.strictEqual(singleParams[0].name, "id");
      assert.strictEqual(singleParams[0].required, true);

      const multiParams = extractRouteParameters("/shop/[category]/[productId]");
      assert.strictEqual(multiParams.length, 2);
      assert.strictEqual(multiParams[0].name, "category");
      assert.strictEqual(multiParams[1].name, "productId");

      const expressParams = extractRouteParameters("/users/:userId/posts/:postId");
      assert.strictEqual(expressParams.length, 2);
      assert.strictEqual(expressParams[0].name, "userId");
      assert.strictEqual(expressParams[1].name, "postId");
    });
  });

  describe("useProjectStore Page Management Actions", () => {
    beforeEach(() => {
      // Reset store to known baseline
      useProjectStore.setState({
        activePageId: "page_home",
        pages: {
          page_home: {
            id: "page_home",
            name: "Home",
            slug: "/",
            rootElementId: "el_root_container",
          },
        },
        elements: {
          el_root_container: {
            id: "el_root_container",
            name: "Home Container",
            archetype: "container",
            parentId: null,
            children: [],
            properties: {},
          },
        },
        redirectRules: {},
      });
    });

    it("adds a new page and automatically extracts dynamic parameters", () => {
      const store = useProjectStore.getState();
      const pageId = store.addPage({
        name: "Product Detail",
        slug: "/products/[id]",
        guard: { type: "public" },
      });

      const updated = useProjectStore.getState();
      assert.ok(updated.pages[pageId], "New page must exist in store");
      assert.strictEqual(updated.pages[pageId].name, "Product Detail");
      assert.strictEqual(updated.pages[pageId].slug, "/products/[id]");
      assert.strictEqual(updated.pages[pageId].isDynamic, true);
      assert.strictEqual(updated.pages[pageId].parameters?.length, 1);
      assert.strictEqual(updated.pages[pageId].parameters?.[0].name, "id");
      assert.strictEqual(updated.activePageId, pageId, "Adding page sets it as active");
      assert.ok(updated.elements[updated.pages[pageId].rootElementId], "Creates root element");
    });

    it("switches active page via setActivePage", () => {
      const store = useProjectStore.getState();
      const pageId = store.addPage({
        name: "About Us",
        slug: "/about",
      });

      store.setActivePage("page_home");
      assert.strictEqual(useProjectStore.getState().activePageId, "page_home");

      store.setActivePage(pageId);
      assert.strictEqual(useProjectStore.getState().activePageId, pageId);
    });

    it("updates page title, slug, and re-parses parameters", () => {
      const store = useProjectStore.getState();
      const pageId = store.addPage({
        name: "Old Title",
        slug: "/old-slug",
      });

      store.updatePage(pageId, {
        name: "New Catalog",
        slug: "/catalog/[category]/[id]",
        guard: { type: "auth", redirectUrl: "/login" },
      });

      const updatedPage = useProjectStore.getState().pages[pageId];
      assert.strictEqual(updatedPage.name, "New Catalog");
      assert.strictEqual(updatedPage.slug, "/catalog/[category]/[id]");
      assert.strictEqual(updatedPage.isDynamic, true);
      assert.strictEqual(updatedPage.parameters?.length, 2);
      assert.strictEqual(updatedPage.guard?.type, "auth");
      assert.strictEqual(updatedPage.guard?.redirectUrl, "/login");
    });

    it("duplicates page with cloned root element and unique slug", () => {
      const store = useProjectStore.getState();
      const copyId = store.duplicatePage("page_home");

      const state = useProjectStore.getState();
      assert.ok(state.pages[copyId], "Duplicated page must exist");
      assert.strictEqual(state.pages[copyId].name, "Home (Copy)");
      assert.strictEqual(state.pages[copyId].slug, "/home-copy");
      assert.strictEqual(state.activePageId, copyId, "Active page switches to duplicated copy");
      assert.ok(state.elements[state.pages[copyId].rootElementId], "Cloned root element exists");
    });

    it("deletes a page and resets activePageId safely, preventing last page deletion", () => {
      const store = useProjectStore.getState();
      const tempId = store.addPage({ name: "Temporary", slug: "/temp" });

      assert.strictEqual(Object.keys(useProjectStore.getState().pages).length, 2);
      assert.strictEqual(useProjectStore.getState().activePageId, tempId);

      // Delete the newly active page
      store.deletePage(tempId);

      const stateAfterDelete = useProjectStore.getState();
      assert.strictEqual(Object.keys(stateAfterDelete.pages).length, 1);
      assert.strictEqual(stateAfterDelete.pages[tempId], undefined);
      assert.strictEqual(stateAfterDelete.activePageId, "page_home");

      // Attempt to delete the last page (must be protected)
      store.deletePage("page_home");
      assert.strictEqual(Object.keys(useProjectStore.getState().pages).length, 1, "Cannot delete last page");
    });

    it("detects route collisions and dispatches [ROUTE_COLLISION] diagnostics", () => {
      const diagnosticEvents: any[] = [];
      const unsub = DiagnosticBus.subscribe((e) => {
        if (e.channel === "ROUTE_COLLISION") {
          diagnosticEvents.push(e);
        }
      });

      const store = useProjectStore.getState();
      store.addPage({ name: "User By ID", slug: "/users/[id]" });
      store.addPage({ name: "User By Name", slug: "/users/[username]" });

      const collisions = store.detectRouteCollisions();
      assert.ok(collisions.length > 0, "Must detect colliding route patterns");
      assert.ok(diagnosticEvents.length > 0, "Must dispatch ROUTE_COLLISION diagnostic event");
      assert.ok(diagnosticEvents[0].message.includes("collision"));

      unsub();
    });
  });

  describe("Redirect Rules Management", () => {
    it("adds, updates, and deletes redirect rules", () => {
      const store = useProjectStore.getState();
      const ruleId = store.addRedirectRule({
        sourcePattern: "/legacy-blog",
        targetPattern: "/blog",
        statusCode: 301,
        description: "Legacy redirect",
      });

      let state = useProjectStore.getState();
      assert.ok(state.redirectRules[ruleId]);
      assert.strictEqual(state.redirectRules[ruleId].sourcePattern, "/legacy-blog");
      assert.strictEqual(state.redirectRules[ruleId].targetPattern, "/blog");
      assert.strictEqual(state.redirectRules[ruleId].statusCode, 301);

      // Update
      store.updateRedirectRule(ruleId, {
        statusCode: 308,
      });
      state = useProjectStore.getState();
      assert.strictEqual(state.redirectRules[ruleId].statusCode, 308);

      // Delete
      store.deleteRedirectRule(ruleId);
      state = useProjectStore.getState();
      assert.strictEqual(state.redirectRules[ruleId], undefined);
    });
  });
});
