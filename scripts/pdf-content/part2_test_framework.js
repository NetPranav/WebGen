// scripts/pdf-content/part2_test_framework.js
// Manual Testing Methodology, Setup, Smoke Tests & Test Recipes

export const part2TestFramework = `
<div class="page-break"></div>

<div class="section-hero">
  <h1>Part II: Manual Testing Architecture & Execution Framework</h1>
  <p>Standardized QA protocol, environment initialization, interface topography map, rapid pre-flight smoke testing, and fundamental test recipes.</p>
</div>

<h2>1. Manual Testing Methodology & The "Do → Expect → Fails if" Standard</h2>
<p>To ensure 100% test reproducibility across human testers, automated agents, and multi-browser environments, every test in this guide adheres to the rigorous <strong>Do → Expect → Fails if</strong> tripartite formula:</p>

<ul>
  <li><strong>Do:</strong> The exact sequence of physical user interactions—keystrokes, mouse moves, clicks, drags, or menu selections.</li>
  <li><strong>Expect:</strong> The precise observable visual, temporal, or DOM state that must occur if the implementation is correct.</li>
  <li><strong>Fails if:</strong> Explicit descriptions of bug states, regressions, timing drift, visual artifacts, or console errors that constitute an immediate test failure.</li>
</ul>

<h3>1.1 Defect Logging & Write-In Protocol</h3>
<div class="callout callout-warning">
  <strong>CRITICAL QA INSTRUCTION:</strong>
  Every test case includes a status selector (<code>Pass</code>, <code>Fail</code>, <code>Blocked</code>) and a dedicated 
  <strong>✎ Actual Outcome / Defect Notes</strong> write-in box. 
  If what you observe matches the <strong>Expect</strong> specification exactly, mark <code>[X] Pass</code>. 
  <strong>If the expected outcome was NOT observed, or if unexpected behavior occurred:</strong>
  <ol>
    <li>Mark <code>[X] Fail</code> (or <code>[X] Blocked</code> if preceding steps prevent reaching this state).</li>
    <li>In the provided write-in lines, explicitly record:
      <ul>
        <li>What actually appeared on screen or failed to appear.</li>
        <li>The exact text of any Red Console Errors in DevTools.</li>
        <li>Browser name, version, and operating system.</li>
        <li>Whether running in <code>npm run dev</code> or a production build (<code>npm run build && npm run start</code>).</li>
      </ul>
    </li>
  </ol>
</div>

<h2>2. Environment Setup & Pre-Flight Configuration</h2>
<pre><code># 1. Ensure you are on the correct branch and up to date
cd "/Users/pranav/Project Folder/WebAPPBuilder"
git status

# 2. Install dependencies cleanly (if package-lock changed)
npm ci

# 3. Start the Next.js development server
npm run dev

# 4. Open Chromium (or Brave, Chrome, Edge) to:
http://localhost:3000/editor</code></pre>

<div class="callout callout-info">
  <strong>DevTools Requirement:</strong> 
  Open Chrome/Chromium DevTools immediately (<code>F12</code> or <code>Cmd+Option+I</code>) and navigate to the 
  <strong>Console</strong> tab. Keep it visible throughout testing. 
  <strong>ANY red uncaught exception or error log that appears during an action is an automatic test failure</strong>, 
  even if the user interface appears normal on the surface.
</div>

<h2>3. Editor Topography Map: Where Everything Is Located</h2>
<p>Refer to this interface directory for all button, panel, and shortcut references:</p>
<table>
  <thead>
    <tr>
      <th style="width: 22%;">Area</th>
      <th style="width: 25%;">Physical Screen Location</th>
      <th>UI Controls, Buttons & Indicators</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Application Header</strong></td>
      <td>Top bar across full screen width</td>
      <td>
        • <strong>Menus:</strong> File, Edit, View, Window, Help<br>
        • <strong>Canvas Presets:</strong> Desktop (1440px), Tablet (768px), Mobile (375px)<br>
        • <strong>Demo Loader:</strong> Mount Showcase Demo button<br>
        • <strong>Workspace Tabs:</strong> Design workspace, Animate workspace, Code workspace<br>
        • <strong>Header Tools:</strong> Saved layouts, Open Command Palette (Ctrl+P), Save (Ctrl+S), Undo (Ctrl+Z), Redo (Ctrl+Shift+Z)
      </td>
    </tr>
    <tr>
      <td><strong>Frame Control Bar</strong></td>
      <td>Floating strip directly above canvas stage</td>
      <td>
        • Active Frame Name & Dimension boxes (W / H)<br>
        • Frame Presets dropdown (Desktop, Tablet, Mobile, Custom)<br>
        • Mode Toggles: <strong>Design</strong> / <strong>Preview</strong><br>
        • Snapping: Snap objects, Snap guides, Pixel grid, Rulers (Shift+R)<br>
        • Canvas Backdrop: Light, Dark, Checkerboard
      </td>
    </tr>
    <tr>
      <td><strong>Tool Dock</strong></td>
      <td>Centered horizontally at bottom of stage</td>
      <td>
        • Selection & Hand tools (V, H)<br>
        • Creation tools: Frame (F), Rectangle (R), Ellipse (O), Line (L), Arrow (Shift+L), Polygon (Y), Star (Shift+Y), Text (T)<br>
        • Vector & Editing tools: Pen (P), Pencil (Shift+P), Paint Bucket (B), Shape Builder (Shift+M)<br>
        • Zoom controls: Zoom Out, Current Zoom (Click to 100%), Zoom In, Fit to Screen (Shift+1)
      </td>
    </tr>
    <tr>
      <td><strong>Left Dock</strong></td>
      <td>Left vertical sidebar</td>
      <td>
        • <strong>Layers tab:</strong> Hierarchical DOM tree, search input, eye (hide/show), padlock (lock/unlock), motion badges<br>
        • <strong>Assets tab:</strong> Image/video asset gallery, SVG import, usage counts<br>
        • <strong>Pages tab:</strong> Multi-page route list (/, /about), add page, section anchors
      </td>
    </tr>
    <tr>
      <td><strong>Right Dock (Inspector)</strong></td>
      <td>Right vertical sidebar</td>
      <td>
        • Inspector Tabs: <strong>Design</strong>, <strong>Motion</strong>, <strong>Code</strong><br>
        • Design Inspector toggle: <strong>Simple</strong> face vs <strong>Pro</strong> face<br>
        • Alignment Bar: Align Left, Center, Right, Top, Middle, Bottom, Distribute, Tidy<br>
        • Property groups: Position, Dimensions, Auto-layout, Constraints, Fill, Stroke, Effects, Typography, Tokens
      </td>
    </tr>
    <tr>
      <td><strong>Bottom Drawer</strong></td>
      <td>Bottom section (active in Animate workspace)</td>
      <td>
        • <strong>Layer Timeline tab:</strong> Layer rows, In/Out time bars, Work area (green bar), Markers, Solo/Shy/Lock switches, Property twirl-downs (▸P), Keyframe stopwatches (◷)<br>
        • <strong>Motion Sequencer tab:</strong> Track-based keyframe editor, playhead needle, speed pills<br>
        • <strong>Export Preview tab:</strong> Live code and markup generation
      </td>
    </tr>
    <tr>
      <td><strong>Status Bar</strong></td>
      <td>Very bottom strip of window</td>
      <td>
        • Layer count readout (e.g. "3 layers selected")<br>
        • Central Transport Bar: Stop & Return, Step Back (1 frame), Play / Pause, Step Forward, Loop toggle, Timecode (MM:SS:FF)<br>
        • Parity Badge: <code>Parity idle</code> (grey), <code>Parity OK</code> (green), <code>Parity drift</code> (red)
      </td>
    </tr>
  </tbody>
</table>

<h2>4. Fundamental Test Recipes</h2>
<p>Most tests in this guide build upon two standardized setup recipes:</p>

<h3>Recipe A: Make an Animated Demo Page (Motion & Timeline Tests)</h3>
<ol>
  <li>Open <code>http://localhost:3000/editor</code>.</li>
  <li>Click the <strong>Animate workspace</strong> tab in the header. The bottom drawer opens on <strong>Layer Timeline</strong>.</li>
  <li>Click the <strong>Motion Sequencer</strong> tab next to it and wait 1 second for the sequencer to hydrate.</li>
  <li>Click <strong>Mount Showcase Demo</strong> in the header. A complete demo page with a heading and a button appears on the stage.</li>
  <li>In the Sequencer, click on the ruler at approximately <strong>0.4s</strong>. The playhead jumps there.</li>
  <li>Click <strong>+ Keyframe</strong>. Two tracks appear: <code>appearance.opacity</code> and <code>transform.y</code>.</li>
  <li>Click <strong>Stop and return to start</strong> in the status bar transport (timecode resets to <code>00:00:00</code>).</li>
  <li>Click <strong>Play</strong> in the status bar.</li>
</ol>
<div class="callout callout-success">
  <strong>Recipe A Success Baseline:</strong> The demo page smoothly fades in and slides upward over ~0.4s, then remains stationary. Status bar timecode counts up continuously.
</div>

<h3>Recipe B: Make Visual Shapes & Layers (Layout & Editing Tests)</h3>
<ol>
  <li>Open <code>http://localhost:3000/editor</code>.</li>
  <li>Click <strong>Mount Showcase Demo</strong>.</li>
  <li>Click the <strong>Rectangle Tool</strong> (dock or shortcut <code>R</code>) and drag a box inside the page.</li>
  <li>Click the <strong>Ellipse Tool</strong> (shortcut <code>O</code>) and drag an oval beside it.</li>
  <li>Click the <strong>Text Tool</strong> (shortcut <code>T</code>), drag a text box, and type <code>Test Run</code>.</li>
</ol>
<div class="callout callout-success">
  <strong>Recipe B Success Baseline:</strong> Three new distinct layers are created inside the demo page container, immediately visible in the Layers panel on the left and selectable with the Select tool (<code>V</code>).
</div>

<h2>5. Quick Smoke Test Suite (3-Minute Pre-Flight)</h2>
<p>Perform this rapid smoke check before undertaking any detailed phase testing. If any step fails, halt testing immediately and file an environment blocker.</p>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">Smoke Test S1 · Editor Boot & Clean Console</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Navigate to <code>http://localhost:3000/editor</code> in Chromium with DevTools Console open.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Editor loads completely. URL redirects to <code>/editor?projectId=...</code>. Design workspace tab is active. ZERO red error messages in the console.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Blank screen, spinning loader never resolves, 500 server error, or any red uncaught exception appears in console.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">Smoke Test S2 · Showcase Demo Mounting</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Click <strong>Mount Showcase Demo</strong> in the top header.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">A white desktop frame mounts on the dotted canvas containing a styled heading and an interactive button. Layers panel populates with the hierarchy.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Nothing appears on canvas, canvas flickers to black, or mounting takes longer than 1 second.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">Smoke Test S3 · Top Header Menus</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Click each top menu item in sequence: <strong>File</strong>, <strong>Edit</strong>, <strong>View</strong>, <strong>Window</strong>, <strong>Help</strong>. Click canvas to dismiss.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Each dropdown menu opens instantly with formatted shortcut badges. Clicking outside dismisses cleanly without leaving orphaned popups.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Menu fails to open, opens behind the stage iframe, or throws console errors.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">Smoke Test S4 · Command Palette (Ctrl+P)</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Press <strong>Ctrl+P</strong> (Cmd+P on Mac). Type <code>zoom</code>, then press <strong>Escape</strong>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Command palette modal overlays the center of the screen with a focused search input. Typing filters matching commands (e.g. Zoom In, Zoom Out). Escape closes it immediately.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Native browser print dialog opens instead of command palette, palette fails to open, or search input cannot be typed into.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">Smoke Test S5 · Shape Creation & Undo Transaction</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Select Rectangle Tool (shortcut <code>R</code>), drag a box inside the demo frame. Press <strong>Ctrl+Z</strong>. Press <strong>Ctrl+Shift+Z</strong>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Rectangle appears on drag release. Ctrl+Z completely removes it in one atomic step. Ctrl+Shift+Z (redo) restores it exactly in place.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Shape does not appear, requires multiple undo presses to remove, or undo corrupts the document.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>
`;
