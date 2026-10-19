# Lane B manual test guide (Phases 53–57)

**For:** `@OVERxPOWERED`. **Covers:** everything Lane B has merged to `main` so far, tested on top of Lane A's Phases 13–19 (updated 2026-10-19 after Lane A's stack landed). Lane A's own features are in `A_TEST_GUIDE.md`.

**How the guide is organised:** sections 1–8 are the **user's view** (what you see and do in the editor). Section 9 onwards is the **developer's view** (automated suites, code and DevTools checks). Section 11 checks that the two lanes still work together.

| Phase | What it delivered | PR |
|---|---|---|
| 53 | Schema v6: new clip types and triggers, grammar gaps closed (AUD-59) | #19 |
| 54 | The transport (one clock) and the transport bar | #20 |
| 55 | The frame scheduler and a lint ban on `requestAnimationFrame` | #21 |
| 56 | Sequencer playback moved onto the transport; old Sequencer clock removed | #22 |
| 57 | Engine adapters; the kernel animates the real layers on the stage | this branch (`b/phase-57-engine-adapters`), PR pending |

Automated tests already cover most of this. This guide is for the things a person sees and feels, and for poking at edges the tests don't reach. Each test says what to do, what you should see, and what a failure looks like. Tick the boxes as you go, and note any failure with the test number.

> **Known behaviour, not bugs.** Don't report these:
> - **Only some things animate on the stage.** Since Phase 57 the stage shows the kernel's value for every property a layer animates. A layer with no clip does nothing. Behaviours other than `loop`, signal bindings and states are still not shown (see `KERNEL_GAPS`). Web Animations routing is Phase 58, and the scrub/play hand-over is Phase 59, so everything is drawn by the one kernel adapter for now.
> - **Playing runs the whole composition** (5 s by default), not just the clip, and the Sequencer's Loop button toggles the transport's loop.
> - **The Sequencer's Step Backward button** moves the head back 0.1 s. It is not a frame step. The transport bar's step buttons are the frame steps.
> - **The toolbar's Play button** (top of the editor, "Play Live Application Preview") is a different feature. It is not the transport.

---

## 0. Setup

```bash
cd ~/padhai_in_linux/Projects/lazylayouts
git switch main && git pull
npm ci                 # only if package-lock.json changed
npm run dev            # editor at http://localhost:3000/editor
```

- Use **Chromium** for the main pass. Repeat sections 2 and 3 in **Firefox** (and WebKit if you have it) at the end, since CI runs all three.
- Open DevTools → Console and keep it open. **Any red error that appears while you test is a failure**, even if the UI looks fine.
- Open `http://localhost:3000/editor`. It redirects to `…/editor?projectId=…` and creates a project.
- The editor opens in the **Design** workspace (Lane A, Phase 15), with the timeline folded away. The transport bar is still visible in the **status bar at the bottom**, in the centre: Stop · Step back · Play/Pause · Step forward · Loop · timecode.
- **Open the Sequencer** with the **Animate** tab in the header (timeline at about 40% of the window), or with the **Timeline tool** button on the Motion shelf. Its code loads the first time you open it, so give it a second. Its transport buttons are at the top of that panel.
- Sections 2.1–2.4 and 2.6 work in any workspace. The keyboard checks in 2.5 need the pointer over the open timeline or the canvas.

The timecode format everywhere is `MM:SS:FF` (frames, counted from 0 within the second). At the default 60 fps the frame counter runs 00–59.

---

## 1. Smoke test (2 minutes)

- [ ] **1.1** The editor loads and the console shows no red errors.
- [ ] **1.2** The status bar shows the transport bar (also in the Design workspace, where the timeline is folded): five icon buttons and `00:00:00 / 00:05:00`.
- [ ] **1.3** Click **Play** in the transport bar. The timecode counts up and the button turns into **Pause**.
- [ ] **1.4** Click **Pause**. The timecode stops.
- [ ] **1.5** Click **Stop** (leftmost). The timecode returns to `00:00:00`.

If any of these fail, stop and report it. The rest depends on them.

---

## 2. Phase 54: the transport bar

### 2.1 Play, pause, stop
- [ ] **2.1.1** Press Play. After about 2 s the timecode reads close to `00:02:00` (the seconds field is 02, ± a frame or two of display lag).
- [ ] **2.1.2** The Play button is highlighted while playing, and its tooltip says **Pause**.
- [ ] **2.1.3** Press Pause, wait 1 s. The timecode does **not** change.
- [ ] **2.1.4** Press Play again. It continues from where it stopped, not from 0.
- [ ] **2.1.5** Press Stop while playing. It stops **and** returns to `00:00:00`.

