/**
 * ============================================================================
 * INDEXEDDB ACCESS
 * ============================================================================
 * ROADMAP Phase 3.2. A minimal promise wrapper over IndexedDB for the
 * `lazylayout` database. Object stores:
 *   - `projects`   full project records (snapshot + metadata), keyed by id
 *   - `summaries`  small records for the project list, keyed by id
 *   - `history`    the saved undo/redo stacks per project, keyed by projectId
 *   - `meta`       one-off flags (e.g. the localStorage migration), keyed by key
 * ============================================================================
 */

export const DB_NAME = "lazylayout";
export const DB_VERSION = 1;
export const STORES = ["projects", "summaries", "history", "meta"] as const;
export type StoreName = (typeof STORES)[number];

const KEY_PATHS: Record<StoreName, string> = {
  projects: "id",
  summaries: "id",
  history: "projectId",
  meta: "key",
};

/** Thrown when the browser refuses a write because storage is full. */
export class StorageQuotaError extends Error {
  constructor(cause?: unknown) {
    super("Browser storage is full, so your latest changes could not be saved.");
    this.name = "StorageQuotaError";
    this.cause = cause;
  }
}

export function isQuotaError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name;
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED" || error instanceof StorageQuotaError;
}

export function getIndexedDB(): IDBFactory | null {
  try {
    return typeof indexedDB === "undefined" ? null : indexedDB;
  } catch {
    // Some privacy modes throw on access.
    return null;
  }
}

export function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: KEY_PATHS[store] });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("The LazyLayout database is open in an older tab. Close other tabs and reload."));
  });
}

function wrapError(error: unknown): unknown {
  return isQuotaError(error) ? new StorageQuotaError(error) : error;
}

/**
 * Runs `work` in one transaction over `stores` and resolves with its result
 * once the transaction commits (so a resolved write is durable).
 */
export function runTransaction<T>(
  db: IDBDatabase,
  stores: StoreName[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction) => Promise<T> | T
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction(stores, mode);
    } catch (error) {
      reject(wrapError(error));
      return;
    }
    let result: T;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(wrapError(tx.error));
    tx.onabort = () => reject(wrapError(tx.error ?? new Error("Storage transaction aborted.")));
    Promise.resolve()
      .then(() => work(tx))
      .then((value) => {
        result = value;
      })
      .catch((error) => {
        try {
          tx.abort();
        } catch {
          // Already finished.
        }
        reject(wrapError(error));
      });
  });
}

/** Promise for a single request inside an open transaction. */
export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(wrapError(request.error));
  });
}
