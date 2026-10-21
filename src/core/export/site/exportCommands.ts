/** Export commands (ROADMAP Phase 49, Law 20): the dialog opens from `file.exportSite`; `export.site` is what agents call. */

import { z } from "zod";
import { defineCommand, defineTypedCommand } from "../../commands";
import { downloadSite } from "./editorExport";
import { useExportUiStore } from "../../store/useExportUiStore";

export function registerExportCommands(): () => void {
  const category = "File";
  const offs = [
    defineCommand({ id: "file.exportSite", title: "Export Site...", category, keybinding: "Ctrl+E", run: () => useExportUiStore.getState().open() }),
    defineTypedCommand({
      id: "export.site",
      title: "Export Site",
      category,
      args: z.object({ target: z.enum(["html", "vite", "next"]), styling: z.enum(["css", "modules", "tailwind"]).default("css") }),
      run: async ({ target, styling }) => {
        const site = await downloadSite({ target, styling });
        return { files: site.files.length, warnings: site.warnings };
      },
    }),
  ];
  return () => offs.forEach((off) => off());
}
