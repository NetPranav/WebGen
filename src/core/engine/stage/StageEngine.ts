import { documentStore, getDocument } from "../../store/documentState";
import { frameScheduler, type FrameScheduler } from "../../time/scheduler";
import { getTransport, subscribeTransport } from "../../time/transport";
import type { StageRenderer } from "../../render/StageRenderer";
import { StageAdapters } from "./StageAdapters";
import { ParityMonitor, parityEnabled } from "./parity";
import type { AdapterHost, EngineAdapter } from "./types";

/**
 * ROADMAP Phase 57: puts the animation on the stage. Reads the transport (Phase 54), and each frame, in the
 * scheduler's `apply` phase (Phase 55), asks the adapter to show the transport's time. It writes through the
 * stage's `LayerNodeRegistry`, never through React or the document store (Law 9).
 *
 * Today the kernel adapter shows everything. Phase 58 adds a Web Animations adapter for animations that can run off
 * the main thread, and Phase 59 chooses between them for scrubbing and playing.
 */
export interface StageEngineOptions {
  scheduler?: FrameScheduler;
  adapter?: EngineAdapter;
  /** Run the parity monitor (Phase 60). Default: dev builds, tests and `?parity=1`. */
  parity?: boolean;
}

export function installStageEngine(renderer: StageRenderer, options: StageEngineOptions = {}): () => void {
  const scheduler = options.scheduler ?? frameScheduler;
  const adapter = options.adapter ?? new StageAdapters();
  const host: AdapterHost = {
    node: (id) => renderer.registry.get(id),
    getDocument,
    compositionId: () => getTransport().compositionId,
    fps: () => getTransport().fps,
    duration: () => getTransport().duration,
  };
  adapter.mount(host);

  let lastTime = Number.NaN;
  let lastPlaying = false;
  let lastRate = 1;
  let dirty = true;

  // What was drawn may have changed under the adapter: the document, or a layer's element.
  const unsubscribeDocument = documentStore.subscribe((state, prev) => {
    if (state.document === prev.document) return;
    adapter.invalidate();
    dirty = true;
  });
  const unsubscribeNodes = renderer.registry.subscribe(() => {
    adapter.invalidate();
    dirty = true;
  });
  const unsubscribeTransport = subscribeTransport((state, prev) => {
    if (state.compositionId !== prev.compositionId) {
      adapter.invalidate();
      dirty = true;
    }
  });

  const unregister = scheduler.register("apply", () => {
    const { time, playing, rate } = getTransport();
    if (playing !== lastPlaying || (playing && rate !== lastRate)) {
      if (playing) adapter.play(time, rate);
      else adapter.pause(time);
      if (playing !== lastPlaying) dirty = true; // a hand-over between engines: show the time again
      lastPlaying = playing;
      lastRate = rate;
    }
    if (!dirty && time === lastTime) return;
    dirty = false;
    lastTime = time;
    adapter.seek(time);
  });

  // Phase 60: while playing, compare what the engines show with `evaluate()` every 30 frames.
  const stageAdapters = adapter instanceof StageAdapters ? adapter : null;
  const unmonitor =
    stageAdapters && (options.parity ?? parityEnabled())
      ? new ParityMonitor({
          scheduler,
          getDocument,
          compositionId: () => getTransport().compositionId,
          fps: () => getTransport().fps,
          transportTime: () => getTransport().time,
          isPlaying: () => getTransport().playing,
          running: () => stageAdapters.running(),
          read: (element, property) => element.ownerDocument.defaultView?.getComputedStyle(element).getPropertyValue(property) ?? "",
        }).install()
      : null;

  return () => {
    unmonitor?.();
    unregister();
    unsubscribeTransport();
    unsubscribeNodes();
    unsubscribeDocument();
    adapter.dispose();
  };
}
