"use client";

/**
 * ============================================================================
 * INTERACTIVE FAMILY PRESETS (13 PRESETS)
 * ============================================================================
 * Production motion presets for Button, Toggle, Badge, and FAB archetypes.
 * Covers spring physics, tactile compression, gesture haptics, and ambient states.
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.3 & PRD.md §5.1
 * ============================================================================
 */

import { MotionPreset } from "./types";

export const INTERACTIVE_PRESETS: MotionPreset[] = [
  {
    id: "preset_interactive_magnetic_hover",
    name: "Magnetic Hover & Spring Pull",
    family: "interactive",
    compatibleArchetypes: ["button", "toggle", "badge", "fab"],
    description: "Elastic physics spring pull toward cursor on hover with subtle scale expansion.",
    badge: "Spring",
    engine: "framer-motion",
    tags: ["hover", "spring", "cursor", "interactive"],
    animation: {
      name: "Magnetic Hover Pull",
      type: "hover",
      trigger: "hover",
      duration: 0.3,
      easing: "spring(stiffness: 400, damping: 25)",
      enabled: true,
      tracks: [
        {
          property: "transform.scale",
          keyframes: [
            { time: 0, value: 1.0, ease: "linear" },
            { time: 0.3, value: 1.06, ease: "spring(stiffness: 400, damping: 25)" },
          ],
        },
        {
          property: "transform.translateY",
          keyframes: [
            { time: 0, value: 0, ease: "linear" },
            { time: 0.3, value: -2, ease: "spring(stiffness: 400, damping: 25)" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_interactive_tactile_bounce",
    name: "Tactile Tap Bounce",
    family: "interactive",
    compatibleArchetypes: ["button", "toggle", "badge", "fab"],
    description: "Subtle 0.94x scale compression on click followed by an energetic back.out rebound.",
    badge: "Gesture",
    engine: "gsap",
    tags: ["tap", "click", "bounce", "compression"],
    animation: {
      name: "Tactile Tap Bounce",
      type: "tap",
      trigger: "press",
      duration: 0.2,
      easing: "back.out(3)",
      enabled: true,
      tracks: [
        {
          property: "transform.scale",
          keyframes: [
            { time: 0, value: 1.0, ease: "power1.in" },
            { time: 0.08, value: 0.94, ease: "power1.in" },
            { time: 0.2, value: 1.0, ease: "back.out(3)" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_interactive_mount_pop",
    name: "Mount Pop-In Reveal",
    family: "interactive",
    compatibleArchetypes: ["button", "toggle", "badge", "fab"],
    description: "Elastic scale expansion from 0 to 1 with an overshoot bounce upon element mount.",
    badge: "Mount",
    engine: "gsap",
    tags: ["mount", "entrance", "pop", "scale"],
    animation: {
      name: "Mount Pop-In Reveal",
      type: "entrance",
      trigger: "mount",
      duration: 0.45,
      easing: "back.out(1.7)",
      enabled: true,
      tracks: [
        {
          property: "transform.scale",
          keyframes: [
            { time: 0, value: 0.2, ease: "power2.out" },
            { time: 0.45, value: 1.0, ease: "back.out(1.7)" },
          ],
        },
        {
          property: "appearance.opacity",
          keyframes: [
            { time: 0, value: 0, ease: "power2.out" },
            { time: 0.2, value: 1.0, ease: "power2.out" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_interactive_elastic_snap",
    name: "Elastic Snap Back",
    family: "interactive",
    compatibleArchetypes: ["button", "toggle", "badge", "fab"],
    description: "Over-damped release physics simulating a mechanical spring button release.",
    badge: "Physics",
    engine: "framer-motion",
    tags: ["spring", "snap", "physics"],
    animation: {
      name: "Elastic Snap Back",
      type: "tap",
      trigger: "press",
      duration: 0.35,
      easing: "spring(stiffness: 600, damping: 15)",
      enabled: true,
      tracks: [
        {
          property: "transform.scale",
          keyframes: [
            { time: 0, value: 0.92, ease: "linear" },
            { time: 0.35, value: 1.0, ease: "spring(stiffness: 600, damping: 15)" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_interactive_skeuomorphic_click",
    name: "Skeuomorphic Click",
    family: "interactive",
    compatibleArchetypes: ["button", "toggle"],
    description: "Realistic tactile mechanical click with downward translateY and shadow collapse.",
    badge: "Gesture",
    engine: "gsap",
    tags: ["skeuomorphic", "click", "mechanical"],
    animation: {
      name: "Skeuomorphic Click",
      type: "tap",
      trigger: "press",
      duration: 0.16,
      easing: "power2.out",
      enabled: true,
      tracks: [
        {
          property: "transform.translateY",
          keyframes: [
            { time: 0, value: 0, ease: "power1.in" },
            { time: 0.08, value: 3, ease: "power1.in" },
            { time: 0.16, value: 0, ease: "power2.out" },
          ],
        },
        {
          property: "appearance.opacity",
          keyframes: [
            { time: 0, value: 1.0, ease: "linear" },
            { time: 0.08, value: 0.92, ease: "linear" },
            { time: 0.16, value: 1.0, ease: "linear" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_interactive_liquid_toggle",
    name: "Liquid Toggle Slide",
    family: "interactive",
    compatibleArchetypes: ["toggle"],
    description: "Fluid organic slide across toggle axis with subtle horizontal jelly stretching.",
    badge: "Physics",
    engine: "framer-motion",
    tags: ["toggle", "liquid", "jelly", "switch"],
    animation: {
      name: "Liquid Toggle Slide",
      type: "tap",
      trigger: "press",
      duration: 0.4,
      easing: "spring(stiffness: 350, damping: 20)",
      enabled: true,
      tracks: [
        {
          property: "transform.translateX",
          keyframes: [
            { time: 0, value: 0, ease: "spring(stiffness: 350, damping: 20)" },
            { time: 0.4, value: 24, ease: "spring(stiffness: 350, damping: 20)" },
          ],
        },
        {
          property: "transform.scaleX",
          keyframes: [
            { time: 0, value: 1.0, ease: "linear" },
            { time: 0.18, value: 1.25, ease: "power2.out" },
            { time: 0.4, value: 1.0, ease: "spring(stiffness: 350, damping: 20)" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_interactive_jiggle_attention",
    name: "Jiggle Attention",
    family: "interactive",
    compatibleArchetypes: ["button", "badge", "fab"],
    description: "Rotational wiggle vibration to draw user gaze to high-priority call-to-action.",
    badge: "Ambient",
    engine: "gsap",
    tags: ["wobble", "jiggle", "attention", "cta"],
    animation: {
      name: "Jiggle Attention",
      type: "loop",
      trigger: "time",
      duration: 0.8,
      repeat: -1,
      easing: "power1.inOut",
      enabled: true,
      tracks: [
        {
          property: "transform.rotate",
          keyframes: [
            { time: 0, value: 0, ease: "power1.inOut" },
            { time: 0.15, value: -4, ease: "power1.inOut" },
            { time: 0.3, value: 4, ease: "power1.inOut" },
            { time: 0.45, value: -2, ease: "power1.inOut" },
            { time: 0.6, value: 2, ease: "power1.inOut" },
            { time: 0.8, value: 0, ease: "power1.inOut" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_interactive_ripple_press",
    name: "Ripple Press",
    family: "interactive",
    compatibleArchetypes: ["button", "badge", "fab"],
    description: "Micro-scale punch with subtle border contrast pulse on click.",
    badge: "Gesture",
    engine: "gsap",
    tags: ["ripple", "press", "border"],
    animation: {
      name: "Ripple Press",
      type: "tap",
      trigger: "press",
      duration: 0.3,
      easing: "power2.out",
      enabled: true,
      tracks: [
        {
          property: "transform.scale",
          keyframes: [
            { time: 0, value: 1.0, ease: "linear" },
            { time: 0.1, value: 0.96, ease: "power1.out" },
            { time: 0.3, value: 1.0, ease: "power2.out" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_interactive_haptic_vibrate",
    name: "Haptic Micro-Vibrate",
    family: "interactive",
    compatibleArchetypes: ["button", "toggle", "fab"],
    description: "Sharp 60Hz simulated micro-haptic buzz upon user action.",
    badge: "Gesture",
    engine: "gsap",
    tags: ["haptic", "vibrate", "micro"],
    animation: {
      name: "Haptic Micro-Vibrate",
      type: "tap",
      trigger: "press",
      duration: 0.18,
      easing: "linear",
      enabled: true,
      tracks: [
        {
          property: "transform.translateX",
          keyframes: [
            { time: 0, value: 0, ease: "linear" },
            { time: 0.03, value: -2, ease: "linear" },
            { time: 0.06, value: 2, ease: "linear" },
            { time: 0.09, value: -1, ease: "linear" },
            { time: 0.12, value: 1, ease: "linear" },
            { time: 0.18, value: 0, ease: "linear" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_interactive_focus_ring",
    name: "Focus Ring Pulse",
    family: "interactive",
    compatibleArchetypes: ["button", "toggle", "badge"],
    description: "Accessible, smooth focus ring expansion with breathing opacity pulse.",
    badge: "Ambient",
    engine: "gsap",
    tags: ["focus", "a11y", "accessibility", "ring"],
    animation: {
      name: "Focus Ring Pulse",
      type: "loop",
      trigger: "time",
      duration: 1.6,
      repeat: -1,
      easing: "sine.inOut",
      enabled: true,
      tracks: [
        {
          property: "transform.scale",
          keyframes: [
            { time: 0, value: 1.0, ease: "sine.inOut" },
            { time: 0.8, value: 1.03, ease: "sine.inOut" },
            { time: 1.6, value: 1.0, ease: "sine.inOut" },
          ],
        },
        {
          property: "appearance.opacity",
          keyframes: [
            { time: 0, value: 0.85, ease: "sine.inOut" },
            { time: 0.8, value: 1.0, ease: "sine.inOut" },
            { time: 1.6, value: 0.85, ease: "sine.inOut" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_interactive_glint_shimmer",
    name: "Glint Shimmer Pass",
    family: "interactive",
    compatibleArchetypes: ["button", "badge", "fab"],
    description: "Diagonal light sheen passing across button face on cursor hover.",
    badge: "Hover",
    engine: "gsap",
    tags: ["glint", "shimmer", "light", "hover"],
    animation: {
      name: "Glint Shimmer Pass",
      type: "hover",
      trigger: "hover",
      duration: 0.6,
      easing: "power2.inOut",
      enabled: true,
      tracks: [
        {
          property: "transform.scale",
          keyframes: [
            { time: 0, value: 1.0, ease: "power2.out" },
            { time: 0.3, value: 1.04, ease: "power2.out" },
            { time: 0.6, value: 1.0, ease: "power2.out" },
          ],
        },
        {
          property: "appearance.opacity",
          keyframes: [
            { time: 0, value: 0.9, ease: "linear" },
            { time: 0.3, value: 1.0, ease: "linear" },
            { time: 0.6, value: 0.9, ease: "linear" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_interactive_float_levitate",
    name: "Float Levitate",
    family: "interactive",
    compatibleArchetypes: ["button", "badge", "fab"],
    description: "Calm 3-second sinusoidal floating idle motion with gentle Y bobbing.",
    badge: "Ambient",
    engine: "gsap",
    tags: ["float", "levitate", "idle", "ambient"],
    animation: {
      name: "Float Levitate",
      type: "loop",
      trigger: "time",
      duration: 3.0,
      repeat: -1,
      easing: "sine.inOut",
      enabled: true,
      tracks: [
        {
          property: "transform.translateY",
          keyframes: [
            { time: 0, value: 0, ease: "sine.inOut" },
            { time: 1.5, value: -6, ease: "sine.inOut" },
            { time: 3.0, value: 0, ease: "sine.inOut" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_interactive_breathing_glow",
    name: "Breathing Glow",
    family: "interactive",
    compatibleArchetypes: ["button", "badge", "fab"],
    description: "Subtle rhythmic scale and opacity oscillation simulating living biological breath.",
    badge: "Ambient",
    engine: "gsap",
    tags: ["breathe", "glow", "ambient", "pulse"],
    animation: {
      name: "Breathing Glow",
      type: "loop",
      trigger: "time",
      duration: 2.4,
      repeat: -1,
      easing: "power1.inOut",
      enabled: true,
      tracks: [
        {
          property: "transform.scale",
          keyframes: [
            { time: 0, value: 1.0, ease: "power1.inOut" },
            { time: 1.2, value: 1.025, ease: "power1.inOut" },
            { time: 2.4, value: 1.0, ease: "power1.inOut" },
          ],
        },
        {
          property: "appearance.opacity",
          keyframes: [
            { time: 0, value: 0.85, ease: "power1.inOut" },
            { time: 1.2, value: 1.0, ease: "power1.inOut" },
            { time: 2.4, value: 0.85, ease: "power1.inOut" },
          ],
        },
      ],
    },
  },
];
