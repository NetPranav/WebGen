# Lane A manual test guide (Phases 13–19)

**For:** `@OVERxPOWERED`, testing `@NetPranav`'s work. **Covers:** everything Lane A has merged to `main` so far (PR #18 and PR #30, which landed the stack #24–#30).

| Phase | What it delivered | Where to look |
|---|---|---|
| 13 | Command bus: typed commands, one menu model, Tier A canvas tools | File / Edit / View / Help menus, command palette, tool dock |
| 14 | Workspace model and panel registry; `EditorShell.tsx` split (2,139 → 389 lines) | Panel layout that survives a reload; lazy panels |
| 15 | Design / Animate / Code presets, inspector tabs, saved layouts | Header tabs, right-hand inspector, Layouts menu |
| 16 | Threat model (decision 0008) and two XSS fixes | Hostile text on the stage and in AI chat |
| 17 | Render definitions: one component per archetype | `/editor/render-gallery` |
| 18 | Stage host v2: live DOM frame, no HTML strings (decision 0009) | The canvas stage |
| 19 | Incremental stage updates, `LayerNodeRegistry`, `renderer.measure()` | `/editor/stage-lab` |

This guide has two halves. **Part 1 is the user's view** (what a person using the editor sees and feels). **Part 2 is the developer's view** (code, tests, DevTools checks). Do Part 1 first. Tick the boxes as you go and note any failure by its number.

> **Known gaps, not bugs.** Lane A's own changelog lists these as not done. Don't report them:
> - Edit-menu Cut / Copy / Paste / Duplicate / Delete, Save As Template, Export Next.js + Prisma, New Project and Close Project are **disabled on purpose** and name the phase that builds them.
> - The inspector's fields don't write to the document yet (Phases 33–34). The Motion inspector is read-only until Stage 2.
> - The **Layers panel** in the Design workspace arrives in Phase 32.
> - **Wheel and pinch over the stage frame** do not zoom the canvas yet (Phase 20).
> - The stage does **not animate** during playback. That is Lane B's Phase 57.
> - Direct-select, Pen, Pencil, the Polygon/Star/Arrow flyout and Tier B tools (Motion Path, Gradient, Anchor Point, Eyedropper) are not built.
> - A drawn shape is selected but shows no highlight box (cosmetic, predates Phase 13).
> - Hover and press looks wait for States (Phase 78). Effect surfaces and 3D layers draw a labelled placeholder.

---

## 0. Setup

```bash
cd ~/padhai_in_linux/Projects/lazylayouts
git switch main && git pull
npm ci                 # only if package-lock.json changed
npm run dev            # http://localhost:3000/editor
```

- Main pass in **Chromium**. Repeat Part 1 sections 3, 5 and 6 in **Firefox** (and WebKit if you have it) at the end. Phase 19 fixed a WebKit-only bug, so WebKit matters.
- Keep DevTools → Console open. **Any red error while you test is a failure.**
- `http://localhost:3000/editor` redirects to `…/editor?projectId=…` and creates a project.
- The editor now opens in the **Design** workspace, with the timeline folded away. Open the timeline with the **Timeline tool** button on the Motion shelf, or switch to the **Animate** tab.
- To get something on the stage, click **Mount Showcase Demo**, or draw shapes with the tool dock.

---

# PART 1: The user's view

## 1. Smoke test (2 minutes)

- [ ] **1.1** The editor loads and the console shows no red errors.
- [ ] **1.2** The header shows workspace tabs, with **Design** selected.
- [ ] **1.3** Click **Mount Showcase Demo**. The demo appears on the stage.
- [ ] **1.4** Click **File**, **Edit**, **View** and **Help**. Each opens a menu.
- [ ] **1.5** Press **Ctrl+P**. The command palette opens. Press Escape to close it.

Stop and report if any of these fail.

## 2. Phase 13: menus, commands and the tool dock

