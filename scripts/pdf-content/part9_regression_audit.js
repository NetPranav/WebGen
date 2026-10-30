// scripts/pdf-content/part9_regression_audit.js
// Regression Journeys, Cross-Browser Matrix, Stress Testing & 50-Item Audit Verification Suite

export const part9RegressionAudit = `
<div class="page-break"></div>

<div class="section-hero">
  <h1>Part IV: Regression, Cross-Browser, Stress & Audit Testing</h1>
  <p>Holistic integration validation: 25-step multi-feature user journeys, cross-browser compatibility matrix (Chromium, Firefox, WebKit), 15 chaotic stress test scenarios, and comprehensive verification suite for the 50 known issues from AUDIT_ISSUES.md.</p>
</div>

<h2>1. End-to-End Regression Journeys</h2>
<p>Execute these complex multi-feature workflows to verify that independent subsystems interoperate seamlessly without state corruption:</p>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">Journey J1 · Full Lifecycle: Design → Animate → Inspect → Export</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">
      1. Boot editor on fresh project.<br>
      2. Draw Desktop frame (1440px), add two rectangles and a text layer.<br>
      3. Wrap shapes in an auto-layout flex stack (Shift+A) with 20px padding.<br>
      4. Convert stack to a Component (Ctrl+Alt+K) and duplicate an instance.<br>
      5. Switch to <strong>Animate workspace</strong>. Twirl open instance properties (▸P) and toggle Position X stopwatch at 1s.<br>
      6. Scrub playhead and press Play in transport bar (verify parity badge is green).<br>
      7. Switch to <strong>Code workspace</strong> and inspect generated CSS.<br>
      8. Open File → Export Site (Ctrl+E) and export Next.js + Tailwind project.
    </span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Every transition operates smoothly without lag. The exported site reproduces the exact canvas layout and motion. Parity badge remains green throughout.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Any step throws an error, components desync, or export fails.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<h2>2. Cross-Browser Compatibility Matrix</h2>
<p>Run these critical checks across <strong>Chromium</strong> (Chrome/Brave/Edge), <strong>Firefox</strong>, and <strong>WebKit</strong> (Safari):</p>
<table>
  <thead>
    <tr>
      <th style="width: 15%;">Test ID</th>
      <th style="width: 25%;">Feature Area</th>
      <th style="width: 35%;">Cross-Browser Verification Action</th>
      <th>Engine Differences & Known Traps</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>XB-01</strong></td>
      <td>StageHost CSP & PostMessage</td>
      <td>Verify stage loads cleanly in WebKit with <code>script-src 'none'</code>.</td>
      <td>WebKit enforces strict origin policies on iframe communication.</td>
    </tr>
    <tr>
      <td><strong>XB-02</strong></td>
      <td>Zoom & Pan Canvas 60 FPS</td>
      <td>Pan and zoom with 5 frames × 200 layers in Firefox and WebKit.</td>
      <td>Check AUD-37 (WebKit zoom frame ceiling with high layer counts).</td>
    </tr>
    <tr>
      <td><strong>XB-03</strong></td>
      <td>WAAPI Animation Execution</td>
      <td>Execute Recipe A and observe Web Animations in Firefox DevTools.</td>
      <td>Firefox sub-frame timing precision differs slightly from Blink.</td>
    </tr>
    <tr>
      <td><strong>XB-04</strong></td>
      <td>Squircle & Arc SVG Rendering</td>
      <td>Render Gallery in Safari: verify smooth squircle corners and donut rings.</td>
      <td>WebKit requires explicit <code>fill-rule="evenodd"</code> on compound paths.</td>
    </tr>
    <tr>
      <td><strong>XB-05</strong></td>
      <td>Keyboard Focus Routing</td>
      <td>Hover canvas and timeline in Firefox; test Space (Hand vs Play).</td>
      <td>Firefox pointer-enter dispatch order can differ under rapid mouse sweeps.</td>
    </tr>
  </tbody>
</table>

<h2>3. Chaotic Stress & Break-Testing Scenarios (15 Edge Scenarios)</h2>
<p>Perform these aggressive torture tests to verify error recovery, memory safety, and boundary enforcement:</p>
<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">Stress S1–S5 · Input & Memory Torture Suite</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">
      • <strong>S1:</strong> Rapidly alternate between <strong>L</strong> and <strong>J</strong> 50 times over the Sequencer.<br>
      • <strong>S2:</strong> Switch workspaces 30 times as fast as possible.<br>
      • <strong>S3:</strong> In stage-lab, mount 500 layers and hold down <strong>Ctrl+Z</strong> continuously.<br>
      • <strong>S4:</strong> Leave looping animation running in background for <strong>15 minutes</strong> with DevTools Memory tab recording.<br>
      • <strong>S5:</strong> Open the same project simultaneously in two browser tabs and edit shapes in both.
    </span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Editor does not crash. Transport handles shuttling without locking. Memory graph stays completely flat (no leaks). Second browser tab opens safely in read-only mode.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Browser tab crashes, memory climbs continuously (leak), or history is corrupted.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<h2>4. Comprehensive Audit Issues Verification Matrix (AUDIT_ISSUES.md)</h2>
<p>Explicit test cases targeting all 50 known issues documented in <code>AUDIT_ISSUES.md</code>:</p>
<table>
  <thead>
    <tr>
      <th style="width: 6%;">#</th>
      <th style="width: 14%;">Area</th>
      <th style="width: 8%;">Sev</th>
      <th style="width: 36%;">Targeted Test Action</th>
      <th style="width: 24%;">Expected Pass Behavior</th>
      <th style="width: 12%;">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>1</strong></td>
      <td>Selection (26)</td>
      <td>Med</td>
      <td>Delete a frame containing 3 selected layers. Inspect <code>useSelectionStore.ids</code>.</td>
      <td>Deleted layer IDs are immediately purged from selection array.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>2</strong></td>
      <td>Commands (13)</td>
      <td>Low</td>
      <td>Select 2 layers. Check context key <code>selection.count</code>.</td>
      <td>Context key updates accurately to <code>2</code>.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>3</strong></td>
      <td>Editing (29)</td>
      <td>Med</td>
      <td>Lock a layer. Select it via command and press Delete or Nudge.</td>
      <td>Locked layer is strictly protected and does NOT delete or move.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>4</strong></td>
      <td>Editing (29)</td>
      <td>High</td>
      <td>Switch to <strong>Preview</strong> mode. Press Delete, Ctrl+D, Ctrl+G.</td>
      <td>Editing shortcuts are strictly disabled while Preview mode is active.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>5</strong></td>
      <td>Tools (24)</td>
      <td>Med</td>
      <td>Begin dragging a shape, press Alt+Tab to blur window mid-drag.</td>
      <td><code>gesturing</code> state terminates safely; shortcuts do not lock up.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>6</strong></td>
      <td>Tools (25)</td>
      <td>Low</td>
      <td>Begin dragging a rectangle. Press Escape before releasing mouse.</td>
      <td>Shape creation is aborted cleanly; no layer is spawned.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>7</strong></td>
      <td>Document (3)</td>
      <td>High</td>
      <td>Press Ctrl+Z while actively dragging a transform handle.</td>
      <td>Undo is either ignored during active drag or terminates transaction safely.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>8</strong></td>
      <td>Document (3)</td>
      <td>Med</td>
      <td>Execute <code>jumpTo</code> to an invalid history state index.</td>
      <td>Editor aborts cleanly without entering an infinite loop.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>9</strong></td>
      <td>Camera (20)</td>
      <td>Med</td>
      <td>Manually corrupt localStorage camera zoom to <code>10000%</code> and reload.</td>
      <td>Zoom clamps automatically to legal range (2%–6,400%).</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>10</strong></td>
      <td>Camera (20)</td>
      <td>High</td>
      <td>Pass <code>NaN</code> to <code>setCamera()</code> in console.</td>
      <td>Camera rejects non-finite values; canvas does not blank.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>11</strong></td>
      <td>Hit-test (22)</td>
      <td>Med</td>
      <td>Stack Frame B over Frame A. Click overlapping area.</td>
      <td>Click selects child of Frame B (topmost), respecting paint order.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>12</strong></td>
      <td>Frames (21)</td>
      <td>Med</td>
      <td>Move a frame vertically and execute <code>moveFrame</code>.</td>
      <td>Frame respects custom Y position; does not force single-row reset.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>13</strong></td>
      <td>Frames (21)</td>
      <td>Med</td>
      <td>Delete a top-level frame. Check <code>page.rootElementId</code>.</td>
      <td>Page updates root ID safely without pointing to orphaned null.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>14</strong></td>
      <td>Frames (21)</td>
      <td>Med</td>
      <td>Create a new empty frame in a blank project. Select Rectangle tool.</td>
      <td>Empty frame is rendered and accepts shape drawing immediately.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>15</strong></td>
      <td>Guides (28)</td>
      <td>Low</td>
      <td>Attempt to create 500 guides on a frame via script.</td>
      <td>System enforces sensible guide limit (e.g. max 50).</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>16</strong></td>
      <td>Geometry</td>
      <td>Med</td>
      <td>Pass non-finite coordinates to <code>dragBox</code> and <code>unionBox</code>.</td>
      <td>Geometry helpers reject <code>NaN</code>/<code>Infinity</code>.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>17</strong></td>
      <td>Persistence</td>
      <td>Low</td>
      <td>Delete a project. Check localStorage for lingering camera keys.</td>
      <td>Associated project camera keys are cleanly unlinked.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>18</strong></td>
      <td>Transform (27)</td>
      <td>Med</td>
      <td>Move a hug-sized container across the canvas with mouse.</td>
      <td>Move updates X/Y only; does NOT overwrite width/height to fixed.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>19</strong></td>
      <td>Clipboard (29)</td>
      <td>Med</td>
      <td>Copy 5,000 layers to clipboard and paste.</td>
      <td>Clipboard either pastes successfully or reports clear payload limit.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>20</strong></td>
      <td>Document (2)</td>
      <td>Med</td>
      <td>Duplicate a document containing 10,000 layers.</td>
      <td><code>createId</code> generates non-colliding 64-bit UUIDs.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>21</strong></td>
      <td>Document (3)</td>
      <td>High</td>
      <td>Insert a layer with an ID matching an existing layer.</td>
      <td>Collision is detected and layer is re-keyed rather than overwritten.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>22</strong></td>
      <td>Clipboard (29)</td>
      <td>Low</td>
      <td>Select a locked container and press Ctrl+V.</td>
      <td>Paste into locked or hidden containers is rejected with message.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>23</strong></td>
      <td>Clipboard (29)</td>
      <td>High</td>
      <td>Trigger Cut with clipboard permission blocked.</td>
      <td>Layer is NOT deleted from stage if clipboard copy failed.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>24</strong></td>
      <td>Time (54)</td>
      <td>High</td>
      <td>Execute <code>transport.seek(NaN)</code> in console.</td>
      <td>Seek is rejected; playhead does not corrupt to <code>NaN</code>.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>25</strong></td>
      <td>Time (54)</td>
      <td>Med</td>
      <td>Define a composition with <code>fps: 0</code>.</td>
      <td>Composition validator rejects <code>fps: 0</code>, defaulting to 60.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>26</strong></td>
      <td>Time (54)</td>
      <td>Med</td>
      <td>Set work area start to 4s and end to 2s (inverted).</td>
      <td>Work area auto-corrects or clamps to minimum 1-frame duration.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>27</strong></td>
      <td>Time (54)</td>
      <td>Med</td>
      <td>Play composition at fractional frame rate (23.976 fps).</td>
      <td>Timecode prints cleanly formatted <code>MM:SS:FF</code> without float blur.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>28</strong></td>
      <td>Time (54)</td>
      <td>Med</td>
      <td>Execute <code>tick(Infinity)</code> or advance by <code>NaN</code>.</td>
      <td>Time validator discards non-finite delta step.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>29</strong></td>
      <td>Time (54)</td>
      <td>Low</td>
      <td>Set transport playback rate to <code>1e12</code>.</td>
      <td>Rate clamps to legal playback range (0.1x to 8x).</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>30</strong></td>
      <td>Time (55)</td>
      <td>Low</td>
      <td>Register a throwing task in the FrameScheduler.</td>
      <td>Scheduler catches error, logs once, and disables task to prevent log flood.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>31</strong></td>
      <td>Time (55)</td>
      <td>Low</td>
      <td>Execute <code>FrameScheduler.step(-1)</code>.</td>
      <td>Negative or <code>NaN</code> step is safely rejected.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>32</strong></td>
      <td>Persistence (3)</td>
      <td>Med</td>
      <td>Simulate IndexedDB failure during autosave.</td>
      <td>Autosave schedules automatic retry backoff.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>33</strong></td>
      <td>Import (3)</td>
      <td>High</td>
      <td>Attempt to import a 200MB corrupted JSON file.</td>
      <td>Import validates file size ceiling before parsing, preventing OOM.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>34</strong></td>
      <td>Import (3)</td>
      <td>Low</td>
      <td>Export project with name <code>CON.lazy.json</code> or control chars.</td>
      <td>File name is sanitized to prevent filesystem reserved clashes.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>35</strong></td>
      <td>Search (8)</td>
      <td>Med</td>
      <td>Inject invalid string into localStorage recent searches key.</td>
      <td>Search panel catches corrupted data, falls back to empty array.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>36</strong></td>
      <td>Stage (18)</td>
      <td>Med</td>
      <td>Perform 1,000 edits in stage-lab. Inspect <code>performance.getEntries()</code>.</td>
      <td>Performance marks are cleared periodically; zero memory leak.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>37</strong></td>
      <td>Camera (20)</td>
      <td>Med</td>
      <td>Pan and zoom in WebKit with 5 frames × 200 layers.</td>
      <td>Frame time remains under 16ms (60 FPS) without 40ms spikes.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>40</strong></td>
      <td>Menus (13)</td>
      <td>Low</td>
      <td>Inspect top menus for built features (e.g. Rulers, Presets).</td>
      <td>Menu items do not display outdated "Coming in Phase 14" text.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>43</strong></td>
      <td>Commands (13)</td>
      <td>Med</td>
      <td>Run automated keybinding audit spec.</td>
      <td>Zero shortcut clashes detected across all context modes.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>44</strong></td>
      <td>Canvas (20)</td>
      <td>Low</td>
      <td>Inspect zoom constants in codebase.</td>
      <td>Zoom limits (2% and 6,400%) are centralized in single constants file.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>45</strong></td>
      <td>Dev Routes</td>
      <td>Med</td>
      <td>Run <code>npm run build && npm run start</code>. Navigate to <code>/editor/stage-lab</code>.</td>
      <td>Development lab routes are disabled or return 404 in production.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>46</strong></td>
      <td>Rulers (28)</td>
      <td>Low</td>
      <td>Change a shape fill color while rulers are displayed.</td>
      <td>Rulers do NOT repaint on un-related paint mutations.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>47</strong></td>
      <td>Hit-test (22)</td>
      <td>Low</td>
      <td>Drag a shape continuously across 1,000 layers.</td>
      <td>Spatial index updates incrementally; drag remains smooth 60 FPS.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>48</strong></td>
      <td>Editing (29)</td>
      <td>Low</td>
      <td>Select two layers in different containers and press Ctrl+G.</td>
      <td>Group handles cross-container grouping cleanly with reparenting.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>49</strong></td>
      <td>Frames (21)</td>
      <td>Low</td>
      <td>Spawn new frames with custom vertical offsets.</td>
      <td><code>nextFramePosition</code> places frame relative to visual topmost.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
    <tr>
      <td><strong>50</strong></td>
      <td>Overlay (23)</td>
      <td>Low</td>
      <td>Hover canvas and press Ctrl without moving mouse.</td>
      <td>Hover outline instantly switches to deep-select highlight.</td>
      <td>[ ] Pass<br>[ ] Fail</td>
    </tr>
  </tbody>
</table>

<h2>5. Standardized Defect Reporting Guide & Bug Filing Template</h2>
<p>When any test case fails, copy this standardized template to report the issue:</p>
<pre><code>### [DEFECT REPORT] Phase &lt;Phase_Num&gt; · Test &lt;Test_ID&gt;

- **Severity:** [High (Data Loss / Crash) | Med (Broken Feature) | Low (Cosmetic)]
- **Phase & Area:** Lane &lt;A|B&gt;, Phase &lt;NN&gt;, Subsystem: &lt;e.g. StageHost / Timeline / Paint&gt;
- **Browser & Environment:** &lt;e.g. Chromium 130 / macOS 15.1 / npm run dev&gt;
- **Steps to Reproduce (Do):**
  1. 
  2. 
  3. 
- **Expected Outcome (Expect):** 
- **Actual Observed Outcome (Fails if):** 
- **Console Output / Uncaught Exceptions:**
  \`\`\`
  &lt;paste red console errors here&gt;
  \`\`\`
- **Screenshots / Video Timestamp:** 
</code></pre>
`;