### 2.2 Playing to the end
- [ ] **2.2.1** With Loop **off** (default), press Play and wait about 5 s. The head stops at `00:05:00` and the button goes back to Play.
- [ ] **2.2.2** Press Play again at the end. It **restarts from 00:00:00** and plays.

### 2.3 Frame stepping
- [ ] **2.3.1** Press Stop. Click **Step forward** once. The timecode reads `00:00:01`.
- [ ] **2.3.2** Click it 59 more times (or hold the click quickly). It reaches `00:01:00` exactly, i.e. 60 steps equal one second. No skipped or repeated values.
- [ ] **2.3.3** Click **Step back** until `00:00:00`. Once there, another click stays at `00:00:00` (no negative time).
- [ ] **2.3.4** Press Play, then click Step forward. Playback **pauses** and moves one frame.

### 2.4 Loop modes
The Loop button cycles **off → loop → ping-pong → off**. Its tooltip names the current mode (`Loop: off`, `Loop: on`, `Loop: ping-pong`).
- [ ] **2.4.1** Click once: tooltip `Loop: on`, button highlighted. Press Play and wait past 5 s. The timecode **wraps to 00:00:00** and keeps playing.
- [ ] **2.4.2** Click again: `Loop: ping-pong` (different icon). Press Play and watch past 5 s. The timecode counts up to 5 s, then **counts down** toward 0, then up again.
- [ ] **2.4.3** Click again: back to `Loop: off`, not highlighted.

### 2.5 Keyboard (J / K / L and arrows)
Keyboard commands apply only when the **pointer is over the timeline (Sequencer) or the canvas**, and never while typing in a text field. This is how focus scopes work in this editor.
- [ ] **2.5.1** Hover over the **Sequencer panel**. Press **→**: one frame forward. Press **←**: one frame back.
- [ ] **2.5.2** Hover over the Sequencer. Press **L**: it plays forward at 1×. Press **L** again: faster. Each press steps 1× → 2× → 4× → 8× (hard to see exactly; the timecode visibly speeds up). A fifth press stays at 8×.
- [ ] **2.5.3** While playing at 4× or 8×, press **J**: it slows one rung. Keep pressing **J** until it stops (slowing past 1× **stops**, it does not jump into reverse).
- [ ] **2.5.4** From a stop with the head at about 3 s, press **J**: it plays **backwards** at 1×. Press **J** again for 2× backwards.
- [ ] **2.5.5** Press **K** while shuttling: it stops and resets to 1× (a following **Play** goes forward at normal speed).
- [ ] **2.5.6** **Typing guard:** click into any text input in the editor (for example a layer name or a property field), then press **J**, **K**, **L**, **→**. The transport must **not** move.
- [ ] **2.5.7** Move the pointer over the **Inspector or Outliner** (not canvas or timeline) and press **L**. Nothing should happen.
- [ ] **2.5.8** Open the command palette (**Ctrl+P**) and search `transport`. You should see: Play / Pause, Go to Start, Play, Pause, Stop and Return to Start, Step Forward/Back One Frame, Shuttle Reverse (J), Stop Shuttle (K), Shuttle Forward (L), Cycle Loop Mode. Run a few; each works.

### 2.6 Timecode readout
- [ ] **2.6.1** The timecode updates in visible ~10 Hz steps during playback (not a blur). That is by design.
- [ ] **2.6.2** After pausing, the timecode settles on the final frame within about 0.1 s. It must not stay one step behind.
- [ ] **2.6.3** The total after the slash is `00:05:00` for a fresh project.

---

## 3. Phase 56: the Sequencer on the same clock

Switch to the **Animate** tab (or use the Timeline tool). If the project has a layer with a clip, you will see tracks and keyframes. If it has none, use the default fallback tracks shown.

### 3.1 One clock, two controls
- [ ] **3.1.1** Press **Play in the Sequencer** (its own toolbar). The **status-bar transport bar** also switches to Pause and counts up.
- [ ] **3.1.2** Press **Pause in the transport bar**. The Sequencer's button also flips back to Play.
- [ ] **3.1.3** While paused, compare the Sequencer's timecode (`MM:SS.mmm` format) with the bar's. They must be the same moment, within one frame (about 17 ms). For example, `00:01.250` and `00:01:15` agree.
- [ ] **3.1.4** Hover the playhead head (the small handle on the needle). The tooltip says `Playhead: x.xxxs` and matches the timecode.

