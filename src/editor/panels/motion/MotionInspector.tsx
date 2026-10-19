"use client";

/**
 * The Motion tab of the inspector (Phase 15): what moves on the selected layer.
 * It lists the layer's clips and their tracks from the document and opens the
 * timeline. Editing stays on the timeline (Stage 2); this is the read-side
 * summary that makes the Animate workspace's inspector real.
 */
import React from "react";
import { Film } from "lucide-react";
import { useLayerClips } from "@/core/store/useDocumentStore";

export interface MotionInspectorProps {
  selectedElementId: string | null;
  selectedElementName: string;
  onOpenTimeline: () => void;
}

export const MotionInspector: React.FC<MotionInspectorProps> = ({ selectedElementId, selectedElementName, onOpenTimeline }) => {
  const clips = useLayerClips(selectedElementId);

  return (
    <div className="motion-inspector" role="region" aria-label="Motion inspector">
      <div className="motion-inspector__header">
        <Film size={13} />
        <span>{selectedElementId ? selectedElementName || "Selected layer" : "Motion"}</span>
      </div>

      {!selectedElementId && <p className="motion-inspector__empty">Select a layer to see what moves on it.</p>}

      {selectedElementId && clips.length === 0 && (
        <p className="motion-inspector__empty">Nothing moves on this layer yet. Add keyframes on the timeline.</p>
      )}

      {clips.map((clip) => (
        <section key={clip.id} className="motion-inspector__clip" aria-label={`Clip ${clip.name}`}>
          <h4>{clip.name}</h4>
          <p>
            {clip.trigger} · {clip.duration}s
          </p>
          <ul>
            {clip.tracks.map((track) => (
              <li key={track.id}>
                <code>{track.property}</code>
                <span>
                  {track.keyframes.length} {track.keyframes.length === 1 ? "keyframe" : "keyframes"}
                </span>
              </li>
            ))}
            {clip.tracks.length === 0 && <li className="motion-inspector__none">No tracks</li>}
          </ul>
        </section>
      ))}

      <button type="button" className="motion-inspector__open" onClick={onOpenTimeline}>
        Open the timeline
      </button>
    </div>
  );
};
