"use client";

import { useFontSync } from "./useFontSync";

/** Keeps the editor's own page supplied with the document's fonts (the in-place text editor and the panels draw there, not in a stage frame). */
export function FontSync(): null {
  useFontSync(typeof document === "undefined" ? null : document);
  return null;
}
