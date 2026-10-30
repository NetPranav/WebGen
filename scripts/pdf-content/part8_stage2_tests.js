// scripts/pdf-content/part8_stage2_tests.js
// Stage 2 (Phases 53–63): Animation Grammar, Transport & Timeline Manual Test Specifications

export const part8Stage2Tests = `
<div class="page-break"></div>

<div class="section-hero">
  <h1>Part III (Cont.): Stage 2 — Animation Grammar, Transport & Timeline (Phases 53–63)</h1>
  <p>Exhaustive manual and developer test specifications for the central transport clock, deterministic frame scheduler, WAAPI acceleration, scrub vs play handoff, real-time parity verification badge, Layer Timeline, and After Effects keybindings.</p>
</div>

<!-- Phase 53 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 53</span>
    <span class="phase-lane-badge">Lane B · Schema v6</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Schema v6 Migration: Advanced Clip Types & Triggers</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Migration from Schema v5 to v6. New clip types (<code>exit</code>, <code>focus</code>, <code>stagger</code>, <code>layout</code>) and triggers (<code>unmount</code>, <code>layoutChange</code>). Automatic backward-compatible migration of older <code>.lazy.json</code> project bundles.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T53.1 · Schema Migration from Older Projects</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Import <code>tests/e2e/fixtures/showcase-v4.lazy.json</code>. Choose <strong>File → Export Project File (.lazy.json)</strong>. Open in text editor and inspect <code>schemaVersion</code>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Older project opens flawlessly with zero console warnings. Exported bundle automatically migrates and writes <code>"schemaVersion": 6</code>.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Import throws migration exception or exported version remains at 4 or 5.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 54 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 54</span>
    <span class="phase-lane-badge">Lane B · Transport</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Central Transport Bar & Single Clock Authority</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Single clock authority (<code>src/core/time/transport.ts</code>) managing time, 60fps frame rate, loop mode (Off, Loop, Ping-Pong), and shuttle speeds. Transport controls in status bar with precise <code>MM:SS:FF</code> timecode. Keyboard shuttling (J/K/L).
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T54.1 · Play, Pause, Single-Frame Stepping & Ping-Pong Loop</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Click <strong>Play</strong> in status bar. Wait 2 seconds. Click <strong>Pause</strong>. Click <strong>Step forward one frame</strong> 5 times. Click Loop button twice to set <strong>Loop: ping-pong</strong>. Click Play.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Timecode advances to ~<code>00:02:00</code>. Pause stops timecode dead. Stepping advances exactly 5 frames (<code>00:02:05</code>). In ping-pong mode, playback counts up to 5s, reverses smoothly toward 0s, and repeats.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Timecode drifts, skips frames, or ping-pong fails to count backwards.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T54.16 · J / K / L Timeline Shuttling Keys</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Hover mouse over timeline panel. Press <strong>L</strong> (plays 1x). Press <strong>L</strong> again (2x), again (4x). Press <strong>J</strong> (slows to 2x, 1x, pauses). Press <strong>J</strong> from standstill (plays backwards). Press <strong>K</strong> (stops dead). Click into a text box and press <strong>L</strong>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">L accelerates shuttle speed forward; J reverses shuttle; K stops immediately. Typing in a text box types the letter 'L' and does NOT trigger transport.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Shuttle keys fail or fire while typing in text inputs.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 55 & 56 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phases 55 & 56</span>
    <span class="phase-lane-badge">Lane B · Scheduler</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Deterministic Frame Scheduler & Sequencer Clock Integration</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Single <code>requestAnimationFrame</code> loop ordering per-frame tasks: <code>input → evaluate → apply → render → overlay → stats</code>. Background tab gap clamp (&le;0.25s). Motion Sequencer unified onto central transport clock.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T56.1 · Sequencer Ruler Scrubbing & Status Bar Synchronization</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Execute Recipe A. Click at <strong>1.5s</strong> on the Sequencer ruler. Drag the playhead needle handle horizontally back and forth between 0s and 3s.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">The Sequencer needle tracks the mouse with zero lag. Status bar timecode updates simultaneously. Both clocks match within 1 frame (e.g. <code>00:01.500</code> = <code>00:01:30</code>).</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Needle lags behind mouse, timecodes disagree, or scrubbing causes visual stutter.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 57 & 58 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phases 57 & 58</span>
    <span class="phase-lane-badge">Lane B · Kernel & WAAPI</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Evaluation Kernel on the Stage & WAAPI Hardware Acceleration</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Kernel output applies live to DOM elements during playback/scrubbing. Eligible simple properties (transforms, opacity, colors) promote to native browser Web Animations API (<code>ll:&lt;layer_id&gt;</code>) running on GPU compositor thread.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T57.1 · Live Stage Animation & Playhead Scrubbing</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Execute Recipe A. Click <strong>Stop and return to start</strong>. Slowly drag playhead needle from 0s to 1s. Click <strong>Play</strong>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Dragging needle scrubs the demo page opacity and slide-up smoothly in exact real-time sync with mouse. Clicking Play executes silky 60fps GPU playback.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Stage elements do not move when scrubbing, or animation jumps abruptly.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 59 & 60 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phases 59 & 60</span>
    <span class="phase-lane-badge">Lane B · Parity</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Zero-Pixel Scrub vs Play Handoff & Real-Time Parity Badge</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Seamless transition between kernel mathematical evaluation (paused/scrubbing) and WAAPI hardware playback. Real-time parity auditor sampling stage every 30 frames and displaying status badge: <code>Parity idle</code> (grey), <code>Parity OK</code> (green), <code>Parity drift</code> (red, &gt;0.5px drift).
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T59.1 · Zero-Pixel Pause Handoff & Green Parity Badge</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Execute Recipe A. Start playback with <strong>Play</strong>. Observe parity badge on right side of status bar. While demo is mid-fade, click <strong>Pause</strong>. Step 1 frame forward, then backward.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Parity badge turns green (<strong>Parity OK</strong>). Clicking Pause produces ZERO visible jump or flicker. Frame stepping smoothly increments/decrements with exact kernel matching.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Parity badge turns red, or pausing snaps stage elements to different coordinates.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 61 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 61</span>
    <span class="phase-lane-badge">Lane B · Layer Timeline</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">The Layer Timeline (Rows, Time Bars, Work Area & Markers)</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Full Layer Timeline workspace. One row per layer with time bars. In/Out trim handles, time sliding. Green Work Area bar with dedicated start/end handles. Yellow timeline markers. Layer switches: Solo (S), Visibility (●), Lock (🔒), Shy (~), Motion blur (≋), Blend mode, and Parent menu. Motion badges in Layers panel.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T61.1 · Layer In/Out Trimming & Solo Switch (S)</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">In Animate workspace, open <strong>Layer Timeline</strong>. Expand root layer. On heading row, drag the right bar handle inward to 2s. Click <strong>S</strong> (Solo) on heading row. Press <strong>Ctrl+Z</strong>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Heading bar trims to 2.0s with white outline. Solo mode hides all other layers on stage except heading. Ctrl+Z cleanly un-solos the layer.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Trim handle does not drag, solo fails to hide other layers, or undo fails.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 62 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 62</span>
    <span class="phase-lane-badge">Lane B · Keyframing</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Twirl-Downs, Keyframe Stopwatches (◷) & U Hotkey Filtering</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Property twirl-downs (▸P) opening groups: Transform, Appearance, Effects, States, Behaviours, Links. Stopwatch icons (◷) toggling keyframing and spawning yellow keyframe diamonds on ruler. <strong>U</strong> hotkey revealing animated properties; <strong>UU</strong> revealing all modified properties.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T62.1 · Stopwatch Keyframe Toggling & U Reveal Hotkey</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">In Layer Timeline, click <strong>▸P</strong> on heading row. Expand <strong>Transform</strong>. Move playhead to 1s and click stopwatch ◷ on <strong>Position X</strong>. Select layer name, hover timeline, and press <strong>U</strong>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Stopwatch turns bright yellow; yellow diamond appears at 1s. Pressing U hides all un-animated properties, isolating Position X in the row view.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Stopwatch does not turn yellow, diamond fails to spawn, or U fails to filter.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 63 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 63</span>
    <span class="phase-lane-badge">Lane B · Navigation</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">After Effects Timeline Navigation Hotkeys</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> After Effects industry-standard keybindings active over Layer Timeline: <strong>Home</strong> (comp start), <strong>End</strong> (comp end), <strong>PageDown / PageUp</strong> (step 1 frame), <strong>Shift+PageDown / Up</strong> (step 10 frames), <strong>I</strong> (jump to In-point), <strong>O</strong> (jump to Out-point), <strong>B</strong> (set Work Area Start), <strong>N</strong> (set Work Area End), <strong>= / -</strong> (zoom timeline), <strong>\\</strong> (zoom to fit Work Area).
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T63.1 · I / O In-Out Jumping & B / N Work Area Setting</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Trim heading layer bar to 1s–3s. Select heading. Hover mouse over timeline. Press <strong>I</strong>. Press <strong>B</strong>. Press <strong>O</strong>. Press <strong>N</strong>. Press <strong>\\</strong> (backslash).</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">I jumps needle to 1s; B snaps work area start to 1s. O jumps needle to 3s; N snaps work area end to 3s. Backslash zooms timeline horizontally so the 1s–3s work area fills the visible viewport width.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Shortcuts fail to navigate, or keys trigger canvas actions instead.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>
`;