### 3.2 Seeking
- [ ] **3.2.1** Click on the Sequencer **ruler** at about 0.5 s. The needle jumps there and the **transport bar** timecode follows (about `00:00:30`).
- [ ] **3.2.2** Click inside a **keyframe lane** (empty space). Same result.
- [ ] **3.2.3** **Drag the playhead head** left and right. The needle follows the mouse, the bar's timecode follows the needle, and nothing lags badly.
- [ ] **3.2.4** Drag beyond the ends. The needle stops at 0 and at the clip's end.
- [ ] **3.2.5** Click **Stop & Reset** (Sequencer). Both go to zero.
- [ ] **3.2.6** Click **Step Backward** (Sequencer). Head moves back about 0.1 s, never below 0.

### 3.3 Needle smoothness
- [ ] **3.3.1** Press Play. The needle moves **smoothly**, with no stutter or jumping, while the timecode text updates in coarser steps. Both must show the same moment.
- [ ] **3.3.2** Let it run for 30 s while interacting elsewhere (scroll the panel, hover things). It never freezes or drifts away from the bar.
- [ ] **3.3.3** Switch to another browser tab for 10 s during playback and come back. The head has advanced a sensible amount (at most about 0.25 s per frame gap is counted, so it may have **less** than 10 s elapsed, which is by design) and does **not** jump to the end.

### 3.4 Loop and rate from the Sequencer
- [ ] **3.4.1** Click the Sequencer's **Loop** button. The status-bar loop button switches to `Loop: on` too (and the reverse).
- [ ] **3.4.2** Click the speed pills (`0.25x`, `0.5x`, `1x`, `2x`). Playback speed changes accordingly; the pill for the current rate is highlighted.
- [ ] **3.4.3** After pressing **L** for a faster shuttle (such as 4×), none of the pills are highlighted. That is expected, since 4× isn't a pill.

### 3.5 Keyboard on the timeline
- [ ] **3.5.1** Hover over the Sequencer and press **Space**: toggles play/pause. Press it twice quickly: no stuck state.
- [ ] **3.5.2** Hover over the Sequencer and press **Home**: head returns to 0 (play state unchanged).
- [ ] **3.5.3** Hover over the **canvas** and press **Space**: it must **not** play the transport. Space is the hand/pan tool there (hold Space and drag to pan).
- [ ] **3.5.4** Hover over the Sequencer, select a keyframe, press **Delete**: the keyframe is deleted (this command was kept). **Ctrl+D** duplicates it. **Ctrl+Z** undoes.
- [ ] **3.5.5** Click into a text field, press **Space**: it types a space and does not toggle playback.

### 3.6 Keyframe tools that use the playhead
- [ ] **3.6.1** Move the head to a time (say 0.8 s), click **Add keyframe at current playhead position**. A keyframe appears on the selected track at the head's time (rounded to 1/120 s).
- [ ] **3.6.2** Scroll simulator: if the ScrollTrigger bar is visible, moving its simulated scroll progress moves the head proportionally.
- [ ] **3.6.3** **Undo** (Ctrl+Z) after adding a keyframe removes it, and the head does not move.

