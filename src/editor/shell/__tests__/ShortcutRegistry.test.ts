import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ShortcutRegistry } from "../../../runtime/ShortcutRegistry";
import { ShortcutCommand } from "../../../core/types/shortcuts";

describe("Sub-Phase 7.3: Keyboard Shortcuts & Command Palette", () => {
  describe("Shortcut Normalization", () => {
    it("normalizes case-insensitive string shortcuts into canonical order", () => {
      assert.strictEqual(ShortcutRegistry.normalizeShortcut("ctrl+s"), "Ctrl+S");
      assert.strictEqual(ShortcutRegistry.normalizeShortcut("cmd+shift+p"), "Ctrl+Shift+P");
      assert.strictEqual(ShortcutRegistry.normalizeShortcut("meta+alt+enter"), "Ctrl+Alt+Enter");
      assert.strictEqual(ShortcutRegistry.normalizeShortcut("shift+ctrl+d"), "Ctrl+Shift+D");
      assert.strictEqual(ShortcutRegistry.normalizeShortcut("escape"), "Escape");
    });

    it("normalizes KeyboardEvent objects into canonical shortcut strings", () => {
      const mockEvent1 = {
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: true,
        key: "f",
      } as unknown as KeyboardEvent;

      assert.strictEqual(ShortcutRegistry.normalizeShortcut(mockEvent1), "Ctrl+Shift+F");

      const mockEvent2 = {
        ctrlKey: false,
        metaKey: true, // Mac Command
        altKey: false,
        shiftKey: false,
        key: "p",
      } as unknown as KeyboardEvent;

      assert.strictEqual(ShortcutRegistry.normalizeShortcut(mockEvent2), "Ctrl+P");
    });
  });

  describe("Built-In Commands & Registry Initialization", () => {
    it("initializes with the canonical built-in IDE studio commands", () => {
      const commands = ShortcutRegistry.getAllCommands();
      assert.ok(commands.length >= 8);

      const saveCmd = ShortcutRegistry.getCommand("core.save");
      assert.ok(saveCmd);
      assert.strictEqual(saveCmd?.currentShortcut, "Ctrl+S");

      const paletteCmd = ShortcutRegistry.getCommand("core.command_palette");
      assert.ok(paletteCmd);
      assert.strictEqual(paletteCmd?.currentShortcut, "Ctrl+P");

      const searchCmd = ShortcutRegistry.getCommand("core.global_search");
      assert.ok(searchCmd);
      assert.strictEqual(searchCmd?.currentShortcut, "Ctrl+Shift+F");

      const deployCmd = ShortcutRegistry.getCommand("core.deploy");
      assert.ok(deployCmd);
      assert.strictEqual(deployCmd?.currentShortcut, "Ctrl+Shift+D");
    });

    it("finds commands by normalized shortcut string or event", () => {
      const cmd = ShortcutRegistry.findCommandByShortcut("Ctrl+S");
      assert.ok(cmd);
      assert.strictEqual(cmd?.id, "core.save");

      const cmdFromEvent = ShortcutRegistry.findCommandByShortcut({
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: true,
        key: "D",
      } as unknown as KeyboardEvent);
      assert.ok(cmdFromEvent);
      assert.strictEqual(cmdFromEvent?.id, "core.deploy");
    });
  });

  describe("Conflict Detection & Command Registration", () => {
    it("successfully registers a unique command with an available shortcut", () => {
      let executed = false;
      const testCmd: ShortcutCommand = {
        id: "test.custom_action",
        title: "Test Custom Action",
        category: "Edit",
        defaultShortcut: "Ctrl+Alt+T",
        action: () => {
          executed = true;
        },
      };

      const result = ShortcutRegistry.registerCommand(testCmd);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.conflict, undefined);

      const found = ShortcutRegistry.getCommand("test.custom_action");
      assert.ok(found);
      assert.strictEqual(found?.currentShortcut, "Ctrl+Alt+T");

      // Cleanup
      ShortcutRegistry.unregisterCommand("test.custom_action");
    });

    it("rejects registering a shortcut already in use and returns conflict details", () => {
      const conflictingPluginCmd: ShortcutCommand = {
        id: "plugin.override_save",
        title: "Plugin Hijack Save",
        category: "File",
        defaultShortcut: "Ctrl+S", // Conflict with core.save
        action: () => {},
        isPlugin: true,
      };

      const result = ShortcutRegistry.registerCommand(conflictingPluginCmd, { override: false });
      assert.strictEqual(result.success, false);
      assert.ok(result.conflict);
      assert.strictEqual(result.conflict?.shortcut, "Ctrl+S");
      assert.strictEqual(result.conflict?.existingCommandId, "core.save");
      assert.ok(result.conflict?.message.includes("already bound"));

      // Ensure original command is still bound
      const currentSave = ShortcutRegistry.findCommandByShortcut("Ctrl+S");
      assert.strictEqual(currentSave?.id, "core.save");
    });

    it("allows overriding a shortcut when explicit override flag is true", () => {
      const overrideCmd: ShortcutCommand = {
        id: "custom.temp_deploy",
        title: "Temporary Deploy",
        category: "Deployment",
        defaultShortcut: "Ctrl+Shift+D",
        action: () => {},
      };

      const result = ShortcutRegistry.registerCommand(overrideCmd, { override: true });
      assert.strictEqual(result.success, true);

      const bound = ShortcutRegistry.findCommandByShortcut("Ctrl+Shift+D");
      assert.strictEqual(bound?.id, "custom.temp_deploy");

      // Revert back to core.deploy
      ShortcutRegistry.unregisterCommand("custom.temp_deploy");
      ShortcutRegistry.remapShortcut("core.deploy", "Ctrl+Shift+D", { override: true });
    });
  });

  describe("Command Execution & Key Event Dispatching", () => {
    it("executes a registered command by ID and logs to recent commands", async () => {
      let callCount = 0;
      const testCmd: ShortcutCommand = {
        id: "test.counted_action",
        title: "Counted Action",
        category: "Edit",
        action: () => {
          callCount++;
        },
      };

      ShortcutRegistry.registerCommand(testCmd);
      const success = await ShortcutRegistry.executeCommand("test.counted_action");
      assert.strictEqual(success, true);
      assert.strictEqual(callCount, 1);

      const recents = ShortcutRegistry.getRecentCommands();
      assert.ok(recents.some((c) => c.id === "test.counted_action"));

      ShortcutRegistry.unregisterCommand("test.counted_action");
    });

    it("dispatches matching keyboard event, prevents default, and executes action", () => {
      let fired = false;
      const testCmd: ShortcutCommand = {
        id: "test.event_action",
        title: "Event Action",
        category: "Edit",
        defaultShortcut: "Ctrl+Alt+E",
        action: () => {
          fired = true;
        },
      };

      ShortcutRegistry.registerCommand(testCmd);

      let prevented = false;
      const syntheticEvent = {
        ctrlKey: true,
        metaKey: false,
        altKey: true,
        shiftKey: false,
        key: "e",
        target: { tagName: "DIV", isContentEditable: false },
        preventDefault: () => {
          prevented = true;
        },
      } as unknown as KeyboardEvent;

      const handled = ShortcutRegistry.handleKeyEvent(syntheticEvent);
      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.strictEqual(fired, true);

      ShortcutRegistry.unregisterCommand("test.event_action");
    });
  });
});
