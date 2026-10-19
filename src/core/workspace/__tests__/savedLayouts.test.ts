import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LAYOUT, applyPreset } from "../layout";
import { MAX_SAVED_LAYOUTS, findLayout, normalizeLayoutName, parseSavedLayouts, removeLayout, saveLayoutAs } from "../savedLayouts";
import { useSavedLayouts, SAVED_LAYOUTS_STORAGE_KEY } from "../useSavedLayouts";

describe("Phase 15: saved layouts", () => {
  it("normalizes names and rejects empty or over-long ones", () => {
    assert.equal(normalizeLayoutName("  My   layout "), "My layout");
    assert.equal(normalizeLayoutName("   "), null);
    assert.equal(normalizeLayoutName("x".repeat(41)), null);
  });

  it("saving stores a copy tagged as a custom preset, and saving under the same name (any case) replaces it", () => {
    const wide = applyPreset(DEFAULT_LAYOUT, "code").layout;
    const first = saveLayoutAs([], "Review", wide);
    assert.ok(first.ok && !first.replaced);
    assert.equal(first.ok && first.layouts[0].layout.preset, "custom:Review");
    assert.equal(first.ok && first.layouts[0].layout.right.activeTab, "code");

    const again = saveLayoutAs(first.ok ? first.layouts : [], "review", DEFAULT_LAYOUT);
    assert.ok(again.ok && again.replaced && again.layouts.length === 1);
    assert.equal(again.ok && again.layouts[0].layout.right.activeTab, "design");
  });

  it("refuses a bad name or a 21st layout", () => {
    assert.deepEqual(saveLayoutAs([], "  ", DEFAULT_LAYOUT), { ok: false, reason: "invalid-name" });
    let list: ReturnType<typeof removeLayout> = [];
    for (let i = 0; i < MAX_SAVED_LAYOUTS; i++) {
      const r = saveLayoutAs(list, `L${i}`, DEFAULT_LAYOUT);
      assert.ok(r.ok);
      if (r.ok) list = r.layouts;
    }
    assert.deepEqual(saveLayoutAs(list, "one too many", DEFAULT_LAYOUT), { ok: false, reason: "limit-reached" });
  });

  it("finds and removes by name regardless of case; parse gives an empty list for garbage", () => {
    const r = saveLayoutAs([], "Focus", DEFAULT_LAYOUT);
    const list = r.ok ? r.layouts : [];
    assert.ok(findLayout(list, "FOCUS"));
    assert.equal(removeLayout(list, "focus").length, 0);
    assert.deepEqual(parseSavedLayouts({ nope: 1 }), []);
    assert.deepEqual(parseSavedLayouts(null), []);
  });
});

describe("Phase 15: saved layouts store", () => {
  const storage = new Map<string, string>();
  beforeEach(() => {
    storage.clear();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
      removeItem: (k: string) => void storage.delete(k),
    } as Storage;
    useSavedLayouts.setState({ layouts: [], hydrated: false });
  });

  it("a custom layout survives a reload", () => {
    const code = applyPreset(DEFAULT_LAYOUT, "code").layout;
    assert.ok(useSavedLayouts.getState().save("Code review", code).ok);
    assert.ok(storage.has(SAVED_LAYOUTS_STORAGE_KEY));

    useSavedLayouts.setState({ layouts: [], hydrated: false }); // the page reloads
    useSavedLayouts.getState().hydrate();
    assert.equal(useSavedLayouts.getState().layouts.length, 1);
    assert.equal(useSavedLayouts.getState().get("code review")?.right.activeTab, "code");
  });

  it("corrupt storage hydrates to an empty list", () => {
    storage.set(SAVED_LAYOUTS_STORAGE_KEY, "{oops");
    useSavedLayouts.getState().hydrate();
    assert.deepEqual(useSavedLayouts.getState().layouts, []);
  });

  it("removing a layout is saved too", () => {
    useSavedLayouts.getState().save("A", DEFAULT_LAYOUT);
    useSavedLayouts.getState().remove("a");
    assert.deepEqual(JSON.parse(storage.get(SAVED_LAYOUTS_STORAGE_KEY) ?? "{}").layouts, []);
  });
});
