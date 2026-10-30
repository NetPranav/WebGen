// scripts/pdf-content/part7_figcraft_tests.js
// FigCraft Port Deepening Suite (F1–F14) Manual Test Specifications

export const part7FigcraftTests = `
<div class="page-break"></div>

<div class="section-hero">
  <h1>Part III (Cont.): FigCraft Port Deepening Suite (Features F1–F14)</h1>
  <p>Comprehensive manual and developer test specifications for the ported Rust FigCraft engine capabilities: continuous squircle geometry, Display P3 gamut, vector networks, paint bucket, live boolean groups, shape builder, nested component swaps, and Dev Mode.</p>
</div>

<!-- F1 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Feature F1</span>
    <span class="phase-lane-badge">FigCraft Port</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Shape Geometry: Squircle Corner Smoothing & Arc/Ring Handles</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Continuous-curvature corner smoothing (squircles, G2 continuity 0–100%) on rectangles; rounded star/polygon vertices; interactive arc gizmos on ellipses (start angle, sweep angle, inner ratio creating donuts/rings).
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">TF1.1 · Squircle Corner Smoothing & Ellipse Ring Arc Handles</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Select a rectangle. In inspector, set Corner Smoothing to <code>60%</code> (iOS squircle). Select an ellipse. Drag the circular Arc Handle on its right perimeter upward, then drag the inner ratio handle inward.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Rectangle corners transition smoothly into straight edges without tangent discontinuities. Ellipse becomes an open donut ring path governed by <code>fill-rule="evenodd"</code>.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Corners remain standard circular arcs or arc handles fail to drag.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- F2 & F3 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Features F2 & F3</span>
    <span class="phase-lane-badge">FigCraft Port</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Display P3 Wide Gamut, Diamond Gradients, Multi-Strokes & Arrowheads</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Display P3 wide-gamut color parsing and <code>color(display-p3 ...)</code> rendering. Exact four-quadrant diamond gradients. Multiple independent strokes per shape with inside/center/outside alignment, per-side weights, and custom arrowheads.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">TF3.1 · Stroke Alignment (Inside / Center / Outside) & Arrowheads</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Select a shape. Set a 10px stroke. Cycle alignment: <strong>Inside</strong>, <strong>Center</strong>, <strong>Outside</strong>. Draw a line (<code>L</code>) and set start cap to <strong>Arrow</strong> and end cap to <strong>Circle</strong>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Stroke shifts position cleanly across boundary. Outside stroke does not intrude into inner fill. Line renders with an arrowhead on start and a solid circle on end.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Stroke alignment does not move or line caps render as plain flat ends.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- F4 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Feature F4</span>
    <span class="phase-lane-badge">FigCraft Port</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Vector Networks & Interactive Paint Bucket Tool (B)</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Non-manifold vector network topology (vertices connecting arbitrary branching edges). Automatic face discovery. Paint Bucket tool (shortcut <code>B</code>) clicking inside closed vector regions to fill or unfill enclosed areas.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">TF4.1 · Paint Bucket Region Filling & Unfilling (B)</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Draw a rectangle, select it, click <strong>Flatten to path</strong>. Press <strong>B</strong> (Paint Bucket). Click inside the shape. Click inside it again. Press <strong>Ctrl+Z</strong>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">First click unfills the bounded region (path becomes hollow outline). Second click refills it with the active fill paint. Ctrl+Z undoes the fill state in one step.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Paint bucket does not change fill or fails to identify closed network face.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- F5 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Feature F5</span>
    <span class="phase-lane-badge">FigCraft Port</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Live Boolean Groups & Shape Builder Tool (Shift+M)</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Non-destructive Live Boolean Groups where operands remain individual editable layers. <strong>Shape Builder Tool</strong> (Shift+M) allowing direct click or drag across overlapping shape regions to merge, or Alt-click to delete regions.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">TF5.1 · Live Boolean Non-Destructive Operation Switching</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Select two overlapping rectangles. Click <strong>Live boolean group (union)</strong>. Inspect Layers panel. In inspector, switch Boolean operation to <strong>Subtract</strong>. Press <strong>Ctrl+Z</strong>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">A live boolean group is created; both operands still exist as layers inside it. Switching to Subtract instantly recalculates the visual cutout. Ctrl+Z returns to Union.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Operands are permanently destroyed, or switching operation fails to update stage.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">TF5.2 · Shape Builder Overlap Region Merge (Shift+M)</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Draw two overlapping rectangles. Select both. Press <strong>Shift+M</strong> (Shape Builder). Hover over the overlapping center intersection. Click it.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Hovering highlights the exact intersecting segment. Clicking extracts the intersection into a new distinct shape while trimming the parent rectangles.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Shape builder does not detect intersection, or click fails to create region.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- F7 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Feature F7</span>
    <span class="phase-lane-badge">FigCraft Port</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Advanced Effects: Progressive Blurs & SVG Noise Turbulences</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Multi-stop Progressive Background Blur (blur radius ramps linearly between two spatial points); SVG procedural noise grain filters (mono, duo, full-color) using <code>feTurbulence</code> and <code>feFlood</code>; simulated frosted glass with highlight reflection.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">TF7.1 · SVG Noise Filter & Progressive Blur Bands</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Select a shape. In Pro inspector Effects, add <strong>Noise</strong>. Switch mode to <strong>Duo</strong>. Add a <strong>Progressive Background Blur</strong> with radius 16px.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Shape displays fine procedural grain texture via SVG filter. Progressive blur splits into 5 backdrop blur bands smoothly ramping optical depth.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Noise renders as solid gray or blur does not ramp progressively.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- F9 & F10 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Features F9 & F10</span>
    <span class="phase-lane-badge">FigCraft Port</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Nested Components, Push Changes & Token Variable Aliases</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Nested component instance swaps; "Push changes to main component"; Combine as variants; variable token collections with aliases (e.g. <code>surface → bg</code>) and circular dependency refusal; frame-scoped collection modes.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">TF9.1 · Push Changes to Main & Token Alias Resolution</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Create component. Duplicate an instance. Change instance background color. Click <strong>Push changes to main component</strong> in Instance inspector.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">The modified color pushes backward to the main component, which in turn propagates to all other unmodified instances across the document.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Push changes button is disabled or main component fails to adopt the new styling.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- F13 & F14 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Features F13 & F14</span>
    <span class="phase-lane-badge">FigCraft Port</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Dev Mode Code Inspection & Native Editable SVG Vector Import</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Dev Mode Code Tab showing generated CSS with token variable syntax (<code>var(--token)</code>), annotations, and measurement overlays. Native SVG import parsing compound paths, gradients, and groups into fully editable vector design layers.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">TF14.1 · SVG Import to Fully Editable Design Vectors</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">In Assets panel, click <strong>Import Design SVG...</strong>. Select an SVG with paths and text. Double-click the imported layers on canvas.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">SVG imports not as a static image, but as a structured frame containing native path, text, and group layers with editable bezier nodes.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">SVG imports as an inert <code>&lt;img&gt;</code> tag or throws SVG parser errors.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>
`;
