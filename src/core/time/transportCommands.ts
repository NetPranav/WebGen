"use client";

import { defineCommand } from "../commands/registry";
import { useContextKeysStore } from "../commands/contextKeys";
import type { ContextKeys } from "../commands/types";
import { subscribeTransport, transport } from "./transport";

/**
 * The transport's keys are timeline-focus commands (ROADMAP Phase 63: "all are commands with timeline focus"), never
 * while a text field has focus. J/K/L shuttle used to apply on the canvas too; the canvas needs L for the Line tool
 * (Phase 24), and J, K and L are one set.
 */
const timelineOnly = (ctx: ContextKeys) => !ctx.textEditing && ctx.timelineFocus;

/**
 * Registers the transport commands and mirrors `playing` into the
 * `transport.playing` context key. Returns the unregister function.
 *
 * Space (play / pause) and Home are timeline-focus commands, as the Sequencer's own were
 * before Phase 56; on the canvas Space stays the hand tool.
 */
export function installTransportCommands(): () => void {
  const unregisters = [
    defineCommand({ id: "transport.togglePlay", title: "Play / Pause", category: "Transport", keybinding: "Space", when: timelineOnly, run: () => transport.togglePlay() }),
    defineCommand({ id: "transport.seekStart", title: "Go to Start", category: "Transport", keybinding: "Home", when: timelineOnly, run: () => transport.seek(0) }),
    defineCommand({ id: "transport.seekEnd", title: "Go to End", category: "Transport", keybinding: "End", when: timelineOnly, run: () => transport.seek(Number.POSITIVE_INFINITY) }),
    defineCommand({ id: "transport.play", title: "Play", category: "Transport", run: () => transport.play() }),
    defineCommand({ id: "transport.pause", title: "Pause", category: "Transport", run: () => transport.pause() }),
    defineCommand({ id: "transport.stop", title: "Stop and Return to Start", category: "Transport", run: () => transport.stop() }),
    defineCommand({ id: "transport.stepForward", title: "Step Forward One Frame", category: "Transport", keybinding: "ArrowRight", when: timelineOnly, run: () => transport.stepFrame(1) }),
    defineCommand({ id: "transport.stepBack", title: "Step Back One Frame", category: "Transport", keybinding: "ArrowLeft", when: timelineOnly, run: () => transport.stepFrame(-1) }),
    defineCommand({ id: "transport.shuttleReverse", title: "Shuttle Reverse (J)", category: "Transport", keybinding: "J", when: timelineOnly, run: () => transport.shuttle("reverse") }),
    defineCommand({ id: "transport.shuttleStop", title: "Stop Shuttle (K)", category: "Transport", keybinding: "K", when: timelineOnly, run: () => transport.stopShuttle() }),
    defineCommand({ id: "transport.shuttleForward", title: "Shuttle Forward (L)", category: "Transport", keybinding: "L", when: timelineOnly, run: () => transport.shuttle("forward") }),
    defineCommand({ id: "transport.cycleLoop", title: "Cycle Loop Mode", category: "Transport", run: () => transport.cycleLoop() }),
  ];

  const mirror = (playing: boolean) => useContextKeysStore.setState({ "transport.playing": playing });
  const unsubscribe = subscribeTransport((state, prev) => {
    if (state.playing !== prev.playing) mirror(state.playing);
  });

  return () => {
    for (const unregister of unregisters) unregister();
    unsubscribe();
    mirror(false);
  };
}
