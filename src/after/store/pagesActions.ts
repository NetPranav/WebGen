"use client";

/**
 * ============================================================================
 * AFTER-TRACK: MULTI-PAGE CRUD & REDIRECT ACTIONS (ROADMAP Sub-Phase 41.1)
 * ============================================================================
 * `pages`/`activePageId` and `setActivePage` stay on the core store — Phase
 * 2's `initElementProject` creates a single default page
 * (`page_stage`/`page_home`) unconditionally in every edition, so those can't
 * move. Only the *multi-page* CRUD actions (`addPage`/`updatePage`/
 * `deletePage`/`duplicatePage`/`detectRouteCollisions`) and the redirect
 * field + actions are After-track: importing this module attaches them to
 * the live store. It is imported exactly once, as a side effect, from
 * `src/editor/shell/afterTrackPanels.tsx`'s `edition === "full"` branch —
 * never imported anywhere reachable from the Initial edition, so it (and
 * everything it pulls in) is absent from an `edition=initial` production
 * bundle (verified the same way panels are, see `scripts/check-bundle-scope.mts`).
 *
 * `detectRouteCollisions`'s one Initial-edition-adjacent caller
 * (`DeploymentEngine.ts`'s `validatePreflight`) is itself only reachable
 * through the already-gated `DeploymentDashboard` panel.
 * ============================================================================
 */

import { recordProjectChange, useProjectStore, type PageDefinition } from "@/core/store/useProjectStore";
import { getDocument, setDocument } from "@/core/store/documentState";
import { createLayer } from "@/core/document/factories";
import type { Layer } from "@/core/document/schema";
import { extractRouteParameters, normalizeRouteSlug, type RedirectRule } from "@/core/types/routing";
import { DiagnosticBus } from "@/core/engine/DiagnosticBus";

