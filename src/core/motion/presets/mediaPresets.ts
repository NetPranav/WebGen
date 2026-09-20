"use client";

/**
 * ============================================================================
 * MEDIA FAMILY PRESETS (13 PRESETS)
 * ============================================================================
 * Production motion presets for Image and Icon (SVG) archetypes.
 * Covers Ken Burns loops, clip-path reveals, SVG stroke draw, and filter transforms.
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.3 & PRD.md §5.2
 * ============================================================================
 */

import { MotionPreset } from "./types";

export const MEDIA_PRESETS: MotionPreset[] = [
  {
    id: "preset_media_ken_burns_zoom",
    name: "Ken Burns Subtle Zoom",
    family: "media",
    compatibleArchetypes: ["image"],
    description: "Cinematic slow zoom from 1.0 to 1.14 scale with gentle focal point drift over 8 seconds.",
    badge: "Ambient",
    engine: "gsap",
    tags: ["ken-burns", "zoom", "image", "cinematic", "ambient"],
    animation: {
      name: "Ken Burns Subtle Zoom",
      type: "loop",
      trigger: "ambient",
      duration: 8.0,
      repeat: -1,
      easing: "sine.inOut",
      enabled: true,
      tracks: [
        {
          property: "transform.scale",
          keyframes: [
            { time: 0, value: 1.0, ease: "sine.inOut" },
            { time: 4.0, value: 1.14, ease: "sine.inOut" },
            { time: 8.0, value: 1.0, ease: "sine.inOut" },
          ],
        },
        {
          property: "media.focalPoint.x",
          keyframes: [
            { time: 0, value: 50, ease: "sine.inOut" },
            { time: 4.0, value: 54, ease: "sine.inOut" },
            { time: 8.0, value: 50, ease: "sine.inOut" },
          ],
        },
        {
          property: "media.focalPoint.y",
          keyframes: [
            { time: 0, value: 50, ease: "sine.inOut" },
            { time: 4.0, value: 46, ease: "sine.inOut" },
            { time: 8.0, value: 50, ease: "sine.inOut" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_media_ken_burns_pan",
    name: "Ken Burns Pan & Drift",
    family: "media",
    compatibleArchetypes: ["image"],
    description: "Deep documentary pan and drift diagonally across high-resolution hero imagery.",
    badge: "Ambient",
    engine: "gsap",
    tags: ["ken-burns", "pan", "drift", "image"],
    animation: {
      name: "Ken Burns Pan & Drift",
      type: "loop",
      trigger: "ambient",
      duration: 10.0,
      repeat: -1,
      easing: "power1.inOut",
      enabled: true,
      tracks: [
        {
          property: "transform.scale",
          keyframes: [
            { time: 0, value: 1.15, ease: "linear" },
            { time: 5.0, value: 1.22, ease: "power1.inOut" },
            { time: 10.0, value: 1.15, ease: "power1.inOut" },
          ],
        },
        {
          property: "transform.translateX",
          keyframes: [
            { time: 0, value: -12, ease: "power1.inOut" },
            { time: 5.0, value: 12, ease: "power1.inOut" },
            { time: 10.0, value: -12, ease: "power1.inOut" },
          ],
        },
        {
          property: "transform.translateY",
          keyframes: [
            { time: 0, value: -8, ease: "power1.inOut" },
            { time: 5.0, value: 8, ease: "power1.inOut" },
            { time: 10.0, value: -8, ease: "power1.inOut" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_media_clip_circle",
    name: "Clip-Path Circle Reveal",
    family: "media",
    compatibleArchetypes: ["image"],
    description: "Expands radial circular clip-path reveal outward from center focal point upon mount.",
    badge: "ClipPath",
    engine: "gsap",
    tags: ["clip-path", "circle", "reveal", "entrance"],
    animation: {
      name: "Clip-Path Circle Reveal",
      type: "entrance",
      trigger: "onMount",
      duration: 0.9,
      easing: "power3.out",
      enabled: true,
      tracks: [
        {
          property: "media.clipPath",
          keyframes: [
            { time: 0, value: "circle(0% at 50% 50%)", ease: "power3.out" },
            { time: 0.9, value: "circle(100% at 50% 50%)", ease: "power3.out" },
          ],
        },
        {
          property: "transform.scale",
          keyframes: [
            { time: 0, value: 1.12, ease: "power2.out" },
            { time: 0.9, value: 1.0, ease: "power2.out" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_media_clip_diamond",
    name: "Clip-Path Diamond Reveal",
    family: "media",
    compatibleArchetypes: ["image"],
    description: "Geometric diamond polygon reveal wiping outward into full rectangular frame.",
    badge: "ClipPath",
    engine: "gsap",
    tags: ["clip-path", "diamond", "polygon", "reveal"],
    animation: {
      name: "Clip-Path Diamond Reveal",
      type: "entrance",
      trigger: "onMount",
      duration: 0.85,
      easing: "power4.inOut",
      enabled: true,
      tracks: [
        {
          property: "media.clipPath",
          keyframes: [
            { time: 0, value: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)", ease: "power4.inOut" },
            { time: 0.85, value: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)", ease: "power4.inOut" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_media_clip_angle",
    name: "Clip-Path 45° Angle Wipe",
    family: "media",
    compatibleArchetypes: ["image"],
    description: "Angular diagonal cut wipe sweeping across the image canvas.",
    badge: "ClipPath",
    engine: "gsap",
    tags: ["clip-path", "angle", "wipe", "diagonal"],
    animation: {
      name: "Clip-Path Angle Wipe",
      type: "entrance",
      trigger: "onMount",
      duration: 0.75,
      easing: "power2.inOut",
      enabled: true,
      tracks: [
        {
          property: "media.clipPath",
          keyframes: [
            { time: 0, value: "polygon(0 0, 0 0, 0 100%, 0 100%)", ease: "power2.inOut" },
            { time: 0.75, value: "polygon(0 0, 100% 0, 100% 100%, 0 100%)", ease: "power2.inOut" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_media_grayscale_color",
    name: "Grayscale to Color Saturate",
    family: "media",
    compatibleArchetypes: ["image"],
    description: "Desaturates to pure monochrome at rest and springs into vivid full color on hover.",
    badge: "Hover",
    engine: "gsap",
    tags: ["grayscale", "filter", "saturate", "hover", "color"],
    animation: {
      name: "Grayscale to Color",
      type: "hover",
      trigger: "onHover",
      duration: 0.45,
      easing: "power2.out",
      enabled: true,
      tracks: [
        {
          property: "media.filter.grayscale",
          keyframes: [
            { time: 0, value: 1, ease: "power2.out" },
            { time: 0.45, value: 0, ease: "power2.out" },
          ],
        },
        {
          property: "transform.scale",
          keyframes: [
            { time: 0, value: 1.0, ease: "power2.out" },
            { time: 0.45, value: 1.04, ease: "power2.out" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_media_cinematic_blur",
    name: "Cinematic Blur-Up Reveal",
    family: "media",
    compatibleArchetypes: ["image"],
    description: "Camera lens focus simulation transitioning from 16px soft blur down to crisp sharpness.",
    badge: "Mount",
    engine: "gsap",
    tags: ["blur", "filter", "lens", "cinematic", "entrance"],
    animation: {
      name: "Cinematic Blur-Up",
      type: "entrance",
      trigger: "onMount",
      duration: 1.1,
      easing: "power2.out",
      enabled: true,
      tracks: [
        {
          property: "filter.blur",
          keyframes: [
            { time: 0, value: 16, ease: "power2.out" },
            { time: 1.1, value: 0, ease: "power2.out" },
          ],
        },
        {
          property: "transform.scale",
          keyframes: [
            { time: 0, value: 1.08, ease: "power2.out" },
            { time: 1.1, value: 1.0, ease: "power2.out" },
          ],
        },
        {
          property: "appearance.opacity",
          keyframes: [
            { time: 0, value: 0.4, ease: "power1.out" },
            { time: 1.1, value: 1.0, ease: "power1.out" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_media_hover_zoom_darken",
    name: "Hover Zoom & Darken Overlay",
    family: "media",
    compatibleArchetypes: ["image"],
    description: "Premium editorial card hover zooming 1.07x and deepening ambient contrast overlay.",
    badge: "Hover",
    engine: "gsap",
    tags: ["hover", "zoom", "darken", "overlay", "card"],
    animation: {
      name: "Hover Zoom & Darken",
      type: "hover",
      trigger: "onHover",
      duration: 0.4,
      easing: "power2.out",
      enabled: true,
      tracks: [
        {
          property: "transform.scale",
          keyframes: [
            { time: 0, value: 1.0, ease: "power2.out" },
            { time: 0.4, value: 1.07, ease: "power2.out" },
          ],
        },
        {
          property: "media.overlay.opacity",
          keyframes: [
            { time: 0, value: 0, ease: "power2.out" },
            { time: 0.4, value: 0.35, ease: "power2.out" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_media_tilt_perspective",
    name: "3D Tilt Perspective",
    family: "media",
    compatibleArchetypes: ["image", "icon"],
    description: "Subtle 3D spatial rotation on X and Y axes creating Apple TV style depth.",
    badge: "Spring",
    engine: "framer-motion",
    tags: ["3d", "tilt", "perspective", "spatial"],
    animation: {
      name: "3D Tilt Perspective",
      type: "hover",
      trigger: "onHover",
      duration: 0.5,
      easing: "spring(stiffness: 300, damping: 20)",
      enabled: true,
      tracks: [
        {
          property: "transform.rotateX",
          keyframes: [
            { time: 0, value: 0, ease: "spring(stiffness: 300, damping: 20)" },
            { time: 0.5, value: 6, ease: "spring(stiffness: 300, damping: 20)" },
          ],
        },
        {
          property: "transform.rotateY",
          keyframes: [
            { time: 0, value: 0, ease: "spring(stiffness: 300, damping: 20)" },
            { time: 0.5, value: -6, ease: "spring(stiffness: 300, damping: 20)" },
          ],
        },
        {
          property: "transform.scale",
          keyframes: [
            { time: 0, value: 1.0, ease: "spring(stiffness: 300, damping: 20)" },
            { time: 0.5, value: 1.05, ease: "spring(stiffness: 300, damping: 20)" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_media_svg_stroke_draw",
    name: "SVG Vector Path Draw-In",
    family: "media",
    compatibleArchetypes: ["icon"],
    description: "Smooth vector stroke-dashoffset animation rendering lines from start to completion.",
    badge: "Vector",
    engine: "svg-runtime",
    tags: ["svg", "stroke", "draw", "vector", "icon"],
    animation: {
      name: "SVG Stroke Draw-In",
      type: "entrance",
      trigger: "onMount",
      duration: 1.4,
      easing: "power2.inOut",
      enabled: true,
      tracks: [
        {
          property: "svg.strokeDashoffset",
          keyframes: [
            { time: 0, value: 1000, ease: "power2.inOut" },
            { time: 1.4, value: 0, ease: "power2.inOut" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_media_svg_morph",
    name: "SVG Morph Pulsar",
    family: "media",
    compatibleArchetypes: ["icon"],
    description: "Fluid vector shape morphing between circle and star polygon outlines.",
    badge: "Vector",
    engine: "svg-runtime",
    tags: ["svg", "morph", "path", "vector"],
    animation: {
      name: "SVG Morph Pulsar",
      type: "loop",
      trigger: "ambient",
      duration: 2.0,
      repeat: -1,
      easing: "sine.inOut",
      enabled: true,
      tracks: [
        {
          property: "svg.path",
          keyframes: [
            { time: 0, value: "M 50 10 A 40 40 0 1 0 50 90 A 40 40 0 1 0 50 10 Z", ease: "sine.inOut" },
            { time: 1.0, value: "M 50 5 L 63 35 L 95 38 L 71 60 L 78 92 L 50 75 L 22 92 L 29 60 L 5 38 L 37 35 Z", ease: "sine.inOut" },
            { time: 2.0, value: "M 50 10 A 40 40 0 1 0 50 90 A 40 40 0 1 0 50 10 Z", ease: "sine.inOut" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_media_vignette_shadow",
    name: "Vignette Shadow Pull",
    family: "media",
    compatibleArchetypes: ["image"],
    description: "Deepens border corner shadows and contrast when hovered.",
    badge: "Hover",
    engine: "gsap",
    tags: ["vignette", "shadow", "hover"],
    animation: {
      name: "Vignette Shadow Pull",
      type: "hover",
      trigger: "onHover",
      duration: 0.35,
      easing: "power2.out",
      enabled: true,
      tracks: [
        {
          property: "media.filter.contrast",
          keyframes: [
            { time: 0, value: 1.0, ease: "power2.out" },
            { time: 0.35, value: 1.15, ease: "power2.out" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_media_glitch_displacement",
    name: "Glitch Displacement Shutter",
    family: "media",
    compatibleArchetypes: ["image"],
    description: "High-energy cyberpunk RGB shift and displacement pulse.",
    badge: "Gesture",
    engine: "gsap",
    tags: ["glitch", "cyberpunk", "displacement", "shutter"],
    animation: {
      name: "Glitch Displacement Shutter",
      type: "tap",
      trigger: "onClick",
      duration: 0.25,
      easing: "linear",
      enabled: true,
      tracks: [
        {
          property: "transform.translateX",
          keyframes: [
            { time: 0, value: 0, ease: "linear" },
            { time: 0.05, value: -6, ease: "linear" },
            { time: 0.1, value: 6, ease: "linear" },
            { time: 0.15, value: -3, ease: "linear" },
            { time: 0.2, value: 2, ease: "linear" },
            { time: 0.25, value: 0, ease: "linear" },
          ],
        },
        {
          property: "media.filter.contrast",
          keyframes: [
            { time: 0, value: 1.0, ease: "linear" },
            { time: 0.1, value: 1.6, ease: "linear" },
            { time: 0.25, value: 1.0, ease: "linear" },
          ],
        },
      ],
    },
  },
];
