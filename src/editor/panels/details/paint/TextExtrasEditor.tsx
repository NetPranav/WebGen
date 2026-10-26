"use client";

/**
 * Text settings from FigCraft (port F8) that need more than one field: lists on the text's paragraphs (bulleted,
 * numbered, nested one level in or out) and text on a path (put the selected text on the selected shape, where it
 * starts, which side, off again). The single-value settings (decoration look, features, spacing, max lines…) are
 * ordinary properties in the groups below.
 */

import React from "react";
import { invokeCommand } from "@/core/commands";
import { useLayers } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { parseTextPath } from "@/core/text/textFeatures";
import { NumberField } from "../controls/NumberField";

const run = (id: string, args?: unknown) => void invokeCommand(id, args);

export const TextExtrasEditor: React.FC = () => {
  const layers = useLayers();
  const ids = useSelectionStore((s) => s.selectedIds);
  const textId = ids.find((id) => layers[id]?.archetype === "text");
  if (!textId) return null;
  const text = layers[textId];
  const list = String(text.properties["typography.list"] ?? "none");
  const path = parseTextPath(text.properties["typography.textPath"]);
  const shape = ids.find((id) => id !== textId && layers[id] && layers[id].archetype !== "text");
  return (
    <div className="effects-block" role="group" aria-label="Text layout">
      <div className="effects-block__head">Text layout</div>
      <div className="effects-block__row" role="radiogroup" aria-label="List">
        {(["none", "bulleted", "numbered"] as const).map((l) => (
          <button key={l} type="button" role="radio" aria-checked={list === l} className={`effects-chip ${list === l ? "effects-chip--on" : ""}`} onClick={() => run("text.setList", { list: l, ids: [textId] })}>
            {l === "none" ? "No list" : l === "bulleted" ? "Bullets" : "Numbers"}
          </button>
        ))}
        <button type="button" className="effects-chip" aria-label="Outdent list items" onClick={() => run("text.indentList", { by: -1, ids: [textId] })}>
          ⇤
        </button>
        <button type="button" className="effects-chip" aria-label="Indent list items" onClick={() => run("text.indentList", { by: 1, ids: [textId] })}>
          ⇥
        </button>
      </div>
      <div className="effects-block__row">
        {path ? (
          <>
            <NumberField label="Text path start" badge="%" min={0} max={100} value={Math.round(path.start * 100)} onCommit={(v) => run("text.setPath", { start: v / 100, ids: [textId] })} />
            <button type="button" className="effects-chip" aria-pressed={path.flip} aria-label="Flip text to the other side of the path" onClick={() => run("text.setPath", { flip: !path.flip, ids: [textId] })}>
              Flip
            </button>
            <button type="button" className="effects-chip" aria-label="Take text off the path" onClick={() => run("text.detachFromPath", { ids: [textId] })}>
              Off path
            </button>
          </>
        ) : (
          <button type="button" className="effects-chip" aria-label="Put text on the selected shape's path" disabled={!shape} title={shape ? undefined : "Select the text and a shape"} onClick={() => run("text.attachToPath", { text: textId, path: shape })}>
            Text on path
          </button>
        )}
      </div>
    </div>
  );
};
