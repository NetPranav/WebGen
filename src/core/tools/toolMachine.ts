/**
 * ============================================================================
 * TOOL STATE MACHINE (ROADMAP Phase 24)
 * ============================================================================
 * Which tool is active, and which tool is acting right now. The *active* tool
 * is the one the person chose (the dock, a shortcut). A *spring* is a tool held
 * only while a key is down: holding Space gives the Hand, holding Cmd/Ctrl gives
 * deep select. The *current* tool is the newest spring's tool, else the active
 * one; releasing the key drops the spring and the active tool is back. Choosing
 * a tool while a spring is held changes the active tool underneath, so
 * releasing returns to the new choice.
 *
 * Plain data and functions, no DOM: the rules are unit-tested.
 * ============================================================================
 */

export interface Spring {
  /** What holds it: "space", "mod". */
  key: string;
  tool: string;
}

export class ToolMachine {
  private active_: string;
  private springs_: Spring[] = [];
  private readonly listeners = new Set<() => void>();

  constructor(initial: string, private readonly isAvailable: (id: string) => boolean = () => true) {
    this.active_ = initial;
  }

  /** The tool the person chose. */
  get active(): string {
    return this.active_;
  }

  /** The tool acting now: the newest spring's, else the active one. */
  get current(): string {
    const top = this.springs_[this.springs_.length - 1];
    return top ? top.tool : this.active_;
  }

  get springs(): readonly Spring[] {
    return this.springs_;
  }

  /** Chooses a tool. Returns false (and changes nothing) when it doesn't exist yet. */
  setActive(id: string): boolean {
    if (!this.isAvailable(id)) return false;
    if (id === this.active_) return true;
    this.active_ = id;
    this.emit();
    return true;
  }

  /** Starts holding `tool` for `key`. A second begin for a key already held does nothing (key repeat). */
  beginSpring(key: string, tool: string): boolean {
    if (!this.isAvailable(tool)) return false;
    if (this.springs_.some((s) => s.key === key)) return false;
    this.springs_ = [...this.springs_, { key, tool }];
    this.emit();
    return true;
  }

  /** The key came up: its spring ends and the previous tool is back. */
  endSpring(key: string): void {
    const next = this.springs_.filter((s) => s.key !== key);
    if (next.length === this.springs_.length) return;
    this.springs_ = next;
    this.emit();
  }

  /** Window lost focus or the like: no key can be trusted to still be down. */
  endAllSprings(): void {
    if (this.springs_.length === 0) return;
    this.springs_ = [];
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }
}