useProjectStore.setState({
  addPage: (pageData, rootElement, actionLabel) => {
    const snapshot = useProjectStore.getState().getSnapshot();
    const pageId = pageData.id || `page_${Math.random().toString(36).substring(2, 9)}`;
    const rootElId = pageData.rootElementId || rootElement?.id || `root_${pageId}`;
    const normalizedSlug = normalizeRouteSlug(pageData.slug);
    const parsedParams = extractRouteParameters(normalizedSlug);

    const newPage: PageDefinition = {
      id: pageId,
      name: pageData.name || "Untitled Page",
      slug: normalizedSlug,
      rootElementId: rootElId,
      isDynamic: parsedParams.length > 0,
      parameters: pageData.parameters || parsedParams,
      guard: pageData.guard || { type: "public" },
      metaTitle: pageData.metaTitle || pageData.name,
      metaDescription: pageData.metaDescription || "",
      isCustom404: pageData.isCustom404 || false,
      order: pageData.order ?? Object.keys(snapshot.pages).length,
    };

    const newRootElement: Layer =
      rootElement ??
      createLayer({
        id: rootElId,
        archetype: "container",
        name: `${newPage.name} Container`,
        properties: { "layout.display": "flex", "layout.flexDirection": "column", "layout.minHeight": "100vh", "layout.padding": 24 },
      });

    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot, { includesDocument: true });
    }

    const doc = getDocument();
    setDocument({ ...doc, layers: { ...doc.layers, [newRootElement.id]: newRootElement } });
    useProjectStore.setState((s) => ({
      pages: {
        ...s.pages,
        [pageId]: newPage,
      },
      activePageId: pageId,
    }));

    useProjectStore.getState().detectRouteCollisions?.();
    return pageId;
  },

  updatePage: (pageId: string, updates: Partial<PageDefinition>, actionLabel) => {
    const state = useProjectStore.getState();
    const existingPage = state.pages[pageId];
    if (!existingPage) return;

    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    const updatedSlug = updates.slug !== undefined ? normalizeRouteSlug(updates.slug) : existingPage.slug;
    const parsedParams = updates.slug !== undefined ? extractRouteParameters(updatedSlug) : (existingPage.parameters || []);

    const mergedPage: PageDefinition = {
      ...existingPage,
      ...updates,
      slug: updatedSlug,
      isDynamic: parsedParams.length > 0,
      parameters: updates.parameters || parsedParams,
    };

    useProjectStore.setState((s) => ({
      pages: {
        ...s.pages,
        [pageId]: mergedPage,
      },
    }));

    useProjectStore.getState().detectRouteCollisions?.();
  },

  deletePage: (pageId: string, actionLabel) => {
    const state = useProjectStore.getState();
    const pageKeys = Object.keys(state.pages);
    if (pageKeys.length <= 1) {
      console.warn("[ProjectStore] Cannot delete the last remaining page.");
      return;
    }

    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    const nextPages = { ...state.pages };
    delete nextPages[pageId];

    let nextActiveId = state.activePageId;
    if (state.activePageId === pageId) {
      nextActiveId = Object.keys(nextPages)[0];
    }

    useProjectStore.setState({
      pages: nextPages,
      activePageId: nextActiveId,
    });

    useProjectStore.getState().detectRouteCollisions?.();
  },

  duplicatePage: (pageId: string, actionLabel) => {
    const state = useProjectStore.getState();
    const originalPage = state.pages[pageId];
    if (!originalPage) return "";

    const snapshot = state.getSnapshot();
    const newPageId = `page_${Math.random().toString(36).substring(2, 9)}`;
    const newRootId = `root_${newPageId}`;

    let duplicateSlug = `${originalPage.slug}-copy`;
    if (originalPage.slug === "/") duplicateSlug = "/home-copy";

    const duplicatedPage: PageDefinition = {
      ...originalPage,
      id: newPageId,
      name: `${originalPage.name} (Copy)`,
      slug: normalizeRouteSlug(duplicateSlug),
      rootElementId: newRootId,
    };

    // Duplicate root element
    const doc = getDocument();
    const originalRoot = doc.layers[originalPage.rootElementId];
    const duplicatedRoot: Layer = originalRoot
      ? { ...originalRoot, id: newRootId, name: `${originalRoot.name} (Copy)`, parentId: null, children: [] }
      : createLayer({ id: newRootId, archetype: "container", name: `${duplicatedPage.name} Container`, properties: {} });

    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot, { includesDocument: true });
    }

    setDocument({ ...doc, layers: { ...doc.layers, [newRootId]: duplicatedRoot } });
    useProjectStore.setState((s) => ({
      pages: {
        ...s.pages,
        [newPageId]: duplicatedPage,
      },
      activePageId: newPageId,
    }));

    useProjectStore.getState().detectRouteCollisions?.();
    return newPageId;
  },

  detectRouteCollisions: (): string[] => {
    const state = useProjectStore.getState();
    const slugMap = new Map<string, string>();
    const collisions: string[] = [];

    for (const page of Object.values(state.pages)) {
      const normalized = normalizeRouteSlug(page.slug);
      // Generalized pattern replacing [param] or :param with a placeholder token
      const pattern = normalized.replace(/\[[^\]]+\]/g, ":param").replace(/:[a-zA-Z0-9_]+/g, ":param");

      if (slugMap.has(pattern)) {
        const conflictingId = slugMap.get(pattern)!;
        const conflictingPage = state.pages[conflictingId];
        const msg = `Route collision detected between "${page.name}" (${page.slug}) and "${conflictingPage?.name || conflictingId}" (${conflictingPage?.slug || ""})`;
        collisions.push(msg);

        DiagnosticBus.emit({
          channel: "ROUTE_COLLISION",
          severity: "error",
          source: {
            panel: "Panel 30: Pages & Routing Manager",
            entityId: page.id,
            entityName: page.name,
          },
          message: msg,
          suggestion: `Ensure every page has a unique route path or distinct dynamic prefix.`,
        });
      } else {
        slugMap.set(pattern, page.id);
      }
    }

    return collisions;
  },

  addRedirectRule: (ruleData, actionLabel) => {
    const snapshot = useProjectStore.getState().getSnapshot();
    const id = ruleData.id || `redir_${Math.random().toString(36).substring(2, 9)}`;
    const rule: RedirectRule = {
      id,
      sourcePattern: normalizeRouteSlug(ruleData.sourcePattern),
      targetPattern: normalizeRouteSlug(ruleData.targetPattern),
      statusCode: ruleData.statusCode || 308,
      description: ruleData.description || "",
      isActive: ruleData.isActive ?? true,
    };

    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    useProjectStore.setState((s) => ({
      redirectRules: {
        ...s.redirectRules,
        [id]: rule,
      },
    }));

    return id;
  },

  updateRedirectRule: (id: string, updates: Partial<RedirectRule>, actionLabel) => {
    const state = useProjectStore.getState();
    const existing = state.redirectRules[id];
    if (!existing) return;

    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    useProjectStore.setState((s) => ({
      redirectRules: {
        ...s.redirectRules,
        [id]: {
          ...existing,
          ...updates,
          sourcePattern: updates.sourcePattern ? normalizeRouteSlug(updates.sourcePattern) : existing.sourcePattern,
          targetPattern: updates.targetPattern ? normalizeRouteSlug(updates.targetPattern) : existing.targetPattern,
        },
      },
    }));
  },

  deleteRedirectRule: (id: string, actionLabel) => {
    const state = useProjectStore.getState();
    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    const nextRules = { ...state.redirectRules };
    delete nextRules[id];

    useProjectStore.setState({ redirectRules: nextRules });
  },
});
