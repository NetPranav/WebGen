// scripts/pdf-content/styles.js
// Modern, publication-quality print and screen styling for LazyLayout testing documentation

export const pdfStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@500;600;700;800&display=swap');

  @page {
    size: A4;
    margin: 16mm 14mm 16mm 14mm;
    @top-right {
      content: "LazyLayout Manual Testing Guide & Repo Analysis";
      font-family: 'Inter', sans-serif;
      font-size: 8pt;
      color: #64748b;
      font-weight: 500;
    }
    @bottom-left {
      content: "Confidential - Quality Assurance & Engine Verification";
      font-family: 'Inter', sans-serif;
      font-size: 8pt;
      color: #94a3b8;
    }
    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
      font-family: 'Inter', sans-serif;
      font-size: 8pt;
      color: #64748b;
      font-weight: 600;
    }
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #0f172a;
    background: #ffffff;
    line-height: 1.5;
    font-size: 9.5pt;
    margin: 0;
    padding: 0;
  }

  /* Cover Page */
  .cover-page {
    page-break-after: always;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 40px 20px 20px 20px;
    background: linear-gradient(135deg, #090d16 0%, #1e1b4b 60%, #0f172a 100%);
    color: #ffffff;
    border-radius: 12px;
  }

  .cover-top {
    border-bottom: 2px solid rgba(255,255,255,0.12);
    padding-bottom: 24px;
  }

  .cover-badge-row {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }

  .cover-badge {
    background: rgba(99, 102, 241, 0.25);
    border: 1px solid rgba(129, 140, 248, 0.4);
    color: #c7d2fe;
    font-size: 8pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding: 4px 12px;
    border-radius: 9999px;
  }

  .cover-title {
    font-family: 'Outfit', sans-serif;
    font-size: 32pt;
    font-weight: 800;
    line-height: 1.15;
    margin: 0 0 12px 0;
    letter-spacing: -0.5px;
    background: linear-gradient(to right, #ffffff, #c7d2fe, #93c5fd);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .cover-subtitle {
    font-size: 13pt;
    color: #cbd5e1;
    font-weight: 400;
    margin: 0 0 18px 0;
    line-height: 1.4;
  }

  .cover-desc {
    font-size: 10pt;
    color: #94a3b8;
    max-width: 680px;
    line-height: 1.6;
    margin: 0;
  }

  .cover-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin: 30px 0;
  }

  .cover-stat-box {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 14px 18px;
    border-radius: 8px;
  }

  .cover-stat-number {
    font-family: 'Outfit', sans-serif;
    font-size: 20pt;
    font-weight: 700;
    color: #38bdf8;
    margin-bottom: 2px;
  }

  .cover-stat-label {
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #94a3b8;
    font-weight: 600;
  }

  .cover-footer {
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 18px;
    display: flex;
    justify-content: space-between;
    font-size: 8.5pt;
    color: #94a3b8;
  }

  /* Typography */
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Outfit', -apple-system, sans-serif;
    color: #0f172a;
    margin-top: 18px;
    margin-bottom: 8px;
    page-break-after: avoid;
  }

  h1 {
    font-size: 18pt;
    font-weight: 700;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 6px;
    color: #1e1b4b;
    margin-top: 24px;
  }

  h2 {
    font-size: 14pt;
    font-weight: 700;
    color: #1e293b;
    border-left: 4px solid #6366f1;
    padding-left: 8px;
    margin-top: 18px;
  }

  h3 {
    font-size: 11.5pt;
    font-weight: 600;
    color: #334155;
    margin-top: 14px;
  }

  p {
    margin: 0 0 8px 0;
  }

  code, pre {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5pt;
  }

  code {
    background: #f1f5f9;
    padding: 1px 4px;
    border-radius: 4px;
    color: #0f172a;
    border: 1px solid #e2e8f0;
  }

  pre {
    background: #0f172a;
    color: #e2e8f0;
    padding: 10px 14px;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 8pt;
    margin: 8px 0 12px 0;
    line-height: 1.45;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px 0;
    font-size: 8.5pt;
    page-break-inside: avoid;
  }

  th, td {
    border: 1px solid #cbd5e1;
    padding: 6px 10px;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: #f8fafc;
    font-weight: 600;
    color: #1e293b;
    border-bottom: 2px solid #94a3b8;
  }

  tr:nth-child(even) td {
    background: #fbfcfe;
  }

  /* Callouts & Alert Boxes */
  .callout {
    padding: 10px 14px;
    border-radius: 6px;
    margin: 10px 0;
    font-size: 9pt;
    page-break-inside: avoid;
  }

  .callout-info {
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
    color: #1e3a8a;
  }

  .callout-warning {
    background: #fffbeb;
    border-left: 4px solid #f59e0b;
    color: #92400e;
  }

  .callout-success {
    background: #ecfdf5;
    border-left: 4px solid #10b981;
    color: #065f46;
  }

  .callout-danger {
    background: #fef2f2;
    border-left: 4px solid #ef4444;
    color: #991b1b;
  }

  /* Phase Cards */
  .phase-header-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-top: 4px solid #6366f1;
    border-radius: 6px;
    padding: 12px 14px;
    margin: 18px 0 12px 0;
    page-break-inside: avoid;
  }

  .phase-badge-line {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 6px;
  }

  .phase-num-badge {
    background: #4f46e5;
    color: #ffffff;
    font-size: 8pt;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .phase-lane-badge {
    background: #e0e7ff;
    color: #3730a3;
    font-size: 7.5pt;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .phase-status-badge {
    background: #dcfce7;
    color: #166534;
    font-size: 7.5pt;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .phase-title {
    font-size: 13pt;
    font-weight: 700;
    color: #0f172a;
    margin: 4px 0 6px 0;
  }

  .phase-completed-box {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 8px 10px;
    margin-top: 6px;
    font-size: 8.5pt;
    color: #334155;
  }

  /* Test Case Block */
  .test-case-card {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    margin: 10px 0 14px 0;
    page-break-inside: avoid;
    background: #ffffff;
    overflow: hidden;
  }

  .test-case-header {
    background: #f1f5f9;
    border-bottom: 1px solid #cbd5e1;
    padding: 6px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .test-id-title {
    font-weight: 700;
    font-size: 9pt;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .test-status-boxes {
    display: flex;
    gap: 12px;
    font-size: 8pt;
    font-weight: 600;
    color: #475569;
  }

  .status-option {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .checkbox-sq {
    display: inline-block;
    width: 13px;
    height: 13px;
    border: 1.5px solid #64748b;
    border-radius: 2px;
    background: #ffffff;
  }

  .test-case-body {
    padding: 8px 12px;
    font-size: 9pt;
  }

  .test-row {
    margin-bottom: 5px;
  }

  .test-label {
    font-weight: 600;
    color: #1e293b;
    display: inline-block;
    min-width: 65px;
  }

  .test-do {
    color: #0f172a;
  }

  .test-expect {
    color: #047857;
  }

  .test-fails {
    color: #b91c1c;
  }

  /* Defect / Note Ruled Area */
  .defect-note-box {
    margin-top: 8px;
    background: #fbfcfe;
    border: 1px dashed #94a3b8;
    border-radius: 4px;
    padding: 6px 10px;
  }

  .note-header {
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748b;
    margin-bottom: 4px;
    display: flex;
    justify-content: space-between;
  }

  .ruled-line {
    height: 18px;
    border-bottom: 1px dotted #cbd5e1;
    margin-bottom: 2px;
  }

  /* Table of Contents */
  .toc-container {
    page-break-after: always;
    padding: 10px 0;
  }

  .toc-title {
    font-size: 18pt;
    font-weight: 700;
    border-bottom: 2px solid #6366f1;
    padding-bottom: 8px;
    margin-bottom: 16px;
    color: #1e1b4b;
  }

  .toc-item {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    border-bottom: 1px dotted #e2e8f0;
    font-size: 9pt;
  }

  .toc-section-title {
    font-weight: 600;
    color: #1e293b;
  }

  .toc-page {
    font-weight: 600;
    color: #6366f1;
  }

  .toc-subitem {
    padding-left: 18px;
    font-size: 8.5pt;
    color: #475569;
  }

  /* Section Dividers */
  .page-break {
    page-break-before: always;
  }

  .section-hero {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
    color: #ffffff;
    padding: 18px 20px;
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .section-hero h1 {
    color: #ffffff;
    border-bottom: 1px solid rgba(255,255,255,0.2);
    margin-top: 0;
    padding-bottom: 8px;
  }

  .section-hero p {
    color: #cbd5e1;
    font-size: 9.5pt;
    margin: 0;
  }
`;
