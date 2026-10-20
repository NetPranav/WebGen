import type { EvaluateInputs } from "../../kernel/evaluate";
import { KernelAdapter } from "./KernelAdapter";
import { WaapiAdapter } from "./WaapiAdapter";
import { canRunOnWaapi } from "./waapiEligibility";
import type { AdapterHost, EngineAdapter, EngineCapabilities } from "./types";

/**
 * ROADMAP Phase 58: the stage's engines. Each animated layer belongs to exactly one: the Web Animations adapter when
 * the rules route it to CSS and every property can be animated that way, the kernel adapter for everything else (and
 * as the fallback where `Element.animate` doesn't exist). Phase 59 decides which of them draws while scrubbing.
 */
export class StageAdapters implements EngineAdapter {
  readonly id = "stage";
  readonly capabilities: EngineCapabilities = { scrub: true, deterministic: false, offMainThread: true };
  readonly waapi: WaapiAdapter;
  readonly kernel: KernelAdapter;
  private readonly all: EngineAdapter[];

  constructor(options: { waapi?: boolean } = {}) {
    // `__LL_KERNEL_ONLY__` is a test seam (set before load): everything on the kernel adapter, to compare it with Web Animations.
    const kernelOnly = typeof window !== "undefined" && (window as unknown as { __LL_KERNEL_ONLY__?: boolean }).__LL_KERNEL_ONLY__ === true;
    const useWaapi = options.waapi ?? (!kernelOnly && typeof Element !== "undefined" && typeof Element.prototype.animate === "function");
    this.waapi = new WaapiAdapter((_id, paths) => useWaapi && canRunOnWaapi(paths));
    this.kernel = new KernelAdapter((_id, paths) => !(useWaapi && canRunOnWaapi(paths)));
    this.all = [this.waapi, this.kernel];
  }

  mount(host: AdapterHost): void {
    for (const a of this.all) a.mount(host);
  }
  play(time: number, rate: number): void {
    for (const a of this.all) a.play(time, rate);
  }
  pause(time: number): void {
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
  dispose(): void {
    for (const a of this.all) a.dispose();
  }
}
