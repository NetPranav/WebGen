"use client";

/**
 * Align, distribute and tidy buttons (ROADMAP Phase 30). Each button runs the same command as its shortcut and menu
 * item; a button is disabled when the selection can't use it (distribute needs three layers, tidy two).
 */

import React from "react";
import {
  AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalSpaceAround, AlignVerticalSpaceAround, LayoutGrid,
} from "lucide-react";
import { invokeCommand } from "@/core/commands";
import { useSelectionStore } from "@/core/store/useSelectionStore";

const ALIGN: { command: string; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { command: "align.left", label: "Align left", Icon: AlignStartVertical },
  { command: "align.hcenter", label: "Align horizontal centres", Icon: AlignCenterVertical },
  { command: "align.right", label: "Align right", Icon: AlignEndVertical },
  { command: "align.top", label: "Align top", Icon: AlignStartHorizontal },
  { command: "align.vcenter", label: "Align vertical centres", Icon: AlignCenterHorizontal },
  { command: "align.bottom", label: "Align bottom", Icon: AlignEndHorizontal },
];

export const AlignBar: React.FC = () => {
  const count = useSelectionStore((s) => s.selectedIds.length);
  if (count === 0) return null;
  const button = (command: string, label: string, Icon: React.ComponentType<{ size?: number }>, enabled: boolean) => (
    <button key={command} type="button" className="panel-icon-btn" title={label} aria-label={label} disabled={!enabled} data-command={command} onClick={() => void invokeCommand(command)}>
      <Icon size={14} />
    </button>
  );
  return (
    <div className="align-bar" role="toolbar" aria-label="Align and distribute" style={{ display: "flex", gap: 2, padding: "6px 8px", flexWrap: "wrap", borderBottom: "1px solid var(--border-subtle, rgba(128,128,128,0.2))" }}>
      {ALIGN.map((a) => button(a.command, a.label, a.Icon, true))}
      <span style={{ width: 8 }} aria-hidden />
      {button("distribute.horizontal", "Distribute horizontal spacing", AlignHorizontalSpaceAround, count >= 3)}
      {button("distribute.vertical", "Distribute vertical spacing", AlignVerticalSpaceAround, count >= 3)}
      {button("layer.tidy", "Tidy up", LayoutGrid, count >= 2)}
    </div>
  );
};
