"use client";

/**
 * ============================================================================
 * MOTION SEQUENCER WRAPPER (BACKWARD COMPATIBILITY)
 * ============================================================================
 * UI Element: TimelineSequencer (Alias to MotionSequencer)
 * Screen / Scope: Screen 05: Motion Sequencer & Bezier Curve Editor (`/editor`)
 * Role: Re-exports MotionSequencer for backwards compatibility with shell & tabs.
 * Styling Source: `@/editor/styles/sequencer.css`
 * Matches: PANELS.md (Panel 05)
 * ============================================================================
 */

import React from "react";
import { MotionSequencer } from "./MotionSequencer";

export const TimelineSequencer: React.FC = () => {
  return <MotionSequencer />;
};

export default TimelineSequencer;
export { MotionSequencer };
