"use client";

/**
 * ============================================================================
 * PERSISTENCE UI: RECOVERY PROMPT, SAVE ERRORS, FILE DROP
 * ============================================================================
 * ROADMAP Phases 3.2–3.3. Small overlays the shell shows for crash recovery,
 * storage errors (e.g. quota) and `.lazy.json` drag-and-drop.
 * ============================================================================
 */

import React from "react";
import { AlertTriangle, History, Upload, X } from "lucide-react";
import { useSaveStatus, type PendingRecovery } from "@/core/storage/ProjectSession";

const cardStyle: React.CSSProperties = {
  position: "fixed",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 10000,
  maxWidth: 520,
  width: "calc(100% - 32px)",
  background: "var(--surface-panel-solid, #fff)",
  color: "var(--text-primary, #0f172a)",
  border: "1px solid var(--border-default, #e2e8f0)",
  borderRadius: "var(--radius-lg, 10px)",
  boxShadow: "var(--shadow-xl, 0 12px 32px rgba(15,23,42,.18))",
  padding: "14px 16px",
  fontSize: 13,
  lineHeight: 1.45,
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid var(--border-default, #e2e8f0)",
  background: "transparent",
  color: "inherit",
  borderRadius: "var(--radius-md, 6px)",
  padding: "5px 12px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "var(--accent-primary, #206859)",
  borderColor: "var(--accent-primary, #206859)",
  color: "var(--text-inverse, #fff)",
};

/** Offered when the last session closed before its latest changes were saved. */
export const RecoveryPrompt: React.FC<{
  recovery: PendingRecovery;
  onRestore: () => void;
  onDiscard: () => void;
}> = ({ recovery, onRestore, onDiscard }) => {
  const when = new Date(recovery.lastChangeAt).toLocaleString();
  const count = recovery.changeCount;
  return (
    <div role="alertdialog" aria-labelledby="recovery-title" aria-describedby="recovery-body" style={{ ...cardStyle, top: 64 }}>
      <History size={18} style={{ flexShrink: 0, marginTop: 2, color: "var(--accent-warning, #d97706)" }} />
      <div style={{ flex: 1 }}>
        <div id="recovery-title" style={{ fontWeight: 700, marginBottom: 2 }}>
          Restore unsaved changes?
        </div>
        <div id="recovery-body" style={{ color: "var(--text-secondary, #475569)" }}>
          LazyLayout closed before saving {count === 1 ? "1 change" : `${count} changes`} to this project (last one at {when}).
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button type="button" style={primaryButtonStyle} onClick={onRestore}>
            Restore
          </button>
          <button type="button" style={buttonStyle} onClick={onDiscard}>
            Discard
          </button>
        </div>
      </div>
    </div>
  );
};

/** Shows save failures (such as full storage) and file-open errors until dismissed or fixed. */
export const SaveErrorBanner: React.FC<{ fileError: string | null; onDismissFileError: () => void }> = ({
  fileError,
  onDismissFileError,
}) => {
  const saveError = useSaveStatus((s) => s.error);
  const persistent = useSaveStatus((s) => s.persistent);
  const message =
    fileError ??
    saveError?.message ??
    (persistent ? null : "This browser isn't allowing LazyLayout to store data, so projects are kept only until you close this tab.");
  if (!message) return null;
  return (
    <div role="alert" style={{ ...cardStyle, bottom: 40 }}>
      <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2, color: "var(--accent-danger, #dc2626)" }} />
      <div style={{ flex: 1 }}>{message}</div>
      {fileError && (
        <button type="button" aria-label="Dismiss" style={{ ...buttonStyle, border: "none", padding: 2 }} onClick={onDismissFileError}>
          <X size={14} />
        </button>
      )}
    </div>
  );
};

/** Full-window hint while a file is dragged over the editor. */
export const FileDropOverlay: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "color-mix(in srgb, var(--accent-primary, #206859) 12%, transparent)",
        border: "2px dashed var(--accent-primary, #206859)",
      }}
    >
      <div style={{ ...cardStyle, position: "static", transform: "none", alignItems: "center", width: "auto" }}>
        <Upload size={18} />
        Drop a .lazy.json file to open it as a new project
      </div>
    </div>
  );
};
