"use client";

/**
 * A layer's export settings (FigCraft port F11): rows of format, scale and file-name suffix (a new row steps the
 * scale up with a matching `@2x` suffix), and Export, which saves one file per row (PNG at 1x when there are none).
 * Frames, groups and sections: resize to fit, and convert one into another.
 */

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { invokeCommand } from "@/core/commands";
import { useLayers } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { EXPORT_FORMATS, nextExportSetting, parseExportSettings, scaleLabel, type ExportSetting } from "@/core/export/layerExport";
import { kindOf } from "@/core/frames/containerOps";

const SCALES = [0.5, 0.75, 1, 1.5, 2, 3, 4];

export const ExportSettingsEditor: React.FC = () => {
  const layers = useLayers();
  const ids = useSelectionStore((s) => s.selectedIds);
  const id = ids.find((i) => layers[i]);
  if (!id) return null;
  const layer = layers[id];
  const settings = parseExportSettings(layer.properties["export.settings"]);
  const write = (next: ExportSetting[]) => void invokeCommand("export.setSettings", { ids: [id], settings: next });
  const change = (i: number, patch: Partial<ExportSetting>) => write(settings.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const kind = kindOf(layer);
  return (
    <div className="effects-block" role="group" aria-label="Layer export">
      <div className="effects-block__head">
        <span>Export</span>
        <button type="button" className="paint-row__btn" aria-label="Add export setting" onClick={() => write([...settings, nextExportSetting(settings.at(-1))])}>
          <Plus size={13} />
        </button>
      </div>
      {settings.map((s, i) => (
        <div key={i} className="effects-block__row" role="group" aria-label={`Export setting ${i + 1}`}>
          <select aria-label={`Export setting ${i + 1} scale`} value={s.scale} onChange={(e) => change(i, { scale: Number(e.target.value) })}>
            {[...new Set([...SCALES, s.scale])].sort((a, b) => a - b).map((v) => (
              <option key={v} value={v}>
                {scaleLabel(v)}
              </option>
            ))}
          </select>
          <input aria-label={`Export setting ${i + 1} suffix`} placeholder="Suffix" defaultValue={s.suffix} key={s.suffix} style={{ width: 60 }} onBlur={(e) => e.target.value !== s.suffix && change(i, { suffix: e.target.value })} onKeyDown={(e) => e.stopPropagation()} />
          <select aria-label={`Export setting ${i + 1} format`} value={s.format} onChange={(e) => change(i, { format: e.target.value as ExportSetting["format"] })}>
            {EXPORT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
          <button type="button" className="paint-row__btn" aria-label={`Remove export setting ${i + 1}`} onClick={() => write(settings.filter((_, k) => k !== i))}>
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <div className="effects-block__row" style={{ flexWrap: "wrap" }}>
        <button type="button" className="effects-chip" aria-label={`Export layer ${layer.name}`} onClick={() => void invokeCommand("export.layer", { id })}>
          Export {layer.name.slice(0, 24)}
        </button>
        {kind && (
          <>
            <button type="button" className="effects-chip" aria-label="Resize to fit" onClick={() => void invokeCommand("object.resizeToFit", { ids: [id] })}>
              Fit
            </button>
            {kind !== "group" && layer.parentId !== null && (
              <button type="button" className="effects-chip" aria-label="Convert to group" onClick={() => void invokeCommand("object.convertToGroup", { ids: [id] })}>
                Group
              </button>
            )}
            {kind !== "frame" && (
              <button type="button" className="effects-chip" aria-label="Convert to frame" onClick={() => void invokeCommand("object.convertToFrame", { ids: [id] })}>
                Frame
              </button>
            )}
            {kind !== "section" && (layer.parentId === null || kindOf(layers[layer.parentId]) === "section") && (
              <button type="button" className="effects-chip" aria-label="Convert to section" onClick={() => void invokeCommand("object.convertToSection", { ids: [id] })}>
                Section
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
