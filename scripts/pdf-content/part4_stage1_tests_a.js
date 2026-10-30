// scripts/pdf-content/part4_stage1_tests_a.js
// Stage 1 (Phases 13–28): Viewport, Canvas, Tools & Selection Manual Test Specifications

export const part4Stage1TestsA = `
<div class="page-break"></div>

<div class="section-hero">
  <h1>Part III (Cont.): Stage 1 — Viewport, Stage Host, Tools & Selection (Phases 13–28)</h1>
  <p>Rigorous manual test specifications for command bus routing, dock workspace persistence, security boundaries, stage host iframe isolation, camera navigation, shape creation, spatial hit-testing, selection mechanics, and transform handles.</p>
</div>

<!-- Phase 13 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 13</span>
    <span class="phase-lane-badge">Lane A · Viewport</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Command Bus, Menu Registry & Focus-Disambiguated Shortcuts</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Single centralized command registry with context keys (<code>canvasFocus</code>, <code>timelineFocus</code>, <code>textEditing</code>). File/Edit/View/Window/Help menus route commands through the dispatcher. Eliminates conflicting key listeners.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T13.1 · Menu Undo/Redo & Keybinding Dispatch</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Mount demo. Draw a rectangle. Choose <strong>Edit → Undo</strong> from the top menu. Choose <strong>Edit → Redo</strong>. Press <strong>Ctrl+Z</strong> then <strong>Ctrl+Shift+Z</strong>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Menu Undo removes rectangle; Menu Redo restores it. Keystrokes produce identical single-step transitions.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Menu click does not fire undo, requires double click, or causes desynchronization.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T13.7 · Disabled Menu States & Pending Phasing</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Open <strong>File</strong> menu. Inspect disabled items: <strong>New Project...</strong>, <strong>Save As Template...</strong>, <strong>Export Next.js + Prisma Code</strong>. Click a disabled item.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Items are visibly grayed out with phase annotations (e.g. "Phase 51", "Phase 49"). Clicking them produces zero action and ZERO console errors. No fake recent-project items exist.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Clicking disabled items triggers crashes or uncaught console exceptions.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 14 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 14</span>
    <span class="phase-lane-badge">Lane A · Workspace</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Workspace Dock Model & On-Demand Panel Registry</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Panel registry with lazy-loaded chunks. Resizable splitters between side docks and stage. Splitter dimensions and docked panel layout persist across page reloads in <code>localStorage</code>. Corrupt layout self-healing.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T14.1 · Splitter Resize & Reload Persistence</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Click <strong>Animate workspace</strong> tab. Drag the vertical splitter before the right dock to widen it significantly. Reload the browser page.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Page reloads directly into Animate workspace with the right dock retaining the exact widened pixel width.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Dock snaps back to default width or resets to Design workspace.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 15 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 15</span>
    <span class="phase-lane-badge">Lane A · Presets</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Workspace Presets (Design, Animate, Code) & Saved Layouts</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> One-click preset switching: Design (Figma-style: stage + inspector), Animate (After Effects-style: timeline drawer + motion inspector), Code (developer-style: live code inspector). Custom named layouts saving and deletion.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T15.1 · Rapid Workspace Switching & Stage Preservation</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Draw a rectangle on the canvas. Rapidly click between <strong>Design</strong>, <strong>Animate</strong>, and <strong>Code</strong> workspace tabs 20 times.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Switches are instantaneous (&lt;100ms). The center stage frame is NEVER destroyed or reloaded. Drawn rectangle remains stable on screen throughout.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Stage flickers to white, iframe reloads, drawn shapes disappear, or editor freezes.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 16 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 16</span>
    <span class="phase-lane-badge">Lane A · Security</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Threat Model & Hostile Content XSS Neutralization</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Verification of nine trust boundaries and ten security rules (R1–R10). Text layers, layer names, SVG attributes, and AI co-pilot prompts are strictly sanitized against script injection and prototype pollution.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T16.1 · Hostile XSS Injection in Text Layer</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Pick Text Tool (<code>T</code>), drag a box, and enter: <code>&lt;img src=x onerror=alert(1)&gt;</code>. Double-click layer in Layers panel and rename it to: <code>&lt;script&gt;alert(2)&lt;/script&gt;</code>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect"><strong>ZERO alert boxes appear.</strong> Both strings render strictly as inert plain text in both the canvas DOM and Layers panel tree.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Any browser alert dialog opens, script executes, or DOM elements are injected into editor shell.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 17 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 17</span>
    <span class="phase-lane-badge">Lane A · Render</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Archetype Render Definitions & Render Gallery</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Replaced monolithic renderer with modular per-archetype definitions (<code>src/core/render/definitions/</code>). 53 visual gallery cases covering basic shapes, complex SVGs, badges, floating buttons, and edge cases.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T17.1 · Render Gallery Inspection (53 Cases)</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Open <code>http://localhost:3000/editor/render-gallery</code> in browser. Scroll through all cases.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">All 53 cases render with visual clarity (rectangles, ellipses, stars, arrows, paths, dividers, badges). Zero console errors. Malformed inputs stay confined to boxes.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Blank test cells, broken images, unstyled fallbacks, or console errors appear.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 18 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 18</span>
    <span class="phase-lane-badge">Lane A · Stage Host</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Stage Host v2: Isolated Live Frame & Strict CSP</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Retired HTML-string iframe (<code>srcDoc</code>). Stage runs inside <code>/stage-frame.html</code> with <code>Content-Security-Policy: script-src 'none'</code>. Canvas editing modifies the live DOM directly.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T18.1 · Live DOM Frame Selection & Shortcut Pass-Through</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Mount Showcase Demo. Click the heading directly on the canvas. With pointer hovering over the stage, press <strong>Ctrl+Z</strong>, <strong>V</strong>, <strong>H</strong>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Heading gets blue outline with dimension badges. Shortcuts fire immediately without clicking parent window to regain focus. Stage does not reload or flicker.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Keystrokes are swallowed by the iframe, stage flickers, or selection fails to highlight.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 19 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 19</span>
    <span class="phase-lane-badge">Lane A · Incremental</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Incremental Reconciliation & Measurement API at Scale</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> <code>LayerNodeRegistry</code> managing direct DOM element updates. Single property edits bypass React reconciliation. 500-layer stress laboratory (<code>/editor/stage-lab</code>) mounting in &lt;500ms.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T19.1 · 500-Layer Mount & Single Node Mutation</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Navigate to <code>http://localhost:3000/editor/stage-lab</code>. Click <strong>Load 500 layers</strong>. Click <strong>Edit one layer</strong>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">500 layers mount with reported time &lt; 500ms. Clicking "Edit one layer" increments counter and updates only layer 250 in under 2ms without re-rendering the other 499 layers.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Mounting takes &gt; 1000ms, page freezes, or editing causes full list re-render lag.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 20 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 20</span>
    <span class="phase-lane-badge">Lane A · Viewport</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Viewport Camera (Pan & Zoom 2%–6,400%)</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Hardware-accelerated canvas pan and zoom. Smooth cursor-anchored zooming (2% to 6,400%), 100% snap, keyboard shortcuts (Shift+1 fit, Shift+2 zoom selection, Shift+0 100%), per-project camera persistence.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T20.1 · Pan, Pointer Zoom & Clamping Limits</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Hold <strong>Space</strong> and drag on canvas. Use <strong>Ctrl+Wheel</strong> (or pinch trackpad) over a corner of the demo. Click Zoom In until capped, then Zoom Out.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Space+drag pans fluidly. Zoom anchors around mouse pointer, not canvas center. Zoom stops cleanly at 6,400% maximum and 2% minimum. 100% snaps.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Camera produces NaN/Infinity, screen blanks, zoom stutters, or limits are exceeded.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 21 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 21</span>
    <span class="phase-lane-badge">Lane A · Multi-Frame</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Multi-Frame Responsive Canvas</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Infinite canvas hosting multiple root frames simultaneously (Desktop 1440px, Tablet 768px, Mobile 375px). Frame titles, dimensions, re-ordering, duplication, and backdrop themes (Light, Dark, Checkerboard).
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T21.1 · Responsive Frame Spawning & Title Renaming</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Click <strong>Tablet Canvas (768px)</strong>, then <strong>Mobile Canvas (375px)</strong> in the top header. Double-click the Mobile frame title and rename to <code>Phone View</code>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Tablet and Mobile frames spawn cleanly beside Desktop frame. Renaming updates title cleanly on canvas and in Layers panel.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Frames overlap, spawn off-screen, or renaming throws exception.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 22 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 22</span>
    <span class="phase-lane-badge">Lane A · Hit-Testing</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Hit-Testing & Spatial Indexing</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> R-Tree/BBox spatial index (<code>HitIndex</code>) for sub-millisecond layer hit-testing. Hover outlines, direct child selection vs <code>Ctrl-click</code> (Cmd-click) deep selection, and lock/hide safety guards.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T22.1 · Direct Child vs Deep Ctrl-Click Selection</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Mount demo. Click the button inside the demo card. Deselect. Now hold <strong>Ctrl</strong> (Cmd on Mac) and click the text label inside the button.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Normal click selects the top-level container or direct child. Ctrl-click deep-selects the exact innermost text span layer.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Ctrl-click behaves identically to normal click, or selection picks incorrect sibling.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 23 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 23</span>
    <span class="phase-lane-badge">Lane A · Modes</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Overlay Layer & Design vs Preview Modes</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> SVG overlay plane rendering selection rings, hover outlines, and dimension labels. <strong>Preview Mode</strong> toggle rendering live interactive links and buttons while disabling selection handles and edit shortcuts.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T23.1 · Preview Mode Live Interactivity</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Mount demo. Click <strong>Preview</strong> in the frame bar. Hover and click the demo button. Press <strong>Delete</strong>. Click <strong>Design</strong> to return.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">In Preview mode, no outlines or handles appear; button shows CSS hover/active effects; pressing Delete does NOT delete the layer. Switching to Design restores selection.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Handles remain visible in Preview, or Delete shortcut deletes layers while previewing.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 24 & 25 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phases 24 & 25</span>
    <span class="phase-lane-badge">Lane A · Tools</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Tool State Machine & Shape Creation Tools</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Modal tool state machine: Select (V), Hand (H), Frame (F), Rectangle (R), Ellipse (O), Line (L), Arrow (Shift+L), Polygon (Y), Star (Shift+Y), Text (T). Drag-to-create with Shift (1:1 ratio / 45° snap) and Alt (center draw).
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T25.1 · Shift-Square & Center-Alt Creation</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Press <strong>R</strong>. Hold <strong>Shift</strong> and drag inside frame. Press <strong>O</strong>. Hold <strong>Alt</strong> and drag inside frame.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Shift forces strict 1:1 aspect ratio (perfect square). Alt draws ellipse expanding symmetrically from the initial click center.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Shift allows non-square dimensions or Alt does not expand from center.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 26 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 26</span>
    <span class="phase-lane-badge">Lane A · Selection</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Multi-Selection, Marquee & Hierarchy Navigation</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Shift-click multi-selection, rubber-band marquee selection across multiple layers, <strong>Ctrl+A</strong> (select all), <strong>Escape</strong> (select none), <strong>Ctrl+Shift+A</strong> (invert), <strong>Enter</strong> (select children), <strong>Shift+Enter</strong> (select parent).
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T26.1 · Marquee Drag & Hierarchy Tree Traversal</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Draw two shapes. Drag a marquee over both with Select tool. Status bar reads "2 layers selected". Select the parent frame and press <strong>Enter</strong>. Press <strong>Shift+Enter</strong>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Marquee selects both shapes. Enter jumps selection down to children. Shift+Enter moves selection up to the parent frame.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Marquee misses intersecting shapes or hierarchy keys fail to navigate.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 27 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 27</span>
    <span class="phase-lane-badge">Lane A · Transform</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Transform Handles, Rotation & Shape Gizmos</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> 8 bounding box transform handles, rotational zones outside corners (Shift snaps to 15°), multi-selection collective transforms, corner radius live handles, polygon sides handle, star points handle.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T27.1 · Corner Resize, Rotation & Radius Gizmo</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Select a rectangle. Drag a corner handle to resize. Hover just outside corner until rotate cursor appears and drag with Shift held. Drag the circular corner-radius handle inside corner. Press <strong>Ctrl+Z</strong> three times.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Shape resizes smoothly. Rotation snaps in exact 15° increments. Radius handle rounds corners visually. Each gesture undoes cleanly in exactly one step.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Rotation angle drifts, radius handle does not round corners, or undo creates intermediate artifacts.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 28 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 28</span>
    <span class="phase-lane-badge">Lane A · Guides</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Snapping, Smart Guides & Canvas Rulers</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Smart magnetic snapping to edges and centers of adjacent layers. Equal spacing indicators. Alt-hover distance measurement badges. Rulers (Shift+R) with drag-out persistent guide lines.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T28.1 · Smart Guide Lines & Ruler Guide Creation</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Drag a rectangle near another. Press <strong>Shift+R</strong> to show rulers. Drag cursor out of top ruler into canvas. Reload page.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Red magnetic snapping lines appear when edges align. A horizontal blue guide line is created from ruler. Guide lines remain after reload.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Snapping lines fail to display, guide cannot be dragged, or guides vanish on reload.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>
`;
