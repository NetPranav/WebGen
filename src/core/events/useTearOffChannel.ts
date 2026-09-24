"use client";

/**
 * ============================================================================
 * TEAR-OFF BROADCAST CHANNEL HOOK
 * ============================================================================
 * UI Element: Cross-Tab Communication for Tear-Off Panel System
 * Screen / Scope: Main Editor ↔ Detached Panel Tabs
 * Role: Wraps BroadcastChannel('ide-tearoff') to synchronize panel
 *       detach/reattach events between the main editor tab and any
 *       detached panel browser tabs.
 *
 * ARCHITECTURE NOTE:
 * Messages are fire-and-forget. The channel is created once per hook
 * instance and cleaned up on unmount. Each tab (main or detached) uses
 * its own hook instance.
 * ============================================================================
 */

import { useEffect, useRef, useCallback } from "react";
import { useLatestRef } from "@/core/hooks/useLatestRef";

export type TearOffMessageType = "DETACH" | "REATTACH";

export interface TearOffMessage {
  type: TearOffMessageType;
  panelId: string;
  panelTitle?: string;
  sourceZone?: string;
  timestamp: number;
}

interface UseTearOffChannelOptions {
  onDetach?: (msg: TearOffMessage) => void;
  onReattach?: (msg: TearOffMessage) => void;
}

const CHANNEL_NAME = "ide-tearoff";

export function useTearOffChannel(options: UseTearOffChannelOptions = {}) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const optionsRef = useLatestRef(options);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<TearOffMessage>) => {
      const msg = event.data;
      if (!msg || !msg.type) return;

      if (msg.type === "DETACH" && optionsRef.current.onDetach) {
        optionsRef.current.onDetach(msg);
      } else if (msg.type === "REATTACH" && optionsRef.current.onReattach) {
        optionsRef.current.onReattach(msg);
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  const sendDetach = useCallback((panelId: string, panelTitle?: string, sourceZone?: string) => {
    channelRef.current?.postMessage({
      type: "DETACH",
      panelId,
      panelTitle,
      sourceZone,
      timestamp: Date.now(),
    } satisfies TearOffMessage);
  }, []);

  const sendReattach = useCallback((panelId: string, panelTitle?: string) => {
    channelRef.current?.postMessage({
      type: "REATTACH",
      panelId,
      panelTitle,
      timestamp: Date.now(),
    } satisfies TearOffMessage);
  }, []);

  return { sendDetach, sendReattach };
}
