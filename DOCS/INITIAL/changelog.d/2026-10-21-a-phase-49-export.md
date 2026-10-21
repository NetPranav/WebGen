### Phase 49 (Static export v1)

Export your design as a site that looks like the canvas.

#### Added
- File > Export Site (Ctrl+E): choose plain HTML, Vite + React or Next.js (App Router), and one stylesheet, CSS Modules or Tailwind. Download a ZIP.
- Pages become routes, breakpoints become `@media (max-width)` rules, modes become `[data-mode]` rules, links become anchors, and only used pictures and fonts are included.
- Components become files with typed props (variants, text, image and show/hide properties).
- The Code tab shows the real HTML, JSX, CSS and Tailwind for the selected layer.
- Commands `file.exportSite` and `export.site`; `src/core/export/site/`; the export build harness now builds a generated site with Next and Vite.
