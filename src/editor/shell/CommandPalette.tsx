"use client";

/**
 * ============================================================================
 * COMMAND PALETTE FLOATING MODAL
 * ============================================================================
 * Fast fuzzy search across all IDE actions, studio commands, tools, and shortcuts.
 * Activated by Ctrl+P / Cmd+P or Ctrl+K / Cmd+K.
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.3 & Detailed Roadmap §Phase 28
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ShortcutCommand, CommandCategory } from "@/core/types/shortcuts";
import { ShortcutRegistry } from "@/runtime/ShortcutRegistry";
import {
  Terminal,
  Search,
  X,
  ArrowRight,
  Clock,
  Sparkles,
  Command as CommandIcon,
  Check,
} from "lucide-react";

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand?: (command: ShortcutCommand) => void;
}

const CATEGORIES: { id: CommandCategory | "All"; label: string }[] = [
  { id: "All", label: "All" },
  { id: "File", label: "File" },
  { id: "Edit", label: "Edit" },
  { id: "View", label: "View" },
  { id: "Navigation", label: "Navigation" },
  { id: "Blueprints", label: "Blueprints" },
  { id: "Deployment", label: "Deployment" },
  { id: "AI", label: "AI" },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onExecuteCommand,
}) => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CommandCategory | "All">("All");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Reset search when opened
  // The registry is mutable; snapshot its commands each time the palette opens.
  const [allCommands, setAllCommands] = useState(() => ShortcutRegistry.getAllCommands());
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setQuery("");
      setActiveCategory("All");
      setSelectedIndex(0);
      setAllCommands(ShortcutRegistry.getAllCommands());
    }
  }

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);



  // Filter commands based on query and category
  const filteredCommands = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    return allCommands.filter((cmd) => {
      // Category check
      if (activeCategory !== "All" && cmd.category !== activeCategory) {
        return false;
      }

      if (!trimmed) return true;

      // Fuzzy / Substring matches on title, description, category, and shortcut
      const title = cmd.title.toLowerCase();
      const desc = (cmd.description || "").toLowerCase();
      const cat = cmd.category.toLowerCase();
      const shortcut = (cmd.currentShortcut || cmd.defaultShortcut || "").toLowerCase();

      return (
        title.includes(trimmed) ||
        desc.includes(trimmed) ||
        cat.includes(trimmed) ||
        shortcut.includes(trimmed)
      );
    });
  }, [allCommands, query, activeCategory]);

  const handleExecute = (cmd: ShortcutCommand) => {
    onClose();
    if (onExecuteCommand) {
      onExecuteCommand(cmd);
    } else {
      ShortcutRegistry.executeCommand(cmd.id);
    }
  };

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands.length > 0 && filteredCommands[selectedIndex]) {
        handleExecute(filteredCommands[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "90px",
        zIndex: 99999,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          width: "640px",
          maxHeight: "500px",
          background: "#12131A",
          border: "1px solid #282A38",
          borderRadius: 12,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(99, 102, 241, 0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "#FFFFFF",
          fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
        }}
      >
        {/* Command Input Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 18px",
            borderBottom: "1px solid #232430",
            background: "#161722",
          }}
        >
          <span style={{ fontSize: 16, color: "#6366F1", fontWeight: 800 }}>&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or press '?' for help..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#FFFFFF",
              fontSize: 14.5,
              fontWeight: 500,
            }}
          />

          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                background: "transparent",
                border: "none",
                color: "#9CA3AF",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <X size={15} />
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#6B7280",
              cursor: "pointer",
              padding: 2,
            }}
            title="Close (Esc)"
          >
            <kbd style={{ background: "#232430", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>
              ESC
            </kbd>
          </button>
        </div>

        {/* Category Pills Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 18px",
            borderBottom: "1px solid #1E202B",
            background: "#13141C",
            overflowX: "auto",
          }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: "3px 9px",
                  background: isActive ? "#6366F1" : "#1E202B",
                  color: isActive ? "#FFFFFF" : "#9CA3AF",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Command List */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            maxHeight: "360px",
          }}
        >
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, index) => {
              const isSelected = selectedIndex === index;
              const shortcut = cmd.currentShortcut || cmd.defaultShortcut;

              return (
                <div
                  key={cmd.id}
                  onClick={() => handleExecute(cmd)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 12px",
                    borderRadius: 6,
                    background: isSelected ? "rgba(99, 102, 241, 0.18)" : "transparent",
                    border: isSelected ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid transparent",
                    cursor: "pointer",
                    gap: 12,
                    transition: "all 0.1s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "#1E202B",
                        color: "#818CF8",
                        textTransform: "uppercase",
                        flexShrink: 0,
                      }}
                    >
                      {cmd.category}
                    </span>

                    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>
                        {cmd.title}
                      </span>
                      {cmd.description && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "#9CA3AF",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {cmd.description}
                        </span>
                      )}
                    </div>
                  </div>

                  {shortcut && (
                    <kbd
                      style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        background: isSelected ? "#2E3048" : "#1E202B",
                        border: "1px solid #2F3142",
                        padding: "3px 7px",
                        borderRadius: 4,
                        color: "#E0E7FF",
                        flexShrink: 0,
                      }}
                    >
                      {shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 20px",
                color: "#6B7280",
                gap: 8,
              }}
            >
              <Terminal size={24} style={{ opacity: 0.5 }} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>No matching commands found</div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 16px",
            background: "#161722",
            borderTop: "1px solid #232430",
            fontSize: 11,
            color: "#9CA3AF",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>
              <kbd style={{ background: "#232430", padding: "1px 5px", borderRadius: 3 }}>↑↓</kbd> Select
            </span>
            <span>
              <kbd style={{ background: "#232430", padding: "1px 5px", borderRadius: 3 }}>↵</kbd> Run Command
            </span>
          </div>
          <div>{filteredCommands.length} Commands Available</div>
        </div>
      </div>
    </div>
  );
};
