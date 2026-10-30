# Competitive Analysis

**Date:** 2026-10-30
**Based on:** the PRD (v2.4), the roadmap, the code on `main` and `a/figcraft-port`, and web research (sources at the end).
Competitor facts change quickly; check prices and feature status on each vendor's own site before quoting them.

---

## 1. The selling point in one line

> **Rive-level interactivity, but it ships as your website's own code.**

In full: interactive motion and its logic, designed on a canvas, exported as plain web code you own (real HTML, CSS and
React, with no vendor runtime), and checked pixel by pixel against what you saw in the editor.

Everything in that sentence beyond static design export is still on the roadmap (§2). The point that sets us apart
starts in Stage 2 (motion export, Phases 94–97) and Stage 3 (reactive effects and Blueprints, Phases 103+).

## 2. What we are: today vs. planned

| Area | Today (on `main` or `a/figcraft-port`) | Planned |
|---|---|---|
| Design canvas | Frames, shapes, pen, text, selection, handles, snapping, Layers panel, Simple/Pro inspector, paint, images, fonts (Phases 20–38). The FigCraft port adds vector networks, strokes, Dev Mode and components | Auto-layout, breakpoints, variants, pages (41–48) |
| Code export | **Static** export to HTML, Vite+React and Next.js. Components become typed React components with props (`src/core/export/site/`) | Motion export (94–97). Interactive-effect export with a small runtime copied into the user's project (Stage 3) |
| Animation | Clock, scheduler, WAAPI adapter, parity overlay, timeline layout and navigation (Lane B at Phase 63) | Keyframes, graph editor, states, scroll, text and SVG motion (66–93) |
| Interactive effects | None | Cursor- and scroll-reactive backgrounds, particles, fields, physics, Blueprints (103–147) |
| AI | Offline parsers only | Prompt to design, co-pilot, MCP (50, 168+) |
| Foundations | One document model, a rules engine, a deterministic `evaluate()` kernel, a pixel-parity harness | — |

Today "we give the full component's code" is true for static design only, not for animation.

## 3. Rive: the right comparison

Rive does not export code or elements. It ships a `.riv` binary file, which a WASM runtime draws onto a `<canvas>`.

| | Rive | LazyLayout (as designed) |
|---|---|---|
| Output | A `.riv` file plus Rive's runtime | Plain DOM, CSS, React or Vue source in your repo |
| Shipped weight (web) | About 222 KB compressed for canvas-lite, about 261 KB brotli for the full runtime with text (Rive docs) | CSS/WAAPI routes ship 0 KB of library; other routes ship only what they need (`motion`, `three`) |
| Text | Drawn on a canvas, so not natively selectable or indexable. Rive adds a separate accessibility layer ("semantics") | Real DOM text: selectable, readable by search engines and screen readers |
| Editing the result | Only by going back to the Rive editor | It's ordinary readable code |
| Logic | State machines, data binding, Luau scripting | Simple "When → Do" rules plus Blueprint graphs, compiled to plain hooks or listeners |

**Where Rive wins, and will keep winning:**
- character rigging: bones, meshes, inverse kinematics, constraints;
- native runtimes for iOS, Android, Flutter, Unity and Unreal;
- GPU rendering of heavy vector animation;
- files 10–15× smaller than Lottie;
- years of polish, plus its own agent and CLI.

Don't compete for game UI, app mascots or mobile. **Rive is for animated graphics inside apps. LazyLayout is for
animated, interactive web interfaces that become the site's own code.** Rive's own "Rive vs HTML" page says to use HTML
for standard UI, which is our ground.

## 4. Speed

There is no benchmark yet, so don't claim "faster".
- **Character or illustration animation:** Rive's GPU renderer will probably beat DOM rendering.
- **UI motion** (hovers, reveals, scroll, layout transitions): our CSS/WAAPI routes run on the compositor thread with
  no JavaScript. That is likely lighter on page load than a 200 KB+ WASM runtime, but it must be measured.

The defensible claim is "it's hard to make a slow animation in LazyLayout". The rules engine blocks animations that
force a layout recalculation every frame. It also gives every effect a performance budget and a fallback for weak
devices.

## 5. The competitors

| Competitor | What it is | Its weakness, where we win |
|---|---|---|
| **Figma Motion** (Config, June 2026): **the biggest threat** | A timeline inside Figma Design. Copies CSS/JSON/React from Dev Mode. Exports MP4, GIF and animated SVG. AI shaders | No documented states, triggers, scroll or cursor reactivity in exported code. Interactive shaders are "coming". Figma calls its canvas code "for exploration", not production. No logic layer |
| **Webflow** (IX3 on GSAP) | Visual GSAP timelines, free GSAP, DevLink exports React | Tied to Webflow hosting and Webflow's GSAP bundle. Interactions are timelines, not reactive systems |
| **Framer** | A site builder using Motion | Hosted on Framer. Getting code out needs third-party plugins, and page transitions don't survive |
| **Unicorn Studio / Spline** | No-code WebGL effects and 3D, embedded on your site | Embeds with a runtime (Unicorn about 29 KB). The effect is an island: it can't drive or be driven by the rest of the UI. Code export only on top tiers |
| **Jitter / Lottie Creator** | Linear motion for video or Lottie. Lottie now has state machines and MCP | Output is a Lottie file, not a UI. No DOM, no layout |
| **Motion Studio** (motion.dev) | A timeline editor plus the "Ultramotion" agent, which writes animations into your existing code | No design canvas. No scroll editing or CSS/WAAPI yet. Requires the `motion` library. A dev tool, not a design tool |
| **React Bits and similar** | 130+ copy-paste animated components | Not visually editable, no timeline, no logic, and you harden them for production yourself (the gap in PRD §5.4) |

