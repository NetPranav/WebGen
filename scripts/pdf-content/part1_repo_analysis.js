// scripts/pdf-content/part1_repo_analysis.js
// Comprehensive Repository, Codebase, Architecture & Goal Analysis

export const part1RepoAnalysis = `
<div class="page-break"></div>

<div class="section-hero">
  <h1>Part I: Comprehensive Repository & Codebase Analysis</h1>
  <p>Detailed architectural inspection of LazyLayout: product vision, core thesis, technology stack, directory organization, state management, runtime execution engines, security boundaries, and known gaps.</p>
</div>

<h2>1. Executive Summary & Product Vision</h2>
<p><strong>LazyLayout</strong> (internally designated <em>"Unreal Engine for Animation & Frontend Design"</em> and <em>"Figma for Motion with AI"</em>) is an AI-native motion design studio. It bridges the deep gulf between three disciplines that rarely overlap: visual motion design, animation engineering (GSAP, Framer Motion, WAAPI, Three.js, shaders), and production-grade frontend engineering.</p>

<p>In standard industry workflows, designers create animations in Figma or After Effects that cannot be cleanly translated to code without manual rewriting, approximation, and performance degradation. Conversely, frontend developers write complex animation scripts without interactive visual feedback. LazyLayout resolves this by providing:</p>
<ul>
  <li><strong>A unified visual canvas</strong> that feels like Figma for authoring responsive layouts, vector shapes, typography, and design tokens.</li>
  <li><strong>A multi-engine animation timeline</strong> that operates like After Effects (with keyframe twirl-downs, stopwatches, curves, and transport control).</li>
  <li><strong>A deterministic evaluation kernel</strong> (<code>evaluate(t)</code>) guaranteeing that what you scrub and play in the editor matches exported production code down to the sub-pixel (Preview = Export).</li>
  <li><strong>Multi-target static code generation</strong> compiling to production Next.js 16 (App Router), Vite + React, or standalone HTML with Tailwind, CSS Modules, or vanilla CSS.</li>
  <li><strong>AI-native authoring</strong> where Claude API or local MCP agents can propose layout and motion changes as typed, reviewable diffs with strict zero-silent-write guarantees.</li>
</ul>

<div class="callout callout-info">
  <strong>Current Repository State (October 2026):</strong>
  The repository is operating under <strong>ROADMAP v4.0.0</strong> (202 sequential phases). 
  <strong>Stage 0 (Phases 1–12)</strong> is 100% complete. 
  <strong>Stage 1 (Phases 13–52)</strong> has delivered the complete viewport, drawing tools, inspector, design tokens, components, multi-page routing, and static export (with active FigCraft port deepening F1–F14). 
  <strong>Stage 2 (Phases 53–102)</strong> has merged Phases 53–63 to <code>main</code>, delivering schema v6, central clock transport, frame scheduler, WAAPI acceleration, and the Layer Timeline.
</div>

<h2>2. Core Architectural Laws (The 20 Laws)</h2>
<p>Every commit and pull request in this repository is strictly bound by 20 non-negotiable architectural laws:</p>
<table>
  <thead>
    <tr>
      <th style="width: 15%;">Law</th>
      <th style="width: 25%;">Name</th>
      <th>Architectural Mandate & Invariant</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Law 1</strong></td>
      <td><strong>Inside-Out</strong></td>
      <td>Types and schema precede rules; rules precede diagnostics; diagnostics precede UI controls. No UI control may exist without an underlying rule table assertion.</td>
    </tr>
    <tr>
      <td><strong>Law 2</strong></td>
      <td><strong>One Document</strong></td>
      <td>Every surface (canvas, inspector, timeline, AI agent, code view, exporter) reads and writes the single Motion Document Model (MDM). No parallel state models.</td>
    </tr>
    <tr>
      <td><strong>Law 3</strong></td>
      <td><strong>Preview = Export</strong></td>
      <td>Every animation evaluates through pure mathematics (<code>evaluate(t)</code>) such that the live preview and exported code match within 0.5% pixel tolerance.</td>
    </tr>
    <tr>
      <td><strong>Law 4</strong></td>
      <td><strong>No Silent AI Writes</strong></td>
      <td>Every AI or agent action generates a visible diff (ghost layers/keyframes) requiring explicit human approval. No silent state modifications.</td>
    </tr>
    <tr>
      <td><strong>Law 5</strong></td>
      <td><strong>Real Verification</strong></td>
      <td>Verification gates must run in TypeScript compiler (<code>tsc</code>), real browsers (Chromium, Firefox, WebKit), and real production builds, not synthetic mocks.</td>
    </tr>
    <tr>
      <td><strong>Law 6</strong></td>
      <td><strong>Simple by Default</strong></td>
      <td>Every capability must expose a Simple face (≤ 7 controls, zero technical jargon) before or alongside its Pro face.</td>
    </tr>
    <tr>
      <td><strong>Law 7</strong></td>
      <td><strong>Licensing Gate</strong></td>
      <td>Third-party code cannot be introduced without formal licensing verification in <code>LICENSES.md</code> (e.g. GSAP is strictly an export target, never bundled in editor runtime).</td>
    </tr>
    <tr>
      <td><strong>Law 8</strong></td>
      <td><strong>One Clock</strong></td>
      <td>A single central transport (<code>src/core/time/transport.ts</code>) owns the timeline, playhead, frame rate, and loop mode. No individual panel holds its own timer.</td>
    </tr>
    <tr>
      <td><strong>Law 9</strong></td>
      <td><strong>Hot Path</strong></td>
      <td>Per-frame animation values never touch React state or the document store. They flow directly through the FrameScheduler and the DOM node registry.</td>
    </tr>
    <tr>
      <td><strong>Law 10</strong></td>
      <td><strong>Document Space</strong></td>
      <td>All layer geometry is stored in document coordinates. Editor UI reads bounding boxes solely through the renderer's measurement API.</td>
    </tr>
    <tr>
      <td><strong>Law 11</strong></td>
      <td><strong>One Renderer</strong></td>
      <td>The editor stage and code exporters render from the identical per-archetype render definitions (<code>src/core/render/definitions/</code>).</td>
    </tr>
    <tr>
      <td><strong>Law 12</strong></td>
      <td><strong>Signal Input Bus</strong></td>
      <td>Continuous inputs (pointer, scroll, touch, keys) are sampled once per frame by the central scheduler. No component attaches unmanaged listeners.</td>
    </tr>
    <tr>
      <td><strong>Law 13</strong></td>
      <td><strong>Surface Budget</strong></td>
      <td>Only the GPU compositor creates WebGL/WebGPU contexts within strict hardware device-tier memory limits.</td>
    </tr>
    <tr>
      <td><strong>Law 14</strong></td>
      <td><strong>Graceful Degradation</strong></td>
      <td>Every interactive effect defines a fallback chain: GPU Shader → CSS/Canvas → Static Poster → Accessible Reduced-Motion alternative.</td>
    </tr>
    <tr>
      <td><strong>Law 15</strong></td>
      <td><strong>Deterministic Replay</strong></td>
      <td>Simulations, particles, and physics replay identically from <code>(seed, input tape, fixed dt step)</code>.</td>
    </tr>
    <tr>
      <td><strong>Law 16</strong></td>
      <td><strong>Untrusted Code</strong></td>
      <td>User code, code components, and raw shaders run only inside an isolated sandbox with zero access to editor privileges or cookies.</td>
    </tr>
    <tr>
      <td><strong>Law 17</strong></td>
      <td><strong>Visual First (No Maths)</strong></td>
      <td>Everything authorable can be created without entering numbers or mathematical formulas (using handles, feel sliders, or visual meters).</td>
    </tr>
    <tr>
      <td><strong>Law 18</strong></td>
      <td><strong>Sequential Order</strong></td>
      <td>Roadmap phase numbers represent strict execution order. Every phase's dependencies only point backward to lower phase numbers.</td>
    </tr>
    <tr>
      <td><strong>Law 19</strong></td>
      <td><strong>Visible Progress</strong></td>
      <td>Every phase from Phase 13 onward must deliver a user-visible change on screen ("You'll see"). At most two infrastructure phases may run consecutively.</td>
    </tr>
    <tr>
      <td><strong>Law 20</strong></td>
      <td><strong>Agent Parity</strong></td>
      <td>Every user interaction is a typed command on the command bus, exposed directly to local MCP servers so AI agents can control the entire editor.</td>
    </tr>
  </tbody>
</table>

<h2>3. Technical Stack & Dependencies</h2>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Domain</th>
      <th style="width: 35%;">Technology / Library</th>
      <th>Role & Configuration</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Framework Baseline</strong></td>
      <td>Next.js 16 (App Router) + React 19</td>
      <td>Strict modern React 19 concurrent features, Server/Client components, and Next.js 16 layout routing.</td>
    </tr>
    <tr>
      <td><strong>Language & Types</strong></td>
      <td>TypeScript 5.x (Strict Mode)</td>
      <td>Full type-safety, zero <code>any</code> policy, compiler emitting no errors (<code>tsc --noEmit</code> enforced in CI).</td>
    </tr>
    <tr>
      <td><strong>Styling & Design System</strong></td>
      <td>Vanilla CSS + CSS Modules + TailwindCSS</td>
      <td>CSS custom properties design tokens, theme variables, hardware-accelerated transforms, zero ad-hoc CSS.</td>
    </tr>
    <tr>
      <td><strong>State Management</strong></td>
      <td>Zustand (Decomposed split stores)</td>
      <td>Fine-grained stores: <code>useDocumentStore</code>, <code>useEnvironmentStore</code>, <code>useProjectStore</code>, <code>useSelectionStore</code>.</td>
    </tr>
    <tr>
      <td><strong>Stage Rendering</strong></td>
      <td>Isolated <code>&lt;iframe&gt;</code> Host (StageHost v2)</td>
      <td>Live DOM tree at <code>/stage-frame.html</code> with strict CSP <code>script-src 'none'</code> and postMessage message-channel dispatch.</td>
    </tr>
    <tr>
      <td><strong>Animation Engines</strong></td>
      <td>Web Animations API (WAAPI) + Custom Kernel</td>
      <td>WAAPI runtime for GPU-accelerated CSS properties; deterministic mathematical kernel (<code>evaluate()</code>) for scrub/pause.</td>
    </tr>
    <tr>
      <td><strong>3D & Graphics</strong></td>
      <td>Three.js 0.186.1 + React Three Fiber + Drei</td>
      <td>MIT-licensed WebGL 3D rendering pipeline for meshes, materials, lights, and cameras.</td>
    </tr>
    <tr>
      <td><strong>Vector & Booleans</strong></td>
      <td><code>polygon-clipping</code> + Kurbo/FigCraft ports</td>
      <td>Curve fitting, bezier mathematical evaluations, vector network topology, and boolean clipping operations.</td>
    </tr>
    <tr>
      <td><strong>Testing & Parity</strong></td>
      <td>Playwright 1.50+ & Node.js Native Test Runner</td>
      <td>Cross-browser testing (Chromium, Firefox, WebKit), pixel-parity diffing (pngjs), export build compilation harness.</td>
    </tr>
  </tbody>
</table>

<h2>4. Architectural Subsystems Breakdown</h2>

<h3>4.1 Unified Motion Document Model (MDM v6)</h3>
<p>The core data model lives under <code>src/core/document/</code>. It defines 216 canonical property paths organized into a strictly typed document tree:</p>
<pre><code>// Conceptual Document Hierarchy
MotionDocument {
  id: string,
  schemaVersion: 6,
  pages: Record&lt;string, Page&gt;,
  layers: Record&lt;string, Layer&gt;,            // Flat dictionary of all layers with parentId links
  compositions: Record&lt;string, Composition&gt;,// Timeline tracks, triggers, work areas, markers
  clips: Record&lt;string, Clip&gt;,              // Keyframe sequences, behaviors, reactive signals
  designComponents: Record&lt;string, Component&gt;, // Component definitions, variants, properties
  tokens: { collections, variables, modes },// Design tokens and semantic color/number variables
  breakpoints: Breakpoint[],               // Responsive breakpoints (Desktop, Tablet, Mobile)
  assets: Record&lt;string, Asset&gt;             // Image/font asset registry with SHA-256 deduplication
}</code></pre>
<p>Every property is accessed via dot-notation canonical paths (e.g. <code>transform.x</code>, <code>appearance.opacity</code>, <code>paint.fills</code>, <code>shape.cornerRadius</code>, <code>layout.auto</code>). All mutations occur through patch-based command transactions that create atomic undo/redo records in IndexedDB.</p>

<h3>4.2 Command Bus & Focus Model (Phase 13)</h3>
<p>Located in <code>src/core/commands/</code>. Every interactive action is a typed command registered with a unique identifier (e.g. <code>edit.undo</code>, <code>canvas.zoomIn</code>, <code>transport.play</code>, <code>tool.select</code>). Commands specify VS Code-style <code>when</code> context clauses reading from the Zustand context keys store:</p>
<ul>
  <li><code>canvasFocus</code>: True when pointer hovers the stage canvas.</li>
  <li><code>timelineFocus</code>: True when pointer hovers the Layer Timeline or Sequencer.</li>
  <li><code>textEditing</code>: True when an input, textarea, or canvas inline text editor has focus.</li>
  <li><code>selection.count</code>: Number of currently selected layers.</li>
  <li><code>transport.playing</code>: Whether the animation transport is running.</li>
</ul>
<p>This completely eliminates keyboard shortcut conflicts (e.g. pressing Space over the timeline plays animation, while pressing Space over canvas activates the Hand panning tool).</p>

<h3>4.3 Stage Host v2 & DOM Isolation (Phase 18)</h3>
<p>Prior to Phase 18, the editor stage was an HTML string injected into an iframe (<code>srcDoc</code>), causing the entire canvas to reload on every keystroke. StageHost v2 mounts a permanent, static iframe (<code>/stage-frame.html</code>) governed by strict Content Security Policy (<code>script-src 'none'</code>):</p>
<ul>
  <li>The iframe never runs untrusted scripts or eval.</li>
  <li>Mutations are reconciled incrementally via DOM operations using <code>LayerNodeRegistry</code> (Phase 19).</li>
  <li>Editing a layer's color, position, or size updates only that specific DOM node in under 1ms, maintaining smooth 60 FPS even with 500+ complex layers.</li>
</ul>

<h3>4.4 Dual Animation Engine & Parity Verification (Phases 57–60)</h3>
<p>LazyLayout solves the classic animation editing paradox (scrubbing requires instant random-access mathematics, while playback requires hardware-accelerated thread independence) using a dual-engine architecture:</p>
<ul>
  <li><strong>Scrubbing & Paused State:</strong> The pure TypeScript <strong>Deterministic Evaluation Kernel</strong> (<code>src/core/kernel/evaluate.ts</code>) evaluates all property paths at exact time <code>t</code>. It integrates GSAP-derived cubic-bezier easings and Framer Motion physical spring formulas.</li>
  <li><strong>Playing State:</strong> Eligible CSS properties (transforms, opacity, colors) hand off instantly to native browser <strong>Web Animations (WAAPI)</strong> running on the compositor thread.</li>
  <li><strong>Zero-Pixel Handoff:</strong> Pausing terminates WAAPI and re-applies kernel inline styles with 0.0px jump.</li>
  <li><strong>Parity Badge:</strong> A real-time drift auditor (<code>src/core/engine/stage/parity.ts</code>) samples the stage every 30 frames and computes mathematical variance against <code>evaluate(t)</code>. A green badge in the status bar confirms drift remains under 0.5px.</li>
</ul>

<h3>4.5 FigCraft Port Architecture (F1–F14)</h3>
<p>On branch <code>a/figcraft-port</code>, LazyLayout incorporates the engine algorithms from the high-performance Rust vector engine FigCraft (MIT licensed), translating data structures and mathematical behaviors into clean TypeScript:</p>
<ul>
  <li><strong>Squircle Corner Smoothing (F1):</strong> Continuous-curvature corner radii (G2 continuity) rather than simple circular arcs.</li>
  <li><strong>Display P3 Color Gamut (F2):</strong> Full wide-gamut color parsing and <code>color(display-p3 ...)</code> rendering.</li>
  <li><strong>Vector Networks & Paint Bucket (F4):</strong> True non-manifold vector topologies with vertices, segments, and faces, editable via the Paint Bucket tool (B).</li>
  <li><strong>Live Boolean Groups & Shape Builder (F5):</strong> Non-destructive boolean unions/subtractions where operands remain editable layers, plus the interactive Shape Builder tool (Shift+M).</li>
  <li><strong>Dev Mode (F13):</strong> Inspector showing CSS syntax with token variables, annotations, and kept measurement overlays.</li>
</ul>

<h2>5. Known Audit Issues & Defect Landscape (AUDIT_ISSUES.md)</h2>
<p>The repository maintains an active audit log of 50 identified issues discovered during Stage 0–Stage 1 development. Understanding these is essential for thorough manual testing:</p>
<table>
  <thead>
    <tr>
      <th style="width: 10%;">ID</th>
      <th style="width: 15%;">Area</th>
      <th style="width: 10%;">Sev</th>
      <th>Issue Summary & Defect Behavior</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>#1</strong></td>
      <td>Selection (26)</td>
      <td><strong>Med</strong></td>
      <td>Selection array retains layer IDs that were deleted via undo, redo, or frame removal.</td>
    </tr>
    <tr>
      <td><strong>#3</strong></td>
      <td>Editing (29)</td>
      <td><strong>Med</strong></td>
      <td>Delete, Cut, Duplicate, Nudge, and Group operations still execute on locked layers if selected via command.</td>
    </tr>
    <tr>
      <td><strong>#4</strong></td>
      <td>Editing (29)</td>
      <td><strong>High</strong></td>
      <td>Editing shortcuts (Delete, nudge, duplicate, arrange) still fire while Preview mode is active.</td>
    </tr>
    <tr>
      <td><strong>#5</strong></td>
      <td>Tools (24)</td>
      <td><strong>Med</strong></td>
      <td>Window blur or pointer cancellation mid-drag leaves <code>gesturing</code> state active, locking shortcuts.</td>
    </tr>
    <tr>
      <td><strong>#7</strong></td>
      <td>Document (3)</td>
      <td><strong>High</strong></td>
      <td>Executing undo or redo while a drag transaction is in progress corrupts history and document tree.</td>
    </tr>
    <tr>
      <td><strong>#10</strong></td>
      <td>Camera (20)</td>
      <td><strong>High</strong></td>
      <td><code>NaN</code> or <code>Infinity</code> entering zoom anchor can blank the entire viewport canvas.</td>
    </tr>
    <tr>
      <td><strong>#11</strong></td>
      <td>Hit-testing (22)</td>
      <td><strong>Med</strong></td>
      <td>Overlapping frames can select a child of the frame underneath, violating visual stacking order.</td>
    </tr>
    <tr>
      <td><strong>#18</strong></td>
      <td>Transform (27)</td>
      <td><strong>Med</strong></td>
      <td>A pure position move mistakenly writes explicit width/height, converting hug-sized layers into fixed.</td>
    </tr>
    <tr>
      <td><strong>#21</strong></td>
      <td>Document (3)</td>
      <td><strong>High</strong></td>
      <td><code>insertLayers</code> can overwrite an existing layer if IDs collide without deduplication check.</td>
    </tr>
    <tr>
      <td><strong>#23</strong></td>
      <td>Clipboard (29)</td>
      <td><strong>High</strong></td>
      <td>Cut command deletes layer from stage even if clipboard write permission was denied.</td>
    </tr>
    <tr>
      <td><strong>#24</strong></td>
      <td>Time (54)</td>
      <td><strong>High</strong></td>
      <td>Seeking with <code>NaN</code> corrupts transport playhead and work area into <code>NaN</code>.</td>
    </tr>
    <tr>
      <td><strong>#33</strong></td>
      <td>Import (3)</td>
      <td><strong>High</strong></td>
      <td><code>.lazy.json</code> import lacks file size and layer count ceilings, allowing hostile memory exhaustion.</td>
    </tr>
    <tr>
      <td><strong>#36</strong></td>
      <td>Stage (18)</td>
      <td><strong>Med</strong></td>
      <td><code>performance.mark</code> calls executed on every render frame never clear, causing slow memory leak.</td>
    </tr>
    <tr>
      <td><strong>#45</strong></td>
      <td>Dev Routes</td>
      <td><strong>Med</strong></td>
      <td>Testing lab routes (<code>/editor/canvas-lab</code>, <code>stage-lab</code>, <code>render-gallery</code>) are exposed in production builds.</td>
    </tr>
  </tbody>
</table>
`;