### 3.7 Panel behaviour
- [ ] **3.7.1** While playing, switch the Sequencer's view between **Tracks** and **Curves**. Playback continues; the needle is still in the right place in tracks view.
- [ ] **3.7.2** Close and reopen the Sequencer during playback. The transport keeps playing (it isn't owned by the panel), and the reopened needle is at the right time immediately, with no jump from 0.
- [ ] **3.7.3** Dock/undock or tear off the Sequencer panel if your build allows it. The needle still follows.

---

## 3A. Phase 57: the kernel on the stage

You need a layer with an animation. Draw a **Rectangle** on the stage, select it, open the timeline (**Animate** tab) and use the Sequencer's add-animation menu to give it an entrance or fade (anything that changes opacity, position or size). If you have a project with animated layers, use that instead.

- [ ] **3A.1** Press **Play** (status bar). The rectangle visibly animates on the stage while the playhead moves.
- [ ] **3A.2** Press **Pause**. The rectangle stops where it is, and does not snap back.
- [ ] **3A.3** **Drag the playhead** back and forth along the ruler. The rectangle follows your hand, forwards and backwards, without lag or flicker.
- [ ] **3A.4** Click the ruler at 0 s. The rectangle is at its first keyframe. Click at the clip's end: it is at its last keyframe.
- [ ] **3A.5** The animation's **easing** is visible: a slow-in clip starts slowly, a slow-out clip ends slowly. Compare with the curve in the Curves view.
- [ ] **3A.6** Step with **→** / **←** over the timeline. The rectangle moves one frame at a time.
- [ ] **3A.7** With Loop on, play past the end: the rectangle jumps back to its start and repeats. With ping-pong it runs backwards.
- [ ] **3A.8** **Edit while paused.** Drag a keyframe in the Sequencer, or change its value. The stage updates at once, at the same playhead time.
- [ ] **3A.9** **Delete the clip** (or its track). The rectangle returns to its normal, un-animated look and no longer moves with the playhead.
- [ ] **3A.10** **Undo** that deletion (Ctrl+Z). The animation is back.
- [ ] **3A.11** Switch presets (**Design / Animate / Code**) while the rectangle is at a mid-animation time. It stays there and the stage is not redrawn from scratch.
- [ ] **3A.12** Animate **position** (transform x or y) on a layer that is rotated (set its rotation in a project file or the inspector if available). The layer keeps its rotation while it moves.
- [ ] **3A.13** Draw a second shape while the first one is playing. The new shape appears and the first keeps animating.
- [ ] **3A.14** Console stays free of red errors through all of the above.

Developer check: `/editor/stage-lab` has a **Load 10 animations** button. It is used by `tests/e2e/stage-engine.spec.ts`, which seeks ten reference animations to five times each and compares the stage with the kernel to within 0.5 px.

---

## 4. Phase 55: the frame scheduler (indirect checks)

The scheduler has no UI. You can still see its effects.

- [ ] **4.1** **One loop.** Open DevTools → Performance, record 3 s of playback, and stop. In the flame chart you should see one `requestAnimationFrame` callback per frame (from the scheduler), not several separate ones from the transport and the Sequencer. (Other panels, such as the dock splitters, may add their own while dragging; that is allowed.)
- [ ] **4.2** **Idle is idle.** With playback stopped, record 3 s in the Performance panel. The scheduler's loop is still registered while the Sequencer or bar is mounted, but there must be no long tasks or growing memory.
- [ ] **4.3** **React commits stay low.** Install React DevTools if you have it, enable "Highlight updates when components render", and play. The status-bar timecode and Sequencer timecode flash about 10 times a second; **the rest of the Sequencer panel does not flash every frame** (tracks, lanes and headers stay quiet).
- [ ] **4.4** **Lint ban.** In a scratch file under `src/editor/`, write `requestAnimationFrame(() => {});` and run `npx eslint <file>`. It must report an error pointing to `frameScheduler`. Delete the file after. (Files in `src/core/time/` and the six allowlisted ones, such as the dock splitters, are exempt.)
- [ ] **4.5** **Hidden tab.** Start playback, switch tab for ~20 s, return. The head did not leap by 20 s (gap is clamped), and the console has no errors.
- [ ] **4.6** **Low-power sanity.** In DevTools → Performance, set **CPU: 6× slowdown**, then play. Playback gets choppier but the timecode and needle stay in sync, and nothing errors.

---

## 5. Phase 54/55: staying in step with the document

The transport follows the active composition's fps, duration and work area.

- [ ] **5.1** A fresh project's total reads `00:05:00` (5 s at 60 fps).
- [ ] **5.2** Add or edit a clip so the main composition grows beyond 5 s (a clip with a long duration or delay). The total after the slash updates after the document change, without a reload, and playing runs to the new end.
- [ ] **5.3** **Undo** that edit. The total returns to `00:05:00`.
- [ ] **5.4** Seek to 4.5 s, then undo a change that shortens the composition below that. The head clamps inside the new length. It is never past the end.
- [ ] **5.5** Reload the page. The transport starts at `00:00:00`, paused. Transport state is not saved in the project; the document is.

---

## 6. Phase 53: schema v6

### 6.1 Old projects still open
These fixtures are real exports from older schemas.

- [ ] **6.1.1** In the editor choose **File → Import Project File…** and pick `tests/e2e/fixtures/showcase-v4.lazy.json`. It opens with no error toast and no console errors. The stage shows the showcase.
- [ ] **6.1.2** Repeat with `tests/e2e/fixtures/showcase-v2.lazy.json` (an even older schema). Same expectation.
- [ ] **6.1.3** For each, choose **File → Export Project File (.lazy.json)**, then open the exported file in a text editor and search for `"schemaVersion"`. It reads **6**.
- [ ] **6.1.4** Compare an exported file from the v4 import with one exported from **Mount Showcase Demo** (the native demo): apart from IDs and timestamps they should describe the same document. (The automated test `composition-migration.spec.ts` checks this precisely; here you are only sanity-checking.)

### 6.2 New file, round trip
- [ ] **6.2.1** Make a few edits (add a layer, add a keyframe), export, then **import that file into a fresh project** (or after a hard reload). It reopens identically and `schemaVersion` is still 6.
- [ ] **6.2.2** Make 20 edits, then undo all 20. The document returns to blank. This was an older gate; schema changes must not have broken it.

### 6.3 A file from "the future"
- [ ] **6.3.1** Copy an exported `.lazy.json`, edit `"schemaVersion": 6` to `7` (in both the file header and the snapshot document if present), and import it. The editor must refuse with a readable message (something like "saved by a newer LazyLayout"), and must **not** crash or open a corrupt project.

### 6.4 New vocabulary validates
There is no UI for the new categories yet (the timeline in Phase 61 adds them), so test through the exported file.

1. Export a project that has at least one clip. Open the JSON and find a clip under `snapshot.document.clips`.
2. Make a copy and change that clip's `"type"` to each of `"exit"`, `"focus"`, `"layout"` (and the trigger to `"unmount"` for exit, `"focus"` for focus, `"layoutChange"` for layout). Change `"schemaVersion"` as needed (keep it 6).
3. Import each copy.

- [ ] **6.4.1** `exit` + `unmount`, `focus` + `focus`, `layout` + `layoutChange`: each imports without error.
- [ ] **6.4.2** `"type": "stagger"` **without** a `stagger` object: the import should be **repaired or rejected with a message that mentions the stagger**, not silently accepted.
- [ ] **6.4.3** `"type": "stagger"` **with** `"stagger": { "each": 0.1, "from": "start" }`: imports.
- [ ] **6.4.4** A bogus trigger such as `"trigger": "whenever"`: rejected or repaired with a message. No crash.

After a successful import of an `exit`/`unmount` clip, look at the document: the clip should sit in its **own interaction composition** (`compositions` has a `comp_<clipId>` with `"trigger": { "on": "unmount", … }`), not in `comp_main`. The transport bar keeps playing `comp_main` and the layer is not affected by the exit clip. This is correct.

---

## 7. Regression checks (things that must still work)

- [ ] **7.1** **Save and persistence:** edit, reload, and your edit is still there. The Save button's dirty dot clears.
- [ ] **7.2** **Undo/redo** (Ctrl+Z / Ctrl+Shift+Z) across keyframe edits works. Dragging a keyframe is **one** undo step.
- [ ] **7.3** **Canvas:** tool shortcuts (V, H, P, T, S…) work when hovering the canvas, and none of them is stolen by the new J/K/L bindings (J, K and L are not tools).
- [ ] **7.3b** **Presets keep time.** Press Play, then click **Design**, **Animate**, **Code** and back. Playback is not interrupted and the timecode never jumps to 0. The status-bar transport survives each switch.
- [ ] **7.4** **Command palette** (Ctrl+P / Ctrl+K) opens, and shortcuts displayed for transport commands are correct.
- [ ] **7.5** **Rules engine:** in the Sequencer's add-animation menu, an animation that isn't legal for the selected layer is **disabled with a reason** (Phase 8 behaviour).
- [ ] **7.6** **Export:** *File → Export* paths still run. The generated code is unaffected by the transport.
- [ ] **7.7** **Production build:** `npm run build && npm run start`, then repeat section 1 on `http://localhost:3000/editor`. Dev and production builds behave differently with timers; both must work.

---

## 8. Cross-browser pass (about 10 minutes)

Repeat in **Firefox** (and **WebKit/Safari** if available):
- [ ] **8.1** Section 1 (smoke).
- [ ] **8.2** 2.1–2.4 (transport bar).
- [ ] **8.3** 3.1, 3.2, 3.5.1 (Sequencer on the same clock).
- [ ] **8.4** 6.1.1 and 6.1.3 (import and schema version).
- [ ] **8.5** 3A.1–3A.4 (the stage animates), then 11.1 and 11.2 (Lane A and Lane B together).

---

# Developer's view

## 9. Run the automated suite and compare

Run these so you can tell whether what you see manually matches what CI says.

```bash
npm test                 # typecheck + unit tests
npm run lint             # must exit 0 (warning budget is enforced)
npm run build
npm run check:bundle-scope && npm run check:doc-links && npm run check:no-adhoc-compat
npx playwright test --project=chromium     # 20 tests, about 25 s
rm -rf test-results playwright-report      # lint scans these if you leave them
```

The Lane B specs are `tests/e2e/transport-bar.spec.ts`, `tests/e2e/playback-on-clock.spec.ts`, `tests/e2e/deterministic-clock.spec.ts` and the two migration specs. Unit tests live in `src/core/time/__tests__/` (transport, scheduler) and `src/core/document/__tests__/migrations.test.ts` (v5 → v6).

---

## 10. Things worth trying to break

These have no pass/fail line, but a finding here is worth reporting.

- Mash **L** and **J** alternately very fast while hovering the Sequencer.
- Press **Play** and **Stop** ten times a second.
- Set Loop to ping-pong and **seek** by clicking the ruler during playback.
- Drag the playhead while playing.
- Step forward 300 times at the end of the composition (it must stop at the end).
- Switch the Sequencer's selected layer or clip during playback.
- Delete the clip the Sequencer is showing while playing.
- Open the editor in **two tabs** of the same project: each tab has its own transport and neither should affect the other.
- Resize the browser window and zoom (Ctrl +/-) during playback. The needle and the ruler should stay aligned.
- Leave playback looping for **10 minutes** and watch the browser's memory (DevTools → Memory). It should stay flat.

---

## 11. Lane A and Lane B together

Lane A's Phases 13–19 rewrote the shell and the stage around Lane B's work. These checks confirm the join is sound and that the ground for Phase 57 is ready.

### 11.1 The user's view
- [ ] **11.1.1** The **Animate** preset shows the Sequencer and the transport bar together. Play from either, and both move.
- [ ] **11.1.2** In **Design**, with the timeline folded, press Play in the status bar. The timecode runs. Open the timeline (Animate): the needle is already at the right time.
- [ ] **11.1.3** Hover the **stage** and press **Space**: it pans (does not play). Hover the **timeline** and press **Space**: it plays. Hover the stage and press **L**: shuttle works there too (the stage frame now holds the canvas focus scope while the pointer is over it).
- [ ] **11.1.4** Click into the stage, then press **J / K / L / ← / →**. The transport responds. Click into a text field and they do not.
- [ ] **11.1.5** Draw a rectangle with the tool dock while the transport is playing. Playback continues, the shape appears and Ctrl+Z removes it.
- [ ] **11.1.6** Reload in **Animate**. The layout returns and the transport starts at `00:00:00`.

### 11.2 The developer's view
- [ ] **11.2.1** `src/core/time/` is untouched by Lane A. Check with `git log --oneline -- src/core/time`: only Lane B commits.
- [ ] **11.2.2** The transport is bound to the document in the new shell: `TransportBar` is still mounted by `StatusBar.tsx`, and `transportBinding.ts` follows the active composition. Edit a composition's length and the total after the slash changes (test 5.2).
- [ ] **11.2.3** `grep -rn "requestAnimationFrame" src/ | grep -v "src/core/time"` lists only the allowlisted files. Lane A's `StageRenderer.measure()` batching runs in the scheduler's `overlay` phase (`runOnNextFrame`), so the lint ban holds for Lane A's code too.
- [ ] **11.2.4** Phase 57 uses Lane A's interfaces: `StageHost` calls `installStageEngine(renderer)`, which reads elements from `renderer.registry` (the `LayerNodeRegistry`). Nothing writes to the stage through React state or `postMessage`.
- [ ] **11.2.5** Per-frame writes happen in the scheduler's `apply` phase (`src/core/engine/stage/StageEngine.ts`), not in a new animation-frame loop. `grep -rn requestAnimationFrame src/core/engine/stage` finds nothing.

---

## 12. Reporting a problem

For each failure write down:

1. The test number (for example `3.5.3`).
2. What you did, what you expected and what happened.
3. Browser, and whether it was `npm run dev` or a production build.
4. Any console error text.
5. A screenshot or a short screen recording for timing problems.

Hand that to your Claude, saying which phase it belongs to (53–56). Fixes go on a `b/phase-NN-…` branch and through a PR, as usual.
