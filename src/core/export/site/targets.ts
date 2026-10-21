/**
 * ============================================================================
 * THE TARGETS: PLAIN HTML, VITE + REACT, NEXT.JS (ROADMAP Phase 49)
 * ============================================================================
 * Lays a `SitePlan` out as files. Plain HTML is a page per folder with one stylesheet. The two React targets write each
 * page as a component (Next: an App Router route; Vite: a route in a small router), with the page's CSS global, as a CSS
 * Module, or as Tailwind utilities on the elements. Pictures and fonts are copied to `assets/` and only those used.
 * ============================================================================
 */

import { assetFamily } from "../../fonts/families";
import type { AssetEntry } from "../../document/schema";
import { cssText } from "./css";
import { toHtml, toJsx } from "./serialize";
import type { ComponentPlan, PagePlan, SitePlan, Styling } from "./plan";
import { walk, type ENode } from "./markup";
import { hrefBetween } from "./plan";

export type Target = "html" | "vite" | "next";

export interface SiteFile {
  path: string;
  content: string | Uint8Array;
}

export interface AssetBytes {
  bytes: Uint8Array;
  mime: string;
  name: string;
}

export interface TargetInput {
  plan: SitePlan;
  styling: Styling;
  projectName: string;
  /** The assets by id (the manifest entries), for names and types. */
  entries: Record<string, AssetEntry>;
  /** The bytes of the assets that are used. */
  assets: Map<string, AssetBytes>;
}

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "font/woff2": "woff2",
  "font/woff": "woff",
  "font/ttf": "ttf",
  "font/otf": "otf",
  "application/font-woff2": "woff2",
};

