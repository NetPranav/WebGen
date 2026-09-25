/**
 * ROADMAP Phase 3.2: autosave, reload with history, gesture-aware saving,
 * crash recovery and storage-full errors (IndexedDB via fake-indexeddb).
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import { ProjectDatabaseManager, createDefaultBlankSnapshot } from "../ProjectDatabase";
import { ProjectSession, useSaveStatus } from "../ProjectSession";
import { StorageQuotaError } from "../idb";
import { MemoryStorage } from "./memoryStorage";
import { documentCommands, gestureCoalescing, getDocument, historyCommands } from "../../store/useDocumentStore";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useProjectStore } from "../../store/useProjectStore";

const DELAY = 15;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const ROOT = "elem_canvas_root";

let factory: IDBFactory;
let storage: MemoryStorage;
let sessions: ProjectSession[] = [];

/** A fresh session over the shared "browser" (same IndexedDB and localStorage), like a reloaded tab. */
function newTab(delay = DELAY) {
  const db = new ProjectDatabaseManager(() => factory, () => null);
  const session = new ProjectSession(db, () => storage, delay);
  sessions.push(session);
  return { db, session };
}

const create = { name: "Gate", snapshot: createDefaultBlankSnapshot("prj_gate", "Gate") };

describe("ProjectSession (Phase 3.2)", () => {
  beforeEach(() => {
    factory = new IDBFactory();
    storage = new MemoryStorage();
    sessions = [];
    gestureCoalescing.release();
  });
  afterEach(() => sessions.forEach((s) => s.close()));

  it("gate analogue: 20 edits → reload → identical state → 20 undos → the blank start", async () => {
    const tab1 = newTab();
    const { created } = await tab1.session.open("prj_gate", { create });
    assert.ok(created);
    const blank = getDocument();

    for (let i = 0; i < 20; i++) documentCommands.updateProps(ROOT, { "layout.gap": i }, `Edit ${i}`);
    const edited = getDocument();
    await wait(DELAY * 4);
    assert.equal(useSaveStatus.getState().state, "saved");
    tab1.session.close();

    // Reload: wipe the in-memory stores, then open the project in a new "tab".
    useProjectStore.setState({ document: createDefaultBlankSnapshot("x", "x").document });
    useHistoryStore.getState().clearHistory();
    const tab2 = newTab();
    const { created: again, recovery } = await tab2.session.open("prj_gate");
    assert.equal(again, false);
    assert.equal(recovery, null);
    assert.deepEqual(getDocument(), edited);
    assert.equal(useHistoryStore.getState().past.length, 20);

    for (let i = 0; i < 20; i++) historyCommands.undo();
    assert.deepEqual(getDocument(), blank);
  });

  it("doesn't save mid-gesture; saves once when the gesture ends", async () => {
    const { db, session } = newTab();
    await session.open("prj_gate", { create });
    const start = (await db.getProject("prj_gate"))!.revision;

    gestureCoalescing.press();
    for (let x = 0; x < 30; x++) documentCommands.updateProps(ROOT, { "transform.x": x }, "Drag");
    await wait(DELAY * 4);
    assert.equal((await db.getProject("prj_gate"))!.revision, start, "no write while the pointer is down");

    gestureCoalescing.release();
    await wait(DELAY * 4);
    const saved = (await db.getProject("prj_gate"))!;
    assert.equal(saved.revision, start + 1, "exactly one write for the whole drag");
    assert.equal(saved.snapshot.document.layers[ROOT].properties["transform.x"], 29);
    assert.equal((await db.loadHistory("prj_gate"))!.past.length, 1);
  });

  it("crash recovery: unsaved edits are offered on the next open, and restore as one undo step", async () => {
    const tab1 = newTab(60_000); // autosave never fires before the "crash"
    await tab1.session.open("prj_gate", { create });
    documentCommands.updateProps(ROOT, { "a11y.label": "Unsaved" }, "Edit title");
    documentCommands.addLayer({ archetype: "button", parentId: ROOT }, "Add button");
    const lost = getDocument();
    tab1.session.close(); // the tab dies without saving

    const tab2 = newTab();
    const { recovery } = await tab2.session.open("prj_gate");
    assert.ok(recovery);
    assert.equal(recovery.changeCount, 2);
    assert.deepEqual(recovery.labels, ["Edit title", "Add button"]);
    assert.notDeepEqual(getDocument(), lost);

    assert.ok(await tab2.session.restoreRecovery());
    assert.deepEqual(getDocument(), lost);
    assert.equal(useHistoryStore.getState().getLastActionLabel(), "Recover unsaved changes");

    const tab3 = newTab();
    const reopened = await tab3.session.open("prj_gate");
    assert.equal(reopened.recovery, null, "restored changes were saved; nothing left to recover");
    assert.deepEqual(getDocument(), lost);
  });

  it("discarding recovery keeps the saved version", async () => {
    const tab1 = newTab(60_000);
    await tab1.session.open("prj_gate", { create });
    const saved = getDocument();
    documentCommands.updateProps(ROOT, { "a11y.label": "Unsaved" }, "Edit title");
    tab1.session.close();

    const tab2 = newTab();
    assert.ok((await tab2.session.open("prj_gate")).recovery);
    await tab2.session.discardRecovery();
    assert.deepEqual(getDocument(), saved);
    assert.equal((await newTab().session.open("prj_gate")).recovery, null);
  });

  it("changes that were saved are not offered again (the journal is trimmed by each save)", async () => {
    const tab1 = newTab();
    await tab1.session.open("prj_gate", { create });
    documentCommands.updateProps(ROOT, { "a11y.label": "Saved" }, "Edit title");
    await tab1.session.flush();
    tab1.session.close();
    assert.equal((await newTab().session.open("prj_gate")).recovery, null);
  });

  it("undo is journaled too, so recovery replays undo correctly", async () => {
    const tab1 = newTab(60_000);
    await tab1.session.open("prj_gate", { create });
    documentCommands.updateProps(ROOT, { "layout.gap": 1 }, "A");
    documentCommands.updateProps(ROOT, { "layout.padding": 2 }, "B");
    historyCommands.undo();
    const expected = getDocument();
    tab1.session.close();

    const tab2 = newTab();
    await tab2.session.open("prj_gate");
    await tab2.session.restoreRecovery();
    assert.deepEqual(getDocument(), expected);
  });

  it("a full disk surfaces a clear, actionable error", async () => {
    const db = new ProjectDatabaseManager(() => factory, () => null);
    const session = new ProjectSession(db, () => storage, DELAY);
    sessions.push(session);
    await session.open("prj_gate", { create });
    db.putProject = async () => {
      throw new StorageQuotaError();
    };
    documentCommands.updateProps(ROOT, { "a11y.label": "x" }, "Edit");
    await wait(DELAY * 4);
    const status = useSaveStatus.getState();
    assert.equal(status.state, "error");
    assert.equal(status.error?.kind, "quota");
    assert.match(status.error!.message, /storage is full.*\.lazy\.json/i);
  });
});
