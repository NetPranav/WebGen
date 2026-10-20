# Lane B manual test guide (Phases 53–60)

**For:** `@OVERxPOWERED`. **Covers:** everything Lane B has merged to `main`, tested together with Lane A's work (`A_TEST_GUIDE.md`).
**Updated:** after every phase. The newest phase is at the end of section 3 (look for "NEW" in the table below).

| Phase | What you can now do or see | PR | Section |
|---|---|---|---|
| 53 | Projects use schema v6 (new clip types and triggers) | #19 | 3.1 |
| 54 | One clock: a transport bar in the status bar | #20 | 3.2 |
| 55 | One frame loop for the whole editor (no UI of its own) | #21 | 3.3 |
| 56 | The Sequencer plays on that clock | #22 | 3.4 |
| 57 | Pressing play animates the real layers on the stage | #36 | 3.5 |
| 58 | Simple animations run as Web Animations | #44 | 3.6 |
| 59 | Scrubbing is exact, playing hands over smoothly | #47 | 3.7 |
| 60 | A parity badge in the status bar checks the engine against the kernel | this PR (NEW) | 3.8 |

## How to use this guide

Every test has the same shape:

- **Do:** exactly what to click, press or type.
- **Expect:** what you should see.
- **Fails if:** what a bug looks like, so you know when to write it down.

Tick the box when the result is what **Expect** says. If it isn't, don't tick it: write the test number and what happened (section 6 says how to report it).

Each phase has a **User test** (click around, no tools needed) and a **Developer test** (terminal, DevTools or code).

> **Known behaviour, not bugs.** Don't report these:
> - **A project with no animation does nothing when you press Play.** Only the playhead and timecode move. Make an animation with Recipe A below.
> - **The Sequencer works on the page's root container**, not on whichever layer you click. Layer-by-layer animation arrives with the timeline phases (61 onward).
> - **The toolbar's "Play Live Application Preview"** is a different feature from the transport.
> - **The Sequencer's Step Backward button** moves 0.1 s, not one frame. The status bar's step buttons move one frame.
> - **Only animation of numbers, lengths, angles and colours is drawn on the stage.** Behaviours other than `loop`, signal bindings, states and path morphs are not shown yet (`KERNEL_GAPS` in `src/core/kernel/evaluate.ts`).

---

## 1. Setup

```bash
cd ~/padhai_in_linux/Projects/lazylayouts
git switch main && git pull
npm ci                 # only if package-lock.json changed
npm run dev            # then open http://localhost:3000/editor
```

- Use **Chromium** (Chrome, Brave, Edge) for the main pass. Section 5 repeats the quick checks in **Firefox** and **Safari/WebKit**.
- Open DevTools → **Console** and keep it open. **Any red error that appears while you test is a failure**, even if the screen looks fine.
- `/editor` redirects to `/editor?projectId=…` and creates a project.

### 1.1 Where things are (the map you need for every test)

| Thing | Where | What it is called |
|---|---|---|
| Workspace switch | Top header | Three tabs: **Design workspace**, **Animate workspace**, **Code workspace** |
| Transport bar | **Status bar**, very bottom, centre | Buttons **Stop and return to start**, **Step back one frame**, **Play** (becomes **Pause**), **Step forward one frame**, **Loop: off** (cycles), then a timecode like `00:00:00 / 00:05:00` |
| Sequencer (the timeline panel) | Bottom of the screen in the **Animate** tab | Tab **Motion Sequencer** (next to Content Browser and Export Preview). Has its own **Play**, **Stop and Reset**, **Step Backward**, **Toggle Loop**, speed pills, **+ Keyframe**, and a ruler across the top |
| Demo content | Header, right of the canvas-size buttons | Button **Mount Showcase Demo** |
| Stage | Centre | The canvas with the frames |
| Layers panel | Left dock | Button **Layers** |

The status bar's timecode is `MM:SS:FF` (frames, 00–59 at the default 60 fps). The Sequencer's timecode is `MM:SS.mmm` (milliseconds). Both show the same moment.

