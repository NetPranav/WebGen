import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GlobalSearchEngine } from "../../../../runtime/GlobalSearchEngine";
import { useProjectStore } from "../../../../core/store/useProjectStore";
import { useSelectionStore } from "../../../../core/store/useSelectionStore";
import { loadDocument } from "@/core/document/migrations";

describe("Sub-Phase 7.2: Global Search Engine / Find in Blueprints (Panel 25)", () => {
  beforeEach(() => {
    // Populate store with rich cross-domain entities for indexing
    useProjectStore.setState({
      projectName: "Search Studio App",
      activePageId: "page_home",
      pages: {
        page_home: {
          id: "page_home",
          name: "Home",
          slug: "/",
          rootElementId: "el_root",
          metaTitle: "Welcome Home",
          metaDescription: "Landing page for our visual app",
        },
        page_dashboard: {
          id: "page_dashboard",
          name: "User Dashboard",
          slug: "/dashboard/[userId]",
          rootElementId: "el_dash_root",
          metaTitle: "User Analytics & Dashboard",
        },
      },
      document: loadDocument({ elements: {
        el_root: {
          id: "el_root",
          name: "Hero Section Container",
          archetype: "container",
          parentId: null,
          children: ["el_btn_login"],
          properties: {
            "appearance.background.color": "#0E0F14",
            "layout.padding": "24px",
          },
        },
        el_btn_login: {
          id: "el_btn_login",
          name: "Primary Login Button",
          archetype: "button",
          parentId: "el_root",
          children: [],
          properties: {
            "content.label": "Sign In with SSO",
            "typography.color": "#6366F1",
            "input.placeholder": "Enter credentials",
          },
        },
      } }),
      blueprintGraphs: {
        graph_main: {
          id: "graph_main",
          name: "Main Event Graph",
          type: "event",
          nodes: {
            node_fetch_user: {
              id: "node_fetch_user",
              type: "api_fetch",
              title: "Fetch User Profile",
              position: { x: 100, y: 150 },
            },
            node_branch_role: {
              id: "node_branch_role",
              type: "branch",
              title: "Branch on Admin Role",
              position: { x: 400, y: 150 },
            },
          },
          wires: [],
          variables: [
            {
              id: "bvar_retry_count",
              name: "maxRetryCount",
              type: "number",
              defaultValue: 3,
            },
          ],
        },
      },
      stateVariables: {
        svar_current_user: {
          id: "svar_current_user",
          name: "currentUserSession",
          type: "json",
          value: { loggedIn: false },
          defaultValue: { loggedIn: false },
          scope: "global",
        },
        svar_theme: {
          id: "svar_theme",
          name: "themePreference",
          type: "string",
          value: "dark",
          defaultValue: "dark",
          scope: "global",
        },
      },
      databaseSchemas: {
        col_accounts: {
          id: "col_accounts",
          name: "Account",
          displayName: "User Accounts",
          description: "Relational customer account records",
          fields: {
            fld_acc_id: {
              id: "fld_acc_id",
              name: "accountId",
              type: "String",
              isPrimaryKey: true,
            },
            fld_email: {
              id: "fld_email",
              name: "emailAddress",
              type: "String",
              description: "Verified customer email",
            },
          },
        },
      },
      redirectRules: {
        redir_legacy: {
          id: "redir_legacy",
          sourcePattern: "/old-portal",
          targetPattern: "/dashboard",
          statusCode: 301,
          isActive: true,
        },
      },
    });

    // Rebuild search index with new state
    GlobalSearchEngine.rebuildIndex();
    GlobalSearchEngine.clearRecentSearches();
  });

  describe("Tokenization & Keyword Processing", () => {
    it("splits camelCase, snake_case, and kebab-case into normalized tokens", () => {
      const tokens1 = GlobalSearchEngine.tokenize("fetchUserProfileData");
      assert.deepStrictEqual(tokens1, ["fetch", "user", "profile", "data"]);

      const tokens2 = GlobalSearchEngine.tokenize("on_button_clicked-event");
      assert.deepStrictEqual(tokens2, ["on", "button", "clicked", "event"]);

      const tokens3 = GlobalSearchEngine.tokenize("/dashboard/[userId]/settings");
      assert.deepStrictEqual(tokens3, ["dashboard", "user", "id", "settings"]);
    });
  });

  describe("Cross-Domain Search & Indexing", () => {
    it("finds pages by title and route slug", () => {
      const pageResults = GlobalSearchEngine.search({
        query: "Dashboard",
        category: "pages",
      });
      assert.ok(pageResults.length > 0);
      assert.strictEqual(pageResults[0].entityType, "page");
      assert.strictEqual(pageResults[0].title, "User Dashboard");
      assert.strictEqual(pageResults[0].navigationPayload.targetPanel, "pages-manager");
    });

    it("finds visual canvas elements by name and property values", () => {
      const elemResults = GlobalSearchEngine.search({
        query: "Sign In",
        category: "elements",
      });
      assert.ok(elemResults.length > 0);
      assert.strictEqual(elemResults[0].entityType, "element");
      assert.strictEqual(elemResults[0].title, "Primary Login Button");
      assert.strictEqual(elemResults[0].navigationPayload.targetPanel, "canvas");
      assert.strictEqual(elemResults[0].navigationPayload.elementId, "el_btn_login");
    });

    it("finds Blueprint nodes by title, description, and category", () => {
      const nodeResults = GlobalSearchEngine.search({
        query: "Fetch User",
        category: "blueprints",
      });
      assert.ok(nodeResults.length > 0);
      assert.strictEqual(nodeResults[0].entityType, "blueprint_node");
      assert.strictEqual(nodeResults[0].title, "Fetch User Profile");
      assert.strictEqual(nodeResults[0].navigationPayload.targetPanel, "blueprint");
      assert.strictEqual(nodeResults[0].navigationPayload.nodeId, "node_fetch_user");
    });

    it("finds blueprint and global state variables", () => {
      const varResults = GlobalSearchEngine.search({
        query: "retryCount",
        category: "variables",
      });
      assert.ok(varResults.length > 0);
      assert.strictEqual(varResults[0].entityType, "blueprint_variable");
      assert.strictEqual(varResults[0].title, "maxRetryCount");

      const stateResults = GlobalSearchEngine.search({
        query: "themePreference",
        category: "variables",
      });
      assert.ok(stateResults.length > 0);
      assert.strictEqual(stateResults[0].entityType, "state_variable");
      assert.strictEqual(stateResults[0].title, "themePreference");
    });

    it("finds database collections and fields", () => {
      const dbResults = GlobalSearchEngine.search({
        query: "emailAddress",
        category: "database",
      });
      assert.ok(dbResults.length > 0);
      assert.strictEqual(dbResults[0].entityType, "database_field");
      assert.strictEqual(dbResults[0].title, "emailAddress");
      assert.strictEqual(dbResults[0].navigationPayload.targetPanel, "database");
    });

    it("finds API redirect endpoints", () => {
      const apiResults = GlobalSearchEngine.search({
        query: "old-portal",
        category: "api",
      });
      assert.ok(apiResults.length > 0);
      assert.strictEqual(apiResults[0].entityType, "api_endpoint");
      assert.ok(apiResults[0].title.includes("/old-portal -> /dashboard"));
    });
  });

  describe("Ranking Scores & Search Filters", () => {
    it("ranks exact title matches higher than substring or content matches", () => {
      const results = GlobalSearchEngine.search({
        query: "Home",
        category: "all",
      });
      assert.ok(results.length > 0);
      // Page "Home" exact match should be #1
      assert.strictEqual(results[0].title, "Home");
      assert.strictEqual(results[0].matchScore, 100);
    });

    it("filters results strictly according to specified category", () => {
      const pageOnly = GlobalSearchEngine.search({
        query: "User",
        category: "pages",
      });
      for (const item of pageOnly) {
        assert.strictEqual(item.entityType, "page");
      }

      const nodeOnly = GlobalSearchEngine.search({
        query: "User",
        category: "blueprints",
      });
      for (const item of nodeOnly) {
        assert.strictEqual(item.entityType, "blueprint_node");
      }
    });

    it("respects caseSensitive and exactMatch flags", () => {
      const caseResults = GlobalSearchEngine.search({
        query: "HOME",
        category: "all",
        caseSensitive: true,
      });
      assert.strictEqual(caseResults.length, 0);

      const exactResults = GlobalSearchEngine.search({
        query: "Log",
        category: "all",
        exactMatch: true,
      });
      // "Log" should NOT match "Login" when exactMatch is true
      assert.ok(!exactResults.some((r) => r.title === "Primary Login Button"));
    });
  });

  describe("Recent Searches & Jump Navigation", () => {
    it("records recent searches up to 10 queries and avoids duplicates", () => {
      GlobalSearchEngine.addRecentSearch("Button");
      GlobalSearchEngine.addRecentSearch("Button");
      GlobalSearchEngine.addRecentSearch("Dashboard");
      GlobalSearchEngine.addRecentSearch("Fetch User");

      const recents = GlobalSearchEngine.getRecentSearches();
      assert.strictEqual(recents.length, 3);
      assert.strictEqual(recents[0], "Fetch User");
      assert.strictEqual(recents[1], "Dashboard");
      assert.strictEqual(recents[2], "Button");

      GlobalSearchEngine.clearRecentSearches();
      assert.strictEqual(GlobalSearchEngine.getRecentSearches().length, 0);
    });

    it("navigates to target entity and triggers store updates", () => {
      const results = GlobalSearchEngine.search({
        query: "Primary Login Button",
        category: "elements",
      });
      assert.ok(results.length > 0);

      let openedPanel = "";
      GlobalSearchEngine.navigateTo(results[0], (panelId) => {
        openedPanel = panelId;
      });

      // Canvas element selection should be updated
      const selectedId = useSelectionStore.getState().selectedId;
      assert.strictEqual(selectedId, "el_btn_login");
      assert.strictEqual(openedPanel, "viewport");
    });
  });
});
