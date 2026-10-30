// scripts/generate_manual_testing_pdf.mjs
// Publication-grade PDF and Markdown generator for LazyLayout Manual Testing Guide & Repository Analysis

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { pdfStyles } from './pdf-content/styles.js';
import { part1RepoAnalysis } from './pdf-content/part1_repo_analysis.js';
import { part2TestFramework } from './pdf-content/part2_test_framework.js';
import { part3Stage0Tests } from './pdf-content/part3_stage0_tests.js';
import { part4Stage1TestsA } from './pdf-content/part4_stage1_tests_a.js';
import { part5Stage1TestsB } from './pdf-content/part5_stage1_tests_b.js';
import { part6Stage1TestsC } from './pdf-content/part6_stage1_tests_c.js';
import { part7FigcraftTests } from './pdf-content/part7_figcraft_tests.js';
import { part8Stage2Tests } from './pdf-content/part8_stage2_tests.js';
import { part9RegressionAudit } from './pdf-content/part9_regression_audit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'DOCS');

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const coverHtml = `
<div class="cover-page">
  <div class="cover-top">
    <div class="cover-badge-row">
      <span class="cover-badge">LazyLayout Studio</span>
      <span class="cover-badge">Release 1 · Initial Phase</span>
      <span class="cover-badge">Roadmap v4.0.0</span>
      <span class="cover-badge">Quality Assurance Master</span>
    </div>
    <div class="cover-title">LazyLayout: Complete Repository Analysis & Manual Testing Documentation</div>
    <div class="cover-subtitle">Comprehensive Architectural Breakdown, Subsystem Analysis, and Phase-by-Phase Quality Assurance Test Execution Manual with Defect Capture Worksheets</div>
    <p class="cover-desc">
      A publication-grade testing manual and engineering reference covering the entire LazyLayout codebase: 
      Stage 0 (Foundations 1–12), Stage 1 (Viewport & Layout 13–49), FigCraft Port Deepening (F1–F14), 
      Stage 2 (Animation Engine & Timeline 53–63), cross-browser matrices, chaotic stress suites, 
      and explicit verification for all 50 known issues from AUDIT_ISSUES.md.
    </p>
  </div>

  <div class="cover-grid">
    <div class="cover-stat-box">
      <div class="cover-stat-number">202 Phases</div>
      <div class="cover-stat-label">Sequential Roadmap Order</div>
    </div>
    <div class="cover-stat-box">
      <div class="cover-stat-number">70+ Completed</div>
      <div class="cover-stat-label">Fully Documented Test Targets</div>
    </div>
    <div class="cover-stat-box">
      <div class="cover-stat-number">216 Properties</div>
      <div class="cover-stat-label">Canonical Motion Paths in MDM</div>
    </div>
    <div class="cover-stat-box">
      <div class="cover-stat-number">50 Audit Gaps</div>
      <div class="cover-stat-label">Explicitly Verified Test Cases</div>
    </div>
  </div>

  <div class="cover-footer">
    <div><strong>Project:</strong> LazyLayout (AI-Native Motion Design Studio)</div>
    <div><strong>Baseline:</strong> Next.js 16 · React 19 · TypeScript 5.x</div>
    <div><strong>Date:</strong> October 2026 · Confidential QA Guide</div>
  </div>
</div>
`;

const tocHtml = `
<div class="page-break"></div>

<div class="toc-container">
  <div class="toc-title">Table of Contents</div>
  
  <div class="toc-item">
    <span class="toc-section-title">Part I: Comprehensive Repository & Codebase Analysis</span>
    <span class="toc-page">Section 1</span>
  </div>
  <div class="toc-subitem">• 1. Executive Summary & Product Vision ("Figma for Motion with AI")</div>
  <div class="toc-subitem">• 2. Core Architectural Laws (The 20 Invariant Laws)</div>
  <div class="toc-subitem">• 3. Technical Stack & Dependencies (Next.js 16, React 19, TypeScript)</div>
  <div class="toc-subitem">• 4. Architectural Subsystems Breakdown (MDM, Command Bus, Stage Host, WAAPI)</div>
  <div class="toc-subitem">• 5. Known Audit Issues & Defect Landscape (50 Cataloged Issues)</div>

  <div class="toc-item" style="margin-top: 10px;">
    <span class="toc-section-title">Part II: Manual Testing Architecture & Execution Framework</span>
    <span class="toc-page">Section 2</span>
  </div>
  <div class="toc-subitem">• 1. Testing Methodology: The "Do → Expect → Fails if" Standard</div>
  <div class="toc-subitem">• 2. Defect Capture & Note-Writing Protocol (When Expected Outcome Was Not Observed)</div>
  <div class="toc-subitem">• 3. Environment Setup & Pre-Flight Configuration</div>
  <div class="toc-subitem">• 4. Interface Topography Map (Where Every Control Is Located)</div>
  <div class="toc-subitem">• 5. Fundamental Test Recipes: Recipe A (Motion) & Recipe B (Shapes)</div>
  <div class="toc-subitem">• 6. Quick Smoke Test Suite (3-Minute Pre-Flight: S1–S5)</div>

  <div class="toc-item" style="margin-top: 10px;">
    <span class="toc-section-title">Part III: Phase-by-Phase Manual Testing Specifications</span>
    <span class="toc-page">Section 3</span>
  </div>
  <div class="toc-subitem"><strong>• Stage 0: Foundations (Phases 1–12)</strong> — Model, Rules, Kernel, Undo, Decomposition</div>
  <div class="toc-subitem"><strong>• Stage 1: Viewport, Tools & Selection (Phases 13–28)</strong> — Camera, Multi-frame, Shapes, Hit-testing</div>
  <div class="toc-subitem"><strong>• Stage 1: Editing, Layers, Inspectors, Paint & Assets (Phases 29–38)</strong> — Duplication, Tree, Gradients, Fonts</div>
  <div class="toc-subitem"><strong>• Stage 1: Vector, Layout, Components & Export (Phases 39–49)</strong> — Pen, Auto-layout, Breakpoints, Next.js ZIP</div>
  <div class="toc-subitem"><strong>• FigCraft Port Deepening (Features F1–F14)</strong> — Squircles, P3, Vector Networks, Booleans, Dev Mode</div>
  <div class="toc-subitem"><strong>• Stage 2: Animation Grammar, Transport & Timeline (Phases 53–63)</strong> — Clock, Scheduler, WAAPI, Timeline</div>

  <div class="toc-item" style="margin-top: 10px;">
    <span class="toc-section-title">Part IV: Regression, Cross-Browser, Stress & Audit Testing</span>
    <span class="toc-page">Section 4</span>
  </div>
  <div class="toc-subitem">• 1. End-to-End Regression Journeys (25-step full lifecycle test)</div>
  <div class="toc-subitem">• 2. Cross-Browser Compatibility Matrix (Chromium, Firefox, WebKit differences)</div>
  <div class="toc-subitem">• 3. Chaotic Stress & Break-Testing Scenarios (15 Torture Scenarios)</div>
  <div class="toc-subitem">• 4. Comprehensive Audit Issues Verification Matrix (50 Specific Test Cases for AUDIT_ISSUES.md)</div>
  <div class="toc-subitem">• 5. Standardized Defect Reporting Guide & Bug Filing Template</div>
</div>
`;

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LazyLayout: Manual Testing Guide & Repository Analysis</title>
  <style>
    ${pdfStyles}
  </style>
