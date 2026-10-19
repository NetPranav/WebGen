"use client";

/**
 * One dropdown for every menu in `menuModel.tsx` (Phase 13). A live item runs
 * its command through `invokeCommand`, which skips the `when` gate: a click is
 * unambiguous, so Edit > Undo still works while a text field has focus.
 * `disabledCommands` greys out items whose command exists but can't run now
 * (e.g. Undo with an empty history).
 */
import React from "react";
import { invokeCommand } from "@/core/commands";
import { MENU_MODEL, type MenuId } from "./menuModel";

interface MenuDropdownProps {
  menu: MenuId;
  isOpen: boolean;
  onClose: () => void;
  disabledCommands?: readonly string[];
}

export const MenuDropdown: React.FC<MenuDropdownProps> = ({ menu, isOpen, onClose, disabledCommands = [] }) => {
  if (!isOpen) return null;
  const { label, entries } = MENU_MODEL[menu];

  return (
    <div className="menu-dropdown" role="menu" aria-label={label}>
      {entries.map((entry, i) => {
        if (entry.kind === "separator") return <div key={`sep-${i}`} className="menu-separator" />;
        const Icon = entry.icon;
        const disabled = !!entry.pending || (!!entry.command && disabledCommands.includes(entry.command));
        return (
          <button
            key={entry.label}
            type="button"
            role="menuitem"
            className="menu-item"
            disabled={disabled}
            title={entry.pending ? `Coming in ${entry.pending}` : undefined}
            data-command={entry.command}
            onClick={() => {
              if (entry.command) invokeCommand(entry.command);
              onClose();
            }}
          >
            <span className="menu-item__left">
              <span className="menu-item__icon"><Icon size={13} /></span>
              <span>{entry.label}</span>
            </span>
            {entry.shortcut ? <kbd className="menu-item__shortcut">{entry.shortcut}</kbd> : null}
          </button>
        );
      })}
    </div>
  );
};
