// scripts/pdf-content/part5_stage1_tests_b.js
// Stage 1 (Phases 29–38): Editing, Layers, Inspectors, Paint, Assets & Fonts Manual Test Specifications

export const part5Stage1TestsB = `
<div class="page-break"></div>

<div class="section-hero">
  <h1>Part III (Cont.): Stage 1 — Editing, Layers, Inspectors, Paint & Assets (Phases 29–38)</h1>
  <p>Detailed manual test specifications for Figma-style editing operations, alignment tools, inline text editing, hierarchical layers tree, Simple and Pro inspector faces, paint/gradients engine, asset management, and typography.</p>
</div>

<!-- Phase 29 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 29</span>
    <span class="phase-lane-badge">Lane A · Editing</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Editing Operations (Clipboard, Duplication, Z-Order, Groups)</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Cross-tab Copy/Paste (Ctrl+C, Ctrl+V), Cut (Ctrl+X), Duplicate with relative offset memory (Ctrl+D), Arrow key nudging (1px, Shift+arrow 10px), Z-order stacking (Ctrl+[, Ctrl+], Ctrl+Shift+[, Ctrl+Shift+]), Grouping (Ctrl+G, Ctrl+Shift+G), Lock (Ctrl+Shift+L), Hide (Ctrl+Shift+H), and canvas context menu.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T29.1 · Duplicate Repeat Offset (Ctrl+D) & Cross-Tab Paste</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Select a shape. Press <strong>Ctrl+D</strong>. Nudge the copy 20px right and 20px down. Press <strong>Ctrl+D</strong> again. Press <strong>Ctrl+C</strong>, switch to a second tab on same project, and press <strong>Ctrl+V</strong>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Second Ctrl+D duplicates again with identical 20px/20px offset applied automatically. Pasting into the second tab pastes the shape identically into that document.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Duplicate spawns at 0,0, offset memory fails, or cross-tab clipboard fails to paste.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T29.7 · Grouping & Ungrouping (Ctrl+G / Ctrl+Shift+G)</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Select two shapes with Shift-click. Press <strong>Ctrl+G</strong>. Verify Layers panel. Press <strong>Ctrl+Shift+G</strong>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Ctrl+G wraps both in a new Group container; shapes maintain exact canvas positions. Ctrl+Shift+G ungroups them back to parent container.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Shapes shift coordinates when grouped or ungrouping leaves orphan nodes.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 30 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 30</span>
    <span class="phase-lane-badge">Lane A · Layout</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Alignment, Distribution & Grid Tidy Up</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Top alignment bar and shortcuts: Alt+A (left), Alt+H (horizontal center), Alt+D (right), Alt+W (top), Alt+V (vertical center), Alt+S (bottom). Equal distribution (Ctrl+Alt+H/V), grid Tidy Up (Ctrl+Alt+T), and interactive spacing handles.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T30.1 · Multi-Layer Alignment & Distribution</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Draw three rectangles scattered across frame. Select all three. Click <strong>Align Top</strong> (Alt+W). Click <strong>Distribute Horizontally</strong> (Ctrl+Alt+H).</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Top edges align perfectly to the topmost shape. Horizontal gaps between shapes become exactly equal while outermost shapes remain fixed.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Shapes shift out of alignment or distribution calculates unequal spacing.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 31 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 31</span>
    <span class="phase-lane-badge">Lane A · Text</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Direct Canvas Inline Text Editing & Styled Character Runs</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Double-click canvas text editing. In-place styled character runs (Ctrl+B bold, Ctrl+I italic, Ctrl+U underline, Ctrl+Shift+X strikethrough on highlighted selection only). Automatic text sizing modes (Auto Width, Auto Height, Fixed).
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T31.1 · Inline Formatting & Atomic Undo</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Double-click a text layer on canvas. Type <code>Alpha Beta Gamma</code>. Highlight the word <code>Beta</code> only and press <strong>Ctrl+B</strong>. Press <strong>Escape</strong> to commit. Press <strong>Ctrl+Z</strong>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Only <code>Beta</code> becomes bold; <code>Alpha</code> and <code>Gamma</code> remain normal weight. Pressing Escape commits clean DOM. Ctrl+Z undoes the text edit in a single atomic step.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Entire text block bolds instead of selection, or undo takes multiple steps.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 32 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 32</span>
    <span class="phase-lane-badge">Lane A · Layers</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Layers Panel Tree & Synchronized Selection</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Visual hierarchical tree in left dock. Drag-and-drop layer reordering and reparenting. Inline rename (F2 / double-click), visibility toggle (eye), lock toggle (padlock), live layer search filter, and context menu.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T32.1 · Canvas ⇄ Layers Panel Bi-Directional Sync</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Select a shape on the canvas. Look at the Layers panel. Select another layer in the Layers panel. Drag a row up in the Layers panel.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Canvas selection highlights the corresponding row in Layers panel. Panel selection highlights the layer on canvas. Dragging row up reorders DOM stacking order immediately.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Selection desynchronizes or layer reordering fails to change visual depth.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 33 & 34 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phases 33 & 34</span>
    <span class="phase-lane-badge">Lane A · Inspector</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Design Inspector: Simple vs Pro Faces & Numeric Scrubbers</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Simple Face (&le;7 clean controls: Position, Size, Fill, Stroke, Radius, Opacity; zero jargon) vs Pro Face (hundreds of legal properties, fine-grained transforms, blend modes). Numeric label scrubbing with Shift (10x) and Alt (0.1x) modifiers.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T34.1 · Pro Inspector Label Scrubbing & Undo</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Select a rectangle. Switch inspector to <strong>Pro</strong>. Click and drag horizontally on the <strong>X</strong> label in Position. Observe shape moving. Press <strong>Escape</strong> mid-drag.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Dragging the label smoothly scrubs the coordinate in real time. Pressing Escape mid-drag cancels the gesture, immediately restoring initial coordinate.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Label cannot be scrubbed, values jump wildly, or Escape fails to restore original value.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 35 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 35</span>
    <span class="phase-lane-badge">Lane A · Paint</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Paint Engine: Colors, Gradients, Multi-Strokes, Shadows & Blurs</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Multi-layer fill stacks. Solid colors (HSB / OKLCH / Hex), linear, radial, and conic gradients with on-canvas drag handles. Multiple strokes, dashed lines, caps/joins, drop shadows, inner shadows, layer blur, and backdrop blur.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T35.1 · Linear Gradient On-Canvas Interactive Gizmo</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Select a rectangle. In Fill section, add a <strong>Linear Gradient</strong>. On canvas, drag the start and end circle handles across the shape. Press <strong>Shift</strong> while dragging end handle.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Interactive gradient line appears over shape. Dragging handles changes angle and length live. Shift snaps angle in 15° increments.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Handles fail to appear, dragging does not update canvas gradient, or Shift snap fails.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 36 & 37 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phases 36 & 37</span>
    <span class="phase-lane-badge">Lane A · Assets</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Asset Store, Storage Safety & Interactive Image Fills</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Drag-and-drop picture upload directly to canvas. SHA-256 deduplication (same file dropped twice creates 1 asset). Script stripping on imported SVGs. Image fill modes (Fill, Fit, Crop, Tile) with interactive on-canvas crop bounding box.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T37.1 · Image Fill Modes & On-Canvas Interactive Crop</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Apply an image fill to a rectangle. Test <strong>Fill</strong>, <strong>Fit</strong>, and <strong>Crop</strong> modes. In Crop mode, drag corner crop handles and middle move handle.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Fill covers bounds; Fit contains without clipping; Crop exposes on-canvas cropping handles allowing pan/zoom of the image within the container mask.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Image distorts aspect ratio improperly or crop gizmo fails to respond.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 38 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 38</span>
    <span class="phase-lane-badge">Lane A · Typography</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Typography, Google Fonts & Custom Web Font Upload</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Dynamic Google Fonts search and on-demand font fetching (fonts downloaded only when a layer uses them). Custom font upload (.ttf, .otf, .woff, .woff2) embedded into project bundle. Variable font axis sliders (weight, optical size, slant).
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T38.1 · Google Font Picker & Dynamic Fetching</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Select a text layer. In inspector typography section, open font family dropdown. Search <code>Playfair Display</code> and select it. Open DevTools Network tab.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Text renders instantly in Playfair Display serif. Network tab confirms font file is requested only upon selection. Selection bounding box automatically adapts to new font glyph metrics.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Font falls back to default sans-serif, selection box does not resize, or console throws font fetch error.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>
`;
