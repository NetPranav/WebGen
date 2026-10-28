# Lane A manual test guide (Phases 13–38, plus the Project Hub)

**For:** `@OVERxPOWERED`, testing `@NetPranav`'s work. **Covers:** everything Lane A has merged to `main` (Phases 13–38) and the front door of the product, the Project Hub at `/` (section 3.0). Lane B's work is in `B_TEST_GUIDE.md`.
**Last checked against `main`:** 2026-10-24 (`391a19c`); re-checked for the changes Lane B's Phases 64–68 make to shared screens on 2026-10-28 (section 3.27 was updated, see below). Labels, shortcuts and counts were compared with the code and the live editor, and the unit and Chromium suites were green.
**Updated:** when Lane A merges more phases (this file, `B_TEST_GUIDE.md` and `USER_MANUAL.md` are the three files kept current). **As of 2026-10-28 `origin/main` has no Lane A work newer than Phase 38.** Phases 39–43 (pen, vector editing, auto layout, grid, breakpoints) are still in open PR #53, and NetPranav's branch `a/figcraft-port` (55 commits, last pushed 27 Oct: vector networks, boolean shapes, effects, variables, components, Dev Mode, SVG import) is not merged and not in a PR. None of it is on `main`, so it is not here. Pull `main` again before you test; when a Lane A PR merges, this guide gets its sections.
**What CI already checks and what only you can check:** section 6.

| Phase | What you can do or see | Section |
|---|---|---|
| (hub) | Project Hub: name a project, pick a scope and a tech stack, launch the editor | 3.0 |
| 13 | Menus run real commands; drawing tools; command palette | 3.1 |
| 14 | Panel layout that survives a reload; panels load on demand | 3.2 |
| 15 | Design / Animate / Code workspaces; inspector tabs; saved layouts | 3.3 |
| 16 | Hostile text can't run code | 3.4 |
| 17 | One drawing per layer type; render gallery | 3.5 |
| 18 | The stage is a live frame, not an HTML string | 3.6 |
| 19 | Only edited layers redraw; 500 layers stay fast | 3.7 |
| 20 | One camera: pan and zoom 2%–6,400%, fit, zoom to selection | 3.8 |
| 21 | Several frames side by side (Desktop / Tablet / Mobile) | 3.9 |
| 22 | Hover outline and click selection go through a spatial index | 3.10 |
| 23 | Overlay layer; Design / Preview switch | 3.11 |
| 24 | Tools as a state machine; Space = Hand, Ctrl = deep select | 3.12 |
| 25 | Draw Frame, Rectangle, Ellipse, Line, Arrow, Polygon, Star, Text | 3.13 |
| 26 | Click, Shift-click, marquee, select all/none/inverse | 3.14 |
| 27 | Move, resize, rotate handles; shape parameter handles | 3.15 |
| 28 | Snapping, smart guides, rulers and guides | 3.16 |
| 29 | Copy, paste, duplicate, delete, nudge, arrange, group, lock, hide, rename | 3.17 |
| 30 | Align, distribute, tidy up | 3.18 |
| 31 | Type directly on the canvas | 3.19 |
| 32 | Layers panel | 3.20 |
| 33 | Simple inspector | 3.21 |
| 34 | Pro inspector | 3.22 |
| 35 | Colour, gradients, strokes, shadows, blur | 3.23 |
| 36 | Assets: drop pictures on the canvas | 3.24 |
| 37 | Image fills and cropping | 3.25 |
| 38 | Fonts: Google, system, your own | 3.26 |
| (older panels) | LazyLayout AI, bottom-drawer tools, Preferences, Output Log, tear-off windows. Built before the phase plan; no phase owns them | 3.27 |

## The 10-minute quick pass (start here)

If you only have ten minutes, do these. They touch every area of Lane A that is on `main`; each step names the full test.

1. Open `/editor`, **Mount Showcase Demo** (S1–S2).
2. **Draw** (3.13): press **R**, drag a rectangle inside the page; **O**, an ellipse; **T**, drag a box and type. **Ctrl+Z** takes the last one away.
3. **Select and transform** (3.14, 3.15): click, **Shift-click**, drag a box on empty canvas; drag a rectangle's corner to resize and just outside a corner to rotate.
4. **Edit** (3.17, 3.18): **Ctrl+D** to duplicate, select three and press **Alt+A** to align, **Ctrl+G** to group.
5. **Layers panel and inspector** (3.20, 3.21): click a row, then type a new **X** in **Simple**, switch to **Pro** and scrub a number by its label.
6. **Paint** (3.23): add a gradient fill, drag its handles on the canvas.
7. **Workspaces** (3.3): click **Animate workspace**, then **Design workspace**; the drawing is still there.
8. **Save** (3.1): **Ctrl+S**, reload; everything is still there.
9. Nothing in the console is red.

## How to use this guide

Every test has the shape **Do → Expect → Fails if**, and a tick box. Tick the box only when what you see is what **Expect** says; otherwise write the test number and what happened (section 8). Each phase has a **User test** (click around) and, where it makes sense, a **Developer test** (terminal, DevTools or code).

