// scripts/pdf-content/part6_stage1_tests_c.js
// Stage 1 (Phases 39–49): Vector, Auto-Layout, Tokens, Components, Pages & Export Manual Test Specifications

export const part6Stage1TestsC = `
<div class="page-break"></div>

<div class="section-hero">
  <h1>Part III (Cont.): Stage 1 — Vector, Layout, Components & Export (Phases 39–49)</h1>
  <p>Comprehensive manual test specifications for vector pen/pencil authoring, auto-layout flexbox stacks, CSS grid, responsive breakpoint cascades, design tokens/variables, components/variants, multi-page routing, and static code generation.</p>
</div>

<!-- Phase 39 & 40 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phases 39 & 40</span>
    <span class="phase-lane-badge">Lane A · Vector</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Pen & Pencil Drawing, Path Node Editing & Booleans</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Pencil tool (Shift+P) gesture curve-fitting algorithm. Pen tool (P) placing nodes and pulling bezier handles (Alt breaks handle tangent). Node editing mode (Enter / double-click), node addition/deletion. Boolean union, subtract, intersect, exclude, and Flatten.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T39.1 · Pen Tool Bezier Curve Creation & Closing</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Press <strong>P</strong> (Pen Tool). Click to place node 1. Drag to place node 2 and pull bezier handles. Click on node 1 to close path. Press <strong>Escape</strong>. Press <strong>Ctrl+Z</strong>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Curved path creates cleanly with smooth bezier curvature. Path closes and fills. Entire path creation is reversed in exactly one Ctrl+Z step.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Handles fail to pull, clicking node 1 does not close path, or undo takes multiple steps.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T40.1 · Boolean Union & Destructive Flatten</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Draw two overlapping rectangles. Select both. Click <strong>Boolean Union</strong>. Observe single outline. Click <strong>Flatten to path</strong>. Double-click the resulting shape.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Shapes merge into a single compound path. Flatten converts it into an editable vector path exposing individual bezier nodes.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Boolean produces visual gaps, leaves interior overlapping lines, or fails to flatten.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 41 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 41</span>
    <span class="phase-lane-badge">Lane A · Auto-Layout</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Auto-Layout Stacks (CSS Flexbox with Figma Controls)</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Convert loose layers into auto-layout flex stack (Shift+A). Direction (horizontal/vertical), wrap, gap, 4-side padding. Child sizing modes: Hug, Fill, Fixed. Drag-and-drop reordering with visual blue insertion indicator line.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T41.1 · Shift+A Stack Creation & Child Drag Reorder</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Draw three buttons side by side. Select all three and press <strong>Shift+A</strong>. In inspector, change gap to <code>24px</code>. Drag the first button past the third button.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Buttons wrap in an auto-layout flex container with 24px gaps. Dragging displays a vertical blue insertion line; releasing drops button into the new sequence position.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Buttons overlap, gap does not update, or reorder line fails to display.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 42 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 42</span>
    <span class="phase-lane-badge">Lane A · Constraints</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">CSS Grid Layout Containers & Pinned Constraints</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Grid layout containers with column/row track lists (e.g. <code>1fr 2fr</code>, <code>repeat(3, 1fr)</code>) and column/row cell spans. Directional constraints for free layers (Left, Right, Left & Right, Center, Scale) adapting when parent frame resizes.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T42.1 · Directional Constraints on Parent Frame Resize</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Draw a rectangle inside a frame. Set its Horizontal Constraint to <strong>Right</strong>. Select the frame and drag its right transform handle outward to widen it.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">The rectangle moves automatically to maintain an exact constant pixel distance from the right edge of the frame.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Rectangle remains stationary at absolute X or distorts unexpectedly.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 43 & 44 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phases 43 & 44</span>
    <span class="phase-lane-badge">Lane A · Breakpoints</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Responsive Breakpoints Cascade & Multi-View Canvas</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Responsive Breakpoint Bar (Desktop 1440, Tablet 768, Mobile 375). Downward cascading property overrides. "All" Breakpoint Canvas rendering all device views simultaneously side-by-side with live synchronized updates.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T43.1 · Downward Cascading Overrides (Mobile Edit Isolation)</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Select <strong>Mobile (375px)</strong> in breakpoint bar. Change a heading font size to <code>18px</code> and background color to blue. Switch back to <strong>Desktop (1440px)</strong>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Desktop retains original large font and original color. Changes made in Mobile are stored strictly as responsive overrides for Mobile only.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Editing Mobile modifies the Desktop master styling.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 45 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 45</span>
    <span class="phase-lane-badge">Lane A · Tokens</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Design Tokens, Semantic Variables & Theme Modes</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Tokens management panel. Semantic color and number variables with multi-mode values (Light / Dark). Binding layer properties (fills, text color, spacing) to tokens. Mode toggle switching whole page instantly. Text and effect styles.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T45.1 · Token Binding & Instant Light/Dark Mode Switch</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Create color variable <code>brand/primary</code> (Light: <code>#3b82f6</code>, Dark: <code>#1d4ed8</code>). Bind two shapes to it. Toggle canvas mode switch from <strong>Light</strong> to <strong>Dark</strong>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Both shapes instantly switch fill to the dark mode color. Editing the token's value in the Tokens tab updates all bound layers immediately.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Shapes fail to update color or mode toggle does not re-resolve variables.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 46 & 47 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phases 46 & 47</span>
    <span class="phase-lane-badge">Lane A · Components</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Components, Instances, Variant Matrices & Container Slots</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Create Component (Ctrl+Alt+K). Synced instance tree propagation. Instance override isolation with Reset override. Variant properties (e.g. Size: S/M/L, Tone: Primary/Secondary). Container slots for custom instance content.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T46.1 · Main Component Sync & Instance Overrides</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Turn a button frame into a Component (Ctrl+Alt+K). Duplicate it to make an instance. On the instance, override text to <code>Submit</code>. On the main component, change background to red.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Instance background immediately turns red (inheriting main's update), while retaining its custom overridden text <code>Submit</code>.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Instance fails to inherit color change or main overwrite destroys instance's text override.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 48 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 48</span>
    <span class="phase-lane-badge">Lane A · Pages</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Multi-Page Routing, Sections & Interactive Prototype Links</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Pages tab in left dock managing routes (<code>/</code>, <code>/about</code>, <code>/contact</code>). Full-width section bands. Shared headers and footers across pages. Layer hyperlink wiring (to page, section anchor, or external URL). Interactive navigation in Preview mode.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T48.1 · Prototype Navigation Link in Preview Mode</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Create an <code>/about</code> page. On the home page, select a button and set Link destination to <code>/about</code> in inspector. Switch to <strong>Preview</strong> mode and click the button.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Preview switches instantly to <code>/about</code> page. Top address bar updates to <code>/about</code>. Back button navigates back to home page.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Link click does nothing, page fails to render, or back navigation breaks.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 49 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 49</span>
    <span class="phase-lane-badge">Lane A · Export</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Static Code Exporter (Next.js, Vite, HTML, Tailwind)</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Export Dialog (Ctrl+E). Compiles entire design to Next.js 16 (App Router), Vite + React, or pure HTML with CSS Modules, Tailwind, or Vanilla CSS. Generates clean component files with typed TypeScript props. ZIP download.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T49.1 · Next.js / Tailwind ZIP Export & Parity</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Mount demo. Choose <strong>File → Export Site...</strong> (Ctrl+E). Select <strong>Next.js (App Router)</strong> and <strong>TailwindCSS</strong>. Click <strong>Export & Download ZIP</strong>. Unpack and inspect generated project.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">ZIP downloads. Contains valid Next.js project structure (<code>app/page.tsx</code>, <code>components/</code>, <code>tailwind.config.ts</code>). Code is clean, dependency-honest, with zero compile errors.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Download fails, export contains missing imports, or generated components fail to compile.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>
`;
