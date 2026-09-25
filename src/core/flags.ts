/**
 * Build-time edition flag.
 *
 * `"initial"` is the Initial Phase product: the motion/animation editor only.
 * `"full"` is the full-vision product (DOCS/After) with the Blueprint / logic,
 * deployment, plugin, pages, versioning and database-studio tracks wired in.
 *
 * Read via `process.env.NEXT_PUBLIC_EDITION` so Next.js's webpack config can
 * inline the literal value at build time (NEXT_PUBLIC_* vars are replaced by
 * DefinePlugin before minification/tree-shaking). Do not read this through an
 * indirection that hides the literal `process.env.NEXT_PUBLIC_EDITION` access
 * from webpack, or dead-code elimination of the gated After-track imports
 * will stop working.
 */
export type Edition = "initial" | "full";

export const edition: Edition =
  process.env.NEXT_PUBLIC_EDITION === "full" ? "full" : "initial";

export const isFullEdition = edition === "full";
