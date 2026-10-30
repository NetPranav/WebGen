// scripts/pdf-content/part3_stage0_tests.js
// Stage 0: Foundation (Phases 1–12) Manual & Developer Test Specifications

export const part3Stage0Tests = `
<div class="page-break"></div>

<div class="section-hero">
  <h1>Part III: Manual Testing Suite — Stage 0: Foundation</h1>
  <p>Verification tests for core architectural infrastructure: Unified Document Model (MDM), transactional history, IndexedDB persistence, rule table, deterministic evaluation kernel, and store decomposition.</p>
</div>

<!-- Phase 1 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 1</span>
    <span class="phase-lane-badge">Core Foundation</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Build Health, Tooling & Verification Pipeline</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Strict TypeScript compiler zero-error configuration, ESLint warning budget enforcement (&lt;463 warnings), Next.js 16 / React 19 build validation, Playwright three-browser harness integration, and architectural link checkers.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T1.1 (Dev) · Production Build & Lint Compliance</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Run <code>npm run typecheck && npm run lint && npm run build</code> in terminal.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">All three exit with code 0. Zero TypeScript errors. ESLint reports 0 errors and warning budget is respected. Next.js production build completes.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Any command exits non-zero, type errors occur, or ESLint budget is exceeded.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 2 & 7 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phases 2 & 7</span>
    <span class="phase-lane-badge">Core Document</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Unified Motion Document Model & Canonical Property Paths</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> MDM schema v5/v6 data structures, 216 canonical dot-notation property paths registered in <code>properties.ts</code>, document geometry hierarchy, and schema version migrations.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T2.1 (Dev) · Property Path Registry Integrity</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Run <code>npx tsx --test "src/core/document/__tests__/properties.test.ts"</code>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">All property paths resolve correctly with expected interpolation types (number, color, unit, matrix). Zero missing paths.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Any test fails, or unregistered property paths are detected.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 3 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 3</span>
    <span class="phase-lane-badge">Persistence</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">History Engine, IndexedDB Autosave & .lazy.json Project Files</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Gesture transaction batching (a 60-frame drag = 1 undo step), IndexedDB non-blocking autosave, dirty state indicator dot, crash recovery, and full JSON export/import of <code>.lazy.json</code> project bundles.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T3.1 (User) · Autosave, Dirty Indicator & Reload Recovery</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Mount Showcase Demo. Draw a rectangle. Observe the top Save button. Wait 3 seconds, then hard reload the browser (<code>Cmd+R</code> / <code>F5</code>).</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Drawing the shape causes a small dirty dot to appear on the Save button. Within ~1s, autosave flushes to IndexedDB and the dot clears. After reload, the rectangle and demo restore identically.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Dirty dot remains stuck indefinitely, data is lost on reload, or editor crashes with IndexedDB error.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T3.2 (User) · .lazy.json Project File Export & Re-Import</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Choose <strong>File → Export Project File (.lazy.json)</strong>. Open the downloaded file in a text editor. In the editor, navigate to <code>/editor</code> (blank canvas) and choose <strong>File → Import Project File...</strong>, selecting the exported file.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">The exported file is valid JSON with <code>schemaVersion: 6</code>. The re-imported project loads flawlessly with all shapes, text, and properties intact.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">File download fails, JSON is corrupted, or import throws schema validation errors.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 10 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 10</span>
    <span class="phase-lane-badge">Rules Engine</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Executable Motion Rules Engine & Scored Engine Routing</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Executable rules compiled directly from the grammar matrix (432 assertions), conditional gating (⚠️ conditional / 🔒 subsumed), accessibility strobe limiter (≤3 flashes/sec), and scored engine routing (CSS vs WAAPI vs Three.js; GSAP excluded from editor runtime).
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T10.1 (Dev) · Rule Table Assertions & Routing Score</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Run <code>npx tsx --test "src/core/rules/__tests__/*.test.ts"</code>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">All 432 grammar compatibility assertions pass. <code>rules.canAdd</code>, <code>rules.validate</code>, and <code>rules.route</code> return correct engine choices without importing GSAP.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Any matrix assertion fails or illegal engine routing is suggested.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 11 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 11</span>
    <span class="phase-lane-badge">Kernel</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Deterministic Evaluation Kernel (evaluate())</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Pure TypeScript mathematical oracle <code>evaluate(document, time)</code>. Features exact GSAP cubic-bezier easing solver (Newton-Raphson + bisection), Motion physical spring integrator with velocity handoff, and OKLab color space interpolation.
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T11.1 (Dev) · Golden Easing & Spring Determinism</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Run <code>npx tsx --test "src/core/kernel/__tests__/*.test.ts"</code>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">111 assertions pass across 5 test suites. Kernel easing matches real GSAP golden values; spring solver matches Motion golden values; 200-sample determinism fuzz test passes with 0 drift.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Mathematical divergence from golden reference values or non-deterministic outputs.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>

<!-- Phase 12 -->
<div class="phase-header-card">
  <div class="phase-badge-line">
    <span class="phase-num-badge">Phase 12</span>
    <span class="phase-lane-badge">State Decomposition</span>
    <span class="phase-status-badge">✅ CI Green</span>
  </div>
  <div class="phase-title">Store Decomposition & Fine-Grained Subscriptions</div>
  <div class="phase-completed-box">
    <strong>What was completed:</strong> Decomposed monolithic 1,554-line store into atomic Zustand stores: <code>useDocumentStore</code> (document state & patches), <code>useEnvironmentStore</code> (camera, grid, lighting), <code>useProjectStore</code> (metadata), and <code>useSelectionStore</code> (active IDs).
  </div>
</div>

<div class="test-case-card">
  <div class="test-case-header">
    <span class="test-id-title">T12.1 (Dev) · Fine-Grained Subscription Performance</span>
    <div class="test-status-boxes">
      <span class="status-option"><span class="checkbox-sq"></span> Pass</span>
      <span class="status-option"><span class="checkbox-sq"></span> Fail</span>
      <span class="status-option"><span class="checkbox-sq"></span> Blocked</span>
    </div>
  </div>
  <div class="test-case-body">
    <div class="test-row"><span class="test-label">Do:</span> <span class="test-do">Run <code>npx tsx --test "src/core/store/__tests__/documentStore.test.ts"</code>.</span></div>
    <div class="test-row"><span class="test-label">Expect:</span> <span class="test-expect">Fine-grained per-clip and per-layer selectors fire only when their respective entity changes. Updates to Layer A do not trigger re-render in Layer B subscribers.</span></div>
    <div class="test-row"><span class="test-label">Fails if:</span> <span class="test-fails">Unnecessary subscriber notification cycles or memory retention leaks.</span></div>
    <div class="defect-note-box">
      <div class="note-header"><span>✎ Actual Outcome / Defect Notes</span><span>(Fill if expected outcome not observed)</span></div>
      <div class="ruled-line"></div>
      <div class="ruled-line"></div>
    </div>
  </div>
</div>
`;
