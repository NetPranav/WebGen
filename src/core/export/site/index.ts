/**
 * Static export v1 (ROADMAP Phase 49): a document as a site. `buildSiteExport` draws every page with the stage's render
 * definitions at every breakpoint and mode, turns the result into classes and responsive CSS, and lays files out for
 * plain HTML, Vite + React or Next.js (App Router), with one stylesheet, CSS Modules or Tailwind utilities.
 */

import type { MotionDocument } from "../../document/schema";
import { buildPlan, type SitePlan, type Styling } from "./plan";
import { writeTarget, type AssetBytes, type SiteFile, type Target } from "./targets";

export type { SiteFile, Styling, Target, SitePlan };
export { buildPlan, exportedPages } from "./plan";

export interface SiteExportOptions {
  target: Target;
  styling: Styling;
  projectName?: string;
  /** The bytes of an imported file by its id; null when it is missing. */
  readAsset?: (id: string) => Promise<AssetBytes | null>;
}

export interface SiteExport {
  files: SiteFile[];
  warnings: string[];
  pages: { route: string; title: string }[];
}

export async function buildSiteExport(doc: MotionDocument, options: SiteExportOptions): Promise<SiteExport> {
  const styling: Styling = options.target === "html" ? "css" : options.styling;
  const plan = buildPlan(doc, { styling: options.styling, hrefs: options.target === "html" ? "files" : "routes", components: options.target !== "html" });
  const assets = new Map<string, AssetBytes>();
  const warnings = [...plan.warnings];
  if (options.target === "html" && options.styling !== "css") warnings.push("Plain HTML is written with one stylesheet; Tailwind and CSS Modules are for the React targets.");
  for (const id of plan.assets) {
    const bytes = options.readAsset ? await options.readAsset(id) : null;
    if (bytes) assets.set(id, bytes);
    else warnings.push(`A picture or font (${id.slice(0, 8)}) is missing from this browser's asset store and was left out.`);
  }
  const files = writeTarget(options.target, {
    plan: { ...plan, warnings },
    styling,
    projectName: options.projectName ?? "LazyLayout site",
    entries: doc.assets ?? {},
    assets,
  });
  return { files, warnings, pages: plan.pages.map((p) => ({ route: p.route, title: p.title })) };
}

/** The files as text, for a viewer (binary files are named, not shown). */
export const textOf = (f: SiteFile): string => (typeof f.content === "string" ? f.content : `(${f.content.byteLength} bytes)`);
