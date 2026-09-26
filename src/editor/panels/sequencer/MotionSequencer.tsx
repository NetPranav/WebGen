"use client";

/**
 * ============================================================================
 * MOTION SEQUENCER & KEYFRAME TIMELINE WORKSTATION
 * ============================================================================
 * UI Element: MotionSequencer (Unreal Equivalent: Sequencer)
 * Screen / Scope: Screen 05: Motion Sequencer & Bezier Curve Editor (`/editor`)
 * Role: Full multi-track keyframe editor for choreographing time-based and
 *       scroll-based animations across all 4 element families.
 * Styling Source: `@/editor/styles/sequencer.css`
 * Matches: ROADMAP.md Sub-Phase 4.1 & PANELS.md (Panel 05)
 * ============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import "@/editor/styles/sequencer.css";
import { useProjectStore } from "@/core/store/useProjectStore";
import { documentCommands, useLayerClips, useLayers } from "@/core/store/useDocumentStore";
import { getArchetype, type ArchetypeId, type FamilyId, type PropValue } from "@/core/document/registry";
import type { Clip, Keyframe, ScrollTriggerConfig, StaggerConfig, Track } from "@/core/document/schema";
import { PlayheadControls } from "./PlayheadControls";
import { TrackHeader } from "./TrackHeader";
import { KeyframeTrack } from "./KeyframeTrack";
import { ScrollTriggerBar } from "./ScrollTriggerBar";
import { StaggerManager } from "./StaggerManager";
import { CurveEditor } from "@/editor/panels/curves/CurveEditor";
import { Plus, ChevronDown, Trash2, Copy, Sliders, ChevronsLeftRight } from "lucide-react";
import { interpolateTrackValue, scrubStylesForTracks } from "./scrubPatch";

export { interpolateTrackValue };
import { createId } from "@/core/ids";
import { useLatestRef } from "@/core/hooks/useLatestRef";
import type { Layer } from "@/core/document/schema";

/**
 * Retrieves valid animatable property paths for a given archetype and family
 * per CONVENTIONS.md §4.
 */
export function getValidPropertiesForArchetype(
  archetype?: ArchetypeId,
  family?: FamilyId
): string[] {
  // Universal paths (all families)
  const universal = [
    "transform.x",
    "transform.y",
    "transform.z",
    "transform.scale",
    "transform.scaleX",
    "transform.scaleY",
    "transform.rotate",
    "transform.rotateX",
    "transform.rotateY",
    "appearance.opacity",
    "appearance.border.color",
    "appearance.border.width",
    "appearance.radius",
    "filter.blur",
  ];

  if (!archetype && !family) return universal;

  const result = [...universal];

  // Interactive & Text Family
  if (
    family === "interactive" ||
    family === "text" ||
    archetype === "button" ||
    archetype === "toggle" ||
    archetype === "badge" ||
    archetype === "fab" ||
    archetype === "text"
  ) {
    result.push(
      "appearance.background.color",
      "typography.color",
      "typography.fontSize",
      "typography.letterSpacing"
    );
  }

  // Media Family
  if (family === "media" || archetype === "image" || archetype === "icon") {
    if (archetype === "image" || family === "media") {
      result.push(
        "media.src",
        "media.objectFit",
        "media.focalPoint.x",
        "media.focalPoint.y",
        "media.filter.grayscale",
        "media.filter.brightness",
        "media.filter.contrast",
        "media.filter.saturate",
        "media.clipPath",
        "media.overlay.color",
        "media.overlay.opacity"
      );
    }
    if (archetype === "icon" || family === "media") {
      result.push("svg.path", "svg.strokeDashoffset");
    }
  }

  // Structural Family
  if (
    family === "structural" ||
    archetype === "divider" ||
    archetype === "background" ||
    archetype === "container"
  ) {
    if (archetype === "divider" || family === "structural") {
      result.push(
        "divider.length",
        "divider.thickness",
        "divider.strokeDashoffset",
        "divider.gradient.angle"
      );
    }
    if (archetype === "background" || family === "structural") {
      result.push(
        "background.color",
        "background.gradient.angle",
        "background.gradient.stopOffset",
        "background.parallax.speed",
        "background.blendMode",
        "background.noise.opacity"
      );
    }
  }

  return result;
}


function findKeyframe(tracks: Track[], keyframeId: string | null) {
  if (!keyframeId) return null;
  for (const track of tracks) {
    const keyframe = track.keyframes.find((k) => (k.id || `kf_${k.time}`) === keyframeId);
    if (keyframe) return { track, keyframe };
  }
  return null;
}

