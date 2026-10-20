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
  /** Every asset's description. The `blob` of each is not guaranteed to hold the bytes: use `get` for those. */
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

/**
 * How a record is kept in IndexedDB: a small description in `assets` and the bytes in `assetData`, as raw
 * ArrayBuffers, not as `Blob`s. Some engines (WebKit in private or automated profiles) refuse to store Blobs
 * ("Error preparing Blob/File data to be stored in object store"), and every engine can store an ArrayBuffer.
 * Keeping the bytes apart means listing the assets, or adding up their sizes, never reads them.
 */
type Meta = Omit<AssetRecord, "blob" | "thumb"> & { hasThumb: boolean };
interface Data {
  id: string;
  data: ArrayBuffer;
  thumbData?: ArrayBuffer;
  thumbType?: string;
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
    const [meta, data] = await runTransaction(db, ["assets", "assetData"], "readonly", async (tx) => [
      await requestResult<Meta | undefined>(tx.objectStore("assets").get(id)),
      await requestResult<Data | undefined>(tx.objectStore("assetData").get(id)),
    ] as const);
    if (!meta || !data) return null;
    const { hasThumb, ...rest } = meta;
    return { ...rest, blob: new Blob([data.data], { type: meta.mime }), ...(hasThumb && data.thumbData ? { thumb: new Blob([data.thumbData], { type: data.thumbType ?? "image/webp" }) } : {}) } as AssetRecord;
  }
  async put(record: AssetRecord) {
    const db = await this.open();
    const { blob, thumb, ...rest } = record;
    // read the bytes before the transaction opens: a transaction closes while it waits for anything but its own requests
    const data: Data = { id: record.id, data: await blob.arrayBuffer(), ...(thumb ? { thumbData: await thumb.arrayBuffer(), thumbType: thumb.type } : {}) };
    const meta: Meta = { ...rest, hasThumb: !!thumb };
    await runTransaction(db, ["assets", "assetData"], "readwrite", async (tx) => {
      await requestResult(tx.objectStore("assetData").put(data));
      await requestResult(tx.objectStore("assets").put(meta));
    });
  }
  async delete(id: string) {
    const db = await this.open();
    await runTransaction(db, ["assets", "assetData"], "readwrite", async (tx) => {
      await requestResult(tx.objectStore("assets").delete(id));
      await requestResult(tx.objectStore("assetData").delete(id));
    });
  }
  /** Descriptions with an empty `blob`: the bytes are read by `get`. */
  async list() {
    const db = await this.open();
    const metas = await runTransaction(db, ["assets"], "readonly", (tx) => requestResult<Meta[]>(tx.objectStore("assets").getAll()));
    return metas.map(({ hasThumb, ...rest }) => ({ ...rest, blob: new Blob([], { type: rest.mime }), ...(hasThumb ? { thumb: new Blob([], { type: "image/webp" }) } : {}) }) as AssetRecord);
  }
  async size() {
    const db = await this.open();
    const metas = await runTransaction(db, ["assets"], "readonly", (tx) => requestResult<Meta[]>(tx.objectStore("assets").getAll()));
    return metas.reduce((n, m) => n + m.bytes, 0);
  }
}