**The gap nobody fills:** a design canvas, interactive and reactive motion, logic, code you own, and proof that the
export matches the editor. Each competitor covers two or three of these; none covers all five.

## 6. Not differentiators

- **"AI-native."** Rive, Lottie, Figma and Motion all have agents or MCP. AI is expected now.
- **"We export code."** Figma Motion and Webflow DevLink do too. It stands out only together with *interactive*
  motion and *no runtime*.
- **"Figma-level design depth."** Figma will always be deeper. Parity makes the editor credible; it doesn't make people
  switch.
- **"A big effects library."** React Bits gives that away free.

## 7. What sets us apart, ranked by how hard it is to copy

1. **Interactive motion compiles to plain code with no runtime from us.** "Letters flee the cursor and spring home"
   becomes readable React hooks or vanilla listeners in the user's repo. Rive, Unicorn and Spline need their runtime;
   Figma can't express it.
2. **Pixel-verified export (Law 3: Preview = Export).** CI renders the export headlessly and compares it with the
   editor to within 1%. No competitor promises this. It answers "tool-generated code is garbage", and it's hard to
   copy because it depends on the deterministic kernel.
3. **Building interactions from primitives** (helpers, pins, splits, fields, colliders, Blueprints), with no maths
   required.
4. **A rules engine that makes broken or slow animation hard to create**, including generated reduced-motion
   variants, touch behaviours and fallbacks.
5. **Accessible and indexable by default**, because the text is real DOM.

## 8. Risks

- **Time to the wedge.** Points 1–4 live in Phases 94–147. Lane B is around 63 and Lane A around 49. Figma shipped
  Motion in June 2026 and has announced interactive shaders. The window is real but closing.
- **Scope.** Each week spent on Figma parity (e.g. the FigCraft port) is a week not spent on §7. Cap parity at "good
  enough to design a hero section", then push toward motion export and the first reactive effect.
- **GSAP.** GSAP is free now, but its licence still forbids use in visual builders that compete with Webflow. That
  covers us, so GSAP stays an opt-in export target only (`DOCS/INITIAL/LICENSES.md` GATE-01).

## 9. How to prove it

Build the PRD's reference piece ("letters flee an invisible cursor circle, then spring home") in Rive, Figma Motion,
Webflow and Unicorn Studio, and in LazyLayout once Stage 3 lands. For each, record:

| Question | Rive | Figma Motion | Webflow | Unicorn Studio | LazyLayout |
|---|---|---|---|---|---|
| Can it be built? In how many minutes? | | | | | |
| Output: code, or a file plus a runtime? | | | | | |
| KB shipped | | | | | |
| Text in the DOM (selectable, screen reader)? | | | | | |
| Can a developer change it without the tool? | | | | | |

If LazyLayout wins four or five rows, this table is the landing page.

---

## Sources

- Rive: [features](https://rive.app/features) · [runtime sizes](https://rive.app/docs/runtimes/runtime-sizes) ·
  [v1→v2 migration](https://rive.app/docs/runtimes/web/migrating-from-v1-to-v2) ·
  [Rive vs HTML](https://rive.app/rive-vs-html) · [Rive vs Lottie](https://rive.app/blog/rive-as-a-lottie-alternative) ·
  [exporting for runtime](https://rive.app/docs/editor/exporting/exporting-for-runtime.md) ·
  [feature support](https://rive.app/docs/feature-support)
- Figma Config 2026: [uwarp recap](https://www.uwarp.design/blog/figma-config-2026-recap-code-motion-agent) ·
  [dragdropship](https://dragdropship.com/blog/figma-config-2026-what-it-actually-means-for-no-code-and-the-web) ·
  [CMSWire](https://www.cmswire.com/digital-experience/figma-launches-code-layers-motion-at-config-2026/) ·
  [Motion docs: Figma](https://motion.dev/docs/figma)
- Motion Studio: [studio](https://motion.dev/studio) · [docs](https://motion.dev/docs/studio)
- Webflow: [Interactions with GSAP](https://webflow.com/blog/webflow-interactions-with-gsap) ·
  [DevLink changelog](https://developers.webflow.com/home/changelog/2026/5/21.md)
- Framer: [Unframer limitations](https://unframer.co/troubleshooting) ·
  [BrowserCat](https://www.browsercat.com/post/migrate-framer-to-code)
- Unicorn Studio: [docs](https://unicorn.studio/docs)
- Lottie / Jitter: [Lottie Creator state machines](https://lottiefiles.com/blog/state-machines/state-machines-are-finally-in-lottie-creator) ·
  [Jitter](https://jitter.video/product/)
- Spline: [pricing review](https://frontdeskreview.com/software/design-tools/spline/)
- React Bits: [wiki](https://github.com/DavidHDev/react-bits/wiki)
- [PkgPulse: Lottie vs Rive vs CSS (2026)](https://www.pkgpulse.com/guides/lottie-vs-rive-vs-css-animations-web-animation-formats-2026)