> **Known gaps, not bugs** (Lane A's own changelogs list them as not done):
> - Pen and Pencil tools, and Tier B tools (Motion Path, Gradient tool, Anchor Point, Eyedropper tool), don't exist yet. The dock only shows tools that work.
> - In the menus, greyed items name the phase that builds them: **Save As Template** (Phase 51), **Export Next.js + Prisma Code** (Phase 49), **120 FPS Cable Physics** (Phase 119), and in Help **Documentation** (183), **Report Issue or Feedback** (185), **About** (189). **New Project** and **Close Project** are live now: both save and go back to the Project Hub.
> - **The header chip reads `MyProject.uweb` whatever your project is called.** It is a placeholder, not a Lane A bug.
> - **There is no list of your projects anywhere.** The hub only creates new ones. To get an old project back, keep its `/editor?projectId=…` address, or import its `.lazy.json` file.
> - The Motion inspector (right dock, **Motion** tab) is read-only until the timeline phases.
> - Hover and press looks wait for States (Phase 78). Effect surfaces and 3D layers draw a labelled placeholder.
> - A whole-document animation of layers other than the root is not yet editable in the Sequencer (Lane B's timeline phases).

---

## 1. Setup

```bash
cd ~/padhai_in_linux/Projects/lazylayouts
git switch main && git pull
npm ci                 # only if package-lock.json changed
npm run dev            # open http://localhost:3000/editor
```

- Use **Chromium** for the main pass; section 5 repeats the key tests in **Firefox** and **Safari/WebKit** (Lane A fixed several WebKit-only bugs).
- Open DevTools → **Console** and keep it open. **Any red error while you test is a failure.**
- `/editor` redirects to `/editor?projectId=…` and creates a project. `/` is the Project Hub (section 3.0); `/database` is switched off and sends you to `/editor`.
- Keep the address of a project you want to come back to. There is no project list yet.

### 1.1 The map: where everything is

| Thing | Where | Names you will see |
|---|---|---|
| Menus | Top header | **File**, **Edit**, **View**, **Window**, **Help** |
| Canvas size buttons | Header, middle | **Desktop Canvas (1440px)**, **Tablet Canvas (768px)**, **Mobile Canvas (375px)** |
| Demo content | Header, right | **Mount Showcase Demo** (a heading and a button). Once mounted the same button reads **Clear showcase demo**. |
| Workspace tabs | Second row, left | **Design workspace**, **Animate workspace**, **Code workspace**; button **Saved layouts** |
| Motion tools | Second row, next to the tabs | **Presets tool**, **Timeline tool**, **Easing tool**, **Export tool**. Each opens a tab in the bottom drawer (Content Browser, Motion Sequencer, curves, Export Preview). |
| Command palette | Second row, right | **Open command palette**, shown as "Search commands… Ctrl K". **Ctrl+P** and **Ctrl+K** both open it. |
| Save / Undo / Redo | Small buttons at the top-left corner of the stage | **Save Project (Ctrl+S / Cmd+S)**, **Undo (Ctrl+Z)**, **Redo (Ctrl+Shift+Z)** |
| Help and settings | Header, far right | **Engine Documentation (F1)**, **Project Settings & Preferences (Ctrl+,)** (the gear; it lights up while Preferences is open) |
| Frame bar | Over the top of the stage | Frame title and size boxes, move/duplicate/delete buttons, **Frame** (add), **Design** / **Preview**, **Snap objects**, **Snap guides**, **Pixel grid**, **Rulers**, **Light** / **Dark** / **Checkerboard** |
| Tool dock | Bottom of the stage | **Select Tool**, **Hand Tool (Pan)**, **Frame Tool**, **Rectangle Tool**, **Ellipse Tool**, **Line Tool**, **Arrow Tool**, **Polygon Tool**, **Star Tool**, **Text Tool**, then **Zoom Out**, **Current Zoom 100%. Click to reset.**, **Zoom In**, **Fit Viewport to Screen** |
| Left dock | Left | Tabs **Layers** and **Assets** |
| Right dock (inspector) | Right | Tabs **Design**, **Motion**, **Code**. With **nothing selected** the Design tab shows **World Environment** (Inspect Mode, Viewport & Grid, Element Interaction, Snapping, Theme & Design Tokens, Motion). Select a layer to get the **Simple / Pro** inspector. |
| Status bar | Very bottom | **Panels**, "All changes saved", the selected layer's name, **Output Log**, **Execution Trace**, the transport bar (Lane B), **Parity idle** badge (dev builds), branch, FPS and memory readouts |

### 1.2 Recipe B: get something to work on

1. Open `/editor`.
2. Click **Mount Showcase Demo**. A page with a heading and a button appears on the stage.
3. Click the **Rectangle Tool** (dock) and drag a rectangle inside the page. Do the same with **Ellipse Tool** and **Text Tool** to have three more layers.

"The demo" below means this page. "Draw a shape" means step 3.

---

## 2. Quick smoke test (3 minutes)

- [ ] **S1** Do: open `/editor`. Expect: the editor loads, no red console errors, the **Design workspace** tab is selected.
- [ ] **S2** Do: click **Mount Showcase Demo**. Expect: a page appears on the stage.
- [ ] **S3** Do: click **File**, **Edit**, **View**, **Window**, **Help** in turn. Expect: each opens a menu; click away to close.
- [ ] **S4** Do: press **Ctrl+P**. Expect: the command palette opens. **Escape** closes it.
- [ ] **S5** Do: draw a rectangle (Recipe B step 3), then **Ctrl+Z**. Expect: it appears, then disappears.

---

## 3. Tests by phase

### 3.0 The Project Hub (the front door, `/`)

No phase owns this screen, but it is the first thing a person sees. It creates a project and opens the editor on it.

**User test**
- [ ] **H1** Do: open `http://localhost:3000/`. Expect: the browser tab says "LazyLayout | AI-Native Motion Design Studio". The page shows a left list (Project Plan, Environment, Templates, Review & Launch), and five numbered cards: **01 Project Name** (a field that holds `LazyLayout`), **02 Select Design Scope** (**Element Design** ticked, **Component Design**, **Custom**), **03 Project Details** (a description box counting to 500 and tags UI / UX, Animation, Frontend, Web App, Interactive, + Add tag), **04 Technology Stack**, **05 Review & Launch** with the button **Launch Studio**. No console errors.
- [ ] **H2** Do: click each scope card in turn. Expect: the tick moves, and the **Design Scope** line in **05 Review & Launch** follows.
- [ ] **H3** Do: open each dropdown in **04 Technology Stack**. Expect: Target Framework: Next.js 15 (App Router), Next.js 15 (Pages Router), React 19 (Vite), Vue 3 (Composition API), Svelte 5 (Runes), Vanilla HTML5 / ES6. Styling System: Tailwind CSS v4, Vanilla CSS & Modern Variables, CSS Modules, Styled Components / Emotion. Animation Engine: GSAP 3.12, Framer Motion 11, SVG Vector & Native CSS Keyframes, Hybrid (GSAP Scroll + Framer Springs). Starting Template: Blank Canvas, Interactive Hover / Tap, Scroll Reveal & Parallax, Ambient Infinite Loop. **Language** is a TypeScript / JavaScript switch. Each change shows in **05 Review & Launch**.
- [ ] **H4** Do: type `My Landing` in the project name, then click **Launch Studio**. Expect: the editor opens at `/editor?projectId=…&name=My%20Landing&scope=element&…` with your choices in the address. The **Layers** panel lists one layer called **My Landing** (a single button-type element drawn 1440 × 900, not the `RootContainer` that `/editor` makes).
- [ ] **H5** Do: reload that page. Expect: the same project comes back.
- [ ] **H6** Do: go back to `/` and click **Open in Editor** (top right). Expect: a new, empty project opens at `/editor`.
- [ ] **H7** Do: open `http://localhost:3000/database`. Expect: you are sent to `/editor` (that route is switched off on purpose).
- [ ] **H8** Do: in the editor (started from `/editor`, with a rectangle drawn) choose **File → New Project…**. Expect: you land on the hub. Press the browser's **Back** button. Expect: your project is back at the same address with the rectangle saved (the Layers tree starts collapsed; open the arrow to see it).

**Known gaps (don't report)**
- Picking a **Starting Template**, a tag, or writing a description doesn't change what you get: the editor opens on one empty frame. Starter projects are Phase 51.
- The left list (Environment, Templates, Review & Launch) doesn't open other pages; you stay on `/`.
- There is no list of earlier projects.
- **A hub-launched project is one button element.** The Rectangle, Ellipse and other shape tools draw nothing inside it and don't say why. To get a canvas to draw on, start from `/editor` (or **Open in Editor**).

**Developer test**
- [ ] **H9** Do: DevTools → Application → IndexedDB. Expect: the project you launched is stored there with its framework, styling, animation, language and template.

---

### 3.1 Phase 13: command bus, menus and tools

**User test**
- [ ] **T13.1** Do: draw a rectangle, then **Edit → Undo**. Expect: it disappears. **Edit → Redo** brings it back. Same with **Ctrl+Z** and **Ctrl+Shift+Z**.
- [ ] **T13.2** Do: **File → Save Project** (or **Ctrl+S**). Expect: the Save button's small dot clears.
- [ ] **T13.3** Do: **File → Export Project File (.lazy.json)**. Expect: a file downloads. **File → Import Project File…** (and **Open Project…**) opens a file picker.
- [ ] **T13.4** Do: **View → Zoom In**, **Zoom Out**, **Reset Zoom (100%)** (or **Ctrl++**, **Ctrl+-**, **Ctrl+0**). Expect: the canvas zooms accordingly.
- [ ] **T13.5** Do: **Edit → Preferences…** (**Ctrl+,**). Expect: preferences open.
- [ ] **T13.6** Do: **Help → Keyboard Shortcuts** (**Ctrl+/**). Expect: the command palette opens.
- [ ] **T13.7** Do: open **File**. Expect: **Save As Template…** is greyed and says Phase 51, **Export Next.js + Prisma Code** is greyed and says Phase 49. **New Project…** and **Close Project** are not greyed. There are **no** fake recent-project entries.
- [ ] **T13.7a** Do: **File → New Project…**. Expect: the editor saves and you land on the Project Hub (`/`). **Close Project** does the same. Press the browser's Back button: you return to your project with your work in it (the Layers tree starts collapsed).
- [ ] **T13.8** Do: click a greyed item. Expect: nothing happens and there is no console error.
- [ ] **T13.9** Do: **Ctrl+P**, type `zoom`, run **Zoom In**. Expect: the canvas zooms.

**Developer test**
- [ ] **T13.10** Do: open `src/editor/menus/menuModel.tsx`. Expect: every menu item has either a `command` or a `pending: "Phase N"`.
- [ ] **T13.11** Do: `npx tsx --test "src/core/commands/__tests__/*.test.ts"`. Expect: pass, including the coverage test.
- [ ] **T13.12** Do: `npx playwright test tests/e2e/command-bus.spec.ts --project=chromium`. Expect: pass.

---

### 3.2 Phase 14: workspace model and panel registry

**User test**
- [ ] **T14.1** Do: click **Animate workspace**, then drag the vertical splitter in front of the right dock to the left to widen it. Reload the page. Expect: the Animate workspace and the dock's width come back as you left them.
- [ ] **T14.2** Do: press **Ctrl+P**, type `reset layout`, run it. Expect: back to the Design workspace default.

**Developer test**
- [ ] **T14.3** Do: `wc -l src/editor/shell/EditorShell.tsx`. Expect: about 410 lines (it was 2,139).
- [ ] **T14.4** Do: open DevTools → Network, filter "JS", reload on the **Design workspace**. Expect: the Sequencer, Curve Editor, Export Preview, Output Log, Live Code and History chunks are **not** fetched. Click **Animate workspace**: the Sequencer chunk appears.
- [ ] **T14.5** Do: in the Console run `document.querySelector('.dock-layout').dataset.loadedPanels`. Expect: a list that grows only as you show panels.
- [ ] **T14.6** Do: in the Console run `document.querySelector('.dock-zone--center').__m = 1`, switch between the three workspace tabs and resize splitters, then run `document.querySelector('.dock-zone--center').__m`. Expect: `1` (the stage element was never replaced).
- [ ] **T14.7** Do: DevTools → Application → Local Storage: find the workspace entry, corrupt its JSON by hand, reload. Expect: the editor falls back to the default layout and doesn't crash.
- [ ] **T14.8** Do: `npx playwright test tests/e2e/workspace.spec.ts --project=chromium`. Expect: pass.

---

### 3.3 Phase 15: Design / Animate / Code workspaces

**User test**
- [ ] **T15.1** Do: open a fresh `/editor`. Expect: **Design workspace** selected, the stage in the middle, the inspector on the right with tabs **Design / Motion / Code**, and no timeline panel (the transport bar stays in the status bar).
- [ ] **T15.2** Do: click **Animate workspace**. Expect: a timeline panel opens at the bottom (about 40% of the window) and the **Motion** inspector shows ("Select a layer to see what moves on it").
- [ ] **T15.3** Do: click **Code workspace**. Expect: the right dock widens and shows the Live Code inspector.
- [ ] **T15.4** Do: click **Design workspace** again. Expect: the default layout returns, and a rectangle you drew earlier is still there (the stage doesn't reload or flicker).
- [ ] **T15.5** Do: switch workspaces rapidly 20 times. Expect: each switch looks instant and nothing breaks.
- [ ] **T15.6** Do: you should **not** see tabs named Logic, Data or Debug (full edition only), "Full Studio", or right-dock tabs "Tokens" / "Errors".
- [ ] **T15.7** Do: arrange a layout (open **Animate workspace**, widen the right dock), then click **Saved layouts** and save it under a name. Switch to another workspace, open **Saved layouts**, pick your name. Expect: your layout returns.
- [ ] **T15.8** Do: reload. Expect: the saved layout is still listed. Delete it from the same menu: it disappears, also after a reload.

**Developer test**
- [ ] **T15.9** Do: `npx playwright test tests/e2e/presets.spec.ts --project=chromium`. Expect: pass (including the "under 100 ms and the stage is not replaced" check).

---

### 3.4 Phase 16: hostile content

Use a throwaway project.
- [ ] **T16.1** Do: draw a **Text Tool** box and type `<img src=x onerror=alert(1)>`. Expect: **no alert box**; the stage shows the text literally.
- [ ] **T16.2** Do: rename a layer to `<script>alert(2)</script>` (double-click its row in the **Layers** panel). Expect: no alert; the name shows as plain text.
- [ ] **T16.3** Do: open the AI panel and send `<b onmouseover=alert(3)>hi</b>`. Expect: shown as text, not bold; hovering does nothing.
- [ ] **T16.4** (Developer) Do: open `DOCS/INITIAL/decisions/0008-threat-model.md`. Expect: nine trust boundaries, seven findings, rules R1–R10.

---

### 3.5 Phase 17: render definitions

- [ ] **T17.1** Do: open `http://localhost:3000/editor/render-gallery`. Expect: 77 cases (the page says how many), no console errors.
- [ ] **T17.2** Do: scroll through them. Expect: every layer type draws something visible (including toggle, badge, floating button, icon, divider, background, SVG group and text, which used to draw nothing).
- [ ] **T17.3** Do: look at the shapes (rectangle, ellipse, line, polygon, star, arrow, path). Expect: they look like what their names say.
- [ ] **T17.4** Do: look at the hostile and edge cases (huge sizes, bad image sources, odd path data, deep nesting). Expect: each stays inside its box, nothing runs, nothing overflows.
- [ ] **T17.5** Do: look at effect surfaces and 3D layers. Expect: a labelled placeholder.
- [ ] **T17.6** (Developer) Do: `npx playwright test tests/e2e/render-gallery.spec.ts --project=chromium`. Expect: pass.

---

### 3.6 Phase 18: the live stage frame

**User test**
- [ ] **T18.1** Do: **Mount Showcase Demo**, then click the heading on the stage. Expect: it is selected (an outline appears).
- [ ] **T18.2** Do: with the pointer over the stage press **Ctrl+Z**, **V**, **H**. Expect: they work as shortcuts (undo, Select, Hand).
- [ ] **T18.3** Do: draw a rectangle and watch the stage. Expect: it appears without the whole page flashing or reloading.

**Developer test**
- [ ] **T18.4** Do: DevTools → Elements, find `iframe[title="Stage"]`. Expect: `src="/stage-frame.html"`, no `srcdoc`, no `sandbox`.
- [ ] **T18.5** Do: DevTools → Network → `stage-frame.html` → Response headers. Expect: a `Content-Security-Policy` header containing `script-src 'none'`.
- [ ] **T18.6** Do: in the Console run `const d=document.querySelector('iframe[title="Stage"]').contentDocument; const s=d.createElement('script'); s.textContent='top.__x=1'; d.body.appendChild(s); top.__x`. Expect: `undefined` (the frame can't run scripts).
- [ ] **T18.7** Do: `grep -rn 'postMessage(.*"\*"' src/`. Expect: no results.
- [ ] **T18.8** Do: `npx playwright test tests/e2e/stage-host.spec.ts --project=chromium`. Expect: pass. (One test has a 16 ms budget and can fail on a busy machine; run it alone before reporting.)

---

### 3.7 Phase 19: incremental updates and measurement

- [ ] **T19.1** Do: open `http://localhost:3000/editor/stage-lab` and click **Load 500 layers**. Expect: 500 lines appear, and the page reports `mounted in … ms` (under 500).
- [ ] **T19.2** Do: click **Edit one layer**. Expect: the `edits:` counter goes up and layer 250's text changes to `Edited …`.
- [ ] **T19.3** Do: click **Add one layer** and **Remove one layer**. Expect: a layer appears at the end / one disappears; the page stays responsive.
- [ ] **T19.4** (Developer) Do: install React DevTools, turn on "Highlight updates", click **Edit one layer**. Expect: only that one layer flashes.
- [ ] **T19.5** (Developer) Do: `npx playwright test tests/e2e/stage-incremental.spec.ts --project=chromium`. Expect: pass (500 layers mount < 500 ms; `measure()` within 0.5 px of the DOM).

---

### 3.8 Phase 20: viewport camera

- [ ] **T20.1** Do: hold **Space** and drag on the canvas. Expect: the canvas pans.
- [ ] **T20.2** Do: **Ctrl+scroll** (or pinch on a trackpad) over the stage. Expect: it zooms around the pointer, not around the centre.
- [ ] **T20.3** Do: click **Zoom In** repeatedly until it stops, then **Zoom Out** repeatedly. Expect: the range is 2% to 6,400%, with steps by 1.25×, and 100% snaps.
- [ ] **T20.4** Do: press **Shift+1**. Expect: zoom to fit everything. Select a layer, press **Shift+2**: zoom to it. Press **Shift+0**: 100%.
- [ ] **T20.5** Do: pan and zoom, then reload. Expect: the same view is restored (it is remembered per project).
- [ ] **T20.6** (Developer) Do: `npx playwright test tests/e2e/viewport-camera.spec.ts --project=chromium`. Expect: pass. (The 60 fps test can fail under load; run it alone.)

---

### 3.9 Phase 21: several frames on the canvas

- [ ] **T21.1** Do: click **Tablet Canvas (768px)** in the header. Expect: a Tablet-sized frame is created next to the first and focused; the canvas shows both side by side.
- [ ] **T21.2** Do: click **Mobile Canvas (375px)**. Expect: a Mobile frame appears. Clicking **Desktop Canvas (1440px)** focuses the Desktop one.
- [ ] **T21.3** Do: double-click a frame's title. Expect: you can rename it. Press Enter.
- [ ] **T21.4** Do: use a frame's size boxes (width and height). Expect: the frame resizes.
- [ ] **T21.5** Do: use a frame's move-left / move-right buttons. Expect: the frame swaps places with its neighbour.
- [ ] **T21.6** Do: use a frame's duplicate and delete buttons. Expect: a copy appears / the frame goes away; each is one **Ctrl+Z** step.
- [ ] **T21.7** Do: click **Frame** in the frame bar. Expect: a menu of presets (Desktop, Laptop, Tablet, Mobile, custom).
- [ ] **T21.8** Do: click **Light**, **Dark**, **Checkerboard**. Expect: the stage backdrop changes.
- [ ] **T21.9** Do: draw a rectangle in one frame, then click inside another and draw. Expect: each shape lands in the frame you last clicked.
- [ ] **T21.10** (Developer) Do: open `http://localhost:3000/editor/canvas-lab` (5 frames × 200 layers). Pan and zoom. Expect: smooth.
- [ ] **T21.11** (Developer) Do: `npx playwright test tests/e2e/frames.spec.ts --project=chromium`. Expect: pass.

---

### 3.10 Phase 22: hit-testing

- [ ] **T22.1** Do: mount the demo, move the pointer over the heading. Expect: an outline appears around it within a frame.
- [ ] **T22.2** Do: click once on a layer inside a container. Expect: the **direct child of the frame** is selected. **Ctrl-click** (Cmd on Mac): the **deepest** layer under the pointer is selected.
- [ ] **T22.3** Do: lock a layer (padlock on its row in **Layers**), then click on it. Expect: it isn't selected; what is inside it isn't either.
- [ ] **T22.4** Do: hide a layer (eye on its row). Expect: clicking where it was selects whatever is under it.
- [ ] **T22.5** (Developer) Do: open `/editor/canvas-lab`, use its **Lock** / **Hide** buttons and click around. Expect: the same rules.
- [ ] **T22.6** (Developer) Do: `npx playwright test tests/e2e/hit-testing.spec.ts --project=chromium`. Expect: pass (slow: about a minute).

---

### 3.11 Phase 23: overlay layer and Design / Preview

- [ ] **T23.1** Do: select a layer. Expect: an outline with a label showing its name and size.
- [ ] **T23.2** Do: click **Preview** in the frame bar. Expect: nothing is outlined or selectable; the demo's button and links react to clicks like a real page.
- [ ] **T23.3** Do: click **Design**. Expect: selection and outlines work again. (**View → Design Mode / Preview Mode** do the same.)
- [ ] **T23.4** (Developer) Do: `npx playwright test tests/e2e/overlay-modes.spec.ts --project=chromium`. Expect: pass.

---

### 3.12 Phase 24: tool state machine

- [ ] **T24.1** Do: hover the canvas, press **V**, **H**, **F**, **R**, **O**, **L**, **T** (single letters). Expect: Select, Hand, Frame, Rectangle, Ellipse, Line, Text become active (the dock highlights each).
- [ ] **T24.2** Do: pick the Rectangle tool, hold **Space**. Expect: the Hand tool while held; release returns to Rectangle.
- [ ] **T24.3** Do: pick Select, hold **Ctrl** (Cmd) and hover layers. Expect: deep select while held.
- [ ] **T24.4** Do: hold **Space**, click the **Ellipse Tool** button, release **Space**. Expect: the Ellipse tool is active.
- [ ] **T24.5** Do: hold **Space**, then switch to another window and back. Expect: the hold has ended (no stuck Hand tool).
- [ ] **T24.6** Do: look at the dock. Expect: **no** Pen, Pencil, Comment or Quick Insert buttons.
- [ ] **T24.7** (Developer) Do: `npx playwright test tests/e2e/tools.spec.ts --project=chromium`. Expect: pass.

---

### 3.13 Phase 25: creation tools

- [ ] **T25.1** Do: pick **Rectangle Tool**, drag on the demo page. Expect: **one** rectangle is created where you dragged, inside the page.
- [ ] **T25.2** Do: repeat with **Ellipse Tool**, **Line Tool**, **Arrow Tool** (Shift+L), **Polygon Tool** (Y), **Star Tool** (Shift+Y), **Text Tool**. Expect: one layer of the right type each.
- [ ] **T25.3** Do: hold **Shift** while dragging a rectangle. Expect: a square. Shift with Line: snaps to 45°.
- [ ] **T25.4** Do: hold **Alt** while dragging. Expect: it draws from the centre.
- [ ] **T25.5** Do: click (don't drag) with a shape tool. Expect: a default-sized shape is placed.
- [ ] **T25.6** Do: pick **Frame Tool** and drag on empty canvas (outside every frame). Expect: a new top-level frame. Try the **Rectangle Tool** on empty canvas: nothing is created.
- [ ] **T25.7** Do: **Ctrl+Z** after each drawing. Expect: each creation is one undo step.
- [ ] **T25.8** (Developer) Do: `npx playwright test tests/e2e/creation-tools.spec.ts --project=chromium`. Expect: pass.

---

### 3.14 Phase 26: selection

- [ ] **T26.1** Do: click a layer, then **Shift-click** another. Expect: both selected; the status bar says "2 layers selected". Shift-click again on one: it leaves the selection.
- [ ] **T26.2** Do: with the Select tool drag on empty canvas, or on a frame's background. Expect: a marquee; layers it touches are selected.
- [ ] **T26.3** Do: press **Ctrl+A** with the pointer over the canvas. Expect: all layers of the frame are selected. **Escape**: none. **Ctrl+Shift+A**: inverse.
- [ ] **T26.4** Do: select a container and press **Enter**. Expect: its children are selected. **Shift+Enter**: its parent.
- [ ] **T26.5** Do: select on the canvas, then look at the **Layers** panel and the inspector. Expect: all agree.
- [ ] **T26.6** Do: lock or hide a layer and try to select it by marquee. Expect: it isn't selected.
- [ ] **T26.7** (Developer) Do: `npx playwright test tests/e2e/selection.spec.ts --project=chromium`. Expect: pass.

---

### 3.15 Phase 27: transform handles

- [ ] **T27.1** Do: select a rectangle. Expect: a box with 8 handles (corners and edges) and rotate zones just outside each corner.
- [ ] **T27.2** Do: drag the rectangle's body. Expect: it moves. Hold **Shift**: locked to one axis.
- [ ] **T27.3** Do: drag a corner handle. Expect: it resizes. **Shift** keeps the ratio; **Alt** resizes about the centre.
- [ ] **T27.4** Do: drag just outside a corner. Expect: it rotates. **Shift** snaps to 15°.
- [ ] **T27.5** Do: select two layers and move, resize, rotate. Expect: they transform together.
- [ ] **T27.6** Do: start dragging and press **Escape**. Expect: the gesture is cancelled; nothing changed.
- [ ] **T27.7** Do: **Ctrl+Z** after a drag. Expect: one gesture = one undo step.
- [ ] **T27.8** Do: select a rectangle, find the corner-radius handle and drag it. Select a star: drag the inner-radius and points handles. Select a polygon: drag the sides handle. Expect: each shape changes accordingly.
- [ ] **T27.9** (Developer) Do: `npx playwright test tests/e2e/transform.spec.ts --project=chromium`. Expect: pass (30 gestures are exactly 30 undo steps).

---

### 3.16 Phase 28: snapping, guides and rulers

- [ ] **T28.1** Do: drag one rectangle near another's edge or centre. Expect: red guide lines appear and it snaps; spacing marks show when gaps are equal.
- [ ] **T28.2** Do: drag with **Ctrl** (Cmd) held. Expect: no snapping.
- [ ] **T28.3** Do: hold **Alt** with a layer selected. Expect: distances to the nearest neighbours show.
- [ ] **T28.4** Do: click **Rulers** (or **Shift+R**). Expect: rulers appear along the top and left, in px from the active frame.
- [ ] **T28.5** Do: drag out of a ruler. Expect: a guide line. Drag it to move it; drag it back onto the ruler to delete it. Reload: guides are still there.
- [ ] **T28.6** Do: toggle **Snap objects**, **Snap guides**, **Pixel grid**. Expect: the matching snapping turns on and off.
- [ ] **T28.7** (Developer) Do: `npx playwright test tests/e2e/snapping.spec.ts --project=chromium`. Expect: pass.

---

### 3.17 Phase 29: editing operations

Select a rectangle first for each.
- [ ] **T29.1** Do: **Ctrl+C**, then **Ctrl+V**. Expect: a copy appears, with its own name. Paste in a second browser tab of the same project: it pastes there too.
- [ ] **T29.2** Do: **Ctrl+X**. Expect: it disappears; **Ctrl+V** brings it back.
- [ ] **T29.3** Do: **Ctrl+D**, move the copy, press **Ctrl+D** again. Expect: the second copy repeats the offset you used.
- [ ] **T29.4** Do: **Delete**. Expect: removed. **Ctrl+Z** brings it back.
- [ ] **T29.5** Do: arrow keys nudge by 1 px; **Shift+arrow** by 10 px.
- [ ] **T29.6** Do: **Ctrl+]** forward, **Ctrl+[** backward, **Ctrl+Shift+]** to front, **Ctrl+Shift+[** to back (check in the **Layers** panel).
- [ ] **T29.7** Do: select two layers, **Ctrl+G**. Expect: a group. **Ctrl+Shift+G**: ungroup. **Ctrl+Alt+G**: wrap in a frame.
- [ ] **T29.8** Do: **Ctrl+Shift+L** locks, **Ctrl+Shift+H** hides. **F2** renames. In **Edit** menu use "Unlock All" and "Show All".
- [ ] **T29.9** Do: right-click a layer on the canvas. Expect: a context menu; it stays on screen near the window's edges.
- [ ] **T29.10** Do: **Edit** menu. Expect: Cut, Copy, Paste, Duplicate, Delete are now live (not greyed).
- [ ] **T29.11** (Developer) Do: `npx playwright test tests/e2e/editing.spec.ts --project=chromium`. Expect: pass (a 25-step journey and cross-tab paste).

---

### 3.18 Phase 30: align, distribute, tidy

- [ ] **T30.1** Do: draw three rectangles at different places, select all three (**Ctrl+A**). Press **Alt+A** (align left), **Alt+H** (horizontal centres), **Alt+D** (right), **Alt+W** (top), **Alt+V** (vertical centres), **Alt+S** (bottom). Expect: they align to each other each time.
- [ ] **T30.2** Do: select one layer inside a frame and press **Alt+A**. Expect: it aligns to its parent.
- [ ] **T30.3** Do: select three and press **Ctrl+Alt+H**, then **Ctrl+Alt+V**. Expect: equal spacing horizontally / vertically; the outer two don't move.
- [ ] **T30.4** Do: select several scattered layers and press **Ctrl+Alt+T**. Expect: they are tidied onto a grid using the gaps they already have.
- [ ] **T30.5** Do: look for the align bar at the top of the inspector and the entries in the **Edit** menu. Expect: the same actions are there.
- [ ] **T30.6** Do: drag a spacing handle between neighbouring selected layers. Expect: every gap becomes equal.
- [ ] **T30.7** (Developer) Do: `npx playwright test tests/e2e/align.spec.ts --project=chromium`. Expect: pass.

---

### 3.19 Phase 31: text on the canvas

- [ ] **T31.1** Do: **Text Tool**, drag a box, and type immediately. Expect: text appears as you type.
- [ ] **T31.2** Do: double-click a text layer (or select it and press **Enter**). Expect: you edit it in place.
- [ ] **T31.3** Do: select words and press **Ctrl+B**, **Ctrl+I**, **Ctrl+U**, **Ctrl+Shift+X**. Expect: bold, italic, underline, strikethrough on the selected words only.
- [ ] **T31.4** Do: press **Enter** in a text box. Expect: a new line. Paste formatted text from a web page: it pastes as plain text.
- [ ] **T31.5** Do: press **Escape** (or **Ctrl+Enter**, or click away). Expect: you leave editing; **Ctrl+Z** undoes the whole edit in one step.
- [ ] **T31.6** Do: create a text box, type nothing, click away. Expect: it is discarded.
- [ ] **T31.7** Do: in the inspector set family, size, weight, line height, letter spacing, alignment, decoration, case and sizing mode. Expect: the text changes. Select two texts that disagree on a value: the field reads "Mixed".
- [ ] **T31.8** (Developer) Do: `npx playwright test tests/e2e/text-editing.spec.ts --project=chromium`. Expect: pass.

---

### 3.20 Phase 32: Layers panel

- [ ] **T32.1** Do: click the **Layers** tab in the left dock. Expect: a tree of every layer, front-most first.
- [ ] **T32.2** Do: select on the canvas, then in the panel (and the other way round). Expect: each follows the other, opening the layers above it.
- [ ] **T32.3** Do: **Shift-click** a range of rows, **Ctrl-click** to add. Expect: range / add selection.
- [ ] **T32.4** Do: drag a row up or down. Expect: it reorders (and the canvas stacking changes).
- [ ] **T32.5** Do: drag a row onto a frame or group. Expect: it moves in and stays where it was on the canvas.
- [ ] **T32.6** Do: try to drag a frame into itself, a layer into a text, or move a locked layer. Expect: refused, with a reason.
- [ ] **T32.7** Do: double-click a row's name, rename, press Enter. Expect: renamed.
- [ ] **T32.8** Do: use the lock and eye buttons on a row. Expect: locked / hidden.
- [ ] **T32.9** Do: type in **Search layers**. Expect: matches are highlighted.
- [ ] **T32.10** Do: right-click a row. Expect: the same menu as the canvas.
- [ ] **T32.11** (Developer) Do: `npx playwright test tests/e2e/layers.spec.ts --project=chromium`. Expect: pass. (The 1,500-layer scroll test can fail under load; run it alone.)

---

### 3.21 Phase 33: Simple inspector

Select a rectangle first. Open the right dock's **Design** tab; make sure the switch at the top says **Simple**.
- [ ] **T33.1** Do: look at what is shown. Expect: Position, Size, Fill, Stroke, Corner radius, Opacity (Text appears only for text layers), and nothing technical.
- [ ] **T33.2** Do: type a new X in Position. Expect: the rectangle moves on the canvas at once.
- [ ] **T33.3** Do: change Size, Opacity, Corner radius. Expect: the canvas updates live.
- [ ] **T33.4** Do: click the Fill swatch. Expect: the colour picker opens (Phase 35).
- [ ] **T33.5** Do: select a text layer. Expect: words and colour, no Stroke control.
- [ ] **T33.6** Do: select two layers with different opacity. Expect: Opacity reads "Mixed"; typing a value sets both in one undo step.
- [ ] **T33.7** Do: move a layer that its parent's layout positions, by typing X. Expect: only that coordinate changes (it becomes absolute where it was).
- [ ] **T33.8** (Developer) Do: `npx playwright test tests/e2e/inspector-simple.spec.ts --project=chromium`. Expect: pass.

---

### 3.22 Phase 34: Pro inspector

- [ ] **T34.1** Do: switch the inspector to **Pro**. Expect: groups of every property of the selected layer (hundreds in total), each with a suitable control.
- [ ] **T34.2** Do: click into a number and press **↑**; with **Shift** it steps ten times as much, with **Alt** a tenth.
- [ ] **T34.3** Do: drag a number's **label** left and right. Expect: the value scrubs; **Escape** during the drag cancels; one drag = one undo step.
- [ ] **T34.4** Do: change a colour (swatch), a choice (menu), a toggle. Expect: each applies.
- [ ] **T34.5** Do: switch back to **Simple**. Expect: the choice is remembered after a reload.
- [ ] **T34.6** (Developer) Do: `npx tsx --test "src/core/inspector/__tests__/*.test.ts"` and `npx playwright test tests/e2e/inspector-pro.spec.ts --project=chromium`. Expect: pass, including the coverage test (every legal property has a control) and the "no technical words in the Simple face" test.

---

### 3.23 Phase 35: paint

- [ ] **T35.1** Do: open a rectangle's Fill. Expect: a list of fills; add a solid colour, a linear, a radial and a conic gradient. Each can be hidden, reordered and removed, with its own opacity.
- [ ] **T35.2** Do: in the colour picker drag the square, hue and alpha sliders; type a hex; switch HSB / OKLCH. Expect: the layer's colour follows.
- [ ] **T35.3** Do: while editing a gradient, drag the handles on the canvas (ends, centre, radii, angle; **Shift** steps 15°). Expect: the gradient changes; one drag = one undo step.
- [ ] **T35.4** Do: in the stop bar add, drag, recolour and remove stops. Expect: the gradient updates.
- [ ] **T35.5** Do: give a stroke a dashed or dotted style and round caps and joins. Expect: they draw.
- [ ] **T35.6** Do: add a drop shadow and an inner shadow (several), layer blur and background blur. Expect: they draw.
- [ ] **T35.7** (Developer) Do: `npx playwright test tests/e2e/paint.spec.ts --project=chromium`. Expect: pass (16 paint cases compared).

---

### 3.24 Phase 36: assets

- [ ] **T36.1** Do: drag a picture file from your computer onto the canvas. Expect: an image layer appears.
- [ ] **T36.2** Do: click the **Assets** tab in the left dock. Expect: previews, sizes, usage counts, an import button.
- [ ] **T36.3** Do: drop the same file twice. Expect: one asset, used twice.
- [ ] **T36.4** Do: drop a file with the wrong extension but picture bytes, and a `.png` that isn't a picture. Expect: the first is recognised, the second is refused.
- [ ] **T36.5** Do: import an SVG that contains `<script>`. Expect: it imports and the script is removed.
- [ ] **T36.6** Do: export the project file and import it elsewhere. Expect: the pictures come along.
- [ ] **T36.7** Do: open the same project in a second browser tab. Expect: it opens read-only with an "Edit here instead" button.
- [ ] **T36.8** (Developer) Do: `npx playwright test tests/e2e/assets.spec.ts --project=chromium`. Expect: pass.

---

### 3.25 Phase 37: image layers

- [ ] **T37.1** Do: on a rectangle's Fill choose **Image** and pick an imported file. Expect: the picture fills it; it stacks with colour and gradient fills.
- [ ] **T37.2** Do: try **Fill**, **Fit**, **Crop**, **Tile**. Expect: covers, contains, crops, repeats.
- [ ] **T37.3** Do: in Crop mode drag the picture's corner handles (zoom) and middle handle (move) on the canvas. Expect: the picture always still covers the box.
- [ ] **T37.4** Do: change brightness, contrast, saturation. Expect: the picture changes.
- [ ] **T37.5** Do: choose another file for the same fill. Expect: the fit, crop and colours stay.
- [ ] **T37.6** (Developer) Do: open `/editor/render-gallery` (the eight picture cases draw) and run `npx playwright test tests/e2e/images.spec.ts --project=chromium`. Expect: pass.

---

### 3.26 Phase 38: fonts

- [ ] **T38.1** Do: select a text layer and open the font picker. Expect: search over Google families, project fonts and system fonts.
- [ ] **T38.2** Do: choose a Google font that isn't loaded yet. Expect: the text changes to it and the selection box follows the new size.
- [ ] **T38.3** Do: **Upload a font…** and pick a `.ttf`, `.otf`, `.woff` or `.woff2`. Expect: it is used at once.
- [ ] **T38.4** Do: pick a variable font. Expect: sliders for width, optical size, slant.
- [ ] **T38.5** Do: in DevTools → Network, choose a font from the list. Expect: the font file is fetched only when a layer uses it.
- [ ] **T38.6** Do: change the project's font-display setting. Expect: it saves.
- [ ] **T38.7** (Developer) Do: `npx playwright test tests/e2e/fonts.spec.ts --project=chromium`. Expect: pass (it fakes Google Fonts, so it needs no internet; T38.1–T38.5 are the only check of the real service).

---

### 3.27 The older panels no phase owns

These were built before the phase plan, are on screen today, and are mostly cut or replaced in later phases (Lane B's Phase 68 retires the old animation panels). Test only that they open, show what is written here and don't crash. Don't judge them as finished.

- [ ] **T27a.1** Do: **Window → LazyLayout AI**, then move the pointer toward the right edge of the window and click. Expect: while you move, a hint reads "Move left or right to choose dock location"; after the click the panel **LazyLayout AI** ("Intelligent Layout & AST Reasoning") docks on the right with a greeting "LazyLayout AI Ready", four buttons (**Diagnose Errors**, **Add Counter Logic**, **Trace Status**, **Explain Graph**) and a box that says "Ask LazyLayout AI to diagnose, fix, or generate logic…".
- [ ] **T27a.2** Do: type `make the heading fade in` and press Enter. Expect: a reply that introduces itself ("I am LayoutAI…") and lists what it can do. **It does not animate anything.** Then send `Diagnose errors` (reply: "System Diagnostics Clean"), `Create counter logic` (reply: "Blueprint Generation Proposal", asking for your review) and `Explain the active blueprint graph`. The assistant matches a few fixed phrases inside the browser; nothing is sent to any model.
- [ ] **T27a.3** Do: with DevTools → Network open, send three messages. Expect: no request to any other website.
- [ ] **T27a.4** Do: send `<b onmouseover=alert(3)>hi</b>`. Expect: shown as text, no alert (same as T16.3).
- [ ] **T27a.5** Do: click **Presets tool** (second row). Expect: a bottom drawer opens on **Content Browser** with an **Add Animation** button (and "Animation Library Empty" in the library list). The Animation panel shows **No layer selected** until you select a layer (Phase 68), then that layer's own animations. The drawer's other tabs are **Layer Timeline**, **Graph Editor**, **Motion Sequencer** and **Export Preview**.
- [ ] **T27a.6** Do: click **Easing tool**. Expect: the **Graph editor** (Phase 67, it replaced the old curve editor): **Value graph** and **Speed graph** buttons, the text "Select keyframes (or a layer that has them) to see their curves here", and an **Easing** strip (Snappy, Smooth, Bouncy, Lazy, Linear, Ease in, Ease out, Ease in and out, Overshoot, Hold) that is greyed until a keyframe is selected. The full tests are in `B_TEST_GUIDE.md` 3.15.
- [ ] **T27a.7** Do: click **Export tool**. Expect: **Export Preview** shows generated code for the target layer, with the targets **Pure CSS (0kb)**, **WAAPI (Native)**, **Framer Motion**, **GSAP 3**, and **Copy Code** / download buttons.
- [ ] **T27a.8** Do: select a layer and open the right dock's **Code** tab. Expect: generated code with **Copy code to clipboard**, **Download file** and a button that packages a Next.js repository as a ZIP. The **Motion** tab says "Select a layer to see what moves on it" until you select one.
- [ ] **T27a.9** Do: **Edit → Preferences…** (or the gear at the far right). Expect: a full-page settings screen with **General**, **Build & Target**, **Design Tokens**, **Environment Keys** and **Return to Viewport**. **The name and ID shown (`MyProject.uweb`, `proj_8f92ab41`) are placeholders, not your project's.**
- [ ] **T27a.10** Do: click **Output Log** in the status bar. Expect: a log panel with filters (All, Blueprints, Sequencer, API, Compiler, Warnings, Errors), a search box and a command line. **The lines in it are sample text** (for example an `AuthWorkflow` graph and `GET /api/v1/projects`), not events from your project.
- [ ] **T27a.11** Do: open `http://localhost:3000/editor/detach/sequencer`. Expect: a stand-alone window page titled **Timeline Sequencer** with a **Return to Main Editor** button.
- [ ] **T27a.12** Do: open **Window** and look at the entries (Outliner Panel, Details & Inspector, Content Browser, Output Log & Console, Logic Blueprint Canvas, Timeline Sequencer, Live Code Inspector, Pages & Routing Manager, Deployment & Cloud Studio, Plugin Manager, Undo History, Version Control & Snapshots …). Expect: the menu opens with no console error. Try three entries: each opens or focuses something and nothing crashes. Most are from the full edition's plan and are not part of the Stage 1 or Stage 2 work.

---

## 4. Regression checks

- [ ] **R1** Do: edit, reload. Expect: your work is saved and returns.
- [ ] **R2** Do: import `tests/e2e/fixtures/showcase-v4.lazy.json`. Expect: it opens with no error.
- [ ] **R3** Do: after Lane B's timeline work, open **Animate workspace** and press **Play** (see `B_TEST_GUIDE.md` Recipe A). Expect: the timeline and transport still work in Lane A's shell.
- [ ] **R4** Do: hover the timeline and press **Space**: it plays. Hover the canvas and press **Space**: it pans.
- [ ] **R5** Do: delete a keyframe with **Delete** while hovering the timeline. Expect: exactly one keyframe goes.

## 5. Cross-browser pass (about 10 minutes)

Repeat in **Firefox** and **Safari/WebKit**:
- [ ] **X1** Section 2 (smoke).
- [ ] **X2** T25.1–T25.2 (draw one of each shape).
- [ ] **X3** T18.1–T18.2 (stage clicks and keys).
- [ ] **X4** T15.1–T15.4 (workspace switching).
- [ ] **X5** T17.1 and T19.1 (gallery and stage lab).
- [ ] **X6** T27.2–T27.4 (move, resize, rotate).

## 6. What CI already checks, and what only you can check

### 6.1 What CI does on every push and pull request (`.github/workflows/ci.yml`)

| Job | What it runs | What it proves |
|---|---|---|
| `verify` | `npm run typecheck`, `npm run lint` (0 errors, at most 463 warnings), unit tests twice (normal and `NEXT_PUBLIC_EDITION=full`), `npm run build`, then four repo checks: bundle scope, doc links in `DOCS/INITIAL`, no ad-hoc compatibility logic in the editor, roadmap order | The code compiles, nothing in the logic regressed (about 2,000 unit tests), the production build works, the docs and roadmap are consistent |
| `e2e` | The whole Playwright suite in **Chromium, Firefox and WebKit**, against a production build, one worker, one retry (177 tests in Chromium) | Every phase's "You'll see" line still happens in a real browser |
| `Export Build Harness` | Nightly, and on pull requests that touch `src/compiler`, the schema or the animation types: builds the exported code inside three fixture apps (Next.js, Vite React, Vue) | Exported code still compiles |

So **the developer-side testing is taken care of by CI.** Every "Developer test" line in this guide that runs `npx tsx --test …` or `npx playwright test …` repeats what CI already does. Run them only when you want an answer before you push, or to chase a failure. The quick local gate before a push is `npm test && npm run lint && npm run build`.

On 2026-10-24 all of this was green on `main`: `npm test` (1,976 unit tests, 0 failed, 4 skipped), `npm run lint` (0 errors), the four repo checks, and 177 of 177 Chromium end-to-end tests (one 60 fps test failed once under full load and passed when run alone, as noted under T20.6). The export harness passed on its last four nightly runs (21–24 October). I could not read GitHub's branch-protection setting; COLLABORATION.md says `verify` and `e2e` must be green before a merge.

### 6.2 What CI cannot tell you (this is what your manual testing is for)

| Gap | Why CI misses it | Where to test it |
|---|---|---|
| **Does it feel right?** Spacing, readability, whether a control is findable, whether a gesture feels smooth | Tests assert values, not taste | Everything in section 3 marked "User test" |
| **The Project Hub, LazyLayout AI, Preferences, Output Log, tear-off windows** | No Playwright test opens them (the only references are in code and one menu-coverage test) | 3.0 and 3.27 |
| **Real Google Fonts** | `fonts.spec.ts` fakes `fonts.googleapis.com` and `fonts.gstatic.com`, so the real service is never called | T38.1–T38.5, with internet |
| **Real files from your computer**: dragging a picture or font from the file manager, the file picker, the download of an exported project | The tests inject files in code | T13.3, T36.1–T36.6, T38.3 |
| **Speed on your machine** | The 60 fps limits are loosened for shared CI runners (WebKit is only held to "not broken"), and there is no performance-budget suite before Phase 101 | T19.1, T20.6, T21.10, section 7 |
| **Long sessions**: 10 minutes of looping playback, memory growth, many undo steps | Tests run for seconds | Section 7 of both guides |
| **Dev-only behaviour**: the parity badge, the lab pages (`/editor/stage-lab` and friends) | CI tests a production build with labs switched on by a flag | B guide Phase 60 and Phase 57 |
| **Odd environments**: private window with storage blocked, two tabs on one project, a phone-width window, browser zoom | Rare in tests | Section 7 |
| **How the browsers look**, not just whether they work | CI runs Firefox and WebKit functionally; nobody compares how they look | Section 5 |

If a test in this guide has no automated twin, nothing else will catch it. If it has one, the twin's file name is in the line below it.

### 6.3 Run the automated suites yourself and compare

```bash
npm test                 # typecheck + unit tests (default and full edition)
npm run lint             # must exit 0
npm run build
npm run check:bundle-scope && npm run check:doc-links && npm run check:no-adhoc-compat && npm run check:roadmap-order
npx playwright test --project=chromium     # stop `npm run dev` first: Playwright reuses port 3000
rm -rf test-results playwright-report      # lint scans these if you leave them
```

Several of Lane A's specs measure time and can fail once when the machine is busy. Re-run a failure alone (`npx playwright test <file> --workers=1`) before reporting it.

## 7. Things worth trying to break

- Switch workspaces 20 times as fast as you can.
- Save 25 layouts with long and odd names (emoji, `<b>`, empty).
- Draw a shape, switch workspace, undo.
- Reload while a splitter drag is in progress.
- Import a project with thousands of layers or very deep nesting.
- Paste an `svgPath` with `javascript:` or enormous path data.
- Load 500 layers in the stage lab and press **Ctrl+Z** repeatedly.
- Open two editor tabs on the same project and edit in both.
- Resize to phone width and back.
- Use a private window (storage may be blocked): the editor must still start.
- Drag a very large image onto the canvas, and a 0-byte file.

## 8. Reporting a problem

For each failure write: the test number (for example `T27.4`), what you did, what you expected, what happened, the browser, whether it was `npm run dev` or a production build, any console error text, and a screenshot or screen recording. Hand it to your Claude saying it belongs to **Lane A, Phase NN**. Lane A bugs go to `@NetPranav`; if the fix is small and in a Lane A file, COLLABORATION §3 lets you make it yourself on a `b/` branch, but say so in the PR.