### 2.1 Menus run real commands
- [ ] **2.1.1** Make an edit (draw a rectangle), then **Edit → Undo**. It disappears. **Edit → Redo** brings it back. The same happens with **Ctrl+Z** and **Ctrl+Shift+Z**.
- [ ] **2.1.2** **File → Save Project** (or Ctrl+S). The Save button's dirty dot clears.
- [ ] **2.1.3** **File → Export Project File (.lazy.json)** downloads a file. **File → Import Project File…** (and **Open Project…**) opens a file picker.
- [ ] **2.1.4** **View → Zoom In / Zoom Out / Reset Zoom (100%)** change the canvas zoom. Ctrl++, Ctrl+- and Ctrl+0 do the same.
- [ ] **2.1.5** **Edit → Preferences…** (Ctrl+,) opens preferences.
- [ ] **2.1.6** **Help → Keyboard Shortcuts** (Ctrl+/) opens the command palette.

### 2.2 Unbuilt items are honest
- [ ] **2.2.1** Open **Edit**. Cut, Copy, Paste, Duplicate and Delete are **greyed out** and name **Phase 29**.
- [ ] **2.2.2** In **File**, Save As Template names Phase 51, Export Next.js + Prisma Code names Phase 49, New Project and Close Project name Phase 14.
- [ ] **2.2.3** In **View**, Fit to Stage and Show Dot Grid name Phase 20, Snap to Grid names Phase 28, Toggle Fullscreen names Phase 14.
- [ ] **2.2.4** Clicking a greyed item does nothing, with no error. The File menu has **no fake recent-project entries**.

### 2.3 Tier A tools
The tool dock holds Select, Hand, Frame, Rectangle, Ellipse, Line and Text.
- [ ] **2.3.1** Pick **Rectangle**, drag on the stage. **Exactly one** rectangle appears (a past bug created two).
- [ ] **2.3.2** Repeat with **Ellipse**, **Line** and **Frame**. Each creates one layer of the right shape.
- [ ] **2.3.3** Pick **Text**, drag, and a text layer appears.
- [ ] **2.3.4** Start the drag **on top of the device frame**. It still draws (the stage used to swallow drags).
- [ ] **2.3.5** With a shape tool active, click a dock or zoom-control button. **No stray shape** is created.
- [ ] **2.3.6** With a shape tool active, hold **Space** and drag, then middle-drag. The canvas pans.
- [ ] **2.3.7** Hover the canvas and press **V**, **H**, **T**: Select, Hand, Text. **P** is Pen (not built); it must not switch to Pencil.
- [ ] **2.3.8** Undo after each drawing step removes it.

### 2.4 Command palette
- [ ] **2.4.1** Ctrl+P, type `workspace`. You see commands such as Design, Animate, Code, Save Layout, Apply Layout, Delete Layout, Reset Layout.
- [ ] **2.4.2** Type `zoom`, run **Zoom In** from the palette. The canvas zooms.
- [ ] **2.4.3** **Ctrl+A** opens the +Add palette (it now goes through the command bus).

## 3. Phases 14 and 15: workspaces, presets and layouts

### 3.1 Presets
- [ ] **3.1.1** The **Design** tab is selected on a fresh load. The stage is in the middle and the inspector is on the right. The timeline drawer is folded away, but the transport bar stays in the status bar.
- [ ] **3.1.2** The inspector has tabs **Design · Motion · Code**.
- [ ] **3.1.3** Click **Animate**. The timeline opens at roughly 40% of the window height and the **Motion** inspector shows.
- [ ] **3.1.4** Click **Code**. The right dock widens and shows the Live Code inspector.
- [ ] **3.1.5** Click **Design** again. The layout returns to the default.
- [ ] **3.1.6** Each switch feels instant (under 100 ms), and **the stage does not flicker or reload**. Anything you drew stays.
- [ ] **3.1.7** In the default (not full) edition, there are **no** Logic, Data or Debug tabs.
- [ ] **3.1.8** If your build still has a Window or workspace list anywhere, it matches the header tabs. "Full Studio" and the right dock's "Tokens" and "Errors" tabs are gone.

