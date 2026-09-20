"use client";

/**
 * ============================================================================
 * DETACHED PANEL SHELL COMPONENT
 * ============================================================================
 * UI Element: Lightweight Panel Wrapper for Detached Browser Tabs
 * Screen / Scope: `/editor/detach/[panelId]` route
 * Role: Provides a compact header with panel title, "Return to Main Editor"
 *       button, and handles BroadcastChannel REATTACH messaging on close.
 * Styling Source: `@/editor/styles/detached.css`
 *
 * ARCHITECTURE NOTE:
 * This shell wraps any panel component in a new browser tab. On close or
 * "Return" click, it sends a REATTACH message via BroadcastChannel so the
 * main editor tab re-adds the panel to the bottom drawer.
 * ============================================================================
 */

import React, { useEffect } from "react";
import { ArrowLeft, Cpu, Film, Terminal, FileCode2, Box, ImageIcon } from "lucide-react";
import { useTearOffChannel } from "@/core/events/useTearOffChannel";
import "@/editor/styles/detached.css";

interface DetachedPanelShellProps {
  panelId: string;
  panelTitle: string;
  children: React.ReactNode;
}

const PANEL_ICONS: Record<string, React.ReactNode> = {
  blueprint: <Cpu size={14} style={{ color: "var(--accent-info)" }} />,
  sequencer: <Film size={14} style={{ color: "var(--accent-purple)" }} />,
  console: <Terminal size={14} style={{ color: "var(--accent-warning)" }} />,
  component: <Box size={14} style={{ color: "var(--accent-primary)" }} />,
  page: <FileCode2 size={14} style={{ color: "var(--accent-primary)" }} />,
  asset: <ImageIcon size={14} style={{ color: "var(--accent-info)" }} />,
};

export const DetachedPanelShell: React.FC<DetachedPanelShellProps> = ({
  panelId,
  panelTitle,
  children,
}) => {
  const { sendReattach } = useTearOffChannel();

  // Send REATTACH when the tab is closed via browser X
  useEffect(() => {
    const handleBeforeUnload = () => {
      sendReattach(panelId, panelTitle);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [panelId, panelTitle, sendReattach]);

  const handleReturn = () => {
    sendReattach(panelId, panelTitle);
    // Small delay to let the message propagate before closing
    setTimeout(() => {
      window.close();
    }, 100);
  };

  return (
    <div className="detached-shell">
      <div className="detached-header">
        <div className="detached-header__left">
          {PANEL_ICONS[panelId] || null}
          <span className="detached-header__title">{panelTitle}</span>
          <span className="detached-header__badge">Detached</span>
        </div>
        <button
          type="button"
          className="detached-header__return"
          onClick={handleReturn}
          title="Return this panel to the main editor"
        >
          <ArrowLeft size={12} />
          <span>Return to Main Editor</span>
        </button>
      </div>
      <div className="detached-content">
        {children}
      </div>
    </div>
  );
};
