### Phase 38 (Fonts)

Any Google font or your own font on the canvas.

#### Added
- A font picker: search 42 Google font families, the fonts imported into the project, and the system fonts; "Upload a font…" imports a .ttf, .otf, .woff or .woff2 file and uses it at once.
- Fonts load only when a layer uses them: a stylesheet for the Google fonts in use and an `@font-face` for imported files, in every frame the editor draws text into.
- Weights offered are the ones the family has; variable fonts get a slider for each axis (width, optical size, slant) that writes `font-variation-settings`.
- A project setting for how fonts show while loading (swap, block, fallback, optional, auto).
- When a font arrives, selection boxes and hit areas follow the new text size instead of staying at the fallback's.
- `src/core/fonts`, `fonts.setDisplay`, `typography.fontVariations`, and test fonts for the browser tests.

#### Changed
- The overlay measures again whenever a layer changes size.