</head>
<body>
  ${coverHtml}
  ${tocHtml}
  ${part1RepoAnalysis}
  ${part2TestFramework}
  ${part3Stage0Tests}
  ${part4Stage1TestsA}
  ${part5Stage1TestsB}
  ${part6Stage1TestsC}
  ${part7FigcraftTests}
  ${part8Stage2Tests}
  ${part9RegressionAudit}
</body>
</html>`;

async function main() {
  const htmlPath = path.join(docsDir, 'MANUAL_TESTING_GUIDE_AND_REPO_ANALYSIS.html');
  const pdfPath = path.join(docsDir, 'LazyLayout_Complete_Manual_Testing_Guide_and_Repo_Analysis.pdf');
  const mdPath = path.join(docsDir, 'COMPLETE_MANUAL_TESTING_GUIDE_AND_REPO_ANALYSIS.md');

  console.log('Writing HTML source to:', htmlPath);
  fs.writeFileSync(htmlPath, fullHtml, 'utf-8');

  console.log('Generating PDF via headless Chromium Playwright...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setContent(fullHtml, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000); // Wait for Google fonts to settle

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: false,
    margin: {
      top: '16mm',
      bottom: '16mm',
      left: '14mm',
      right: '14mm'
    }
  });

  await browser.close();
  console.log('PDF generated successfully at:', pdfPath);

  // Generate a clean Markdown companion file
  console.log('Generating Markdown companion at:', mdPath);
  const mdContent = `# LazyLayout: Complete Repository Analysis & Manual Testing Documentation

**Document Version:** 4.0.0-QA  
**Date:** October 2026  
**Status:** Complete Quality Assurance Master Reference  
**PDF Version:** [LazyLayout_Complete_Manual_Testing_Guide_and_Repo_Analysis.pdf](file://${pdfPath})  
**HTML Version:** [MANUAL_TESTING_GUIDE_AND_REPO_ANALYSIS.html](file://${htmlPath})

---

## Executive Summary
This document provides a complete, rigorous analysis of the **LazyLayout** codebase, its architectural laws, technology stack, and full phase-by-phase manual testing specifications covering:
- **Stage 0 (Phases 1–12):** Core Foundation, MDM Schema, Rules Engine, Deterministic Kernel, History.
- **Stage 1 (Phases 13–49):** Viewport, Multi-Frame Canvas, Creation Tools, Selection, Transform Handles, Snapping, Editing, Simple/Pro Inspectors, Paint, Typography, Auto-Layout, Grid, Breakpoints, Tokens, Components, Multi-page Routing, and Static Export.
- **FigCraft Port Deepening (F1–F14):** Squircle corner smoothing, Display P3 gamut, Vector Networks, Paint Bucket (B), Live Booleans, Shape Builder (Shift+M), Progressive Blurs, and Dev Mode.
- **Stage 2 (Phases 53–63):** Schema v6, Central Transport Clock, Frame Scheduler, WAAPI GPU Acceleration, Scrub vs Play Handoff, Parity Verification Badge, Layer Timeline Workspace, Stopwatches, and After Effects keybindings.
- **Quality Assurance Matrices:** End-to-end regression journeys, cross-browser compatibility matrix (Chromium, Firefox, WebKit), 15 chaotic stress test scenarios, and full verification suite for all 50 known issues from \`AUDIT_ISSUES.md\`.

> **Note on Testing Protocol:** Every manual test case features explicit **Do → Expect → Fails if** instructions and a dedicated **Actual Outcome / Defect Notes** section for logging unexpected behavior and deviations.

*(For the complete, beautifully styled multi-page printable document with formatted worksheets, open the generated PDF file.)*
`;

  fs.writeFileSync(mdPath, mdContent, 'utf-8');
  console.log('All files generated successfully!');
}

main().catch((err) => {
  console.error('Error during generation:', err);
  process.exit(1);
});
