import type { EvaluateInputs } from "../../kernel/evaluate";
import { KernelAdapter } from "./KernelAdapter";
import { WaapiAdapter, type RunningLayer } from "./WaapiAdapter";
import { canRunOnWaapi } from "./waapiEligibility";
import type { AdapterHost, EngineAdapter, EngineCapabilities } from "./types";

/**
 * ROADMAP Phases 58 and 59: the stage's engines. Each animated layer belongs to exactly one engine at a time.
 *
 * - **Scrubbing (not playing): the kernel draws every layer.** Seeking shows `evaluate()` exactly, at any time, in any
 *   order, with nothing running on its own clock.
 * - **Playing: each layer hands over to its routed adapter.** A layer the rules route to CSS (and whose properties can
 *   be animated that way) becomes a Web Animation started at the transport's time and rate; the rest stay on the kernel.
 *   The Web Animation is baked from the kernel, so the hand-over doesn't change a pixel.
 * - **Pausing hands the layer back** to the kernel at the transport's time.
 *
 * Without `Element.animate` everything stays on the kernel.
 */
export class StageAdapters implements EngineAdapter {
  readonly id = "stage";
  readonly capabilities: EngineCapabilities = { scrub: true, deterministic: false, offMainThread: true };
  readonly waapi: WaapiAdapter;
  readonly kernel: KernelAdapter;
  private readonly all: EngineAdapter[];
  private playing = false;

  constructor(options: { waapi?: boolean } = {}) {
    // `__LL_KERNEL_ONLY__` is a test seam (set before load): everything on the kernel adapter, to compare it with Web Animations.
    const kernelOnly = typeof window !== "undefined" && (window as unknown as { __LL_KERNEL_ONLY__?: boolean }).__LL_KERNEL_ONLY__ === true;
    const useWaapi = options.waapi ?? (!kernelOnly && typeof Element !== "undefined" && typeof Element.prototype.animate === "function");
    const onWaapi = (paths: ReadonlySet<string>) => useWaapi && this.playing && canRunOnWaapi(paths);
    this.waapi = new WaapiAdapter((_id, paths) => onWaapi(paths));
    this.kernel = new KernelAdapter((_id, paths) => !onWaapi(paths));
    this.all = [this.waapi, this.kernel];
  }

  mount(host: AdapterHost): void {
    for (const a of this.all) a.mount(host);
  }
  play(time: number, rate: number): void {
    // A rate change while playing needs no hand-over; starting to play does.
    if (!this.playing) {
      this.playing = true;
      this.invalidate();
    }
    for (const a of this.all) a.play(time, rate);
  }
  pause(time: number): void {
    if (this.playing) {
      this.playing = false;
      this.invalidate();
    }
    for (const a of this.all) a.pause(time);
  }
  seek(time: number): void {
    for (const a of this.all) a.seek(time);
  }
  setInputs(inputs: EvaluateInputs): void {
    for (const a of this.all) a.setInputs(inputs);
  }
  invalidate(): void {
    for (const a of this.all) a.invalidate();
  }
  currentTime(): number | null {
    return this.waapi.currentTime();
  }
  /** Layers running on an engine of their own, for the parity monitor. */
  running(): RunningLayer[] {
    return this.playing ? this.waapi.running() : [];
  }
  get isPlaying(): boolean {
    return this.playing;
  }
  dispose(): void {
    for (const a of this.all) a.dispose();
  }
}