### 3.2 Layout persistence
- [ ] **3.2.1** Pick **Animate**, drag the splitter in front of the right dock to make it wider, then reload. The preset, tab and dock width come back as you left them.
- [ ] **3.2.2** `workspace.resetLayout` (Ctrl+P → "Reset Layout") returns to the Design default.

### 3.3 Saved layouts
- [ ] **3.3.1** Arrange a layout, open the **Layouts** menu, **save** it under a name.
- [ ] **3.3.2** Switch preset, then apply your saved layout from the menu. It comes back.
- [ ] **3.3.3** Reload. The saved layout is still listed.
- [ ] **3.3.4** Delete it. It is gone, also after a reload.
- [ ] **3.3.5** Save more than 20. The 21st is refused or the oldest dropped; either way there's no crash.

### 3.4 Motion inspector
- [ ] **3.4.1** In **Animate**, select a layer that has animation. The Motion inspector lists its clips and tracks. It is read-only. Clicking opens the timeline.
- [ ] **3.4.2** With nothing selected it shows a sensible empty state.

## 4. Phase 16: hostile content (user-facing check)

Use a throwaway project.
- [ ] **4.1** Create a Text layer and set its text to `<img src=x onerror=alert(1)>` (type it in the layer's text, or import a file where the text is that string). **No alert appears.** The stage shows the literal text.
- [ ] **4.2** Give a layer the name `<script>alert(2)</script>`. No alert, and the layer name shows as plain text in any panel that lists it.
- [ ] **4.3** In the AI chat, send a message containing `<b onmouseover=alert(3)>hi</b>`. It shows as text, not bold, and hovering does nothing.

## 5. Phases 17 and 18: what the stage draws

### 5.1 The render gallery
Open `http://localhost:3000/editor/render-gallery`.
- [ ] **5.1.1** The page lists **53 cases** with no console errors.
- [ ] **5.1.2** Every archetype draws something visible, including toggle, badge, fab, icon, divider, background, SVG group and text (the old stage drew these as invisible boxes).
- [ ] **5.1.3** The shapes (rectangle, ellipse, line, polygon, star, arrow, svgPath) look right.
- [ ] **5.1.4** Hostile and edge cases (huge sizes, bad image sources, bad path data, deep nesting) stay **inside their cell**, never overflow and never run script.
- [ ] **5.1.5** Effect surfaces and 3D layers draw a labelled placeholder.

### 5.2 The live stage
- [ ] **5.2.1** Mount the showcase demo. It looks like the demo, apart from having no body padding or default container styles (Lane A says that change is deliberate).
- [ ] **5.2.2** Click a layer on the stage. It is picked (the id is reported).
- [ ] **5.2.3** Edit a layer (drag a keyframe or change a property in the Sequencer). The stage updates **without flashing or reloading**.
- [ ] **5.2.4** With the pointer over the stage, press **Ctrl+Z**, **V**, **H**. They work as shortcuts.
- [ ] **5.2.5** Click into the stage, then type. Keys are not eaten by the frame (the WebKit bug).

## 6. Phase 19: speed on a big document

Open `http://localhost:3000/editor/stage-lab`.
- [ ] **6.1** Click **Load 500 layers**. They appear quickly and the page shows a mount time well under 500 ms.
- [ ] **6.2** Click **Edit one layer**. The `edits:` counter goes up and layer 250's text changes to `Edited …`. With React DevTools → "Highlight updates", only that layer flashes. (The exact render counts are only recorded in the automated test, which sets `window.__LL_TEST__`; to read them yourself, run `window.__LL_TEST__ = true; window.__LL_RENDER_STATS__ = {}` in the console **before** loading the layers.)
- [ ] **6.3** Click **Add one layer** and **Remove one layer**. Only the parent and the new layer flash. Click **Reset render counts** between tries.
- [ ] **6.4** The page stays responsive while you do all of this.

## 7. Regression checks

- [ ] **7.1** Reload mid-edit. Your work is saved and comes back.
- [ ] **7.2** Import `tests/e2e/fixtures/showcase-v4.lazy.json`. It opens, with no error.
- [ ] **7.3** The timeline still works from the **Animate** tab (Lane B's transport, scrubbing and keyboard shortcuts; see `B_TEST_GUIDE.md`).
- [ ] **7.4** Hover the timeline and press **Space**: it plays. Hover the canvas and press **Space**: it pans and does not play.
- [ ] **7.5** Delete a keyframe in the timeline with **Delete**: exactly **one** keyframe goes.

---

# PART 2: The developer's view

## 8. Run the automated suites

```bash
npm test                  # typecheck + unit tests (default and full edition)
npm run lint              # must exit 0; warning budget is 463
npm run build
npm run check:bundle-scope && npm run check:doc-links && npm run check:no-adhoc-compat
npx playwright test --project=chromium
rm -rf test-results playwright-report   # lint scans these if you leave them
```

- [ ] **8.1** Everything passes. If the unit suite fails once on a timing test (`evaluate.test.ts` 200 tracks, or `WasmCableCanvas`'s frame budget), rerun it before reporting. Those are load-sensitive.
- [ ] **8.2** Lane A's e2e specs pass in Chromium, Firefox and WebKit: `command-bus`, `workspace`, `presets`, `render-gallery`, `stage-host`, `stage-incremental`.

## 9. Read the code against the claims

### 9.1 Phase 13
- [ ] **9.1.1** `src/editor/menus/menuModel.tsx` is the single source for the four menus. Every item has either a `command` or a `pending: "Phase N"`. `src/core/commands/__tests__` contains the coverage test that enforces this.
- [ ] **9.1.2** A command can declare zod `args`/`result`. `tryRunCommand(id, args)` returns a reason instead of throwing when validation fails. `defineTypedCommand` exists for typed `run` arguments.
- [ ] **9.1.3** In the palette, run `workspace.setPreset` with bad input if you can (or read its test). It reports why nothing ran.

### 9.2 Phase 14
- [ ] **9.2.1** `wc -l src/editor/shell/EditorShell.tsx` is about 389. A test pins its size and imports.
- [ ] **9.2.2** `src/core/workspace/` holds the zod `WorkspaceLayout`, `applyPreset`, and `useWorkspaceStore` (saved to `localStorage`).
- [ ] **9.2.3** Panels are registered through `registerPanel` in `panels/builtins.tsx`. New panels must go there or into a hook, not into `EditorShell.tsx`.
- [ ] **9.2.4** In DevTools → Network (JS filter), reload in **Design**. The Sequencer, Curve Editor, Export Preview, Output Log, Live Code, History and similar chunks are **not** fetched. Switch to **Animate** and the Sequencer chunk appears.
- [ ] **9.2.5** In the console, `document.querySelector('.dock-layout').dataset.loadedPanels` lists the panels loaded so far; it grows only as you show panels.
- [ ] **9.2.6** **Stage identity.** In the console run `$0 = document.querySelector('.dock-zone--center'); $0.__m = 1`, switch presets and resize splitters, then check `document.querySelector('.dock-zone--center').__m`. It is still `1` (the node was never replaced).
- [ ] **9.2.7** `localStorage` (Application tab) holds the workspace layout and the saved layouts. Corrupt the JSON by hand and reload: the editor falls back to the default layout and does not crash.

### 9.3 Phase 16
- [ ] **9.3.1** `DOCS/INITIAL/decisions/0008-threat-model.md` exists with nine boundaries, seven findings and rules R1–R10.
- [ ] **9.3.2** `escapeHtml` is covered in `SandboxHost.test.ts`.

### 9.4 Phases 17 and 18
- [ ] **9.4.1** `src/core/render/` has `RENDER_DEFINITIONS` as a complete record over the archetype registry. A unit test fails if you add an archetype without a definition.
- [ ] **9.4.2** Limits: 5,000 layers and 64 levels per tree, cycles cut, unsafe image sources and path data dropped.
- [ ] **9.4.3** `public/stage-frame.html` is static and has a `script-src 'none'` policy. In DevTools → Network → `stage-frame.html` → Response Headers, the **Content-Security-Policy** header is there too.
- [ ] **9.4.4** The stage iframe has `src="/stage-frame.html"`, no `srcdoc`, and **no `sandbox` attribute** (WebKit needs this; CSP is the guard instead).
- [ ] **9.4.5** In the console, with the stage showing, try to run code in the frame:
  `const d=document.querySelector('iframe[title="Stage"]').contentDocument; const s=d.createElement('script'); s.textContent='top.__x=1'; d.body.appendChild(s); top.__x`
  It is `undefined`. Repeat in Firefox and WebKit.
- [ ] **9.4.6** `grep -rn 'postMessage(.*"\*"' src/` finds nothing (a test scans `src/` for wildcard targets).
- [ ] **9.4.7** `SandboxHost` loads only in the full edition (`NEXT_PUBLIC_EDITION=full`). `npm run check:bundle-scope` passes.
- [ ] **9.4.8** `decisions/0009-render-host.md` exists.

### 9.5 Phase 19
- [ ] **9.5.1** Each layer renders through `StoreRenderLayer`, which subscribes to its own layer and child list. React DevTools → "Highlight updates": editing one layer flashes that layer only.
- [ ] **9.5.2** `LayerNodeRegistry` maps layer id → element via `nodeRef` on each render definition. `getStageRenderer()` returns the `StageRenderer`. These are the interfaces **Lane B's Phase 57 builds on**.
- [ ] **9.5.3** `measure(layerIds)` returns document-space rectangles, batches many callers into one read per animation frame, and caches until a `ResizeObserver`, `MutationObserver` or window resize. `measureNow` is the synchronous form.
- [ ] **9.5.4** Read `stage-incremental.spec.ts` for the numbers it asserts: 500 layers under 500 ms, `measure()` within 0.5 px of the DOM.
- [ ] **9.5.5** Lane A reports 500 layers mounting in 15 / 42 / 34 ms and edits reaching the DOM in 2–7 ms (Chromium / Firefox / WebKit). On your machine the lab's mount time should be the same order of magnitude.

## 10. Cross-browser pass (about 10 minutes)

Repeat in Firefox (and WebKit):
- [ ] **10.1** Section 1 (smoke).
- [ ] **10.2** 2.3 (draw one shape of each kind) and 5.2.4–5.2.5 (keys reach the stage).
- [ ] **10.3** 3.1 (preset switching) and 3.2.1 (persistence).
- [ ] **10.4** 5.1 (render gallery) and 6 (stage lab).

## 11. Things worth trying to break

- Switch presets 20 times as fast as you can.
- Save 25 layouts with long and odd names (emoji, `<b>`, empty).
- Draw a shape, switch preset, undo.
- Reload while a splitter drag is in progress.
- Import a project with 5,000+ layers or very deep nesting (the limits should cut it, not freeze the tab).
- Paste an `svgPath` with `javascript:` or enormous path data.
- Load 500 layers in the lab, then press Ctrl+Z repeatedly.
- Open two editor tabs on the same project and edit in both.
- Resize the window to phone width and back.
- Put `localStorage` in a private window (it may be blocked): the editor must still start.

## 12. Reporting a problem

For each failure write down: the test number (for example `3.1.6`), what you did, what you expected, what happened, the browser and whether it was `npm run dev` or a production build, any console error text, and a screenshot or screen recording. Hand it to your Claude saying it belongs to **Lane A, Phase NN**. Lane A bugs go to `@NetPranav`. If the fix is small and in a Lane A file, COLLABORATION §3 lets you make it yourself on a `b/` branch, but tell them in the PR.
