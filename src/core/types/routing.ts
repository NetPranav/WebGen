"use client";

/**
 * ============================================================================
 * ROUTING & PAGE CONTRACTS
 * ============================================================================
 * Pure TypeScript contracts for visual sitemaps, dynamic route parameters,
 * route guards, and redirect rules.
 * Architecture Ref: ROADMAP.md §Sub-Phase 6.5 & PANELS.md §Panel 30
 * ============================================================================
 */

export interface RouteParameter {
  name: string; // e.g., "id", "slug", "category"
  type: "string" | "number" | "boolean";
  required: boolean;
  defaultValue?: string;
  description?: string;
}

export type RouteGuardType = "public" | "auth" | "admin" | "custom";

export interface RouteGuard {
  type: RouteGuardType;
  redirectUrl?: string; // e.g. "/login"
  roleRequired?: string; // e.g. "admin"
}

export type RedirectStatusCode = 301 | 302 | 307 | 308;

export interface RedirectRule {
  id: string;
  sourcePattern: string; // e.g. "/old-blog/:slug"
  targetPattern: string; // e.g. "/blog/:slug"
  statusCode: RedirectStatusCode;
  description?: string;
  isActive?: boolean;
}

export interface RouteValidationIssue {
  type: "collision" | "missing_param" | "invalid_slug" | "syntax_error";
  pageId: string;
  pageName: string;
  slug: string;
  message: string;
  conflictingPageId?: string;
}

export interface PagePreset {
  id: string;
  name: string;
  defaultSlug: string;
  description: string;
  icon: string;
  guardType?: RouteGuardType;
  defaultElementsCount: number;
}

/**
 * Extracts dynamic route parameters from a Next.js / Express style slug.
 * Matches both Next.js `[param]` / `[...param]` and Express `:param`.
 */
export function extractRouteParameters(slug: string): RouteParameter[] {
  const params: RouteParameter[] = [];
  const seen = new Set<string>();

  // 1. Next.js style `[id]` or `[...slug]`
  const nextParamRegex = /\[(?:\.\.\.)?([a-zA-Z0-9_]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = nextParamRegex.exec(slug)) !== null) {
    const paramName = match[1];
    if (!seen.has(paramName)) {
      seen.add(paramName);
      params.push({
        name: paramName,
        type: paramName.toLowerCase().includes("id") ? "string" : "string",
        required: !match[0].startsWith("[["),
      });
    }
  }

  // 2. Express style `:param`
  const expressParamRegex = /:([a-zA-Z0-9_]+)/g;
  while ((match = expressParamRegex.exec(slug)) !== null) {
    const paramName = match[1];
    if (!seen.has(paramName)) {
      seen.add(paramName);
      params.push({
        name: paramName,
        type: "string",
        required: true,
      });
    }
  }

  return params;
}

/**
 * Normalizes a route slug to standard Next.js App Router format (leading slash, lowercase, no trailing slash unless root).
 */
export function normalizeRouteSlug(rawSlug: string): string {
  if (!rawSlug || rawSlug.trim() === "" || rawSlug.trim() === "/") {
    return "/";
  }
  let slug = rawSlug.trim();
  if (!slug.startsWith("/")) {
    slug = "/" + slug;
  }
  if (slug.length > 1 && slug.endsWith("/")) {
    slug = slug.slice(0, -1);
  }
  return slug;
}
