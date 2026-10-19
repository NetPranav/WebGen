"use client";

/**
 * Which dock zone is on top (moved out of `EditorShell.tsx`, Phase 14). The
 * Details dock, the AI dock and the bottom drawer overlap; a click raises one
 * at once, and hovering one for 2 seconds raises it too.
 */
import React, { useState } from "react";
import { useLatestRef } from "@/core/hooks/useLatestRef";

export type DockLayer = "left" | "right" | "bottom" | "ai";

export function useDockLayers() {
  const [activeLayer, setActiveLayer] = useState<DockLayer>("bottom");
  const activeLayerRef = useLatestRef<DockLayer>(activeLayer);
  const layerTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (layerTimerRef.current) {
        clearTimeout(layerTimerRef.current);
      }
    };
  }, []);

  const handleZoneMouseEnter = (targetLayer: DockLayer) => {
    if (layerTimerRef.current) {
      clearTimeout(layerTimerRef.current);
      layerTimerRef.current = null;
    }
    // If this zone is already the active top layer, nothing to switch
    if (targetLayer === activeLayerRef.current) return;

    // Dwell timer: Must stay in this panel/drawer for ~2 seconds before overlapping
    // Until then, whichever panel/drawer was on top remains on top!
    layerTimerRef.current = setTimeout(() => {
      setActiveLayer(targetLayer);
      layerTimerRef.current = null;
    }, 2000);
  };

  const handleZoneMouseLeave = (zone: DockLayer) => {
    // If mouse leaves before the 2 seconds, cancel the dwell transition timer.
    // Whichever layer was active continues to be active!
    if (layerTimerRef.current) {
      clearTimeout(layerTimerRef.current);
      layerTimerRef.current = null;
    }
  };

  const handleZoneClick = React.useCallback((targetLayer: DockLayer) => {
    // Immediate click bypasses dwell timer
    if (layerTimerRef.current) {
      clearTimeout(layerTimerRef.current);
      layerTimerRef.current = null;
    }
    setActiveLayer(targetLayer);
  }, []);

  return { activeLayer, setActiveLayer, handleZoneMouseEnter, handleZoneMouseLeave, handleZoneClick };
}
