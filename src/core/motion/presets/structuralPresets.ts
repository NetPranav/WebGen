"use client";

/**
 * ============================================================================
 * STRUCTURAL FAMILY PRESETS (13 PRESETS)
 * ============================================================================
 * Production motion presets for Divider and Background Layer archetypes.
 * Covers stroke draw-ins, gradient angle sweeps, parallax, and noise texture pulses.
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.3 & PRD.md §5.3
 * ============================================================================
 */

import { MotionPreset } from "./types";

export const STRUCTURAL_PRESETS: MotionPreset[] = [
  {
    id: "preset_structural_divider_ltr",
    name: "Divider Draw Left-to-Right",
    family: "structural",
    compatibleArchetypes: ["divider"],
    description: "Draws divider length smoothly across viewport from left margin to 100% full width.",
    badge: "Mount",
    engine: "gsap",
    tags: ["divider", "draw", "line", "reveal", "entrance"],
    animation: {
      name: "Divider Draw LTR",
      type: "entrance",
      trigger: "onMount",
      duration: 0.8,
      easing: "power3.out",
      enabled: true,
      tracks: [
        {
          property: "divider.length",
          keyframes: [
            { time: 0, value: "0%", ease: "power3.out" },
            { time: 0.8, value: "100%", ease: "power3.out" },
          ],
        },
        {
          property: "appearance.opacity",
          keyframes: [
            { time: 0, value: 0, ease: "linear" },
            { time: 0.2, value: 1.0, ease: "linear" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_structural_divider_center",
    name: "Divider Draw Center-Out",
    family: "structural",
    compatibleArchetypes: ["divider"],
    description: "Expands divider symmetrically outward from exact center point to both edges.",
    badge: "Mount",
    engine: "gsap",
    tags: ["divider", "center", "draw", "symmetric"],
    animation: {
      name: "Divider Draw Center-Out",
      type: "entrance",
      trigger: "onMount",
      duration: 0.7,
      easing: "power2.out",
      enabled: true,
      tracks: [
        {
          property: "transform.scaleX",
          keyframes: [
            { time: 0, value: 0, ease: "power2.out" },
            { time: 0.7, value: 1.0, ease: "power2.out" },
          ],
        },
        {
          property: "appearance.opacity",
          keyframes: [
            { time: 0, value: 0, ease: "power1.out" },
            { time: 0.2, value: 1.0, ease: "power1.out" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_structural_divider_gradient_sweep",
    name: "Divider Gradient Sweep Loop",
    family: "structural",
    compatibleArchetypes: ["divider"],
    description: "Continuous 360-degree angle drift across linear gradient color stops.",
    badge: "Ambient",
    engine: "gsap",
    tags: ["divider", "gradient", "sweep", "loop", "ambient"],
    animation: {
      name: "Gradient Sweep Loop",
      type: "loop",
      trigger: "ambient",
      duration: 4.0,
      repeat: -1,
      easing: "linear",
      enabled: true,
      tracks: [
        {
          property: "divider.gradient.angle",
          keyframes: [
            { time: 0, value: 0, ease: "linear" },
            { time: 4.0, value: 360, ease: "linear" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_structural_divider_dash_marquee",
    name: "Divider Dash Offset Marquee",
    family: "structural",
    compatibleArchetypes: ["divider"],
    description: "Infinite marquee running line cycling stroke-dashoffset along divider path.",
    badge: "Ambient",
    engine: "gsap",
    tags: ["divider", "dash", "marquee", "loop"],
    animation: {
      name: "Dash Offset Marquee",
      type: "loop",
      trigger: "ambient",
      duration: 2.0,
      repeat: -1,
      easing: "linear",
      enabled: true,
      tracks: [
        {
          property: "divider.strokeDashoffset",
          keyframes: [
            { time: 0, value: 0, ease: "linear" },
            { time: 2.0, value: -64, ease: "linear" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_structural_divider_scroll_reveal",
    name: "Divider Scroll-Triggered Reveal",
    family: "structural",
    compatibleArchetypes: ["divider"],
    description: "Ties divider drawing directly to scroll position via ScrollTrigger scrub.",
    badge: "ScrollTrigger",
    engine: "gsap",
    tags: ["divider", "scroll", "scrolltrigger", "scrub"],
    animation: {
      name: "Scroll-Triggered Reveal",
      type: "scroll",
      trigger: "onScroll",
      duration: 1.0,
      easing: "none",
      enabled: true,
      scrollTrigger: {
        start: "top 85%",
        end: "top 40%",
        scrub: 1.0,
      },
      tracks: [
        {
          property: "divider.length",
          keyframes: [
            { time: 0, value: "0%", ease: "none" },
            { time: 1.0, value: "100%", ease: "none" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_structural_bg_sunrise_drift",
    name: "Sunrise Gradient Drift",
    family: "structural",
    compatibleArchetypes: ["background"],
    description: "Atmospheric dawn-to-sunrise ambient loop rotating gradient angle and glowing warm hues.",
    badge: "Ambient",
    engine: "gsap",
    tags: ["background", "gradient", "sunrise", "ambient", "drift"],
    animation: {
      name: "Sunrise Gradient Drift",
      type: "loop",
      trigger: "ambient",
      duration: 12.0,
      repeat: -1,
      easing: "sine.inOut",
      enabled: true,
      tracks: [
        {
          property: "background.gradient.angle",
          keyframes: [
            { time: 0, value: 45, ease: "sine.inOut" },
            { time: 6.0, value: 125, ease: "sine.inOut" },
            { time: 12.0, value: 45, ease: "sine.inOut" },
          ],
        },
        {
          property: "appearance.opacity",
          keyframes: [
            { time: 0, value: 0.9, ease: "sine.inOut" },
            { time: 6.0, value: 1.0, ease: "sine.inOut" },
            { time: 12.0, value: 0.9, ease: "sine.inOut" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_structural_bg_aurora_mesh",
    name: "Aurora Borealis Shifting Color",
    family: "structural",
    compatibleArchetypes: ["background"],
    description: "Hypnotic northern lights mesh simulation shifting between emerald and deep violet.",
    badge: "Ambient",
    engine: "gsap",
    tags: ["aurora", "gradient", "mesh", "ambient", "color"],
    animation: {
      name: "Aurora Borealis Shifting Color",
      type: "loop",
      trigger: "ambient",
      duration: 16.0,
      repeat: -1,
      easing: "sine.inOut",
      enabled: true,
      tracks: [
        {
          property: "background.gradient.angle",
          keyframes: [
            { time: 0, value: 120, ease: "sine.inOut" },
            { time: 8.0, value: 260, ease: "sine.inOut" },
            { time: 16.0, value: 120, ease: "sine.inOut" },
          ],
        },
        {
          property: "transform.scale",
          keyframes: [
            { time: 0, value: 1.0, ease: "sine.inOut" },
            { time: 8.0, value: 1.08, ease: "sine.inOut" },
            { time: 16.0, value: 1.0, ease: "sine.inOut" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_structural_bg_cosmic_drift",
    name: "Deep Space Cosmic Drift",
    family: "structural",
    compatibleArchetypes: ["background"],
    description: "Subtle cosmic radial gradient pulse expanding outward into deep nebula tones.",
    badge: "Ambient",
    engine: "gsap",
    tags: ["cosmic", "space", "radial", "ambient"],
    animation: {
      name: "Deep Space Cosmic Drift",
      type: "loop",
      trigger: "ambient",
      duration: 14.0,
      repeat: -1,
      easing: "power1.inOut",
      enabled: true,
      tracks: [
        {
          property: "transform.scale",
          keyframes: [
            { time: 0, value: 1.0, ease: "power1.inOut" },
            { time: 7.0, value: 1.12, ease: "power1.inOut" },
            { time: 14.0, value: 1.0, ease: "power1.inOut" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_structural_bg_parallax_scroll",
    name: "Parallax Scroll Depth",
    family: "structural",
    compatibleArchetypes: ["background"],
    description: "ScrollTrigger-linked 0.4x background movement producing convincing spatial parallax.",
    badge: "ScrollTrigger",
    engine: "gsap",
    tags: ["parallax", "scroll", "depth", "scrolltrigger"],
    animation: {
      name: "Parallax Scroll Depth",
      type: "scroll",
      trigger: "onScroll",
      duration: 1.0,
      easing: "none",
      enabled: true,
      scrollTrigger: {
        start: "top bottom",
        end: "bottom top",
        scrub: 0.5,
      },
      tracks: [
        {
          property: "transform.translateY",
          keyframes: [
            { time: 0, value: -60, ease: "none" },
            { time: 1.0, value: 60, ease: "none" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_structural_bg_noise_pulse",
    name: "Film Grain Noise Pulse",
    family: "structural",
    compatibleArchetypes: ["background"],
    description: "Subtle film grain texture opacity modulation simulating organic photographic grain.",
    badge: "Ambient",
    engine: "gsap",
    tags: ["noise", "film-grain", "texture", "ambient"],
    animation: {
      name: "Film Grain Noise Pulse",
      type: "loop",
      trigger: "ambient",
      duration: 3.5,
      repeat: -1,
      easing: "sine.inOut",
      enabled: true,
      tracks: [
        {
          property: "background.noise.opacity",
          keyframes: [
            { time: 0, value: 0.08, ease: "sine.inOut" },
            { time: 1.75, value: 0.18, ease: "sine.inOut" },
            { time: 3.5, value: 0.08, ease: "sine.inOut" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_structural_bg_blend_crossfade",
    name: "Ambient Color Crossfade",
    family: "structural",
    compatibleArchetypes: ["background"],
    description: "Gentle mix-blend-mode opacity wave creating subtle mood shifts.",
    badge: "Ambient",
    engine: "gsap",
    tags: ["crossfade", "blend", "ambient", "color"],
    animation: {
      name: "Ambient Color Crossfade",
      type: "loop",
      trigger: "ambient",
      duration: 6.0,
      repeat: -1,
      easing: "sine.inOut",
      enabled: true,
      tracks: [
        {
          property: "appearance.opacity",
          keyframes: [
            { time: 0, value: 0.75, ease: "sine.inOut" },
            { time: 3.0, value: 1.0, ease: "sine.inOut" },
            { time: 6.0, value: 0.75, ease: "sine.inOut" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_structural_bg_radial_scanner",
    name: "Radial Glow Scanner",
    family: "structural",
    compatibleArchetypes: ["background"],
    description: "Ambient radial gradient hotspot sweeping horizontally across container.",
    badge: "Ambient",
    engine: "gsap",
    tags: ["radial", "glow", "scanner", "ambient"],
    animation: {
      name: "Radial Glow Scanner",
      type: "loop",
      trigger: "ambient",
      duration: 8.0,
      repeat: -1,
      easing: "sine.inOut",
      enabled: true,
      tracks: [
        {
          property: "transform.translateX",
          keyframes: [
            { time: 0, value: -20, ease: "sine.inOut" },
            { time: 4.0, value: 20, ease: "sine.inOut" },
            { time: 8.0, value: -20, ease: "sine.inOut" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_structural_bg_mesh_flow",
    name: "Subtle Mesh Flow",
    family: "structural",
    compatibleArchetypes: ["background"],
    description: "Slow 20-second conic mesh rotation driving rich, velvety background movement.",
    badge: "Ambient",
    engine: "gsap",
    tags: ["mesh", "conic", "flow", "rotation", "loop"],
    animation: {
      name: "Subtle Mesh Flow",
      type: "loop",
      trigger: "ambient",
      duration: 20.0,
      repeat: -1,
      easing: "linear",
      enabled: true,
      tracks: [
        {
          property: "background.gradient.angle",
          keyframes: [
            { time: 0, value: 0, ease: "linear" },
            { time: 20.0, value: 360, ease: "linear" },
          ],
        },
      ],
    },
  },
];