export const MotionSequencer: React.FC = () => {
  const elements = useLayers();
  const pages = useProjectStore((s) => s.pages);
  const activePageId = useProjectStore((s) => s.activePageId);

  // Determine root or active element
  const activePage = pages[activePageId || "page_home"];
  const rootElementId = activePage?.rootElementId || Object.keys(elements)[0];
  const activeElement: Layer | undefined = elements[rootElementId];

  const archetype: ArchetypeId | undefined = activeElement?.archetype;
  const family: FamilyId | undefined = archetype ? (getArchetype(archetype).family ?? undefined) : undefined;

  // The layer's animation stack: its clips, in order.
  const animationStack = useLayerClips(activeElement?.id);

  const [activeAnimIndex, setActiveAnimIndex] = useState(0);
  const currentAnimation: Clip | undefined = animationStack[activeAnimIndex] || animationStack[0];

  // Tracks for active animation
  const currentTracks = currentAnimation?.tracks;
  const tracks: Track[] = useMemo(() => {
    if (currentTracks && currentTracks.length > 0) {
      return currentTracks;
    }
    // Default fallback tracks if none attached
    return [
      {
        id: "tr_opacity",
        property: "appearance.opacity",
        keyframes: [
          { id: "kf_1", time: 0.0, value: "0", ease: "power2.out" },
          { id: "kf_2", time: 0.6, value: "1", ease: "power2.out" },
        ],
      },
      {
        id: "tr_y",
        property: "transform.y",
        keyframes: [
          { id: "kf_3", time: 0.0, value: "20px", ease: "power2.out" },
          { id: "kf_4", time: 0.8, value: "0px", ease: "power2.out" },
        ],
      },
    ];
  }, [currentTracks]);

  // Sequencer Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0.0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLooping, setIsLooping] = useState(true);
  const [activeTrackId, setActiveTrackId] = useState<string>(tracks[0]?.id || "tr_opacity");
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);
  const [isStaggerOpen, setIsStaggerOpen] = useState(false);
  const [isAddTrackOpen, setIsAddTrackOpen] = useState(false);
  const [timelineViewMode, setTimelineViewMode] = useState<"tracks" | "curves">("tracks");

  const totalDuration = currentAnimation?.duration || 2.0;
  const pixelsPerSecond = 280; // 280px per second on timeline

  // Find currently selected keyframe object & track
  const selectedKeyframeInfo = findKeyframe(tracks, selectedKeyframeId);

  // Live Stage DOM Hot-Patch: dispatch interpolated values on playhead update
  useEffect(() => {
    if (!activeElement || typeof window === "undefined") return;

    const stylesToApply = scrubStylesForTracks(tracks, currentTime, interpolateTrackValue);

    // Post to all runtime iframes
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((ifr) => {
      try {
        ifr.contentWindow?.postMessage(
          {
            type: "SANDBOX_HOT_PATCH",
            payload: {
              action: "update_property",
              elementId: activeElement.id,
              properties: {
                style: stylesToApply,
              },
            },
          },
          "*"
        );
      } catch (e) {}
    });
  }, [currentTime, tracks, activeElement]);

  // Playhead animation loop at 120 FPS
  useEffect(() => {
    let animFrame: number;
    let lastTimestamp = performance.now();

    const loop = (now: number) => {
      const delta = ((now - lastTimestamp) / 1000) * playbackRate;
      lastTimestamp = now;

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= totalDuration) {
            return isLooping ? 0 : totalDuration;
          }
          return next;
        });
      }
      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, isLooping, totalDuration, playbackRate]);

  // Helper to commit tracks back to store
  const commitTracks = useCallback(
    (newTracks: Track[]) => {
      if (!activeElement) return;
      if (!currentAnimation) {
        documentCommands.addClip(
          activeElement.id,
          {
            id: createId("clip"),
            name: "Default Motion",
            type: "entrance",
            trigger: "mount",
            duration: totalDuration,
            easing: "power2.out",
            enabled: true,
            tracks: newTracks,
          },
          "Update motion tracks"
        );
      } else {
        documentCommands.setTracks(currentAnimation.id, newTracks, "Update motion tracks");
      }
    },
    [activeElement, currentAnimation, totalDuration]
  );

  // Playhead actions
  const handleTogglePlay = () => setIsPlaying((p) => !p);
  const handleStopReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };
  const handleToggleLoop = () => setIsLooping((l) => !l);
  const handleReverse = () => {
    setCurrentTime((prev) => Math.max(0, prev - 0.1));
  };
  const handleRateChange = (rate: number) => setPlaybackRate(rate);

  // Keyframe actions
  const handleSelectKeyframe = (kfId: string, trackId: string) => {
    setSelectedKeyframeId(kfId);
    setActiveTrackId(trackId);
  };

  const handleUpdateKeyframeTime = (trackId: string, kfId: string, newTime: number) => {
    const updated = tracks.map((t) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        keyframes: t.keyframes.map((kf) => (kf.id === kfId ? { ...kf, time: newTime } : kf)),
      };
    });
    commitTracks(updated);
  };

  const handleUpdateKeyframeValue = (trackId: string, kfId: string, val: PropValue) => {
    const updated = tracks.map((t) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        keyframes: t.keyframes.map((kf) => (kf.id === kfId ? { ...kf, value: val } : kf)),
      };
    });
    commitTracks(updated);
  };

  const handleUpdateKeyframeEase = (trackId: string, kfId: string, ease: string) => {
    const updated = tracks.map((t) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        keyframes: t.keyframes.map((kf) => (kf.id === kfId ? { ...kf, ease } : kf)),
      };
    });
    commitTracks(updated);
  };

  const handleAddKeyframe = () => {
    const targetTrack = tracks.find((t) => t.id === activeTrackId) || tracks[0];
    if (!targetTrack) return;

    const newKf: Keyframe = {
      id: createId("kf"),
      time: Math.round(currentTime * 120) / 120,
      value: "default",
      ease: currentAnimation?.easing || "power2.out",
    };

    const updated = tracks.map((t) => {
      if (t.id !== targetTrack.id) return t;
      return {
        ...t,
        keyframes: [...t.keyframes, newKf].sort((a, b) => a.time - b.time),
      };
    });

    commitTracks(updated);
    setSelectedKeyframeId(newKf.id!);
  };

  const handleDeleteKeyframe = (trackId: string, kfId: string) => {
    const updated = tracks.map((t) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        keyframes: t.keyframes.filter((kf) => (kf.id || `kf_${kf.time}`) !== kfId),
      };
    });
    commitTracks(updated);
    setSelectedKeyframeId(null);
  };

  const handleDuplicateKeyframe = (trackId: string, kfId: string) => {
    const targetTrack = tracks.find((t) => t.id === trackId);
    if (!targetTrack) return;
    const sourceKf = targetTrack.keyframes.find((k) => (k.id || `kf_${k.time}`) === kfId);
    if (!sourceKf) return;

    const newKf: Keyframe = {
      id: createId("kf"),
      time: Math.min(totalDuration, Math.round((currentTime || sourceKf.time + 0.1) * 120) / 120),
      value: sourceKf.value,
      ease: sourceKf.ease,
    };

    const updated = tracks.map((t) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        keyframes: [...t.keyframes, newKf].sort((a, b) => a.time - b.time),
      };
    });

    commitTracks(updated);
    setSelectedKeyframeId(newKf.id!);
  };

  const handleStretchKeyframes = (factor: number) => {
    const updated = tracks.map((t) => {
      return {
        ...t,
        keyframes: t.keyframes.map((kf) => ({
          ...kf,
          time: Math.min(totalDuration, Math.round(kf.time * factor * 120) / 120),
        })),
      };
    });
    commitTracks(updated);
  };

  const handleDeleteTrack = (trackId: string) => {
    const updated = tracks.filter((t) => t.id !== trackId);
    commitTracks(updated);
    if (activeTrackId === trackId && updated.length > 0) {
      setActiveTrackId(updated[0].id || "");
    }
  };

  const handleToggleMuteTrack = (trackId: string) => {
    const updated = tracks.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t));
    commitTracks(updated);
  };

  const handleToggleLockTrack = (trackId: string) => {
    const updated = tracks.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t));
    commitTracks(updated);
  };

  const handleAddPropertyTrack = (property: string) => {
    setIsAddTrackOpen(false);
    if (tracks.some((t) => t.property === property)) return;

    const newTrack: Track = {
      id: createId("tr"),
      property,
      keyframes: [
        { id: createId("kf_start"), time: 0.0, value: "0", ease: "power2.out" },
        { id: createId("kf_end"), time: totalDuration, value: "1", ease: "power2.out" },
      ],
    };

    commitTracks([...tracks, newTrack]);
    setActiveTrackId(newTrack.id!);
  };

  // Keyboard Shortcuts (Space: Play/Pause, Delete: Delete KF, Ctrl+D: Duplicate KF).
  // Subscribed once; reads the latest selection and handlers through a ref.
  const shortcutStateRef = useLatestRef({ selectedKeyframeInfo, handleDeleteKeyframe, handleDuplicateKeyframe });
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { selectedKeyframeInfo, handleDeleteKeyframe, handleDuplicateKeyframe } = shortcutStateRef.current;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === "Home") {
        e.preventDefault();
        setCurrentTime(0);
      } else if (e.code === "Delete" || e.code === "Backspace") {
        if (selectedKeyframeInfo) {
          e.preventDefault();
          handleDeleteKeyframe(
            selectedKeyframeInfo.track.id || selectedKeyframeInfo.track.property,
            selectedKeyframeInfo.keyframe.id || `kf_${selectedKeyframeInfo.keyframe.time}`
          );
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        if (selectedKeyframeInfo) {
          e.preventDefault();
          handleDuplicateKeyframe(
            selectedKeyframeInfo.track.id || selectedKeyframeInfo.track.property,
            selectedKeyframeInfo.keyframe.id || `kf_${selectedKeyframeInfo.keyframe.time}`
          );
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcutStateRef]);

  // ScrollTrigger & Stagger update handlers
  const handleUpdateScrollTrigger = (stConfig: ScrollTriggerConfig) => {
    if (!currentAnimation) return;
    documentCommands.updateClip(currentAnimation.id, { scrollTrigger: stConfig }, "Update ScrollTrigger");
  };

  const handleSimulateScroll = (progress: number) => {
    setCurrentTime(progress * totalDuration);
  };

  const handleUpdateRepeat = (repeatVal: number) => {
    if (!currentAnimation) return;
    documentCommands.updateClip(currentAnimation.id, { repeat: repeatVal }, "Update repeat policy");
  };

  const handleUpdateStagger = (staggerConfig?: StaggerConfig) => {
    if (!currentAnimation) return;
    documentCommands.updateClip(currentAnimation.id, { stagger: staggerConfig }, "Update child stagger");
  };

  const validProperties = getValidPropertiesForArchetype(archetype, family);
  const unusedProperties = validProperties.filter((p) => !tracks.some((t) => t.property === p));

  const playheadPixel = currentTime * pixelsPerSecond;

  const rulerTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let t = 0; t <= totalDuration + 0.001; t += 0.25) {
      ticks.push(Math.round(t * 100) / 100);
    }
    return ticks;
  }, [totalDuration]);

  return (
    <div className="motion-sequencer-shell" role="region" aria-label="Motion Sequencer Timeline">
      {/* Top Playhead Controls */}
      <PlayheadControls
        isPlaying={isPlaying}
        isLooping={isLooping}
        playbackRate={playbackRate}
        currentTime={currentTime}
        totalDuration={totalDuration}
        viewMode={timelineViewMode}
        onToggleViewMode={setTimelineViewMode}
        onTogglePlay={handleTogglePlay}
        onStopReset={handleStopReset}
        onToggleLoop={handleToggleLoop}
        onReverse={handleReverse}
        onRateChange={handleRateChange}
        onAddKeyframe={handleAddKeyframe}
        onOpenStagger={() => setIsStaggerOpen(!isStaggerOpen)}
      />

      {/* Selected Keyframe Inspector Bar */}
      {selectedKeyframeInfo && (
        <div
          style={{
            height: 28,
            background: "var(--surface-panel-selected)",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 var(--space-md)",
            fontSize: 10,
            color: "var(--text-secondary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
            <span style={{ fontWeight: 600, color: "var(--accent-primary)" }}>
              Selected Keyframe: {selectedKeyframeInfo.track.property}
            </span>

            {/* Time Editor */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span>Time:</span>
              <input
                type="number"
                step="0.05"
                min="0"
                max={totalDuration}
                value={selectedKeyframeInfo.keyframe.time}
                onChange={(e) =>
                  handleUpdateKeyframeTime(
                    selectedKeyframeInfo.track.id || selectedKeyframeInfo.track.property,
                    selectedKeyframeInfo.keyframe.id || `kf_${selectedKeyframeInfo.keyframe.time}`,
                    parseFloat(e.target.value) || 0
                  )
                }
                style={{ width: 54, height: 18, fontSize: 10, fontFamily: "var(--font-mono)" }}
                className="form-input"
              />
              <span>s</span>
            </div>

            {/* Value Editor */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span>Value:</span>
              <input
                type="text"
                value={String(selectedKeyframeInfo.keyframe.value)}
                onChange={(e) =>
                  handleUpdateKeyframeValue(
                    selectedKeyframeInfo.track.id || selectedKeyframeInfo.track.property,
                    selectedKeyframeInfo.keyframe.id || `kf_${selectedKeyframeInfo.keyframe.time}`,
                    e.target.value
                  )
                }
                style={{ width: 68, height: 18, fontSize: 10, fontFamily: "var(--font-mono)" }}
                className="form-input"
              />
            </div>

            {/* Ease Editor */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span>Easing:</span>
              <select
                value={selectedKeyframeInfo.keyframe.ease || "power2.out"}
                onChange={(e) =>
                  handleUpdateKeyframeEase(
                    selectedKeyframeInfo.track.id || selectedKeyframeInfo.track.property,
                    selectedKeyframeInfo.keyframe.id || `kf_${selectedKeyframeInfo.keyframe.time}`,
                    e.target.value
                  )
                }
                style={{ height: 18, fontSize: 10 }}
                className="form-select"
              >
                <option value="power2.out">Power2.out</option>
                <option value="power4.inOut">Power4.inOut</option>
                <option value="elastic.out">Elastic.out</option>
                <option value="bounce.out">Bounce.out</option>
                <option value="linear">Linear</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {/* Stretch Buttons */}
            <span style={{ color: "var(--text-tertiary)" }}>Stretch:</span>
            <button
              type="button"
              className="cb-pill"
              style={{ height: 18, fontSize: 9, padding: "0 4px" }}
              onClick={() => handleStretchKeyframes(0.9)}
              title="Compress track keyframes by 10%"
            >
              0.9x
            </button>
            <button
              type="button"
              className="cb-pill"
              style={{ height: 18, fontSize: 9, padding: "0 4px" }}
              onClick={() => handleStretchKeyframes(1.1)}
              title="Stretch track keyframes by 10%"
            >
              1.1x
            </button>

            {/* Duplicate */}
            <button
              type="button"
              className="cb-pill"
              style={{ height: 18, fontSize: 9, padding: "0 6px" }}
              onClick={() =>
                handleDuplicateKeyframe(
                  selectedKeyframeInfo.track.id || selectedKeyframeInfo.track.property,
                  selectedKeyframeInfo.keyframe.id || `kf_${selectedKeyframeInfo.keyframe.time}`
                )
              }
              title="Duplicate Keyframe (Ctrl+D)"
            >
              <Copy size={9} />
              <span>Duplicate</span>
            </button>

            {/* Delete */}
            <button
              type="button"
              className="cb-pill"
              style={{ height: 18, fontSize: 9, padding: "0 6px", color: "var(--accent-danger)" }}
              onClick={() =>
                handleDeleteKeyframe(
                  selectedKeyframeInfo.track.id || selectedKeyframeInfo.track.property,
                  selectedKeyframeInfo.keyframe.id || `kf_${selectedKeyframeInfo.keyframe.time}`
                )
              }
              title="Delete Keyframe (Del/Backspace)"
            >
              <Trash2 size={9} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {timelineViewMode === "curves" ? (
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <CurveEditor />
        </div>
      ) : (
        <>
          {/* Main Split Layout: Left Tracks, Right Lanes */}
          <div className="sequencer-layout">
        {/* Left Column: Track Headers */}
        <div className="sequencer-tracks-col">
          <div className="sequencer-tracks-col-header">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>Animated Tracks</span>
              <span className="panel-header__badge">{tracks.length}</span>
            </div>

            {/* Add Track Selector */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="sequencer-track-action-btn"
                onClick={() => setIsAddTrackOpen(!isAddTrackOpen)}
                title="Add property track for current archetype"
                style={{ width: "auto", padding: "0 6px", height: 22, fontSize: 10, gap: 2 }}
              >
                <Plus size={11} />
                <span>Track</span>
                <ChevronDown size={10} />
              </button>

              {isAddTrackOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: 24,
                    right: 0,
                    width: 220,
                    maxHeight: 240,
                    overflowY: "auto",
                    background: "var(--surface-panel-solid)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-lg)",
                    zIndex: 60,
                    padding: 4,
                  }}
                >
                  <div style={{ padding: "4px 6px", fontSize: 10, color: "var(--text-tertiary)", fontWeight: 600 }}>
                    Valid for {archetype || "element"}:
                  </div>
                  {unusedProperties.length === 0 ? (
                    <div style={{ padding: 6, fontSize: 11, color: "var(--text-muted)" }}>
                      All valid tracks already added
                    </div>
                  ) : (
                    unusedProperties.map((prop) => (
                      <button
                        key={prop}
                        type="button"
                        onClick={() => handleAddPropertyTrack(prop)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "4px 6px",
                          fontSize: 11,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          borderRadius: "var(--radius-xs)",
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-mono)",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-panel-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        {prop}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Track Header Rows */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {tracks.map((track) => (
              <TrackHeader
                key={track.id || track.property}
                id={track.id || track.property}
                property={track.property}
                isActive={activeTrackId === (track.id || track.property)}
                isMuted={track.muted}
                isLocked={track.locked}
                keyframeCount={track.keyframes.length}
                onSelect={() => setActiveTrackId(track.id || track.property)}
                onToggleMute={() => handleToggleMuteTrack(track.id || track.property)}
                onToggleLock={() => handleToggleLockTrack(track.id || track.property)}
                onDelete={() => handleDeleteTrack(track.id || track.property)}
              />
            ))}
          </div>
        </div>

        {/* Right Column: Timeline Stage with Ruler, Lanes, Playhead */}
        <div className="sequencer-timeline-col">
          {/* Ruler */}
          <div
            className="sequencer-ruler-wrap"
            style={{ width: `${pixelsPerSecond * totalDuration + 120}px`, minWidth: "100%" }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const newTime = Math.max(0, Math.min(clickX / pixelsPerSecond, totalDuration));
              setCurrentTime(newTime);
            }}
          >
            {rulerTicks.map((sec) => (
              <div
                key={sec}
                className="sequencer-ruler-tick"
                style={{ left: `${sec * pixelsPerSecond}px` }}
              >
                <span className="sequencer-ruler-label">{sec.toFixed(2)}s</span>
                <div className="sequencer-ruler-mark-line" />
              </div>
            ))}
          </div>

          {/* Keyframe Lanes */}
          <div className="sequencer-lanes-stage" style={{ width: `${pixelsPerSecond * totalDuration + 120}px`, minWidth: "100%" }}>
            {tracks.map((track) => (
              <KeyframeTrack
                key={track.id || track.property}
                trackId={track.id || track.property}
                property={track.property}
                keyframes={track.keyframes}
                pixelsPerSecond={pixelsPerSecond}
                totalDuration={totalDuration}
                isActive={activeTrackId === (track.id || track.property)}
                isLocked={track.locked}
                selectedKeyframeId={selectedKeyframeId}
                onSelectKeyframe={handleSelectKeyframe}
                onUpdateKeyframeTime={handleUpdateKeyframeTime}
                onLaneClick={(time) => setCurrentTime(time)}
              />
            ))}

            {/* Playhead Vertical Needle */}
            <div
              className="sequencer-playhead-line"
              style={{ transform: `translateX(${playheadPixel}px)` }}
            >
              <div
                className="sequencer-playhead-head"
                title={`Playhead: ${currentTime.toFixed(3)}s`}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const startClientX = e.clientX;
                  const initialTime = currentTime;

                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    const deltaX = moveEvent.clientX - startClientX;
                    const newTime = Math.max(
                      0,
                      Math.min(initialTime + deltaX / pixelsPerSecond, totalDuration)
                    );
                    setCurrentTime(newTime);
                  };

                  const handleMouseUp = () => {
                    window.removeEventListener("mousemove", handleMouseMove);
                    window.removeEventListener("mouseup", handleMouseUp);
                  };

                  window.addEventListener("mousemove", handleMouseMove);
                  window.addEventListener("mouseup", handleMouseUp);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ScrollTrigger Bar at Bottom */}
      <ScrollTriggerBar
        config={currentAnimation?.scrollTrigger}
        onUpdateConfig={handleUpdateScrollTrigger}
        onSimulateScroll={handleSimulateScroll}
      />
      </>
      )}

      {/* Stagger & Infinite Loop Popover */}
      <StaggerManager
        isOpen={isStaggerOpen}
        onClose={() => setIsStaggerOpen(false)}
        repeat={currentAnimation?.repeat ?? 0}
        stagger={currentAnimation?.stagger}
        onUpdateRepeat={handleUpdateRepeat}
        onUpdateStagger={handleUpdateStagger}
      />
    </div>
  );
};
