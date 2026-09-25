"use client";

/**
 * ============================================================================
 * PROJECT SESSION: LOAD, AUTOSAVE & CRASH RECOVERY
 * ============================================================================
 * ROADMAP Phase 3.2.
 *
 * - `open(id)` loads a project and its undo history from IndexedDB into the
 *   stores, then starts autosave.
 * - Autosave: any change to the saved project state or the history schedules
 *   a debounced write (`AUTOSAVE_DELAY_MS`). Nothing is written while a
 *   gesture transaction is open, so a drag is saved once, when it ends.
 *   `flush()` saves at once (Cmd+S, tab hidden, page hide).
 * - Crash journal: every durable document change is appended synchronously to
 *   a small localStorage journal, tied to the revision it builds on. A save
 *   trims what it covered. If the tab dies between an edit and its save, the
 *   next `open` finds the journal and offers to restore those changes.
 *   Changes made outside the document commands (loading a project, mounting
 *   the demo) can't be journaled as patches; they reset the journal and are
 *   saved right away instead.
 * - Save status (for the UI) lives in `useSaveStatus`.
 * ============================================================================
 */

import { create } from "zustand";
import type { Patch } from "immer";
import { useProjectStore, type ProjectStateSnapshot } from "../store/useProjectStore";
import { useHistoryStore } from "../store/useHistoryStore";
import { documentCommands, getDocument, isTransactionOpen, subscribeToDocumentChanges } from "../store/useDocumentStore";
import { ProjectDatabase, type ProjectDatabaseManager, type ProjectSettings } from "./ProjectDatabase";
import { isQuotaError } from "./idb";
import type { MotionDocument } from "../document/schema";

export const AUTOSAVE_DELAY_MS = 400;
const JOURNAL_PREFIX = "lazylayout:journal:";

/** `pending`: unsaved changes are waiting for the autosave delay. */
export type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

export interface SaveStatus {
  state: SaveState;
  lastSavedAt: number | null;
  /** "quota" when storage is full; the message says what the user can do. */
  error: null | { kind: "quota" | "unknown"; message: string };
  /** False when IndexedDB is unavailable and projects live only in memory. */
  persistent: boolean;
}

export const useSaveStatus = create<SaveStatus>(() => ({
  state: "idle",
  lastSavedAt: null,
  error: null,
  persistent: true,
}));

interface JournalEntry {
  seq: number;
  at: number;
  label: string;
  patches: Patch[];
}

interface Journal {
  projectId: string;
  /** Record revision the entries apply on top of; -1 when the journal is invalid until the next save. */
  baseRevision: number;
  entries: JournalEntry[];
}

export interface PendingRecovery {
  projectId: string;
  changeCount: number;
  lastChangeAt: number;
  labels: string[];
}

export interface OpenProjectOptions {
  /** Used when the project doesn't exist yet. */
  create?: { name?: string; settings?: ProjectSettings; snapshot?: ProjectStateSnapshot };
}

export interface OpenProjectResult {
  created: boolean;
  recovery: PendingRecovery | null;
}

function defaultStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Snapshot fields whose change means the project needs saving. */
const WATCHED_KEYS: (keyof ProjectStateSnapshot)[] = [
  "projectName",
  "scope",
  "rootArchetype",
  "activePageId",
  "pages",
  "document",
  "databaseSchemas",
  "databaseRecords",
  "stateVariables",
  "animationSamples",
  "bindings",
  "databaseLatches",
  "blueprintGraphs",
  "activeBlueprintGraphId",
  "redirectRules",
  "environment",
];

export class ProjectSession {
  private projectId: string | null = null;
  private revision = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private saving: Promise<void> | null = null;
  private saveAgain = false;
  private disposers: (() => void)[] = [];
  private seq = 0;
  private journal: Journal | null = null;
  /** The last document produced through the command API (anything else is a raw write). */
  private lastEmittedDocument: MotionDocument | null = null;
  private pendingRecovery: { journal: Journal } | null = null;

  constructor(
    private readonly db: ProjectDatabaseManager = ProjectDatabase,
    private readonly storage: () => Storage | null = defaultStorage,
    private readonly delayMs = AUTOSAVE_DELAY_MS
  ) {}

  get currentProjectId(): string | null {
    return this.projectId;
  }

  /** Loads `id` into the stores (creating it if needed) and starts autosave. */
  async open(id: string, options: OpenProjectOptions = {}): Promise<OpenProjectResult> {
    this.close();
    useSaveStatus.setState({ persistent: await this.db.isPersistent(), error: null, state: "idle" });

    let record = await this.db.getProject(id);
    const created = !record;
    if (!record) {
      record = await this.db.registerProject({
        id,
        name: options.create?.name,
        settings: options.create?.settings,
        snapshot: options.create?.snapshot,
      });
    }

    const project = useProjectStore.getState();
    project.restoreSnapshot(record.snapshot);
    project.setProjectId(id);
    if (record.name) project.setProjectName(record.name);
    useHistoryStore.getState().load((await this.db.loadHistory(id)) ?? { past: [], future: [] });

    this.projectId = id;
    this.revision = record.revision;
    this.lastEmittedDocument = getDocument();

    const stale = this.readJournal(id);
    const recovery =
      stale && stale.baseRevision === record.revision && stale.entries.length > 0 ? this.describeRecovery(stale) : null;
    this.pendingRecovery = recovery && stale ? { journal: stale } : null;
    if (!recovery) this.writeJournal({ projectId: id, baseRevision: record.revision, entries: [] });
    else this.journal = { projectId: id, baseRevision: -1, entries: [] };

    this.start();
    useSaveStatus.setState({ state: "saved", lastSavedAt: Date.parse(record.updatedAt) || Date.now() });
    return { created, recovery };
  }

