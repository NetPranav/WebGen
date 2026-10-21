"use client";

/**
 * Static export from the editor (ROADMAP Phase 49): the open document as a site, its pictures and fonts read from the
 * asset store, packed as a ZIP the browser downloads.
 */

import { ZipPacker } from "@/compiler/export/ZipPacker";
import { getAssetStore } from "../../assets/AssetStore";
import { getDocument } from "../../store/documentState";
import { useProjectMetaStore } from "../../store/useProjectMetaStore";
import { buildSiteExport, type SiteExport, type SiteExportOptions } from "./index";
import type { SiteFile } from "./targets";

export async function exportCurrentSite(options: Omit<SiteExportOptions, "readAsset" | "projectName"> & { projectName?: string }): Promise<SiteExport> {
  const store = getAssetStore();
  return buildSiteExport(getDocument(), {
    ...options,
    projectName: options.projectName ?? useProjectMetaStore.getState().projectName,
    readAsset: async (id) => {
      const r = await store.get(id);
      return r ? { bytes: new Uint8Array(await r.blob.arrayBuffer()), mime: r.mime, name: r.name } : null;
    },
  });
}

export function zipOf(files: readonly SiteFile[]): Blob {
  const zip = new ZipPacker();
  for (const f of files) {
    if (typeof f.content === "string") zip.addFile(f.path, f.content);
    else zip.addBinary(f.path, f.content);
  }
  return zip.toBlob();
}

/** Builds the site and downloads it as `<name>.zip`. Returns what was built. */
export async function downloadSite(options: Parameters<typeof exportCurrentSite>[0]): Promise<SiteExport> {
  const site = await exportCurrentSite(options);
  const name = (options.projectName ?? useProjectMetaStore.getState().projectName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "site";
  const url = URL.createObjectURL(zipOf(site.files));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}-${options.target}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return site;
}

/**
 * Test seam: with `window.__LL_TEST__` set before load, `window.__LL_EXPORT__.build(options)` returns the export's files
 * as text (binary files as base64), so a browser test can serve and look at the exported site.
 */
if (typeof window !== "undefined" && (window as unknown as { __LL_TEST__?: boolean }).__LL_TEST__) {
  (window as unknown as Record<string, unknown>).__LL_EXPORT__ = {
    build: async (options: Parameters<typeof exportCurrentSite>[0]) => {
      const site = await exportCurrentSite(options);
      return {
        warnings: site.warnings,
        pages: site.pages,
        files: site.files.map((f) => (typeof f.content === "string" ? { path: f.path, text: f.content } : { path: f.path, base64: btoa(String.fromCharCode(...f.content)) })),
      };
    },
  };
}
