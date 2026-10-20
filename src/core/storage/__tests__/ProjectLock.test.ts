import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ProjectLock, type ChannelLike } from "../ProjectLock";

/** An in-memory BroadcastChannel: every channel with the same name hears every other one's messages. */
function bus() {
  const channels = new Map<string, Set<FakeChannel>>();
  class FakeChannel implements ChannelLike {
    onmessage: ((e: { data: unknown }) => void) | null = null;
    constructor(readonly name: string) {
      if (!channels.has(name)) channels.set(name, new Set());
      channels.get(name)!.add(this);
    }
    postMessage(message: unknown) {
      for (const c of channels.get(this.name) ?? []) if (c !== this) queueMicrotask(() => c.onmessage?.({ data: structuredClone(message) }));
    }
    close() {
      channels.get(this.name)?.delete(this);
    }
  }
  return (name: string) => new FakeChannel(name);
}

const tab = (make: ReturnType<typeof bus>, id: string, project = "p1") => new ProjectLock(project, { makeChannel: make, tabId: id, waitMs: 20 });

describe("Phase 36: one editor per project across tabs", () => {
  it("the first tab owns the project, a second tab opens read-only", async () => {
    const make = bus();
    const a = tab(make, "a");
    assert.equal(await a.acquire(), "owner");
    const b = tab(make, "b");
    assert.equal(await b.acquire(), "readonly");
    assert.equal(a.current, "owner");
  });

  it("a different project is a different lock", async () => {
    const make = bus();
    assert.equal(await tab(make, "a", "p1").acquire(), "owner");
    assert.equal(await tab(make, "b", "p2").acquire(), "owner");
  });

  it("taking over makes the other tab read-only and tells it", async () => {
    const make = bus();
    const a = tab(make, "a");
    const b = tab(make, "b");
    await a.acquire();
    await b.acquire();
    const seen: string[] = [];
    a.onChange((s) => seen.push(s));
    b.takeOver();
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(b.current, "owner");
    assert.equal(a.current, "readonly");
    assert.deepEqual(seen, ["readonly"]);
  });

  it("two tabs that open at the same moment settle on one owner (the smaller id)", async () => {
    const make = bus();
    const a = tab(make, "a");
    const b = tab(make, "b");
    const [sa, sb] = await Promise.all([a.acquire(), b.acquire()]);
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(a.current, "owner", "the smaller id keeps it");
    assert.equal(b.current, "readonly");
    assert.ok(sa === "owner" && (sb === "readonly" || sb === "owner"));
  });

  it("a browser without BroadcastChannel always owns the project", async () => {
    const lock = new ProjectLock("p", { makeChannel: () => null, waitMs: 5 });
    assert.equal(await lock.acquire(), "owner");
  });

  it("ignores messages that aren't ours, and its own", async () => {
    const make = bus();
    const a = tab(make, "a");
    await a.acquire();
    const stranger = make("lazylayout:project:p1");
    stranger.postMessage({ t: "takeover" }); // no sender id
    stranger.postMessage("takeover");
    stranger.postMessage(null);
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(a.current, "owner");
  });

  it("releasing closes the channel, and a closed lock no longer answers", async () => {
    const make = bus();
    const a = tab(make, "a");
    await a.acquire();
    a.release();
    assert.equal(await tab(make, "b").acquire(), "owner");
  });
});
