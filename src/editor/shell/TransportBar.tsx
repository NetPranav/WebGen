"use client";

/**
 * ============================================================================
 * TRANSPORT BAR (ROADMAP Phase 54)
 * ============================================================================
 * Play / pause, frame step, timecode and loop mode for the one transport that
 * drives the whole studio (`src/core/time/transport.ts`). It also installs the
 * transport's commands, its document binding and its clock while it is mounted.
 * ============================================================================
 */

import React, { useEffect } from "react";
import { Pause, Play, Repeat, Repeat1, SkipBack, StepBack, StepForward } from "lucide-react";
import { useStore } from "zustand";
import { formatTimecode, transport, transportStore, type LoopMode } from "@/core/time/transport";
import { bindTransportToDocument } from "@/core/time/transportBinding";
import { startTransportClock } from "@/core/time/transportClock";
import { installTransportCommands } from "@/core/time/transportCommands";
import { useTransportTime } from "@/core/time/useTransportTime";

const LOOP_LABEL: Record<LoopMode, string> = { off: "Loop: off", loop: "Loop: on", "ping-pong": "Loop: ping-pong" };

export interface TransportBarProps {
  className?: string;
}

export const TransportBar: React.FC<TransportBarProps> = ({ className }) => {
  const playing = useStore(transportStore, (s) => s.playing);
  const loop = useStore(transportStore, (s) => s.loop);
  const fps = useStore(transportStore, (s) => s.fps);
  const duration = useStore(transportStore, (s) => s.duration);
  const time = useTransportTime({ maxHz: 10 });

  useEffect(() => {
    const unbind = bindTransportToDocument();
    const uninstall = installTransportCommands();
    const stopClock = startTransportClock();
    return () => {
      stopClock();
      uninstall();
      unbind();
    };
  }, []);

  return (
    <div className={`transport-bar${className ? ` ${className}` : ""}`} role="group" aria-label="Transport">
      <button type="button" className="statusbar__btn" onClick={() => transport.stop()} title="Stop and return to start" aria-label="Stop and return to start">
        <SkipBack size={12} />
      </button>
      <button type="button" className="statusbar__btn" onClick={() => transport.stepFrame(-1)} title="Step back one frame" aria-label="Step back one frame">
        <StepBack size={12} />
      </button>
      <button
        type="button"
        className={`statusbar__btn ${playing ? "statusbar__btn--active" : ""}`}
        onClick={() => transport.togglePlay()}
        title={playing ? "Pause" : "Play"}
        aria-label={playing ? "Pause" : "Play"}
        aria-pressed={playing}
      >
        {playing ? <Pause size={12} /> : <Play size={12} />}
      </button>
      <button type="button" className="statusbar__btn" onClick={() => transport.stepFrame(1)} title="Step forward one frame" aria-label="Step forward one frame">
        <StepForward size={12} />
      </button>
      <button
        type="button"
        className={`statusbar__btn ${loop !== "off" ? "statusbar__btn--active" : ""}`}
        onClick={() => transport.cycleLoop()}
        title={LOOP_LABEL[loop]}
        aria-label={LOOP_LABEL[loop]}
      >
        {loop === "ping-pong" ? <Repeat1 size={12} /> : <Repeat size={12} />}
      </button>
      <span className="transport-bar__timecode" aria-label="Timecode" title={`${fps} fps`}>
        {formatTimecode(time, fps)} <span className="transport-bar__total">/ {formatTimecode(duration, fps)}</span>
      </span>
    </div>
  );
};
