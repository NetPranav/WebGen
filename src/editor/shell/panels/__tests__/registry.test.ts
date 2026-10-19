import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { clearPanelRegistry, getPanel, getPanels, loadedPanelIds, markPanelLoaded, onPanelLoaded, registerPanel, resolveFullPagePanel } from "../registry";

const stub = async () => () => null;

describe("Phase 14: panel registry", () => {
  beforeEach(clearPanelRegistry);

  it("registers a panel per zone and id, and replaces on re-register", () => {
    registerPanel({ id: "details", title: "Details", zone: "right", edition: "initial", load: stub });
    registerPanel({ id: "details", title: "Details (bottom)", zone: "bottom", edition: "initial", load: stub });
    assert.equal(getPanel("right", "details")?.title, "Details");
    assert.equal(getPanel("bottom", "details")?.title, "Details (bottom)");
    registerPanel({ id: "details", title: "Renamed", zone: "right", edition: "initial", load: stub });
    assert.equal(getPanel("right", "details")?.title, "Renamed");
    assert.equal(getPanels("right").length, 1);
  });

  it("resolves a full-page tab by exact id, then by match in registration order, then the fallback", () => {
    registerPanel({ id: "sequencer", title: "Sequencer", zone: "fullpage", edition: "initial", load: stub, match: (id) => id.includes("seq") });
    registerPanel({ id: "console", title: "Output", zone: "fullpage", edition: "initial", load: stub });
    registerPanel({ id: "asset", title: "Asset", zone: "fullpage", edition: "initial", load: stub, match: () => true });
    assert.equal(resolveFullPagePanel("console", "x")?.id, "console");
    assert.equal(resolveFullPagePanel("my.seq", "x")?.id, "sequencer");
    assert.equal(resolveFullPagePanel("anything", "hero.png")?.id, "asset");
  });

  it("tracks which panels' code has been loaded", () => {
    registerPanel({ id: "curves", title: "Curves", zone: "bottom", edition: "initial", load: stub });
    assert.deepEqual(loadedPanelIds(), []);
    markPanelLoaded("bottom", "curves");
    assert.deepEqual(loadedPanelIds(), ["bottom:curves"]);
  });

  it("notifies subscribers once per newly loaded panel", () => {
    let calls = 0;
    const off = onPanelLoaded(() => calls++);
    markPanelLoaded("bottom", "curves");
    markPanelLoaded("bottom", "curves");
    markPanelLoaded("bottom", "sequencer");
    assert.equal(calls, 2);
    off();
    markPanelLoaded("right", "details");
    assert.equal(calls, 2);
  });
});
