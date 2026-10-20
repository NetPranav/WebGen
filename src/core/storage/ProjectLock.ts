/**
 * ============================================================================
 * ONE EDITOR PER PROJECT, ACROSS TABS (ROADMAP Phase 36)
 * ============================================================================
 * Two tabs editing one project would each save over the other. Tabs of the same project talk on a
 * `BroadcastChannel`: a tab that opens the project asks "who has it?"; if another tab answers, this one opens
 * read-only (and says so). "Edit here instead" takes the project over: the other tab becomes read-only. Two tabs
 * that open at the same moment both think they own it, hear each other, and the one with the smaller id keeps it.
 * The channel is injected so the protocol is a plain unit test.
 * ============================================================================
 */

export interface ChannelLike {
  postMessage(message: unknown): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  close(): void;
}

export type LockState = "owner" | "readonly";

type Message = { t: "who" | "owner" | "takeover" | "released"; from: string };

const isMessage = (m: unknown): m is Message => {
  const o = m as Record<string, unknown> | null;
  return !!o && typeof o === "object" && typeof o.from === "string" && ["who", "owner", "takeover", "released"].includes(o.t as string);
};

export interface LockOptions {
  makeChannel?: (name: string) => ChannelLike | null;
  tabId?: string;
  /** How long to wait for another tab to answer, ms. */
  waitMs?: number;
}

const defaultChannel = (name: string): ChannelLike | null => (typeof BroadcastChannel === "undefined" ? null : (new BroadcastChannel(name) as unknown as ChannelLike));
const randomId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export class ProjectLock {
  readonly tabId: string;
  private channel: ChannelLike | null = null;
  private state: LockState = "owner";
  private readonly listeners = new Set<(state: LockState) => void>();
  private readonly makeChannel: (name: string) => ChannelLike | null;
  private readonly waitMs: number;

  constructor(readonly projectId: string, options: LockOptions = {}) {
    this.tabId = options.tabId ?? randomId();
    this.makeChannel = options.makeChannel ?? defaultChannel;
    this.waitMs = options.waitMs ?? 300;
  }

  get current(): LockState {
    return this.state;
  }

  onChange(listener: (state: LockState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private set(state: LockState) {
    if (state === this.state) return;
    this.state = state;
    this.listeners.forEach((l) => l(state));
  }

  private send(t: Message["t"]) {
    this.channel?.postMessage({ t, from: this.tabId } satisfies Message);
  }

  /** Opens the channel and finds out whether another tab has the project. Resolves with this tab's state. A browser with no BroadcastChannel always owns it. */
  async acquire(): Promise<LockState> {
    this.channel = this.makeChannel(`lazylayout:project:${this.projectId}`);
    if (!this.channel) return "owner";
    let heard = false;
    this.channel.onmessage = (event) => {
      const m = event.data;
      if (!isMessage(m) || m.from === this.tabId) return;
      if (m.t === "who") {
        if (this.state === "owner") this.send("owner");
      } else if (m.t === "owner") {
        heard = true;
        // two owners (both opened at once): the smaller id keeps it
        if (this.state === "owner" && m.from < this.tabId) this.set("readonly");
      } else if (m.t === "takeover") {
        if (this.state === "owner") this.set("readonly");
      }
    };
    this.state = "owner";
    this.send("who");
    await new Promise((resolve) => setTimeout(resolve, this.waitMs));
    if (heard && this.state === "owner") {
      // somebody answered: they have it, unless the tie-break above already settled it the other way
      this.set("readonly");
    }
    return this.state;
  }

  /** Makes this tab the editor and the others read-only. */
  takeOver(): void {
    this.send("takeover");
    this.set("owner");
  }

  release(): void {
    if (this.state === "owner") this.send("released");
    if (this.channel) {
      this.channel.onmessage = null;
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
}
