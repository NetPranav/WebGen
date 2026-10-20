import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { requestPersistence } from "../persistence";
import { MemoryStorage } from "./memoryStorage";

describe("Phase 36: asking the browser to keep our storage", () => {
  it("asks once, and remembers that it asked", async () => {
    let calls = 0;
    const flags = new MemoryStorage();
    const storage = { persist: async () => (calls++, true), persisted: async () => false };
    assert.equal(await requestPersistence({ storage, flags }), "granted");
    assert.equal(await requestPersistence({ storage, flags }), "already-asked");
    assert.equal(calls, 1);
  });
  it("a refusal is reported and not asked again", async () => {
    const flags = new MemoryStorage();
    const storage = { persist: async () => false, persisted: async () => false };
    assert.equal(await requestPersistence({ storage, flags }), "denied");
    assert.equal(await requestPersistence({ storage, flags }), "already-asked");
  });
  it("storage that is already persistent needs no request", async () => {
    let calls = 0;
    const storage = { persist: async () => (calls++, true), persisted: async () => true };
    assert.equal(await requestPersistence({ storage, flags: new MemoryStorage() }), "granted");
    assert.equal(calls, 0);
  });
  it("a browser without the API, or one that throws, is fine", async () => {
    assert.equal(await requestPersistence({ storage: null, flags: new MemoryStorage() }), "unsupported");
    assert.equal(await requestPersistence({ storage: {}, flags: new MemoryStorage() }), "unsupported");
    assert.equal(await requestPersistence({ storage: { persist: async () => { throw new Error("no"); } }, flags: new MemoryStorage() }), "denied");
  });
});
