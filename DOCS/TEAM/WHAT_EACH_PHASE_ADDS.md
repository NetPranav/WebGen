# What each Lane A phase adds (what you'll see in the editor)

✅ = on `main`. 🚧 = built on a branch/PR but not merged or not gate-passed yet, so it may not show on `main`.

| # | Phase | You'll see |
|---|---|---|
| 13 | Command bus | Edit/File menus and toolbar undo, redo, save work like their shortcuts. ✅ |
| 14 | Workspace & panels | The panel layout you arrange survives a reload. ✅ |
| 15 | Design / Animate / Code presets | One click switches between a Figma-like and an After Effects-like layout. ✅ |
| 16 | Threat model | Nothing visible; a safety document. ✅ |
| 17 | Render definitions | Every element type is drawn the new way (render gallery). ✅ |
| 18 | Stage host v2 | The canvas is live DOM frames; editing a property doesn't reload the stage. ✅ |
| 19 | Incremental updates | A 500-layer document stays smooth while editing. ✅ |
| 20 | Viewport camera | Smooth pan and zoom around your frames. 🚧 |
| 21 | Multi-frame canvas | Desktop, Tablet and Mobile frames side by side. 🚧 |
| 22 | Hit-testing | Hovering shows the layer a click would select. 🚧 |
| 23 | Overlay & Preview mode | Hover outlines; a Preview button makes the page clickable. 🚧 |
| 24 | Tool state machine | Every dock button works or isn't there; H/V/R/O/T shortcuts. 🚧 |
| 25 | Creation tools | Draw frames, shapes and text boxes. 🚧 |
| 26 | Selection | Click, Shift-click, marquee; selection is in sync everywhere. 🚧 |
| 27 | Transform handles | Move, resize and rotate with Figma-style handles. 🚧 |
| 28 | Snapping & guides | Smart guides, spacing labels and rulers while you drag. 🚧 |
| 29 | Editing operations | Copy, paste, duplicate, group, delete and the Figma keyboard flow. 🚧 |
| 30 | Align & distribute | Align/distribute buttons and spacing handles on the canvas. 🚧 |
| 31 | Text on the canvas | Type directly on the canvas, with styled runs. 🚧 |
| 32 | Layers panel | A Figma-like layer tree in sync with the canvas. 🚧 |
| 33 | Inspector: Simple | Edit position, size or fill and the canvas updates live. 🚧 |
| 34 | Inspector: Pro | A Pro switch showing every property. 🚧 |
| 35 | Paint | Colours, gradients (with handles), strokes, shadows, blur. 🚧 |
| 36 | Asset store | An Assets panel; drop an image file onto the canvas. 🚧 |
| 37 | Image layers | Pictures as fills with fill/fit/crop/tile and drag-to-crop. 🚧 |
| 38 | Fonts | Any Google font or your own font file. 🚧 |
| 39 | Pen & pencil | Draw vector paths with the Pen (P) and Pencil (Shift+P). 🚧 |
| 40 | Vector editing & booleans | Reshape any path point by point; union/subtract/intersect. |
| 41 | Auto-layout stacks | Cards and buttons that resize to their content (Shift+A). |
| 42 | Grid & constraints | Resizing a frame moves/stretches children as you set. |
| 43 | Breakpoints & overrides | A breakpoint bar; Mobile edits don't touch Desktop. |
| 44 | Breakpoint canvas | Desktop/Tablet/Mobile versions update together. |
| 45 | Design tokens & styles | Change one colour style and everything updates; dark mode. |
| 46 | Components & instances | Edit the main component and all instances follow. |
| 47 | Variants & properties | A button with Size and Tone dropdowns. |
| 48 | Sections & pages | A multi-page site you can click through in Preview. |
| 49 | Static export v1 | Export → ZIP gives a site that looks like the canvas. |
| 50 | Agent bridge (MCP) | Ask Claude "add a pricing section" and accept it as a diff. |
| 51 | Section templates | Insert → Sections gallery of starters. |
| 52 | Stage 1 gate | The whole thing works as a responsive design tool with export. |

**Why the viewport looks empty on `main`:** phases 20–39 are still 🚧 and mostly in open PRs (#42 and later), so only the frames and Layers work until they're merged.