/** The file name an asset has in the export: its hash's start and its type. */
export function assetFileName(id: string, mime: string): string {
  return `${id.slice(0, 12)}.${MIME_EXT[mime] ?? "bin"}`;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "site";
const pascal = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(" ").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join("") || "Page";

/** Replaces `{{asset:<id>}}` with the path the file has from where the text lives. */
export function withAssetPaths(text: string, prefix: string, files: Map<string, string>): string {
  return text.replace(/\{\{asset:([0-9a-f]{64})\}\}/g, (_m, id: string) => `${prefix}${files.get(id) ?? "missing.bin"}`);
}

function assetFiles(input: TargetInput): { names: Map<string, string>; files: SiteFile[] } {
  const names = new Map<string, string>();
  const files: SiteFile[] = [];
  for (const [id, a] of input.assets) {
    const name = assetFileName(id, a.mime);
    names.set(id, name);
    files.push({ path: `__ASSETS__/${name}`, content: a.bytes });
  }
  return { names, files };
}

function fontFaceRules(plan: SitePlan, input: TargetInput, urlOf: (id: string) => string): string {
  return plan.fonts.uploads
    .map((u) => {
      const entry = input.entries[u.id];
      const family = entry ? assetFamily(entry) : u.family;
      const format = u.mime === "font/woff2" ? "woff2" : u.mime === "font/woff" ? "woff" : u.mime === "font/otf" ? "opentype" : "truetype";
      return `@font-face {\n  font-family: "${family}";\n  src: url("${urlOf(u.id)}") format("${format}");\n  font-weight: 100 900;\n  font-style: normal;\n  font-display: ${plan.fonts.display};\n}`;
    })
    .join("\n\n");
}

const RESET = `*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}\n\nhtml,\nbody {\n  margin: 0;\n  padding: 0;\n}\n\n.lnk {\n  display: contents;\n  color: inherit;\n  text-decoration: none;\n}\n`;

const pageCss = (p: PagePlan): string => cssText(p.blocks);

const fontLinks = (plan: SitePlan): string =>
  plan.fonts.googleUrl ? `    <link rel="preconnect" href="https://fonts.googleapis.com" />\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n    <link rel="stylesheet" href="${plan.fonts.googleUrl}" />\n` : "";

// --- plain HTML --------------------------------------------------------------------------

function htmlTarget(input: TargetInput): SiteFile[] {
  const { plan } = input;
  const { names, files: assetOut } = assetFiles(input);
  const out: SiteFile[] = [];
  const depth = (route: string) => (route === "/" ? 0 : route.replace(/^\/+|\/+$/g, "").split("/").length);
  for (const p of plan.pages) {
    const up = "../".repeat(depth(p.route));
    const path = p.route === "/" ? "index.html" : `${p.route.replace(/^\/+|\/+$/g, "")}/index.html`;
    const body = withAssetPaths(toHtml(p.tree, "    "), `${up || "./"}assets/`, names);
    const modes = plan.extraModes.length > 0 ? " data-mode=\"light\"" : "";
    out.push({
      path,
      content: `<!doctype html>\n<html lang="en"${modes}>\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>${p.title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</title>\n${fontLinks(plan)}    <link rel="stylesheet" href="${up || "./"}styles.css" />\n  </head>\n  <body>\n${body}  </body>\n</html>\n`,
    });
  }
  const css = [`/* Exported from LazyLayout. One class for each layer; narrower screens and other modes are the @media and [data-mode] rules. */`, fontFaceRules(plan, input, (id) => `assets/${names.get(id)}`), RESET, ...plan.pages.map((p) => `/* ${p.name} (${p.route}) */\n${pageCss(p)}`)].filter(Boolean).join("\n");
  out.push({ path: "styles.css", content: withAssetPaths(css, "assets/", names) });
  out.push(...assetOut.map((f) => ({ ...f, path: f.path.replace("__ASSETS__", "assets") })));
  return out;
}

// --- React: shared ---------------------------------------------------------------------------

interface ReactPage {
  plan: PagePlan;
  component: string;
  file: string;
}

function globalCss(input: TargetInput, names: Map<string, string>): string {
  const { plan } = input;
  const parts = [fontFaceRules(plan, input, (id) => `/assets/${names.get(id)}`), RESET];
  if (input.styling === "css") {
    parts.push(...plan.components.map((c) => `/* ${c.name} */\n${componentCss(c, names)}`));
    parts.push(...plan.pages.map((p) => `/* ${p.name} (${p.route}) */\n${pageCss(p)}`));
  }
  return withAssetPaths(parts.filter(Boolean).join("\n"), "/assets/", names);
}

function moduleCss(p: PagePlan, names: Map<string, string>): string {
  return withAssetPaths(`/* ${p.name} (${p.route}) */\n${pageCss(p)}`, "/assets/", names);
}

/** How class names are written in JSX for a styling: a string, or a property of the CSS Module (`lnk` is in the global sheet). */
function jsxOptions(styling: Styling): { classExpr: (c: string) => string; classValue: (c: string) => string } {
  const str = (c: string) => (/["{}\n]/.test(c) ? JSON.stringify(c) : `"${c}"`);
  return styling === "modules"
    ? { classExpr: (c) => (c === "lnk" ? '"lnk"' : `{styles[${JSON.stringify(c)}]}`), classValue: (c) => (c === "lnk" ? '"lnk"' : `styles[${JSON.stringify(c)}]`) }
    : { classExpr: (c) => (/["{}\n]/.test(c) ? `{${JSON.stringify(c)}}` : `"${c}"`), classValue: str };
}

function jsxFor(p: PagePlan, input: TargetInput, names: Map<string, string>): string {
  return withAssetPaths(toJsx(p.tree, jsxOptions(input.styling), "      "), "/assets/", names);
}

/** The names of the components a page calls. */
function componentsUsed(p: PagePlan): string[] {
  const out = new Set<string>();
  walk(p.tree, (n) => {
    if (n.tag === "#component" && n.component) out.add(n.component.name);
  });
  return [...out].sort();
}

/** A component's file: its props as a TypeScript interface, and the markup of each variant. */
function componentSource(c: ComponentPlan, input: TargetInput, names: Map<string, string>): string {
  const opts = jsxOptions(input.styling);
  const variantTypes = c.variantProps.map((v) => `  ${v.prop}?: ${v.values.map((x) => JSON.stringify(x)).join(" | ")};`);
  const propTypes = c.props.map((p) => `  ${p.name}?: ${p.type === "boolean" ? "boolean" : "string"};`);
  const iface = `export interface ${c.name}Props {\n${[...variantTypes, ...propTypes, "  className?: string;"].join("\n")}\n}\n`;
  const body = (tree: ENode[]) => withAssetPaths(toJsx(tree, opts, "      "), "/assets/", names);
  const head = input.styling === "modules" ? `import styles from "./${c.name}.module.css";\n\n` : "";
  const usesProps = c.props.length > 0 || true;
  void usesProps;
  let fn: string;
  if (c.variantProps.length === 0) {
    fn = `  return (\n${body(c.variants[0].tree)}  );\n`;
  } else {
    const destructure = `  const { ${c.variantProps.map((v) => `${v.prop} = ${JSON.stringify(v.values[0])}`).join(", ")} } = props;\n`;
    const arms = c.variants
      .slice(1)
      .map((v) => `  if (${c.variantProps.map((p) => `${p.prop} === ${JSON.stringify(v.values[p.name] ?? p.values[0])}`).join(" && ")}) {\n    return (\n${body(v.tree).replace(/^/gm, "  ")}    );\n  }\n`)
      .join("");
    fn = `${destructure}${arms}  return (\n${body(c.variants[0].tree)}  );\n`;
  }
  return `${head}${iface}\nexport default function ${c.name}(props: ${c.name}Props) {\n${fn}}\n`;
}

function componentCss(c: ComponentPlan, names: Map<string, string>): string {
  return withAssetPaths(c.variants.map((v) => cssText(v.blocks)).join("\n"), "/assets/", names);
}

const TAILWIND_FILES = (): SiteFile[] => [
  { path: "tailwind.config.js", content: `/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],\n  theme: { extend: {} },\n  plugins: [],\n};\n` },
  { path: "postcss.config.js", content: `module.exports = {\n  plugins: { tailwindcss: {}, autoprefixer: {} },\n};\n` },
];

// --- Vite + React -----------------------------------------------------------------------------

function viteTarget(input: TargetInput): SiteFile[] {
  const { plan, styling } = input;
  const { names, files: assetOut } = assetFiles(input);
  const out: SiteFile[] = [];
  const pages: ReactPage[] = plan.pages.map((p) => ({ plan: p, component: pascal(p.name), file: `src/pages/${pascal(p.name)}.tsx` }));
  const seen = new Set<string>();
  for (const p of pages) {
    let c = p.component;
    for (let n = 2; seen.has(c); n++) c = `${p.component}${n}`;
    seen.add(c);
    p.component = c;
    p.file = `src/pages/${c}.tsx`;
  }
  out.push({
    path: "package.json",
    content: JSON.stringify(
      {
        name: slug(input.projectName),
        private: true,
        version: "0.0.0",
        type: "module",
        scripts: { dev: "vite", build: "tsc --noEmit && vite build", preview: "vite preview" },
        dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
        devDependencies: { "@types/react": "^19.0.0", "@types/react-dom": "^19.0.0", "@vitejs/plugin-react": "^5.0.0", typescript: "^5.6.0", vite: "^7.0.0", ...(styling === "tailwind" ? { tailwindcss: "^3.4.0", postcss: "^8.4.0", autoprefixer: "^10.4.0" } : {}) },
      },
      null,
      2,
    ) + "\n",
  });
  out.push({ path: "index.html", content: `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${input.projectName.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</title>\n${fontLinks(plan)}  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n` });
  out.push({ path: "vite.config.ts", content: `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({ plugins: [react()] });\n` });
  out.push({ path: "tsconfig.json", content: JSON.stringify({ compilerOptions: { target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "bundler", jsx: "react-jsx", strict: true, skipLibCheck: true, noEmit: true, isolatedModules: true, allowImportingTsExtensions: true, types: ["vite/client"] }, include: ["src", "vite.config.ts"] }, null, 2) + "\n" });
  out.push({ path: "src/main.tsx", content: `import { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\nimport "./styles.css";\n\ncreateRoot(document.getElementById("root")!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n);\n` });
  out.push({ path: "src/styles.css", content: (styling === "tailwind" ? "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n" : "") + globalCss(input, names) });
  if (styling === "tailwind") out.push(...TAILWIND_FILES());
  const routes = pages.map((p) => `  { path: ${JSON.stringify(p.plan.route)}, title: ${JSON.stringify(p.plan.title)}, element: <${p.component} /> },`).join("\n");
  out.push({
    path: "src/App.tsx",
    content: `import { useEffect, useState } from "react";\n${pages.map((p) => `import ${p.component} from "./pages/${p.component}";`).join("\n")}\n\nconst routes = [\n${routes}\n];\n\n/** The route for a path: a trailing slash doesn't matter. */\nfunction match(path: string) {\n  const clean = path.length > 1 ? path.replace(/\\/+$/, "") : path;\n  return routes.find((r) => r.path === clean) ?? routes[0];\n}\n\nexport default function App() {\n  const [path, setPath] = useState(window.location.pathname);\n\n  useEffect(() => {\n    const onPop = () => setPath(window.location.pathname);\n    // links between pages are plain anchors: take them without a page load\n    const onClick = (e: MouseEvent) => {\n      const a = (e.target as Element).closest("a");\n      const href = a?.getAttribute("href");\n      if (!a || !href || !href.startsWith("/") || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey) return;\n      e.preventDefault();\n      window.history.pushState({}, "", href);\n      setPath(window.location.pathname);\n      const hash = href.split("#")[1];\n      requestAnimationFrame(() => (hash ? document.getElementById(hash)?.scrollIntoView() : window.scrollTo(0, 0)));\n    };\n    window.addEventListener("popstate", onPop);\n    document.addEventListener("click", onClick);\n    return () => {\n      window.removeEventListener("popstate", onPop);\n      document.removeEventListener("click", onClick);\n    };\n  }, []);\n\n  const route = match(path);\n  useEffect(() => {\n    document.title = route.title;\n  }, [route]);\n  return route.element;\n}\n`,
  });
  for (const p of pages) {
    const used = componentsUsed(p.plan).map((n) => `import ${n} from "../components/${n}";\n`).join("");
    const imports = `${used}${styling === "modules" ? `import styles from "./${p.component}.module.css";\n` : ""}${used || styling === "modules" ? "\n" : ""}`;
    out.push({ path: p.file, content: `${imports}export default function ${p.component}() {\n  return (\n${jsxFor(p.plan, input, names).replace(/^/gm, "")}  );\n}\n` });
    if (styling === "modules") out.push({ path: `src/pages/${p.component}.module.css`, content: moduleCss(p.plan, names) });
  }
  for (const c of plan.components) {
    out.push({ path: `src/components/${c.name}.tsx`, content: componentSource(c, input, names) });
    if (styling === "modules") out.push({ path: `src/components/${c.name}.module.css`, content: componentCss(c, names) });
  }
  out.push(...assetOut.map((f) => ({ ...f, path: f.path.replace("__ASSETS__", "public/assets") })));
  return out;
}

// --- Next.js (App Router) -----------------------------------------------------------------------

function nextTarget(input: TargetInput): SiteFile[] {
  const { plan, styling } = input;
  const { names, files: assetOut } = assetFiles(input);
  const out: SiteFile[] = [];
  out.push({
    path: "package.json",
    content: JSON.stringify(
      {
        name: slug(input.projectName),
        private: true,
        version: "0.0.0",
        scripts: { dev: "next dev", build: "next build", start: "next start" },
        dependencies: { next: "^16.0.0", react: "^19.0.0", "react-dom": "^19.0.0" },
        devDependencies: { "@types/node": "^22.0.0", "@types/react": "^19.0.0", "@types/react-dom": "^19.0.0", typescript: "^5.6.0", ...(styling === "tailwind" ? { tailwindcss: "^3.4.0", postcss: "^8.4.0", autoprefixer: "^10.4.0" } : {}) },
      },
      null,
      2,
    ) + "\n",
  });
  out.push({ path: "tsconfig.json", content: JSON.stringify({ compilerOptions: { target: "ES2022", lib: ["dom", "dom.iterable", "esnext"], allowJs: false, skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true, module: "esnext", moduleResolution: "bundler", resolveJsonModule: true, isolatedModules: true, jsx: "react-jsx", incremental: true, plugins: [{ name: "next" }] }, include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"], exclude: ["node_modules"] }, null, 2) + "\n" });
  out.push({ path: "next.config.ts", content: `import type { NextConfig } from "next";\n\nconst nextConfig: NextConfig = {};\n\nexport default nextConfig;\n` });
  if (styling === "tailwind") out.push(...TAILWIND_FILES());
  out.push({ path: "app/globals.css", content: (styling === "tailwind" ? "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n" : "") + globalCss(input, names) });
  const fonts = plan.fonts.googleUrl;
  out.push({
    path: "app/layout.tsx",
    content: `import type { ReactNode } from "react";\nimport "./globals.css";\n\nexport const metadata = { title: ${JSON.stringify(input.projectName)} };\n\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return (\n    <html lang="en"${plan.extraModes.length > 0 ? ' data-mode="light"' : ""}>\n      <head>${fonts ? `\n        <link rel="preconnect" href="https://fonts.googleapis.com" />\n        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />\n        <link rel="stylesheet" href=${JSON.stringify(fonts)} />\n      ` : ""}</head>\n      <body>{children}</body>\n    </html>\n  );\n}\n`,
  });
  const used = new Set<string>();
  for (const p of plan.pages) {
    const dir = p.route === "/" ? "app" : `app/${p.route.replace(/^\/+|\/+$/g, "")}`;
    let name = pascal(p.name);
    for (let n = 2; used.has(name); n++) name = `${pascal(p.name)}${n}`;
    used.add(name);
    const up = dir === "app" ? "../" : "../".repeat(dir.split("/").length);
    const calls = componentsUsed(p).map((n) => `import ${n} from "${up}components/${n}";\n`).join("");
    const imports = `${calls}${styling === "modules" ? `import styles from "./page.module.css";\n` : ""}${calls || styling === "modules" ? "\n" : ""}`;
    out.push({ path: `${dir}/page.tsx`, content: `${imports}export const metadata = { title: ${JSON.stringify(p.title)} };\n\nexport default function ${name}() {\n  return (\n${jsxFor(p, input, names)}  );\n}\n` });
    if (styling === "modules") out.push({ path: `${dir}/page.module.css`, content: moduleCss(p, names) });
  }
  for (const c of plan.components) {
    out.push({ path: `components/${c.name}.tsx`, content: componentSource(c, input, names) });
    if (styling === "modules") out.push({ path: `components/${c.name}.module.css`, content: componentCss(c, names) });
  }
  out.push(...assetOut.map((f) => ({ ...f, path: f.path.replace("__ASSETS__", "public/assets") })));
  return out;
}

export function writeTarget(target: Target, input: TargetInput): SiteFile[] {
  const styling: Styling = target === "html" && input.styling !== "css" ? "css" : input.styling;
  const adjusted = { ...input, styling };
  const files = target === "html" ? htmlTarget(adjusted) : target === "vite" ? viteTarget(adjusted) : nextTarget(adjusted);
  files.push({ path: "README.md", content: readme(target, adjusted) });
  return files;
}

function readme(target: Target, input: TargetInput): string {
  const how = target === "html" ? "Open `index.html`, or serve the folder with any static server." : target === "vite" ? "```\nnpm install\nnpm run dev\n```" : "```\nnpm install\nnpm run dev\n```";
  return `# ${input.projectName}\n\nExported from LazyLayout as ${target === "html" ? "plain HTML and CSS" : target === "vite" ? "a Vite + React app" : "a Next.js App Router app"}${target === "html" ? "" : ` (${input.styling === "modules" ? "CSS Modules" : input.styling === "tailwind" ? "Tailwind utilities" : "one stylesheet"})`}.\n\n${how}\n\nPages: ${input.plan.pages.map((p) => `\`${p.route}\``).join(", ")}.\n${input.plan.warnings.length > 0 ? `\nNot carried exactly:\n${input.plan.warnings.map((w) => `- ${w}`).join("\n")}\n` : ""}`;
}

export { hrefBetween };
