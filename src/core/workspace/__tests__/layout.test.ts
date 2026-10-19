import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LAYOUT, PRESET_IDS, WorkspaceLayoutSchema, applyPreset, clampLayout, parseLayout } from "../layout";
import { useWorkspaceStore, WORKSPACE_STORAGE_KEY, installWorkspacePersistence } from "../useWorkspaceStore";

describe("Phase 14: workspace layout model", () => {
  it("the default layout satisfies its own schema", () => {
    assert.equal(WorkspaceLayoutSchema.safeParse(DEFAULT_LAYOUT).success, true);
  });

  it("every preset yields a valid layout and records itself", () => {
    for (const id of PRESET_IDS) {
      const { layout } = applyPreset(DEFAULT_LAYOUT, id);
      assert.equal(WorkspaceLayoutSchema.safeParse(layout).success, true, id);
      assert.equal(layout.preset, id);
    }
  });

  it("presets reproduce the shell's old workspace switcher", () => {
    const animate = applyPreset(DEFAULT_LAYOUT, "animate");
    assert.equal(animate.layout.left.collapsed, true);
    assert.equal(animate.layout.bottom.activeTab, "sequencer");
    assert.equal(animate.layout.bottom.size, 420);
    assert.deepEqual(animate.effects, [{ type: "focusZone", zone: "bottom" }]);

    const logic = applyPreset(DEFAULT_LAYOUT, "logic");
    assert.deepEqual(logic.effects, [{ type: "fullPage", panelId: "blueprint", title: "Logic Blueprint" }]);

    assert.equal(applyPreset(DEFAULT_LAYOUT, "debug").layout.outputLogOpen, true);
    assert.equal(applyPreset(DEFAULT_LAYOUT, "design").layout.bottom.collapsed, true);
  });

  it("applying a preset never mutates its input; an unknown preset changes nothing", () => {
    const before = structuredClone(DEFAULT_LAYOUT);
    applyPreset(DEFAULT_LAYOUT, "animate");
    assert.deepEqual(DEFAULT_LAYOUT, before);
    const unknown = applyPreset(DEFAULT_LAYOUT, "nope");
    assert.equal(unknown.layout, DEFAULT_LAYOUT);
    assert.deepEqual(unknown.effects, []);
  });

  it("parseLayout falls back to the default for garbage, other versions and bad values", () => {
    assert.deepEqual(parseLayout(null), DEFAULT_LAYOUT);
    assert.deepEqual(parseLayout({ version: 2 }), DEFAULT_LAYOUT);
    assert.deepEqual(parseLayout({ ...DEFAULT_LAYOUT, right: { size: -5, collapsed: false, activeTab: "details" } }), DEFAULT_LAYOUT);
    assert.deepEqual(parseLayout(JSON.parse(JSON.stringify(DEFAULT_LAYOUT))), DEFAULT_LAYOUT);
  });

  it("clampLayout keeps restored sizes inside what the splitters allow", () => {
    const wild = { ...DEFAULT_LAYOUT, right: { ...DEFAULT_LAYOUT.right, size: 2000 }, bottom: { ...DEFAULT_LAYOUT.bottom, size: 10 } };
    const clamped = clampLayout(wild);
    assert.equal(clamped.right.size, 550);
    assert.equal(clamped.bottom.size, 140);
  });
});

describe("Phase 14: workspace store", () => {
  const storage = new Map<string, string>();
  beforeEach(() => {
    storage.clear();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
      removeItem: (k: string) => void storage.delete(k),
    } as Storage;
    useWorkspaceStore.setState({ layout: DEFAULT_LAYOUT, hydrated: false });
  });

  it("zone actions update the layout, including functional updates", () => {
    const s = useWorkspaceStore.getState();
    s.setZoneSize("right", 400);
    s.setZoneTab("bottom", "sequencer");
    s.setZoneCollapsed("left", (c) => !c);
    s.setOutputLogOpen(true);
    s.setAi({ open: true, side: "left" });
    const { layout } = useWorkspaceStore.getState();
    assert.equal(layout.right.size, 400);
    assert.equal(layout.bottom.activeTab, "sequencer");
    assert.equal(layout.left.collapsed, true);
    assert.equal(layout.outputLogOpen, true);
    assert.deepEqual(layout.ai, { open: true, side: "left", width: 340 });
  });

  it("a saved layout survives a reload: persisted, then hydrated", async () => {
    useWorkspaceStore.setState({ hydrated: true });
    const stop = installWorkspacePersistence();
    useWorkspaceStore.getState().setZoneSize("right", 410);
    useWorkspaceStore.getState().setZoneTab("right", "tokens");
    await new Promise((r) => setTimeout(r, 400));
    stop();
    const saved = JSON.parse(storage.get(WORKSPACE_STORAGE_KEY) ?? "null");
    assert.equal(saved.right.size, 410);

    useWorkspaceStore.setState({ layout: DEFAULT_LAYOUT, hydrated: false }); // the page reloads
    useWorkspaceStore.getState().hydrate();
    assert.equal(useWorkspaceStore.getState().layout.right.size, 410);
    assert.equal(useWorkspaceStore.getState().layout.right.activeTab, "tokens");
  });

  it("corrupt or blocked storage falls back to the default layout", () => {
    storage.set(WORKSPACE_STORAGE_KEY, "{not json");
    useWorkspaceStore.getState().hydrate();
    assert.deepEqual(useWorkspaceStore.getState().layout, DEFAULT_LAYOUT);
    assert.equal(useWorkspaceStore.getState().hydrated, true);
  });

  it("selectPreset returns the effects the shell must run; resetLayout restores full-studio", () => {
    const effects = useWorkspaceStore.getState().selectPreset("logic");
    assert.equal(effects[0]?.type, "fullPage");
    useWorkspaceStore.getState().resetLayout();
    assert.equal(useWorkspaceStore.getState().layout.preset, "full-studio");
  });
});