  /** Applies the journaled changes found by `open` as one undoable step, then saves. */
  async restoreRecovery(): Promise<boolean> {
    const pending = this.pendingRecovery;
    this.pendingRecovery = null;
    if (!pending) return false;
    const patches = pending.journal.entries.flatMap((entry) => entry.patches);
    try {
      documentCommands.applyDiff(patches, "Recover unsaved changes");
    } catch (error) {
      console.warn("[ProjectSession] Recovered changes no longer apply; discarding them.", error);
      await this.flush();
      return false;
    }
    await this.flush();
    return true;
  }

  /** Drops the journaled changes found by `open`. */
  async discardRecovery(): Promise<void> {
    this.pendingRecovery = null;
    await this.flush();
  }

  /** Saves now (waits for a save already in flight). */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.save();
  }

  /** Stops autosave and listeners. Pending changes are not saved; call `flush` first. */
  close() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.disposers.forEach((dispose) => dispose());
    this.disposers = [];
    this.projectId = null;
  }

  // ------------------------------------------------------------------ internals

  private start() {
    this.disposers.push(
      useProjectStore.subscribe((state, prev) => {
        if (!WATCHED_KEYS.some((key) => state[key] !== prev[key])) return;
        if (state.document !== prev.document) this.checkRawDocumentWrite();
        this.schedule();
      }),
      useHistoryStore.subscribe((state, prev) => {
        if (state.past !== prev.past || state.future !== prev.future) this.schedule();
      }),
      subscribeToDocumentChanges((change) => {
        this.lastEmittedDocument = getDocument();
        if (change.transient) return;
        this.appendJournal(change.label ?? "Edit", change.patches);
      })
    );
  }

  /** A document write that didn't go through the commands can't be journaled: reset and save now. */
  private checkRawDocumentWrite() {
    queueMicrotask(() => {
      if (!this.projectId || getDocument() === this.lastEmittedDocument) return;
      this.lastEmittedDocument = getDocument();
      if (this.journal) this.writeJournal({ ...this.journal, baseRevision: -1, entries: [] });
      void this.flush();
    });
  }

  private schedule(delay = this.delayMs) {
    if (!this.projectId) return;
    if (useSaveStatus.getState().state !== "error") useSaveStatus.setState({ state: "pending" });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      if (isTransactionOpen()) this.schedule();
      else void this.save();
    }, delay);
  }

  private async save(): Promise<void> {
    if (this.saving) {
      this.saveAgain = true;
      return this.saving;
    }
    const projectId = this.projectId;
    if (!projectId) return;

    const snapshot = useProjectStore.getState().getSnapshot();
    const { past, future } = useHistoryStore.getState();
    const coveredSeq = this.seq;
    useSaveStatus.setState({ state: "saving" });

    this.saving = (async () => {
      try {
        const record = await this.db.saveProjectSnapshot(projectId, snapshot, { history: { past, future } });
        if (record && this.projectId === projectId) {
          this.revision = record.revision;
          this.trimJournal(coveredSeq, record.revision);
        }
        useSaveStatus.setState({ state: "saved", lastSavedAt: Date.now(), error: null });
      } catch (error) {
        const quota = isQuotaError(error);
        useSaveStatus.setState({
          state: "error",
          error: {
            kind: quota ? "quota" : "unknown",
            message: quota
              ? "Browser storage is full, so recent changes are not saved. Export this project as a .lazy.json file, or delete old projects, then save again."
              : `Saving failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        });
      }
    })();

    try {
      await this.saving;
    } finally {
      this.saving = null;
    }
    if (this.saveAgain) {
      this.saveAgain = false;
      await this.save();
    }
  }

  // -------------------------------------------------------------------- journal

  private journalKey(id: string) {
    return `${JOURNAL_PREFIX}${id}`;
  }

  private readJournal(id: string): Journal | null {
    try {
      const raw = this.storage()?.getItem(this.journalKey(id));
      return raw ? (JSON.parse(raw) as Journal) : null;
    } catch {
      return null;
    }
  }

  private writeJournal(journal: Journal) {
    this.journal = journal;
    try {
      this.storage()?.setItem(this.journalKey(journal.projectId), JSON.stringify(journal));
    } catch (error) {
      // A full localStorage only costs crash recovery, not saving.
      console.warn("[ProjectSession] Crash journal not written.", error);
    }
  }

  private appendJournal(label: string, patches: Patch[]) {
    if (!this.journal || !this.projectId || patches.length === 0) return;
    if (this.journal.baseRevision === -1) return;
    this.seq += 1;
    this.writeJournal({ ...this.journal, entries: [...this.journal.entries, { seq: this.seq, at: Date.now(), label, patches }] });
  }

  private trimJournal(coveredSeq: number, revision: number) {
    if (!this.journal) return;
    this.writeJournal({
      ...this.journal,
      baseRevision: revision,
      entries: this.journal.entries.filter((entry) => entry.seq > coveredSeq),
    });
  }

  private describeRecovery(journal: Journal): PendingRecovery {
    return {
      projectId: journal.projectId,
      changeCount: journal.entries.length,
      lastChangeAt: journal.entries[journal.entries.length - 1].at,
      labels: journal.entries.map((entry) => entry.label),
    };
  }
}

export const projectSession = new ProjectSession();
