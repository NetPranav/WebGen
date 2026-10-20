/**
 * Asking the browser not to evict this origin's storage (ROADMAP Phase 36, closes AUD-53). Browsers may clear
 * IndexedDB of a site that hasn't asked for persistence when the disk is under pressure. The request is made after
 * the first successful save, once per browser: Chromium decides from how the site is used, Firefox may ask the
 * person, and Safari answers directly. Nothing here blocks saving; a refusal changes nothing.
 */

const KEY = "lazylayout:persist-requested";

export interface StorageManagerLike {
  persist?: () => Promise<boolean>;
  persisted?: () => Promise<boolean>;
}

export type PersistResult = "granted" | "denied" | "unsupported" | "already-asked";

export async function requestPersistence(options: { storage?: StorageManagerLike | null; flags?: Pick<Storage, "getItem" | "setItem"> | null } = {}): Promise<PersistResult> {
  const storage = options.storage === undefined ? (typeof navigator !== "undefined" ? (navigator.storage as StorageManagerLike | undefined) ?? null : null) : options.storage;
  let flags: Pick<Storage, "getItem" | "setItem"> | null = null;
  try {
    flags = options.flags === undefined ? (typeof localStorage !== "undefined" ? localStorage : null) : options.flags;
  } catch {
    flags = null;
  }
  if (!storage || typeof storage.persist !== "function") return "unsupported";
  try {
    if (typeof storage.persisted === "function" && (await storage.persisted())) return "granted";
    if (flags?.getItem(KEY) === "1") return "already-asked";
    flags?.setItem(KEY, "1");
    return (await storage.persist()) ? "granted" : "denied";
  } catch {
    return "denied";
  }
}