### 1.2 Recipe A: make something animate (used by most tests below)

1. Open `http://localhost:3000/editor`.
2. Click the **Animate workspace** tab. Wait a second: the Sequencer loads.
3. Click **Mount Showcase Demo** (header). A page with a heading and a button appears on the stage.
4. In the Sequencer, click on the **ruler** (the strip of seconds at the top of the timeline) about 0.4 s from its left end. The needle jumps there.
5. Click **+ Keyframe**. The panel now lists two tracks: `appearance.opacity` and `transform.y`.
6. Click **Stop and return to start** (status bar).
7. Click **Play** (status bar).

**Expect:** the whole demo page **fades in and slides up a little** over well under a second, then stays put.
**Fails if:** nothing moves, or the page jumps to its final look at once.

This animates the root container (the Sequencer's current layer). From here, "the demo" means this animated page.

---

## 2. Quick smoke test (2 minutes)

- [ ] **S1** Do: open `/editor`. Expect: the editor loads, the console has no red errors.
- [ ] **S2** Do: look at the status bar. Expect: five transport buttons and `00:00:00 / 00:05:00`.
- [ ] **S3** Do: click **Play**. Expect: the timecode counts up and the button becomes **Pause**.
- [ ] **S4** Do: click **Pause**. Expect: the count stops.
- [ ] **S5** Do: click **Stop and return to start**. Expect: back to `00:00:00`.

If any step fails, stop and report it. Everything else depends on them.

---

## 3. Tests by phase

### 3.1 Phase 53: schema v6

**What changed:** the project file format moved from version 5 to 6. New clip types (`exit`, `focus`, `stagger`, `layout`) and triggers (`unmount`, `layoutChange`) exist in the file format. There is no screen for them yet, so you test through files.

**User test: old projects still open**

- [ ] **T53.1** Do: in the editor choose **File → Import Project File…** and pick `tests/e2e/fixtures/showcase-v4.lazy.json` from the repo. Expect: the project opens, with no error message and no console errors.
- [ ] **T53.2** Do: repeat with `tests/e2e/fixtures/showcase-v2.lazy.json` (an older format). Expect: the same.
- [ ] **T53.3** Do: after each import, choose **File → Export Project File (.lazy.json)**. Open the downloaded file in a text editor and search for `"schemaVersion"`. Expect: it says `6`.
- [ ] **T53.4** Do: make a few edits (draw a rectangle with **Rectangle Tool**, add a keyframe with Recipe A), export, reload the page, then import that file. Expect: it reopens identically and `schemaVersion` is still `6`.

**Developer test: the file format**

- [ ] **T53.5** Do: take an exported file, change `"schemaVersion": 6` to `7` (everywhere it appears) and import it. Expect: the editor refuses with a readable message and doesn't crash or open a broken project.
- [ ] **T53.6** Do: in an exported file find a clip under `snapshot.document.clips` and set its `"type"` to `"exit"` and its trigger to `"unmount"`, then import. Expect: it imports. In the re-exported file the clip sits in its own composition (`compositions` contains `comp_<clipId>` with `"trigger": { "on": "unmount" }`), not in `comp_main`.
- [ ] **T53.7** Do: repeat T53.6 with type `"focus"` + trigger `"focus"`, and `"layout"` + `"layoutChange"`. Expect: each imports.
- [ ] **T53.8** Do: set a clip's type to `"stagger"` without a `stagger` object. Expect: rejected or repaired with a message that mentions the stagger, not silently accepted. With `"stagger": { "each": 0.1, "from": "start" }` it imports.
- [ ] **T53.9** Do: set a trigger to `"whenever"`. Expect: rejected or repaired with a message. No crash.
- [ ] **T53.10** Do: `npx tsx --test src/core/document/__tests__/migrations.test.ts`. Expect: all pass (v5 → v6 changes only the version).

---

### 3.2 Phase 54: the transport (one clock)

**What changed:** a single clock owns the time, frame rate, loop mode and playback speed. Its controls are in the status bar.

**User test**

*Play, pause, stop*
- [ ] **T54.1** Do: click **Play**, wait 2 seconds, look at the timecode. Expect: about `00:02:00` (the seconds field is 02, give or take a few frames).
- [ ] **T54.2** Do: look at the Play button while playing. Expect: it is highlighted and its tooltip says **Pause**.
- [ ] **T54.3** Do: click **Pause**, wait 1 second. Expect: the timecode does not change.
- [ ] **T54.4** Do: click **Play** again. Expect: it continues from where it stopped, not from 0.
- [ ] **T54.5** Do: while playing, click **Stop and return to start**. Expect: it stops and the timecode is `00:00:00`.

*Playing to the end*
- [ ] **T54.6** Do: with **Loop: off**, click **Play** and wait about 5 seconds. Expect: the head stops at `00:05:00` and the button returns to Play.
- [ ] **T54.7** Do: click **Play** again at the end. Expect: it restarts from `00:00:00` and plays.

*Frame stepping*
- [ ] **T54.8** Do: click **Stop and return to start**, then **Step forward one frame** once. Expect: `00:00:01`.
- [ ] **T54.9** Do: click Step forward 59 more times. Expect: exactly `00:01:00` (60 frames = 1 second). No skipped or repeated numbers.
- [ ] **T54.10** Do: click **Step back one frame** until `00:00:00`, then once more. Expect: it stays at `00:00:00`.
- [ ] **T54.11** Do: click **Play**, then **Step forward one frame**. Expect: playback pauses and moves one frame.

*Loop modes* (the Loop button cycles off → on → ping-pong → off)
- [ ] **T54.12** Do: click Loop once. Expect: tooltip **Loop: on**, button highlighted. Click **Play** and wait past 5 s: the timecode wraps to `00:00:00` and keeps playing.
- [ ] **T54.13** Do: click Loop again. Expect: **Loop: ping-pong**. Play past 5 s: the timecode counts up to 5 s, then **down** towards 0, then up again.
- [ ] **T54.14** Do: click Loop again. Expect: **Loop: off**, not highlighted.

*Keyboard* (shortcuts work only while the mouse pointer is **over the Sequencer or over the canvas**, and never while typing in a text field)
- [ ] **T54.15** Do: open the **Animate** tab, hover the Sequencer, press **→** then **←**. Expect: one frame forward, then one frame back.
- [ ] **T54.16** Do: hover the Sequencer and press **L**. Expect: plays forward. Press **L** again: faster (2×), again 4×, again 8×. A fifth press stays at 8×.
- [ ] **T54.17** Do: while playing at 4× or 8×, press **J**. Expect: it slows one step per press, and slowing past 1× **stops** (it does not reverse).
- [ ] **T54.18** Do: stop, move the head to about 3 s (click the Sequencer ruler), hover the Sequencer, press **J**. Expect: plays **backwards** at 1×. Press **J** again: 2× backwards.
- [ ] **T54.19** Do: while shuttling, press **K**. Expect: it stops and resets to 1× (a following **Play** goes forward at normal speed).
- [ ] **T54.20** Do: click into any text box in the editor (for example rename a layer, double-click its name in the Layers panel), then press **J**, **K**, **L**, **→**. Expect: the transport does **not** move.
- [ ] **T54.21** Do: hover the Layers panel (not the canvas, not the Sequencer) and press **L**. Expect: nothing happens.
- [ ] **T54.22** Do: press **Ctrl+P** (command palette), type `transport`. Expect: Play / Pause, Go to Start, Play, Pause, Stop and Return to Start, Step Forward/Back One Frame, Shuttle Reverse (J), Stop Shuttle (K), Shuttle Forward (L), Cycle Loop Mode. Run three of them: each works.

*Timecode*
- [ ] **T54.23** Do: watch the timecode while playing. Expect: it updates about 10 times a second (visible steps, not a blur). This is by design.
- [ ] **T54.24** Do: click Pause. Expect: the timecode settles on the final frame within 0.1 s and doesn't stay one step behind.

**Developer test**
- [ ] **T54.25** Do: `npx tsx --test src/core/time/__tests__/transport.test.ts`. Expect: all pass.
- [ ] **T54.26** Do: open `src/core/time/transport.ts` and check that `timeToFrame` is `Math.round(time * fps)` and that nothing in the file owns a timer (no `setInterval`, no `requestAnimationFrame`).
- [ ] **T54.27** Do: `npx playwright test tests/e2e/transport-bar.spec.ts --project=chromium`. Expect: pass.

---

### 3.3 Phase 55: the frame scheduler

**What changed:** one animation-frame loop runs everything per frame, in the order input → evaluate → apply → render → overlay → stats. It has no screen. You check its effects.

**User test**
- [ ] **T55.1** Do: Recipe A, then press **Play** and use the editor normally (hover panels, scroll the Sequencer) for 30 seconds. Expect: playback never freezes or stutters.
- [ ] **T55.2** Do: Play, switch to another browser tab for 10 seconds, come back. Expect: the head advanced a little but did **not** leap by 10 seconds, and the console has no errors. (The scheduler counts at most 0.25 s per frame gap.)

**Developer test**
- [ ] **T55.3** Do: DevTools → Performance, record 3 seconds of playback, stop. Expect: one `requestAnimationFrame` callback per frame, not several competing ones. (The dock splitters have their own while you drag them; that is allowed.)
- [ ] **T55.4** Do: record 3 seconds with playback **stopped**. Expect: no long tasks, no growing memory.
- [ ] **T55.5** Do: install React DevTools, turn on "Highlight updates when components render", and play. Expect: the status bar timecode and the Sequencer timecode flash about 10 times a second; the rest of the Sequencer (tracks, lanes, headers) stays quiet.
- [ ] **T55.6** Do: create `src/editor/tmp.ts` containing `requestAnimationFrame(() => {});` and run `npx eslint src/editor/tmp.ts`. Expect: an error telling you to use the frame scheduler. Delete the file afterwards.
- [ ] **T55.7** Do: `npx tsx --test src/core/time/__tests__/scheduler.test.ts`. Expect: all pass.

---

### 3.4 Phase 56: the Sequencer on the same clock

**What changed:** the Sequencer has no clock of its own. Its play, pause, loop, speed and playhead all use the transport.

**User test** (open the **Animate workspace** tab and the **Motion Sequencer** tab first)

*One clock, two sets of controls*
- [ ] **T56.1** Do: click **Play** in the **Sequencer's** toolbar. Expect: the **status bar** button also becomes Pause and its timecode counts up.
- [ ] **T56.2** Do: click **Pause** in the **status bar**. Expect: the Sequencer's button flips back to Play.
- [ ] **T56.3** Do: while paused compare the Sequencer's timecode (`MM:SS.mmm`) with the status bar's (`MM:SS:FF`). Expect: the same moment within one frame (for example `00:01.250` and `00:01:15`).

*Seeking*
- [ ] **T56.4** Do: click on the Sequencer **ruler** about 0.5 s from the left. Expect: the needle jumps there and the status bar timecode follows (about `00:00:30`).
- [ ] **T56.5** Do: click in an empty part of a keyframe lane. Expect: the same.
- [ ] **T56.6** Do: drag the playhead's head (the small handle on top of the needle) left and right. Expect: the needle follows the mouse, the status bar timecode follows the needle, no big lag.
- [ ] **T56.7** Do: drag past both ends. Expect: it stops at 0 and at the end.
- [ ] **T56.8** Do: click **Stop and Reset** (Sequencer). Expect: both go to zero.
- [ ] **T56.9** Do: click **Step Backward** (Sequencer). Expect: the head moves back about 0.1 s and never below 0.

*Needle smoothness*
- [ ] **T56.10** Do: click Play and watch the needle. Expect: it moves smoothly with no stutter while the timecode text changes in coarser steps. Both show the same moment.
- [ ] **T56.11** Do: let it run for 30 s while you hover and scroll the panel. Expect: it never freezes or drifts from the status bar.

*Loop and speed from the Sequencer*
- [ ] **T56.12** Do: click the Sequencer's **Toggle Loop**. Expect: the status bar Loop button changes to **Loop: on** too, and the other way round.
- [ ] **T56.13** Do: click the speed pills `0.25x`, `0.5x`, `1x`, `2x` while playing. Expect: playback speed changes and the current pill is highlighted.
- [ ] **T56.14** Do: hover the Sequencer and press **L** until 4×. Expect: no pill is highlighted (4× has no pill).

*Keyboard over the timeline*
- [ ] **T56.15** Do: hover the Sequencer and press **Space**. Expect: play, then pause on the second press. Press it twice quickly: no stuck state.
- [ ] **T56.16** Do: hover the Sequencer and press **Home**. Expect: the head returns to 0 (play state unchanged).
- [ ] **T56.17** Do: hover the **canvas** and press **Space**. Expect: the transport does **not** play (Space is the Hand tool there; hold Space and drag to pan).
- [ ] **T56.18** Do: click into a text box and press **Space**. Expect: it types a space and does not toggle playback.
- [ ] **T56.19** Do: hover the Sequencer, click a keyframe diamond, press **Delete**. Expect: exactly that one keyframe goes. **Ctrl+Z** brings it back.

*Keyframes at the playhead*
- [ ] **T56.20** Do: move the head to about 0.8 s and click **+ Keyframe**. Expect: a keyframe appears on the selected track at the head's time.
- [ ] **T56.21** Do: press **Ctrl+Z**. Expect: that keyframe is gone and the head did not move.

*Panel behaviour*
- [ ] **T56.22** Do: while playing, click **Graph View** then **Tracks**. Expect: playback continues and the needle is in the right place in Tracks view.
- [ ] **T56.23** Do: while playing, click the **Content Browser** tab and then **Motion Sequencer** again. Expect: the transport kept playing, and the needle is at the right time at once (no jump from 0).

**Developer test**
- [ ] **T56.24** Do: `npx playwright test tests/e2e/playback-on-clock.spec.ts tests/e2e/deterministic-clock.spec.ts --project=chromium`. Expect: pass.
- [ ] **T56.25** Do: `grep -rn "currentTime" src/editor/panels/sequencer/MotionSequencer.tsx`. Expect: no React state called `currentTime` (the playhead is painted by a scheduler task).

---

### 3.5 Phase 57: the kernel on the stage

**What changed:** the evaluation kernel's output is now drawn on the real layers. Playing and scrubbing animate the stage.

**User test** (do Recipe A first so the demo has an animation)

- [ ] **T57.1** Do: click **Stop and return to start**, then **Play**. Expect: the demo fades in and slides up; it ends fully visible and in place.
- [ ] **T57.2** Do: click **Stop and return to start**. Expect: the demo goes back to its **first look** (invisible and 20 px low).
- [ ] **T57.3** Do: drag the playhead along the ruler from 0 to 1 s and back. Expect: the demo fades in and out and moves as you drag, in both directions, without flicker.
- [ ] **T57.4** Do: click the ruler at 0 s, then at the right-hand end of the animation. Expect: first look, then final look.
- [ ] **T57.5** Do: hover the Sequencer and press **→** repeatedly. Expect: the demo changes a tiny bit per frame; **←** reverses.
- [ ] **T57.6** Do: turn on Loop and play past the end. Expect: the animation repeats. With ping-pong it runs backwards.
- [ ] **T57.7** Do: pause in the middle of the animation. Expect: the demo stays exactly in that in-between look and doesn't snap anywhere.
- [ ] **T57.8** Do: while paused, drag a keyframe to a different time or value in the Sequencer. Expect: the stage updates at once, at the same playhead time.
- [ ] **T57.9** Do: delete every track of the animation (click the trash icon on each track row). Expect: the demo returns to its normal look and no longer moves with the playhead.
- [ ] **T57.10** Do: press **Ctrl+Z** until the tracks are back. Expect: the animation works again.
- [ ] **T57.11** Do: switch between **Design workspace**, **Animate workspace** and **Code workspace** while paused mid-animation. Expect: the demo stays in that look, and the stage doesn't blink.
- [ ] **T57.12** Do: while playing, draw a rectangle with **Rectangle Tool** on the canvas. Expect: the rectangle appears and the demo keeps animating.
- [ ] **T57.13** Do: during all of the above watch the console. Expect: no red errors.

**Developer test**
- [ ] **T57.14** Do: `npx tsx --test src/core/engine/stage/__tests__/stageEngine.test.ts`. Expect: pass (14 tests, including ten reference animations at five times each).
- [ ] **T57.15** Do: `npx playwright test tests/e2e/stage-engine.spec.ts --project=chromium`. Expect: three tests pass: ten animations × five times match the kernel within 0.5 px, play moves a layer and pause holds it, scrubbing back to 0 restores the first keyframe.
- [ ] **T57.16** Do: open `http://localhost:3000/editor/stage-lab`, click **Load 10 animations**. Expect: ten rectangles appear (this page has no transport buttons; it is for the automated tests).
- [ ] **T57.17** Do: `grep -rn "requestAnimationFrame\|postMessage" src/core/engine/stage`. Expect: nothing. Per-frame writes go through the scheduler and the layer registry.
- [ ] **T57.18** Do: open `src/core/engine/stage/StageEngine.ts`. Expect: it registers one task in the scheduler's `apply` phase and returns an uninstall function that disposes the adapter.

---

### 3.6 Phase 58: Web Animations

**What changed:** layers whose animation is simple (numbers, lengths, angles, colours) run as browser Web Animations while playing, so they keep moving even if the page is busy. The curve is baked from the kernel, so it looks the same.

**User test** (Recipe A first)
- [ ] **T58.1** Do: click **Play**. Expect: the same fade-and-slide as before. Nothing looks different from Phase 57.
- [ ] **T58.2** Do: play and, while playing, click the ruler at 0.3 s. Expect: the demo jumps to that point and keeps going from there.
- [ ] **T58.3** Do: play with the speed pill `0.25x`. Expect: the animation runs four times slower. Switch to `2x` while playing: it speeds up without restarting.
- [ ] **T58.4** Do: let Loop wrap at the end (Loop on). Expect: the animation restarts smoothly.
- [ ] **T58.5** Do: edit a keyframe while playing. Expect: the stage picks up the change; the playhead does not jump back to 0.

**Developer test**
- [ ] **T58.6** Do: open DevTools → three-dot menu → More tools → **Animations**. Click **Play** in the editor. Expect: an animation group appears, listing an animation named `ll:<layer id>`. Pause: it pauses.
- [ ] **T58.7** Do: open DevTools → Performance → record while you click **Play**, and in the Console run `const end = performance.now() + 400; while (performance.now() < end);` to block the page. Expect: the animation still advances on screen after the block (its clock lives in the browser).
- [ ] **T58.8** Do: `npx tsx --test src/core/engine/stage/__tests__/waapiAdapter.test.ts`. Expect: pass.
- [ ] **T58.9** Do: `npx playwright test tests/e2e/stage-waapi.spec.ts --project=chromium`. Expect: pass.
- [ ] **T58.10** Do: read `src/core/engine/stage/waapiEligibility.ts`. Expect: a layer qualifies only if the rules route it to `css` and every property it animates is a number, length, angle or colour with a CSS name.

---

### 3.7 Phase 59: scrub vs play

**What changed:** there is now a rule for who draws what. **Scrubbing or paused: the kernel draws every layer** (exact, at any time, in any order). **Playing: each layer hands over to its routed engine** (Web Animations for simple ones, the kernel for the rest) at the current time and speed. **Pausing hands it back.** The hand-over must not change a single pixel.

**User test** (Recipe A first)
- [ ] **T59.1** Do: click **Stop and return to start**, then click **Play**, and click **Pause** at a moment when the demo is half-faded. Expect: the demo does **not** jump when you press Pause; it stays in that in-between look.
- [ ] **T59.2** Do: right after T59.1, click **Step forward one frame** and then **Step back one frame**. Expect: tiny, smooth changes, no jumps.
- [ ] **T59.3** Do: drag the playhead through the animation, press **Play** from the middle, press **Pause** after a moment, drag again. Expect: at every point the look matches what you saw when scrubbing there before; scrubbing and playing look the same.
- [ ] **T59.4** Do: press **Play**, and while it plays press **L** to 4× and then **K**. Expect: the speed change doesn't restart the animation, and **K** stops it in place.
- [ ] **T59.5** Do: press **Play** and click the ruler at 0.2 s, then 0.4 s, quickly several times. Expect: the demo follows each click and keeps playing from there.
- [ ] **T59.6** Do: press **Play** and **Pause** ten times quickly. Expect: no flicker, no stuck half-state; the final state matches the transport (playing or paused).
- [ ] **T59.7** Do: after pausing, press **Ctrl+Z** once. Expect: the last edit undoes and the demo is still drawn correctly at the paused time.

**Developer test**
- [ ] **T59.8** Do: open DevTools → **Animations** (as in T58.6). Scrub the playhead while paused. Expect: **no** `ll:` animation in the panel (the kernel is drawing). Press **Play**. Expect: one appears and runs. Press **Pause**. Expect: it disappears.
- [ ] **T59.9** Do: while paused, in DevTools → Elements select the demo root layer inside the stage frame (`iframe[title="Stage"]` → `[data-element-id="el_root_container"]`). Expect: the animated values are in its inline `style` (opacity, transform). While playing, they are gone from inline style because the animation owns them.
- [ ] **T59.10** Do: `npx tsx --test src/core/engine/stage/__tests__/waapiAdapter.test.ts`. Expect: the "Phase 59: scrub vs play" group of five tests passes.
- [ ] **T59.11** Do: `npx playwright test tests/e2e/stage-waapi.spec.ts --project=chromium`. Expect: pass, including "paused after really playing, the stage matches the kernel's (≤ 0.5%) at five times".

---

### 3.8 Phase 60: the parity badge (NEW)

**What changed:** while an engine of its own (Web Animations) plays, the editor checks every 0.5 s that the layer shows what the kernel says it should. A small badge in the **status bar** (right side, left of the branch name) shows the result: **Parity idle** (grey), **Parity OK** (green) or **Parity drift** (red). It only exists in dev builds (`npm run dev`), or in a production build when you add `?parity=1` to the address.

**User test** (use `npm run dev`; Recipe A first)
- [ ] **T60.1** Do: look at the right side of the status bar before pressing anything. Expect: a grey badge **Parity idle**.
- [ ] **T60.2** Do: click **Stop and return to start**, then **Play**, and watch the badge for about 3 seconds. Expect: it turns green and says **Parity OK**.
- [ ] **T60.3** Do: hover the green badge. Expect: a tooltip such as "1 layer on an engine match evaluate()".
- [ ] **T60.4** Do: click **Pause**. Expect: the badge goes grey (**Parity idle**) within about half a second.
- [ ] **T60.5** Do: while paused, drag the playhead around. Expect: the badge stays grey (the kernel draws; nothing to compare).
- [ ] **T60.6** Do: press **Play** and change playback speed with the pills (`0.25x`, `2x`) and loop modes while playing. Expect: the badge stays green throughout, never red, even for a moment after you click the ruler.
- [ ] **T60.7** Do: open the production build with `npm run build && npm run start` and go to `http://localhost:3000/editor`. Expect: **no** badge. Add `?parity=1` after `/editor` (for example `/editor?projectId=<your id>&parity=1`): the badge appears.

**Developer test: make it go red**
- [ ] **T60.8** Do: with the demo playing, open DevTools → Console, switch the context dropdown (top left of the Console) from `top` to the **Stage** iframe (`stage-frame.html`), and run:
  `document.getAnimations().forEach(a => a.effect.updateTiming({ easing: 'steps(3, end)' }))`
  Expect: within about half a second the badge turns **red** (**Parity drift**), and the Console shows a warning starting `[PARITY_DRIFT] layer el_root_container, …`. Hovering the badge lists what differs.
- [ ] **T60.9** Do: click **Pause**, then **Play** again. Expect: the animations are baked again from the kernel and the badge returns to green.
- [ ] **T60.10** Do: `npx tsx --test src/core/engine/stage/__tests__/parity.test.ts`. Expect: 8 tests pass.
- [ ] **T60.11** Do: `npx playwright test tests/e2e/parity.spec.ts --project=chromium`. Expect: 3 tests pass (green stays green; an injected wrong easing raises `[PARITY_DRIFT]`; the badge turns green in the editor).
- [ ] **T60.12** Do: read `src/core/engine/stage/parity.ts`. Expect: tolerances 0.5 px for lengths, 0.01 for opacity, 0.005 for matrix entries, 6 frames for the clock, one sample every 30 frames.

---

## 4. Regression checks (things that must still work)

- [ ] **R1** Do: edit something, reload the page. Expect: your edit is still there and the Save button's dirty dot clears.
- [ ] **R2** Do: change a few keyframes, undo and redo with **Ctrl+Z** / **Ctrl+Shift+Z**. Expect: each keyframe drag is **one** undo step.
- [ ] **R3** Do: hover the canvas and press the tool keys (V, H, T, R…). Expect: they switch tools; none is taken by **J/K/L** (those belong to the timeline).
- [ ] **R4** Do: open the command palette (**Ctrl+P**). Expect: it opens, and transport shortcuts show correct keys.
- [ ] **R5** Do: in the Sequencer open the add-property menu (**Add property track for current archetype**). Expect: properties that aren't legal for the layer are disabled with a reason.
- [ ] **R6** Do: **File → Export Project File** and open the file. Expect: valid JSON, `schemaVersion` 6.
- [ ] **R7** Do: `npm run build && npm run start`, open `http://localhost:3000/editor`, repeat section 2 (smoke) and Recipe A. Expect: it all works in the production build too.

## 5. Cross-browser pass (about 10 minutes)

Repeat in **Firefox** and **Safari/WebKit** (CI runs all three):
- [ ] **X1** Section 2 (smoke).
- [ ] **X2** Recipe A, then T57.1–T57.4.
- [ ] **X3** T54.1–T54.14 (transport bar).
- [ ] **X4** T59.1, T59.3, T59.6 (hand-over) and T60.2 (badge turns green).
- [ ] **X5** T53.1 and T53.3 (import and schema version).

## 6. Run the automated suites and compare

```bash
npm test                 # typecheck + unit tests (default and full edition)
npm run lint             # must exit 0
npm run build
npm run check:bundle-scope && npm run check:doc-links && npm run check:no-adhoc-compat
npx playwright test --project=chromium
rm -rf test-results playwright-report      # lint scans these if you leave them
```

Several timing-based tests can fail once on a busy machine and pass when run alone (`npx playwright test <file> --workers=1`). Re-run a failure by itself before reporting it.

## 7. Things worth trying to break

- Mash **L** and **J** alternately, very fast, with the pointer over the Sequencer.
- Press Play and Stop ten times a second.
- Set ping-pong, then click the ruler during playback.
- Drag the playhead while playing.
- Step forward 300 times at the end of the composition (it must stop at the end).
- Delete the clip or its tracks while playing.
- Open the editor in **two tabs** of the same project: each has its own transport; neither affects the other.
- Resize the window and zoom with Ctrl +/- during playback. The needle and ruler stay aligned.
- Leave looping playback running for **10 minutes** and watch memory in DevTools → Memory. It should stay flat.

## 8. Reporting a problem

For each failure write: the test number (for example `T59.3`), what you did, what you expected, what happened, the browser, whether it was `npm run dev` or a production build, any console error text, and a screenshot or short screen recording for timing problems. Hand it to your Claude, naming the phase (53–60). Fixes go on a `b/phase-NN-…` branch and through a pull request.
