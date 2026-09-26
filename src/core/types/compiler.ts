"use client";

/**
 * ============================================================================
 * BLUEPRINT COMPILER & CODE EMITTER TYPE CONTRACTS
 * ============================================================================
 * Pure TypeScript contracts for generating production Next.js 15, React 19,
 * scoped CSS, and GSAP animation code from visual AST models.
 * Architecture Ref: ROADMAP.md §Sub-Phase 6.1 & FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md
 * ============================================================================
 */

export interface EmittedFile {
  /** Relative destination path, e.g. "components/HeroSection.tsx" */
  path: string;
  /** Generated source code content */
  content: string;
  /** Syntax language for syntax highlighting and file extension */
  language: "typescript" | "css" | "javascript" | "json";
  /** Categorical role of the generated file */
  type: "component" | "page" | "styles" | "animation" | "api" | "schema" | "logic" | "migration";
}

export type TargetFramework = "nextjs15" | "react19";
export type StylingApproach = "css-modules" | "scoped-css" | "inline-tokens";

export interface ComponentEmitterOptions {
  /** Target React / Next.js ecosystem version (default: 'nextjs15') */
  targetFramework?: TargetFramework;
  /** Selected CSS strategy (default: 'scoped-css') */
  stylingApproach?: StylingApproach;
  /** Export pattern: named (`export function X`) vs default (`export default function X`) */
  exportType?: "named" | "default";
  /** Whether to generate typed `interface <Name>Props` (default: true) */
  includeTypeScriptTypes?: boolean;
  /** Whether to emit WCAG compliant ARIA attributes & semantic tags (default: true) */
  includeAccessibility?: boolean;
  /** Next.js 15 client component directive emission (default: 'auto') */
  useClientDirective?: "auto" | "always" | "never";
  /** Override component function identifier */
  componentName?: string;
  /** Optional custom CSS class name or CSS module object identifier */
  styleIdentifier?: string;
}

export interface StyleEmitterOptions {
  /** Class prefix prepended to generated class selectors (e.g. 'webgen') */
  classPrefix?: string;
  /** Output style format: scoped stylesheet, CSS module, or token root variables */
  format?: "scoped-css" | "css-modules" | "root-variables";
  /** Indentation spaces count (default: 2) */
  indent?: number;
  /** Custom responsive breakpoints in pixels (e.g. { mobile: 640, tablet: 768, desktop: 1024 }) */
  responsiveBreakpoints?: Record<string, number>;
  /** Pseudo-class style overrides (canonical property paths), e.g. from the layer's `hover` state. */
  stateStyles?: Partial<Record<"hover" | "active" | "focus", Record<string, unknown>>>;
  /** Per-breakpoint overrides (canonical property paths), keyed like `responsiveBreakpoints`. */
  breakpointOverrides?: Record<string, Record<string, unknown>>;
}

export interface GSAPAnimationEmitterOptions {
  /** Target React lifecycle hook for GSAP execution (default: 'useEffect') */
  hookType?: "useGSAP" | "useEffect";
  /** Variable name assigned to the GSAP timeline instance (default: 'tl') */
  timelineName?: string;
  /** Ref identifier targeting the animated root DOM element (default: 'elementRef') */
  targetRefName?: string;
  /** Ref identifier targeting the GSAP container context scope (default: 'containerRef') */
  scopeRefName?: string;
  /** Whether to emit timeline cleanup / context revert logic (default: true) */
  includeCleanup?: boolean;
  /** Emission wrapper format: custom React hook, standalone function, or raw timeline body */
  exportType?: "hook" | "function" | "raw";
}

export interface LogicFlowEmitterOptions {
  /** Function export format: named (`export async function X`) vs default */
  exportType?: "named" | "default";
  /** Whether to generate typed parameters and return interfaces */
  includeTypeScriptTypes?: boolean;
  /** JSDoc header with graph metadata */
  includeJSDoc?: boolean;
  /** Error handling wrapper strategy */
  errorHandling?: "try-catch" | "propagate";
  /** Prisma client import specifier (default: '@/lib/prisma') */
  prismaImportPath?: string;
}

export interface ApiRouteEmitterOptions {
  /** Target data access layer: Prisma client vs in-memory mock */
  dataAccessLayer?: "prisma" | "mock";
  /** Path to the Prisma client module (default: '@/lib/prisma') */
  prismaImportPath?: string;
  /** Supported HTTP methods (default: ['GET', 'POST', 'PUT', 'DELETE']) */
  supportedMethods?: ("GET" | "POST" | "PUT" | "DELETE")[];
  /** Default query pagination limit (default: 50) */
  defaultLimit?: number;
  /** Route format: collection index route (`app/api/[collection]/route.ts`) vs item route */
  routePattern?: "collection" | "item";
}

export interface PrismaSchemaEmitterOptions {
  /** Database datasource provider: postgresql, sqlite, or mysql */
  provider?: "postgresql" | "sqlite" | "mysql";
  /** Environment variable holding the connection URL (default: 'DATABASE_URL') */
  urlEnvVar?: string;
  /** Target client generator provider (default: 'prisma-client-js') */
  clientGenerator?: string;
  /** Whether to format and emit corresponding raw SQL DDL migration files */
  includeSQLMigrations?: boolean;
}

