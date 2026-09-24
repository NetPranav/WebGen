"use client";

/**
 * ============================================================================
 * ANIMATION TRACK & ARCHETYPE COMPATIBILITY VALIDATOR
 * ============================================================================
 * Evaluates animation sample tracks against element archetypes. Traps incompatible
 * tracks (e.g. typography tracks on image or container), emits [ANIM_COMPAT]
 * diagnostics to DiagnosticBus, and produces sanitized samples for GSAP playback.
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.3 & SCHEMA_REFERENCE.md §13.2
 * ============================================================================
 */

import type { ArchetypeId } from "../document/registry";
import {
  AnimationSample,
  AnimationTrack,
  ARCHETYPE_ANIMATION_COMPATIBILITY,
} from "../types/animations";
import { DiagnosticBus } from "./DiagnosticBus";

export interface RejectedTrackInfo {
  track: AnimationTrack;
  reason: string;
  alternativeSuggestion: string;
}

export interface AnimationValidationResult {
  isValid: boolean;
  allowedTracks: AnimationTrack[];
  rejectedTracks: RejectedTrackInfo[];
  sanitizedSample: AnimationSample;
}

export class AnimationValidatorService {
  /**
   * Evaluates an AnimationSample against a target element's archetype.
   * Traps incompatible tracks, logs diagnostics, and returns a safe sanitized sample.
   */
  public validateSampleForElement(
    sample: AnimationSample,
    target: {
      elementId: string;
      elementName?: string;
      archetype: ArchetypeId;
    }
  ): AnimationValidationResult {
    const compatRule = ARCHETYPE_ANIMATION_COMPATIBILITY[target.archetype];
    const allowedTrackSet = new Set(compatRule?.allowedTracks || []);

    const allowedTracks: AnimationTrack[] = [];
    const rejectedTracks: RejectedTrackInfo[] = [];

    for (const track of sample.tracks) {
      if (allowedTrackSet.has(track.trackId)) {
        allowedTracks.push(track);
      } else {
        // Disallowed track detected
        const disallowedInfo = compatRule?.disallowedTracks?.[track.trackId];
        const reason =
          disallowedInfo?.reason ||
          `Track '${track.trackId}' is not supported by element archetype '${target.archetype}'.`;
        const alternativeSuggestion =
          disallowedInfo?.alternativeSuggestion ||
          `Valid tracks: [${(compatRule?.allowedTracks || []).join(", ")}].`;

        // Dispatch diagnostic event
        DiagnosticBus.reportAnimationIncompatibility(
          target.archetype,
          track.trackId,
          compatRule?.allowedTracks || [],
          target.elementId,
          target.elementName
        );

        rejectedTracks.push({
          track,
          reason,
          alternativeSuggestion,
        });
      }
    }

    const sanitizedSample: AnimationSample = {
      ...sample,
      tracks: allowedTracks,
    };

    return {
      isValid: rejectedTracks.length === 0,
      allowedTracks,
      rejectedTracks,
      sanitizedSample,
    };
  }
}

export const AnimationValidator = new AnimationValidatorService();
