### Phase 35 (Paint: colour, gradients, strokes, shadows & blur)

Figma-style paint controls with gradient handles on the canvas.

#### Added
- A colour picker: a saturation and brightness square, hue and alpha sliders, HSB or OKLCH numbers, a hex box and (where the browser has one) the eyedropper.
- Fills as a list: solid colours and linear, radial and conic gradients, each with opacity and visibility; add, reorder, hide and remove; a stop bar to add, drag, recolour and remove gradient stops. Frames, forms, buttons, badges, floating buttons, rectangles, ellipses, polygons, stars and arrows can have them.
- Gradient handles on the canvas while you edit a gradient: drag the ends, the centre, the radii or the angle (Shift steps by 15 degrees); a drag is one undo step.
- Dashed and dotted strokes; round and square caps and joins now draw.
- Drop and inner shadows (several per layer), layer blur and background blur.
- `paint.setFills`, `paint.setShadows`, `paint.setBlur`, `paint.setStrokeStyle` commands; `src/core/paint`.
- A screenshot test that 16 paint cases render the same in Chromium, Firefox and WebKit, with golden images.

#### Changed
- The Simple face's Fill opens the fills editor and its swatch the colour picker (before: the browser's colour box). Typing a colour there makes the fill one plain colour.
- Text layers take drop shadows as text shadows.
