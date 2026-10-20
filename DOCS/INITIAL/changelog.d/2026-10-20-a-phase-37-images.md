### Phase 37 (Image layers)

Figma-style image cropping.

#### Added
- Picture fills: pick "Image" as the type of any fill on a frame, button, rectangle, ellipse, polygon, star or arrow, and choose one of the imported files (or import one there). It stacks with solid and gradient fills.
- Four ways to sit in the box: Fill (covers it), Fit (all of it shows), Crop and Tile (repeats, at any size).
- Crop on the canvas: the picture's outline appears with a handle on each corner and one in the middle; drag the corners to zoom in, the middle to move it. The picture always covers the box.
- Brightness, contrast and saturation for each picture fill.
- Replace image: the Picture control on image layers, and for fills just choose another file. The fit, crop and colours stay. Also the `paint.replaceImage` command.
- Eight picture cases in the render gallery, compared across Chromium, Firefox and WebKit.

#### Changed
- A picture whose colours are changed is drawn by a layer of its own behind the layer's content.
