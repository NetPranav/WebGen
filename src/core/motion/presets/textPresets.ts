"use client";

/**
 * ============================================================================
 * TEXT FAMILY PRESETS (12 PRESETS)
 * ============================================================================
 * Production motion presets for Text, Heading, Label, and Text Link archetypes.
 * Covers SplitText word/character staggers, kinetic tracking, blur reveals, and editorial fades.
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.3 & PRD.md §5.4
 * ============================================================================
 */

import { MotionPreset } from "./types";

export const TEXT_PRESETS: MotionPreset[] = [
  {
    id: "preset_text_word_stagger",
    name: "Word Stagger Cascade",
    family: "text",
    compatibleArchetypes: ["text"],
    description: "GSAP SplitText word-by-word upward cascading fade reveal with 0.05s stagger delay.",
    badge: "SplitText",
    engine: "gsap",
    tags: ["splittext", "words", "stagger", "cascade", "entrance"],
    animation: {
      name: "Word Stagger Cascade",
      type: "entrance",
      trigger: "mount",
      duration: 0.8,
      easing: "power3.out",
      enabled: true,
      stagger: {
        amount: 0.35,
        from: "start",
      },
      tracks: [
        {
          property: "transform.translateY",
          keyframes: [
            { time: 0, value: 20, ease: "power3.out" },
            { time: 0.8, value: 0, ease: "power3.out" },
          ],
        },
        {
          property: "appearance.opacity",
          keyframes: [
            { time: 0, value: 0, ease: "linear" },
            { time: 0.4, value: 1.0, ease: "linear" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_text_char_pop",
    name: "Character Stagger Pop",
    family: "text",
    compatibleArchetypes: ["text"],
    description: "Playful char-by-char scale pop entrance with bouncy spring overshoot.",
    badge: "SplitText",
    engine: "gsap",
    tags: ["splittext", "characters", "pop", "bounce", "entrance"],
    animation: {
      name: "Character Stagger Pop",
      type: "entrance",
      trigger: "mount",
      duration: 0.6,
      easing: "back.out(2)",
      enabled: true,
      stagger: {
        amount: 0.4,
        from: "start",
      },
      tracks: [
        {
          property: "transform.scale",
          keyframes: [
            { time: 0, value: 0.3, ease: "back.out(2)" },
            { time: 0.6, value: 1.0, ease: "back.out(2)" },
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
    id: "preset_text_blur_reveal",
    name: "Blur-Up Line Reveal",
    family: "text",
    compatibleArchetypes: ["text"],
    description: "Atmospheric lens focus transition sharpening blurred typography into crisp readability.",
    badge: "Mount",
    engine: "gsap",
    tags: ["blur", "reveal", "focus", "entrance", "editorial"],
    animation: {
      name: "Blur-Up Line Reveal",
      type: "entrance",
      trigger: "mount",
      duration: 1.0,
      easing: "power2.out",
      enabled: true,
      tracks: [
        {
          property: "filter.blur",
          keyframes: [
            { time: 0, value: 12, ease: "power2.out" },
            { time: 1.0, value: 0, ease: "power2.out" },
          ],
        },
        {
          property: "transform.translateY",
          keyframes: [
            { time: 0, value: 14, ease: "power2.out" },
            { time: 1.0, value: 0, ease: "power2.out" },
          ],
        },
        {
          property: "appearance.opacity",
          keyframes: [
            { time: 0, value: 0, ease: "linear" },
            { time: 0.5, value: 1.0, ease: "linear" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_text_kinetic_tracking",
    name: "Kinetic Type Tracking",
    family: "text",
    compatibleArchetypes: ["text"],
    description: "Expands letter-spacing dramatically from 0.3em wide tracking down to refined baseline.",
    badge: "Mount",
    engine: "gsap",
    tags: ["letter-spacing", "tracking", "kinetic", "typography"],
    animation: {
      name: "Kinetic Type Tracking",
      type: "entrance",
      trigger: "mount",
      duration: 1.2,
      easing: "power4.out",
      enabled: true,
      tracks: [
        {
          property: "typography.letterSpacing",
          keyframes: [
            { time: 0, value: "0.25em", ease: "power4.out" },
            { time: 1.2, value: "0.02em", ease: "power4.out" },
          ],
        },
        {
          property: "appearance.opacity",
          keyframes: [
            { time: 0, value: 0, ease: "linear" },
            { time: 0.4, value: 1.0, ease: "linear" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_text_underline_draw",
    name: "Underline Draw-In",
    family: "text",
    compatibleArchetypes: ["text"],
    description: "Draws decorative text underline from 0% to 100% width upon mount or hover.",
    badge: "Mount",
    engine: "gsap",
    tags: ["underline", "draw", "line", "link"],
    animation: {
      name: "Underline Draw-In",
      type: "entrance",
      trigger: "mount",
      duration: 0.65,
      easing: "power2.out",
      enabled: true,
      tracks: [
        {
          property: "transform.scaleX",
          keyframes: [
            { time: 0, value: 0, ease: "power2.out" },
            { time: 0.65, value: 1.0, ease: "power2.out" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_text_highlighter_sweep",
    name: "Highlighter Marker Sweep",
    family: "text",
    compatibleArchetypes: ["text"],
    description: "Fluorescent marker highlight expanding beneath words like an editorial pen stroke.",
    badge: "Mount",
    engine: "gsap",
    tags: ["highlighter", "marker", "sweep", "editorial"],
    animation: {
      name: "Highlighter Marker Sweep",
      type: "entrance",
      trigger: "mount",
      duration: 0.75,
      easing: "power3.out",
      enabled: true,
      tracks: [
        {
          property: "appearance.opacity",
          keyframes: [
            { time: 0, value: 0.2, ease: "power3.out" },
            { time: 0.75, value: 1.0, ease: "power3.out" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_text_typewriter_step",
    name: "Typewriter Cursor Step",
    family: "text",
    compatibleArchetypes: ["text"],
    description: "Simulated terminal typewriter reveal with stepped timing function.",
    badge: "Mount",
    engine: "gsap",
    tags: ["typewriter", "terminal", "stepped", "code"],
    animation: {
      name: "Typewriter Cursor Step",
      type: "entrance",
      trigger: "mount",
      duration: 1.8,
      easing: "steps(20)",
      enabled: true,
      tracks: [
        {
          property: "appearance.opacity",
          keyframes: [
            { time: 0, value: 0, ease: "linear" },
            { time: 0.1, value: 1.0, ease: "linear" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_text_bounce_wave",
    name: "Bounce Stagger Wave",
    family: "text",
    compatibleArchetypes: ["text"],
    description: "Sinusoidal wave bounce rippling across heading text.",
    badge: "SplitText",
    engine: "gsap",
    tags: ["bounce", "wave", "stagger", "sine"],
    animation: {
      name: "Bounce Stagger Wave",
      type: "entrance",
      trigger: "mount",
      duration: 1.1,
      easing: "back.out(2.5)",
      enabled: true,
      stagger: {
        amount: 0.45,
        from: "start",
      },
      tracks: [
        {
          property: "transform.translateY",
          keyframes: [
            { time: 0, value: 24, ease: "back.out(2.5)" },
            { time: 1.1, value: 0, ease: "back.out(2.5)" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_text_gradient_sheen",
    name: "Gradient Text Sheen",
    family: "text",
    compatibleArchetypes: ["text"],
    description: "Luminous metallic sheen sliding continuously across typographic surface.",
    badge: "Ambient",
    engine: "gsap",
    tags: ["gradient", "sheen", "metallic", "ambient", "loop"],
    animation: {
      name: "Gradient Text Sheen",
      type: "loop",
      trigger: "time",
      duration: 3.5,
      repeat: -1,
      easing: "linear",
      enabled: true,
      tracks: [
        {
          property: "appearance.opacity",
          keyframes: [
            { time: 0, value: 0.9, ease: "linear" },
            { time: 1.75, value: 1.0, ease: "linear" },
            { time: 3.5, value: 0.9, ease: "linear" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_text_split_3d_flip",
    name: "Split 3D Flip Stagger",
    family: "text",
    compatibleArchetypes: ["text"],
    description: "Airport departure board 3D flip rotation from -90deg to 0deg.",
    badge: "SplitText",
    engine: "gsap",
    tags: ["3d", "flip", "departure", "stagger", "entrance"],
    animation: {
      name: "Split 3D Flip Stagger",
      type: "entrance",
      trigger: "mount",
      duration: 0.9,
      easing: "power3.out",
      enabled: true,
      stagger: {
        amount: 0.4,
        from: "start",
      },
      tracks: [
        {
          property: "transform.rotateX",
          keyframes: [
            { time: 0, value: -90, ease: "power3.out" },
            { time: 0.9, value: 0, ease: "power3.out" },
          ],
        },
        {
          property: "appearance.opacity",
          keyframes: [
            { time: 0, value: 0, ease: "linear" },
            { time: 0.3, value: 1.0, ease: "linear" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_text_glitch_chromatic",
    name: "Glitch Chromatic Aberration",
    family: "text",
    compatibleArchetypes: ["text"],
    description: "Cyberpunk text jitter with cyan and red micro-displacement.",
    badge: "Gesture",
    engine: "gsap",
    tags: ["glitch", "chromatic", "cyberpunk", "jitter"],
    animation: {
      name: "Glitch Chromatic Aberration",
      type: "tap",
      trigger: "press",
      duration: 0.3,
      easing: "linear",
      enabled: true,
      tracks: [
        {
          property: "transform.translateX",
          keyframes: [
            { time: 0, value: 0, ease: "linear" },
            { time: 0.06, value: -3, ease: "linear" },
            { time: 0.12, value: 4, ease: "linear" },
            { time: 0.18, value: -2, ease: "linear" },
            { time: 0.24, value: 1, ease: "linear" },
            { time: 0.3, value: 0, ease: "linear" },
          ],
        },
      ],
    },
  },
  {
    id: "preset_text_fade_editorial",
    name: "Fade-Up Editorial Reveal",
    family: "text",
    compatibleArchetypes: ["text"],
    description: "Clean, understated NYT/Vogue editorial entrance easing up 24px into viewport.",
    badge: "Mount",
    engine: "gsap",
    tags: ["editorial", "fade", "clean", "entrance"],
    animation: {
      name: "Fade-Up Editorial Reveal",
      type: "entrance",
      trigger: "mount",
      duration: 0.85,
      easing: "power2.out",
      enabled: true,
      tracks: [
        {
          property: "transform.translateY",
          keyframes: [
            { time: 0, value: 24, ease: "power2.out" },
            { time: 0.85, value: 0, ease: "power2.out" },
          ],
        },
        {
          property: "appearance.opacity",
          keyframes: [
            { time: 0, value: 0, ease: "power1.out" },
            { time: 0.5, value: 1.0, ease: "power1.out" },
          ],
        },
      ],
    },
  },
];
