/**
 * Where asset bytes are kept (ROADMAP Phase 36). One store for every project in this browser, keyed by content
 * hash, so the same picture used in ten projects is stored once. The IndexedDB backend is the real one; the memory
 * backend is the same interface for tests.
 */

import { getIndexedDB, openDatabase, requestResult, runTransaction } from "../storage/idb";
import type { AssetKind } from "./sniff";

export interface AssetRecord {
  id: string;
  kind: AssetKind;
  mime: string;
  name: string;
  bytes: number;
  width?: number;
  height?: number;
  blob: Blob;
  /** A small preview, made after the import. */
  thumb?: Blob;
  addedAt: number;
}

export interface AssetBackend {
  get(id: string): Promise<AssetRecord | null>;
  put(record: AssetRecord): Promise<void>;
  delete(id: string): Promise<void>;
  list(): Promise<AssetRecord[]>;
  /** Total bytes held. */
  size(): Promise<number>;
}

export class MemoryAssetBackend implements AssetBackend {
  private readonly map = new Map<string, AssetRecord>();
  async get(id: string) {
    return this.map.get(id) ?? null;
  }
  async put(record: AssetRecord) {
    this.map.set(record.id, record);
  }
  async delete(id: string) {
    this.map.delete(id);
  }
  async list() {
    return [...this.map.values()];
  }
  async size() {
    return [...this.map.values()].reduce((n, r) => n + r.bytes, 0);
  }
}

export class IdbAssetBackend implements AssetBackend {
  private db: Promise<IDBDatabase> | null = null;
  private open(): Promise<IDBDatabase> {
    const factory = getIndexedDB();
    if (!factory) return Promise.reject(new Error("This browser has no IndexedDB, so imported files can't be kept."));
    return (this.db ??= openDatabase(factory));
  }
  async get(id: string) {
    const db = await this.open();
    return runTransaction(db, ["assets"], "readonly", (tx) => requestResult<AssetRecord | undefined>(tx.objectStore("assets").get(id))).then((r) => r ?? null);
  }
  async put(record: AssetRecord) {
    const db = await this.open();
    await runTransaction(db, ["assets"], "readwrite", (tx) => requestResult(tx.objectStore("assets").put(record)));
  }
  async delete(id: string) {
    const db = await this.open();
    await runTransaction(db, ["assets"], "readwrite", (tx) => requestResult(tx.objectStore("assets").delete(id)));
  }
  async list() {
    const db = await this.open();
    return runTransaction(db, ["assets"], "readonly", (tx) => requestResult<AssetRecord[]>(tx.objectStore("assets").getAll()));
  }
  async size() {
    return (await this.list()).reduce((n, r) => n + r.bytes, 0);
  }
}
